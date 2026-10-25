const path = require("path");
const fs = require("fs");

// Load production secrets from .env.production when present (PM2 may not inject them).
require("dotenv").config({
  path: path.join(__dirname, ".env.production"),
});
require("dotenv").config(); // also allow .env for local overrides

const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");
const helmet = require("helmet");
const cors = require("cors");
const winston = require("winston");
const crypto = require("crypto");

// Ensure logs directory exists
const LOGS_DIR = path.join(__dirname, "logs");
try {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
} catch (e) {
  /* ignore */
}
const bodyParser = require("body-parser");
const next = require("next");
const {
  seoRedirectMiddleware,
  CANONICAL_ORIGIN,
} = require("./lib/seo-redirects.cjs");

// Setup Next.js
const dev = process.env.NODE_ENV !== "production";
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret && secret !== "secret") return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be set to a strong value in production");
  }
  return "dev-only-insecure-jwt-secret";
}

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  );
}

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const port = process.env.PORT || 3001;

// Socket.IO — authenticated realtime channel for the Adamas client.
// Handshake token comes from socket.handshake.auth.token or the httpOnly
// adamas_session cookie; user lookup reuses the mongoose connection the
// Next route handlers establish (same process, same module instance).
async function ensureSocketDb() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  });
}

io.use(async (socket, next) => {
  try {
    let token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token && socket.handshake.headers && socket.handshake.headers.cookie) {
      const match = socket.handshake.headers.cookie.match(
        /(?:^|;\s*)adamas_session=([^;]*)/,
      );
      token = match ? decodeURIComponent(match[1]) : null;
    }
    if (!token) return next(new Error("Unauthorized"));
    const verified = jwt.verify(token, getJwtSecret());
    await ensureSocketDb();
    const user = await mongoose.connection
      .collection("users")
      .findOne({ _id: new mongoose.Types.ObjectId(String(verified._id)) });
    if (!user || (verified.tv || 0) !== (user.tokenVersion || 0)) {
      return next(new Error("Unauthorized"));
    }
    socket.user = { _id: user._id, role: user.role };
    return next();
  } catch {
    return next(new Error("Unauthorized"));
  }
});

io.on("connection", (socket) => {
  socket.on("join", (userId) => {
    if (!socket.user || String(userId) !== String(socket.user._id)) return;
    socket.join(String(userId));
  });
  socket.on("note-update", (data) => {
    if (
      !socket.user ||
      !data ||
      String(data.userId) !== String(socket.user._id)
    ) {
      return;
    }
    socket.to(String(data.userId)).emit("note-updated", data);
  });
});

// All user/auth/DB APIs live in the Next.js route handlers under src/app/api
// (forwarded below via nextApiForward). Express owns static hosting, SEO
// redirects, rate limiting, admin analytics, and the contact form.

// prepare Next.js
nextApp.prepare().then(() => {
  // Fail closed in production if JWT signing secret is missing/weak
  try {
    getJwtSecret();
  } catch (err) {
    logger.error(err.message);
    process.exit(1);
  }

  app.use(
    helmet({
      // CSP is owned by nginx (single source of truth for every app it fronts:
      // Next.js, /adamas, lgenia, webexpressstudio). Defining it here too sent
      // two Content-Security-Policy headers, so the browser enforced the
      // stricter intersection — e.g. blocking the data: fonts and Google /
      // reCAPTCHA frames the nginx policy intentionally allows.
      contentSecurityPolicy: false,
    }),
  );
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || "https://danielhipskind.com",
      credentials: true,
    }),
  );

  // Canonical URLs, legacy paths, and Search Console cleanup (before static)
  app.use(seoRedirectMiddleware);

  // Forward Next-owned API routes BEFORE body parsers consume the raw body.
  // Express body-parser + Next Request body = "Response body object should not
  // be disturbed or locked".
  const nextApiForward = (req, res) => handle(req, res);
  app.all("/api/analytics", nextApiForward);
  app.all("/api/health", nextApiForward);
  app.all("/api/notes", nextApiForward);
  app.all("/api/upload", nextApiForward);
  app.all("/api/register", nextApiForward);
  app.all("/api/login", nextApiForward);
  app.all("/api/me", nextApiForward);
  app.all("/api/logout", nextApiForward);
  app.all(/^\/api\/user(?:\/|$)/, nextApiForward);
  app.all(/^\/callcenterhelper\/api(?:\/|$)/, nextApiForward);

  app.use(bodyParser.json({ limit: "10mb" }));
  app.use(bodyParser.urlencoded({ extended: true }));

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    // Behind nginx+Cloudflare every request reaches Node from 127.0.0.1, so
    // req.ip would bucket the entire internet together. Key on the real
    // client IP that Cloudflare forwards instead.
    keyGenerator: (req) => {
      const cf = req.get("CF-Connecting-IP");
      if (cf) return cf;
      // Use helper so IPv6 addresses are normalized (express-rate-limit v8+)
      return ipKeyGenerator(req.ip);
    },
    // We key on CF-Connecting-IP (not the spoofable XFF), so suppress
    // express-rate-limit's trust-proxy validation warning.
    validate: { trustProxy: false },
    // Never throttle static assets: a single page load pulls ~15+ of them,
    // and they're immutable + meant to be edge-cached.
    skip: (req) =>
      req.method === "GET" &&
      (req.path.startsWith("/_next/") ||
        req.path.startsWith("/assets/") ||
        req.path.startsWith("/adamas/") ||
        req.path === "/favicon.ico"),
  });
  app.use(limiter);

  // Correct path for Adamas files on server (root/adamas)
  const adamasPath = path.join(__dirname, "adamas");
  const popupsDir = path.join(adamasPath, "popups");
  const uploadsDir = path.join(__dirname, "uploads");

  // Create directories if they don't exist
  fs.mkdirSync(popupsDir, { recursive: true });
  fs.mkdirSync(uploadsDir, { recursive: true });

  // Canonical Adamas URLs (before static; absolute URLs for Express 5 redirect)
  app.get("/adamas", (req, res) =>
    res.redirect(301, `${CANONICAL_ORIGIN}/adamas/`),
  );
  ["contact", "privacy", "terms", "settings"].forEach((page) => {
    app.get(`/adamas/${page}.html`, (req, res) => {
      res.redirect(301, `${CANONICAL_ORIGIN}/adamas/${page}`);
    });
  });

  // Serve Adamas static files — never year-cache HTML/SW; only contenthashed assets are immutable
  function setAdamasCacheHeaders(res, filePath) {
    const rel = String(filePath || "").replace(/\\/g, "/");
    if (
      rel.endsWith(".html") ||
      rel.endsWith("/sw.js") ||
      rel.endsWith("sw.js") ||
      rel.endsWith("sw.facet.js") ||
      rel.endsWith("build-date.txt")
    ) {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      return;
    }
    if (
      /\.[a-f0-9]{8,}\.(js|css|woff2?|ttf|png|jpe?g|gif|svg)(\.map)?$/i.test(
        rel,
      )
    ) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      return;
    }
    if (/\.(js|css)$/i.test(rel)) {
      res.setHeader("Cache-Control", "no-cache, must-revalidate");
    }
  }

  app.use(
    "/adamas",
    express.static(adamasPath, { setHeaders: setAdamasCacheHeaders }),
  );

  // Legacy multer-era uploads live in ./uploads; the Next /api/upload route
  // writes to public/uploads — serve both locations under /uploads.
  const publicUploadsDir = path.join(__dirname, "public", "uploads");
  fs.mkdirSync(publicUploadsDir, { recursive: true });
  app.use("/uploads", express.static(uploadsDir));
  app.use("/uploads", express.static(publicUploadsDir));
  app.use(
    "/socket.io",
    express.static(path.join(__dirname, "node_modules/socket.io/client-dist")),
  );

  // Admas Static Routes
  app.get("/adamas/privacy", (req, res) => {
    res.sendFile(path.join(adamasPath, "privacy.html"));
  });
  app.get("/adamas/terms", (req, res) => {
    res.sendFile(path.join(adamasPath, "terms.html"));
  });
  app.get("/adamas/contact", (req, res) => {
    res.sendFile(path.join(adamasPath, "contact.html"));
  });
  app.get("/adamas/settings", (req, res) => {
    res.sendFile(path.join(adamasPath, "settings.html"));
  });

  // Ensure JS charset
  app.use((req, res, next) => {
    if (req.path.endsWith(".js")) {
      res.setHeader("Content-Type", "text/javascript; charset=utf-8");
    }
    next();
  });

  // --- API ROUTES (Adamas) ---
  // /api/register and /api/login are handled by the Next.js route handlers.

  // --- Admin Logic & Analytics (In-Memory Session Fallback) ---
  const ADMIN_SESSION_NAME = "admin_session";
  const ADMIN_SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
  const adminSessions = new Map(); // In-memory session store (replaces Redis)

  // Periodically prune expired admin sessions (memory leak prevention)
  setInterval(
    () => {
      const now = Date.now();
      for (const [token, session] of adminSessions) {
        if (now > session.exp) adminSessions.delete(token);
      }
    },
    5 * 60 * 1000,
  ).unref?.();

  function generateSessionToken() {
    return crypto.randomBytes(32).toString("hex");
  }

  function verifySessionToken(token) {
    if (!token) return false;
    const session = adminSessions.get(token);
    if (!session) return false;
    if (Date.now() > session.exp) {
      adminSessions.delete(token);
      return false;
    }
    return true;
  }

  function parseCookies(req) {
    const header = req.headers.cookie || "";
    return header
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean)
      .reduce((acc, kv) => {
        const [k, ...v] = kv.split("=");
        acc[k] = decodeURIComponent((v || []).join("="));
        return acc;
      }, {});
  }

  function getRealIP(req) {
    const cf = req.get("CF-Connecting-IP");
    if (cf && cf !== "127.0.0.1") return cf;
    const forwarded = req.get("X-Forwarded-For");
    if (forwarded) return forwarded.split(",")[0].trim();
    return req.ip || req.connection?.remoteAddress || "unknown";
  }

  // Login
  app.post("/api/admin/login", async (req, res) => {
    const secret = (req.body && req.body.secret) || req.get("x-admin-secret");
    if (!process.env.ADMIN_SECRET)
      return res.status(403).json({ error: "Admin login not enabled" });
    if (!secret || secret !== process.env.ADMIN_SECRET)
      return res.status(401).json({ error: "Unauthorized" });

    const token = generateSessionToken();
    adminSessions.set(token, {
      ts: Date.now(),
      exp: Date.now() + ADMIN_SESSION_TTL_MS,
    });

    const cookieParts = [
      `${ADMIN_SESSION_NAME}=${token}`,
      "HttpOnly",
      "Path=/",
      `Max-Age=${Math.floor(ADMIN_SESSION_TTL_MS / 1000)}`,
      "SameSite=Strict",
    ];
    if (process.env.NODE_ENV === "production") cookieParts.push("Secure");
    res.setHeader("Set-Cookie", cookieParts.join("; "));
    return res.status(204).end();
  });

  // Logout
  app.post("/api/admin/logout", (req, res) => {
    const cookies = parseCookies(req);
    const token = cookies[ADMIN_SESSION_NAME];
    if (token) adminSessions.delete(token);
    res.setHeader(
      "Set-Cookie",
      `${ADMIN_SESSION_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict${
        process.env.NODE_ENV === "production" ? "; Secure" : ""
      }`,
    );
    return res.status(204).end();
  });

  // Analytics ingest: handled by Next.js route at src/app/api/analytics/route.js

  // Admin Analytics Read
  app.get("/api/admin/analytics", async (req, res) => {
    const cookies = parseCookies(req);
    const token = cookies[ADMIN_SESSION_NAME];
    const headerSecret = req.get("x-admin-secret");
    const authHeader = req.get("authorization") || "";
    const bearer = authHeader.replace(/^Bearer\s+/i, "");

    const isAuth =
      (token && verifySessionToken(token)) ||
      headerSecret === process.env.ADMIN_SECRET ||
      bearer === process.env.ADMIN_SECRET;

    if (!process.env.ADMIN_SECRET)
      return res.status(403).json({ error: "Admin disabled" });
    if (!isAuth) return res.status(401).json({ error: "Unauthorized" });

    const limit = Math.min(Number(req.query.limit) || 100, 1000);
    try {
      const files = fs
        .readdirSync(LOGS_DIR)
        .filter((f) => f.startsWith("analytics-"))
        .sort()
        .reverse();
      if (files.length === 0)
        return res.json({ source: "file", count: 0, events: [] });

      const latest = path.join(LOGS_DIR, files[0]);
      const raw = fs
        .readFileSync(latest, "utf8")
        .trim()
        .split("\n")
        .filter(Boolean);
      // Read last N lines
      const selected = raw
        .slice(-limit)
        .reverse()
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch {
            return { raw: line };
          }
        });
      return res.json({
        source: "file",
        file: files[0],
        count: selected.length,
        events: selected,
      });
    } catch (err) {
      return res.status(500).json({ error: "Read failed" });
    }
  });

  // CSV Export
  app.get("/api/admin/analytics.csv", async (req, res) => {
    const cookies = parseCookies(req);
    const token = cookies[ADMIN_SESSION_NAME];
    const headerSecret = req.get("x-admin-secret");
    const authHeader = req.get("authorization") || "";
    const bearer = authHeader.replace(/^Bearer\s+/i, "");

    const isAuth =
      (token && verifySessionToken(token)) ||
      headerSecret === process.env.ADMIN_SECRET ||
      bearer === process.env.ADMIN_SECRET;

    if (!process.env.ADMIN_SECRET)
      return res.status(403).send("Admin disabled");
    if (!isAuth) return res.status(401).send("Unauthorized");

    const limit = Math.min(Number(req.query.limit) || 1000, 10000);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="analytics.csv"',
    );
    res.write("timestamp,ip,ua,path,referrer,event,data,country,city\n");

    try {
      const files = fs
        .readdirSync(LOGS_DIR)
        .filter((f) => f.startsWith("analytics-"))
        .sort()
        .reverse();
      if (files.length === 0) {
        res.end();
        return;
      }

      const latest = path.join(LOGS_DIR, files[0]);
      const stream = fs.createReadStream(latest, { encoding: "utf8" });
      let leftover = "";
      let count = 0;

      stream.on("data", (chunk) => {
        leftover += chunk;
        const parts = leftover.split("\n");
        leftover = parts.pop();
        // Traverse backwards to get newest first? The legacy code did that in memory but for CSV stream it just dumped.
        // Actually legacy code did: `for (let i = parts.length - 1; i >= 0; i--)`. Let's match that.
        for (let i = parts.length - 1; i >= 0; i--) {
          const line = parts[i].trim();
          if (!line) continue;
          try {
            const e = JSON.parse(line);
            const row = [
              `"${e.timestamp || ""}"`,
              `"${e.ip || ""}"`,
              `"${(e.ua || "").replace(/"/g, '""')}"`,
              `"${(e.path || "").replace(/"/g, '""')}"`,
              `"${(e.referrer || "").replace(/"/g, '""')}"`,
              `"${e.event || ""}"`,
              `"${JSON.stringify(e.data || "").replace(/"/g, '""')}"`,
              `"${e.country || ""}"`,
              `"${e.city || ""}"`,
            ];
            res.write(row.join(",") + "\n");
            count++;
            if (count >= limit) {
              stream.destroy();
              res.end();
              return;
            }
          } catch {}
        }
      });
      stream.on("end", () => res.end());
    } catch {
      res.status(500).end();
    }
  });

  // End Admin Logic
  // The user can add specific missing API endpoints if needed later.
  // BUT the user's specific request "new files aren't deploying" was about the MAIN SITE (Next.js).

  // CRM/Finesse/Etc routes would go here.

  // Contact Form
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

  // Strip characters that could break or inject into email headers
  const safeName = (s) =>
    String(s ?? "")
      .replace(/["\\\r\n<>]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 100);

  app.post("/api/contact", async (req, res) => {
    const { name, email, message } = req.body ?? {};
    const fromName = safeName(name);
    const replyTo = String(email ?? "")
      .trim()
      .slice(0, 254);
    const text = String(message ?? "").slice(0, 10000);
    if (!fromName || !replyTo || !text.trim())
      return res.status(400).json({ error: "Missing fields" });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyTo))
      return res.status(400).json({ error: "Invalid email" });
    try {
      await transporter.sendMail({
        from: `"${fromName}" <${process.env.EMAIL_USER}>`,
        replyTo,
        to: process.env.EMAIL_USER,
        subject: `Adamas Contact: ${fromName}`,
        text,
      });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  // Explicitly serve admin index for /admin path to avoid Next.js 404
  app.get(["/admin", "/admin/"], (req, res) => {
    res.sendFile(path.join(__dirname, "public", "admin", "index.html"));
  });

  // Explicitly serve admin analytics for /admin/analytics
  app.get(["/admin/analytics", "/admin/analytics/"], (req, res) => {
    res.sendFile(path.join(__dirname, "public", "admin", "analytics.html"));
  });

  // Default Catch-All: Next.js
  app.all(/.*/, (req, res) => {
    return handle(req, res);
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
  });
});
