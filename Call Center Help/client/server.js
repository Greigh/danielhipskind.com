const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const winston = require('winston');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const cookie = require('cookie');
const bodyParser = require('body-parser');
const { body, validationResult } = require('express-validator');
const { nanoid } = require('nanoid');

const SESSION_COOKIE = 'adamas_session';
const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

function sessionCookieOptions() {
  // COOKIE_SECURE=true|false overrides; otherwise Secure in production (HTTPS).
  // Local smoke against http:// should set COOKIE_SECURE=false.
  const secure =
    process.env.COOKIE_SECURE === 'true'
      ? true
      : process.env.COOKIE_SECURE === 'false'
        ? false
        : process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_MS,
  };
}

function readSessionToken(req) {
  const header = req.header('Authorization');
  if (header && header.startsWith('Bearer ')) {
    return header.slice(7).trim();
  }
  const raw = req.headers.cookie || '';
  if (!raw) return null;
  try {
    const parsed = cookie.parse(raw);
    return parsed[SESSION_COOKIE] || null;
  } catch {
    return null;
  }
}

function injectHtmlNonce(html, nonce) {
  return String(html)
    .replace(/<script(?=[\s>])(?![^>]*\bnonce=)/gi, `<script nonce="${nonce}"`)
    .replace(/<style(?=[\s>])(?![^>]*\bnonce=)/gi, `<style nonce="${nonce}"`);
}

function sendHtmlFile(res, filePath) {
  const nonce = res.locals.cspNonce;
  let html = fs.readFileSync(filePath, 'utf8');
  if (nonce) html = injectHtmlNonce(html, nonce);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // HTML must revalidate so deploys / Facet redesigns aren't stuck behind CDN/browser cache
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.send(html);
}

function clearSessionCookie(res) {
  const opts = sessionCookieOptions();
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: opts.secure,
    sameSite: 'lax',
    path: '/',
  });
}

/** Reject private/link-local literal hosts; require strict Finesse hostnames. */
function isAllowedFinesseUrl(rawUrl) {
  let urlObj;
  try {
    urlObj = new URL(rawUrl);
  } catch {
    return false;
  }
  // HTTPS only — never follow cleartext to internal networks
  if (urlObj.protocol !== 'https:') return false;
  if (urlObj.username || urlObj.password) return false;
  const host = String(urlObj.hostname || '').toLowerCase();
  if (!host || host === 'localhost' || host.endsWith('.local')) return false;
  if (
    /^(10\.|127\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(
      host
    )
  ) {
    return false;
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return false;
  if (host.includes(':')) return false; // raw IPv6
  // Exact suffix / label allowlist — no loose "finesse" substring hosts
  const patterns = [
    /(^|\.)cisco\.com$/i,
    /(^|\.)lminfosys\.net$/i,
    /^finesse(\.|-)/i,
    /\.finesse\./i,
  ];
  // Require hostname to look like a real Finesse server (finesse.X or X.finesse.Y)
  // Reject attacker domains such as finesse.evil.com unless under known parents
  const allowedExactEnv = (process.env.FINESSE_ALLOWED_HOSTS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (allowedExactEnv.length > 0) {
    return allowedExactEnv.some(
      (h) => host === h || host.endsWith('.' + h)
    );
  }
  return patterns.some((p) => p.test(host));
}

/** Fetch Finesse without following redirects (SSRF hardening). */
async function fetchFinesse(url, options = {}) {
  const response = await fetch(url, { ...options, redirect: 'manual' });
  if (response.status >= 300 && response.status < 400) {
    const err = new Error('Finesse redirect blocked');
    err.status = 400;
    throw err;
  }
  return response;
}

function maskSsnServer(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return { ssn: '', ssnLast4: '' };
  return {
    ssn: `***${digits.slice(-4)}`,
    ssnLast4: digits.slice(-4),
  };
}

function sanitizeCallLogPayload(body, userId) {
  const src = body && typeof body === 'object' ? body : {};
  const {
    userId: _u,
    _id: _id,
    password: _p,
    twilio: _t,
    __v: _v,
    ...rest
  } = src;
  const ssnFields = maskSsnServer(rest.ssn || rest.ssnLast4 || '');
  return {
    ...rest,
    ...ssnFields,
    userId,
  };
}

async function deleteUserAccount(userId, res) {
  await Models.User.findByIdAndDelete(userId);
  await Models.Note.deleteMany({ userId });
  await Models.CallLog.deleteMany({ userId });
  // Best-effort popup cleanup for this user
  for (const [id, meta] of popupStore.entries()) {
    if (meta.userId && String(meta.userId) === String(userId)) {
      try {
        fs.unlinkSync(meta.filePath);
      } catch {
        /* ignore */
      }
      popupStore.delete(id);
    }
  }
  clearSessionCookie(res);
  return res.json({ message: 'Account deleted' });
}

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  // Cookies on the Socket.IO handshake (same-origin)
  cors: {
    origin: true,
    credentials: true,
  },
});
const port = process.env.PORT || 8080;

// Fail closed if JWT secret is missing in production; use a noisy default only in non-production.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  logger.warn(
    'WARNING: JWT_SECRET is not set. Using an insecure development default.'
  );
}
const EFFECTIVE_JWT_SECRET = JWT_SECRET || 'dev-only-insecure-secret';

// Database connection
let isDbConnected = false;
let db = {}; // Will hold User, Note, AuditLog models (real or mock)

// Mock DB Implementation
class MockModel {
  constructor(data) {
    Object.assign(this, data);
    this._id = data._id || Date.now().toString();
    this.createdAt = new Date();
  }

  save() {
    // Mimic async save
    const collection = MockModel.collections[this.constructor.modelName];
    if (!this._id) this._id = Date.now().toString();
    const existingIndex = collection.findIndex((i) => i._id === this._id);
    if (existingIndex >= 0) {
      collection[existingIndex] = this;
    } else {
      collection.push(this);
    }
    return Promise.resolve(this);
  }

  static findOne(query) {
    const collection = MockModel.collections[this.modelName] || [];
    // Simple mock query support for basic fields
    const item = collection.find((item) => {
      return Object.keys(query).every((key) => item[key] === query[key]);
    });
    return Promise.resolve(item ? new this(item) : null);
  }

  static find(query) {
    const collection = MockModel.collections[this.modelName] || [];
    // Regex mock support for 'content' search
    if (query.content && query.content instanceof RegExp) {
      const results = collection.filter((item) =>
        query.content.test(item.content)
      );
      return Promise.resolve(results);
    }
    if (query.userId) {
      const results = collection.filter((item) => item.userId == query.userId); // loose equality for mock IDs
      return Promise.resolve(results);
    }
    return Promise.resolve(collection);
  }

  static findById(id) {
    const collection = MockModel.collections[this.modelName] || [];
    const item = collection.find((i) => i._id == id);
    return Promise.resolve(item ? new this(item) : null);
  }

  static findByIdAndUpdate(id, update) {
    const collection = MockModel.collections[this.modelName] || [];
    const index = collection.findIndex((i) => i._id == id);
    if (index > -1) {
      // Very basic Mock update: merge keys
      if (update.$set) Object.assign(collection[index], update.$set);
      else Object.assign(collection[index], update);

      return Promise.resolve(new this(collection[index]));
    }
    return Promise.resolve(null);
  }

  static findByIdAndDelete(id) {
    const collection = MockModel.collections[this.modelName] || [];
    const index = collection.findIndex((i) => i._id == id);
    if (index > -1) {
      collection.splice(index, 1);
    }
    return Promise.resolve();
  }

  static deleteMany(query) {
    // Simple mock for "delete all for user"
    if (query.userId) {
      const collection = MockModel.collections[this.modelName] || [];
      const newCollection = collection.filter(
        (item) => item.userId != query.userId
      );
      MockModel.collections[this.modelName] = newCollection;
    }
    return Promise.resolve();
  }
}
MockModel.collections = { User: [], Note: [], AuditLog: [], CallLog: [] };

// Initialize Models Function
function initializeModels() {
  if (isDbConnected) {
    const UserSchema = new mongoose.Schema({
      username: { type: String, required: true, unique: true },
      email: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      role: { type: String, default: 'agent' },
      createdAt: { type: Date, default: Date.now },
      settings: { type: mongoose.Schema.Types.Mixed, default: {} },
      twilio: {
        accountSid: { type: String, default: '' },
        authToken: { type: String, default: '' },
        phoneNumber: { type: String, default: '' },
      },
    });
    db.User = mongoose.model('User', UserSchema);

    const NoteSchema = new mongoose.Schema({
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      content: String,
      createdAt: { type: Date, default: Date.now },
    });
    db.Note = mongoose.model('Note', NoteSchema);

    const CallLogSchema = new mongoose.Schema({
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      callerName: String,
      callerPhone: String,
      callType: String,
      startTime: Date,
      endTime: Date,
      duration: Number,
      notes: String,
      status: String,
      customData: { type: mongoose.Schema.Types.Mixed },
      accountNumber: String,
      ssn: String,
      createdAt: { type: Date, default: Date.now },
    });
    db.CallLog = mongoose.model('CallLog', CallLogSchema);

    const AuditLogSchema = new mongoose.Schema({
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      action: { type: String, required: true },
      resource: { type: String, required: true },
      details: { type: mongoose.Schema.Types.Mixed },
      ip: String,
      userAgent: String,
      timestamp: { type: Date, default: Date.now },
    });
    db.AuditLog = mongoose.model('AuditLog', AuditLogSchema);
    logger.info('Using MongoDB Models');
  } else {
    // Assign Mock Models
    db.User = class User extends MockModel {
      static modelName = 'User';
    };
    db.Note = class Note extends MockModel {
      static modelName = 'Note';
    };
    db.CallLog = class CallLog extends MockModel {
      static modelName = 'CallLog';
    };
    db.AuditLog = class AuditLog extends MockModel {
      static modelName = 'AuditLog';
    };
    logger.warn(
      'WARNING: Using In-Memory Mock Database. Data will be lost on restart.'
    );
  }
}

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/callcenter', {
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => {
    logger.info('MongoDB connected');
    isDbConnected = true;
    initializeModels();
  })
  .catch((err) => {
    logger.error(
      'MongoDB connection error - Falling back to Mock DB',
      err.message
    );
    isDbConnected = false;
    initializeModels();
  });

// Pre-initialize mock models synchronously so 'User' etc are available immediately
// (though technically they might get overwritten if connection succeeds, that's fine)
initializeModels();

// Alias for cleaner code in routes - use getters
// We can't use 'const User = db.User' because db.User changes.
// We will simply use `db.User` in the routes, OR define getters:
const Models = {
  get User() {
    return db.User;
  },
  get Note() {
    return db.Note;
  },
  get CallLog() {
    return db.CallLog;
  },
  get AuditLog() {
    return db.AuditLog;
  },
};

// Audit logging function
async function logAudit(userId, action, resource, details, req) {
  try {
    const auditEntry = new Models.AuditLog({
      userId,
      action,
      resource,
      details,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
    await auditEntry.save();
  } catch (err) {
    logger.error('Audit log error:', err);
  }
}

// Middleware — per-request CSP nonce (no unsafe-inline / unsafe-eval on scripts)
app.use((req, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  next();
});

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          (req, res) => `'nonce-${res.locals.cspNonce}'`,
          'https://www.google.com',
          'https://www.gstatic.com',
        ],
        // Legacy inline event handlers (onclick=) still present in some modules
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: [
          "'self'",
          (req, res) => `'nonce-${res.locals.cspNonce}'`,
          'https://www.gstatic.com',
          'https://fonts.googleapis.com',
        ],
        // element.style / style= attributes (not style tags)
        styleSrcAttr: ["'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        connectSrc: ["'self'", 'https://www.google.com', 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://fonts.googleapis.com', 'data:'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'", 'blob:'],
        frameSrc: ["'self'", 'https://www.google.com'],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
      },
    },
  })
);
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser / same-origin tools (no Origin header)
      if (!origin) return callback(null, true);
      const allowed = (
        process.env.CORS_ORIGINS ||
        process.env.FRONTEND_ORIGIN ||
        ''
      )
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (allowed.length === 0) {
        // Production must set CORS_ORIGINS — fail closed
        if (process.env.NODE_ENV === 'production') {
          return callback(new Error('CORS origin not allowed'));
        }
        return callback(null, true);
      }
      if (allowed.includes(origin) || allowed.includes('*')) {
        return callback(null, true);
      }
      return callback(new Error('CORS origin not allowed'));
    },
    credentials: true,
  })
);
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Rate limiting (API only — do not throttle static assets/pages)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const p = req.path || '';
    // Skip static files and HTML pages; only rate-limit API/auth endpoints
    if (p.startsWith('/api') || p.startsWith('/adamas/api')) return false;
    return true;
  },
});
app.use(limiter);

// Stricter limiter for auth endpoints (credential stuffing)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts, please try again later' },
});

// Auth middleware — httpOnly cookie session, with Bearer fallback for tooling
const auth = async (req, res, next) => {
  const token = readSessionToken(req);
  if (!token) return res.status(401).json({ error: 'Access denied' });
  try {
    const verified = jwt.verify(token, EFFECTIVE_JWT_SECRET);
    // Reject deleted / unknown users so JWTs do not outlive the account
    const user = await Models.User.findById(verified._id);
    if (!user) {
      clearSessionCookie(res);
      return res.status(401).json({ error: 'Invalid token' });
    }
    req.user = {
      _id: user._id,
      role: user.role || verified.role || 'agent',
    };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeRegExp(string) {
  return String(string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// File upload — images only, size-capped, randomized name
const ALLOWED_UPLOAD_EXTS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
]);
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ALLOWED_UPLOAD_EXTS.has(ext) ? ext : '';
    cb(null, `${Date.now()}-${nanoid(8)}${safeExt}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!ALLOWED_UPLOAD_EXTS.has(ext)) {
      return cb(new Error('Only image uploads are allowed'));
    }
    if (!String(file.mimetype || '').startsWith('image/')) {
      return cb(new Error('Only image uploads are allowed'));
    }
    cb(null, true);
  },
});

// Ensure directories
const srcPath = path.join(__dirname, 'dist');
const popupsDir = path.join(srcPath, 'popups');
const uploadsDir = path.join(__dirname, 'uploads');
fs.mkdirSync(popupsDir, { recursive: true });
fs.mkdirSync(uploadsDir, { recursive: true });

// Serve static files (HTML gets CSP nonces injected)
function htmlNonceStatic(rootDir) {
  return (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    let rel = req.path || '/';
    if (rel.endsWith('/')) rel += 'index.html';
    if (!rel.endsWith('.html')) return next();
    const filePath = path.normalize(path.join(rootDir, rel));
    if (!filePath.startsWith(path.normalize(rootDir))) return next();
    if (!fs.existsSync(filePath)) return next();
    try {
      return sendHtmlFile(res, filePath);
    } catch (err) {
      return next(err);
    }
  };
}

// Cache policy: never cache SW/HTML; long-cache only contenthashed assets
function setStaticCacheHeaders(res, filePath) {
  const rel = String(filePath || '').replace(/\\/g, '/');
  if (rel.endsWith('/sw.js') || rel.endsWith('sw.js') || rel.endsWith('sw.facet.js')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Service-Worker-Allowed', '/adamas/');
    return;
  }
  if (rel.endsWith('.html')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    return;
  }
  // Webpack contenthash: main.abc123.js / main.abc123.css
  if (/\.[a-f0-9]{8,}\.(js|css|woff2?|ttf|png|jpe?g|gif|svg|mp3|wav|ogg)(\.map)?$/i.test(rel)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return;
  }
  // Non-hashed compat copies (main.js / main.css) — always revalidate
  if (/\.(js|css)$/i.test(rel)) {
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  }
}

const staticOpts = {
  setHeaders: setStaticCacheHeaders,
};

app.use(htmlNonceStatic(srcPath));
app.use(express.static(srcPath, staticOpts));
app.use('/adamas', htmlNonceStatic(srcPath));
app.use('/adamas', express.static(srcPath, staticOpts));
app.use('/callcenterhelper', (req, res) => {
  res.redirect(301, '/adamas' + req.path);
});

app.use('/uploads', express.static(uploadsDir));
app.use(
  '/socket.io',
  express.static(path.join(__dirname, 'node_modules/socket.io/client-dist'))
);

// Routes for static pages with /adamas/ prefix
app.get('/adamas/privacy', (req, res) => {
  sendHtmlFile(res, path.join(srcPath, 'privacy.html'));
});

// Contact Form Handling
async function handleContactForm(req, res) {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res
      .status(400)
      .json({ error: 'Please provide name, email, and message.' });
  }

  try {
    // Send email notification (HTML-escaped to prevent mail client injection)
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');
    await transporter.sendMail({
      from: `"${String(name).replace(/["\r\n]/g, '')}" <${process.env.EMAIL_USER}>`,
      replyTo: email,
      to: process.env.EMAIL_USER,
      subject: `Adamas Contact: Message from ${String(name).replace(/[\r\n]/g, '')}`,
      text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
      html: `
        <h3>New Contact Message</h3>
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <div style="margin-top: 1em; padding: 1em; background: #f5f5f5; border-radius: 5px;">
          ${safeMessage}
        </div>
      `,
    });

    res.json({ success: true, message: 'Message sent successfully!' });
  } catch (error) {
    console.error('Contact email error:', error);
    res
      .status(500)
      .json({ error: 'Failed to send message. Please try again later.' });
  }
}

app.post('/api/contact', handleContactForm);
app.post('/adamas/api/contact', handleContactForm);

app.get('/adamas/terms', (req, res) => {
  sendHtmlFile(res, path.join(srcPath, 'terms.html'));
});

app.get('/adamas/contact', (req, res) => {
  sendHtmlFile(res, path.join(srcPath, 'contact.html'));
});

app.get('/adamas/settings', (req, res) => {
  sendHtmlFile(res, path.join(srcPath, 'settings.html'));
});

// Ensure JavaScript files have proper charset in Content-Type
app.use((req, res, next) => {
  if (req.path.endsWith('.js')) {
    res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
  }
  next();
});

// In-memory metadata for popups
const popupStore = new Map();

// Auth routes
app.post(
  '/api/register',
  authLimiter,
  [
    body('username').isLength({ min: 3 }).trim().escape(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const { username, email, password } = req.body;
    // Never accept client-supplied role — always provision as agent
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new Models.User({
      username,
      email,
      password: hashedPassword,
      role: 'agent',
    });
    try {
      await user.save();
      res.status(201).json({ message: 'User registered' });
    } catch {
      res.status(400).json({ error: 'User already exists' });
    }
  }
);

app.post(
  '/api/login',
  authLimiter,
  [body('email').isEmail().normalizeEmail(), body('password').exists()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    const user = await Models.User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { _id: user._id, role: user.role },
      EFFECTIVE_JWT_SECRET,
      { expiresIn: '12h' }
    );
    res.cookie(SESSION_COOKIE, token, sessionCookieOptions());
    // Token is intentionally omitted from JSON — session lives in httpOnly cookie
    res.json({
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  }
);

// Current session (cookie-based)
app.get('/api/me', async (req, res) => {
  const token = readSessionToken(req);
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const verified = jwt.verify(token, EFFECTIVE_JWT_SECRET);
    const user = await Models.User.findById(verified._id);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    res.json({
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

app.post('/api/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ message: 'Logged out' });
});

// Update Profile
app.put(
  '/api/user/profile',
  auth,
  [
    body('username').optional().isLength({ min: 3 }).trim().escape(),
    body('email').optional().isEmail().normalizeEmail(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const { username, email } = req.body;
    const user = await Models.User.findById(req.user._id);

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Check if email is being changed and if it's taken
    if (email && email !== user.email) {
      const existing = await Models.User.findOne({ email });
      if (existing)
        return res
          .status(400)
          .json({ error: 'Email already currently in use' });
      user.email = email;
    }

    if (username) user.username = username;

    await user.save();

    // Return updated user data (sensitive data excluded)
    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
    });
  }
);

// Update Password
app.put(
  '/api/user/password',
  auth,
  [body('currentPassword').exists(), body('newPassword').isLength({ min: 6 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const { currentPassword, newPassword } = req.body;
    const user = await Models.User.findById(req.user._id);

    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch)
      return res.status(400).json({ error: 'Incorrect current password' });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    // Invalidate current session — client must re-login
    clearSessionCookie(res);
    res.json({ message: 'Password updated successfully' });
  }
);

// Protected routes
app.get('/api/notes', auth, async (req, res) => {
  const notes = await Models.Note.find({ userId: req.user._id });
  await logAudit(req.user._id, 'read', 'notes', { count: notes.length }, req);
  res.json(notes);
});

app.post('/api/notes', auth, async (req, res) => {
  const note = new Models.Note({ ...req.body, userId: req.user._id });
  await note.save();
  await logAudit(req.user._id, 'create', 'note', { noteId: note._id }, req);
  res.status(201).json(note);
});

// Call Logs Routes
app.get('/api/calls', auth, async (req, res) => {
  try {
    const logs = await Models.CallLog.find({ userId: req.user._id });
    // Sort by most recent
    logs.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    res.json(logs);
  } catch {
    res.status(500).json({ error: 'Failed to fetch call logs' });
  }
});

app.post('/api/calls', auth, async (req, res) => {
  try {
    const logData = sanitizeCallLogPayload(req.body, req.user._id);
    const callLog = new Models.CallLog(logData);
    await callLog.save();
    await logAudit(
      req.user._id,
      'create',
      'call_log',
      { logId: callLog._id },
      req
    );
    res.status(201).json(callLog);
  } catch {
    res.status(500).json({ error: 'Failed to save call log' });
  }
});

app.put('/api/calls/:id', auth, async (req, res) => {
  try {
    const existing = await Models.CallLog.findById(req.params.id);
    if (!existing || String(existing.userId) !== String(req.user._id)) {
      return res.status(404).json({ error: 'Call log not found' });
    }
    const safeBody = sanitizeCallLogPayload(req.body, req.user._id);
    delete safeBody.userId; // ownership already verified; don't churn id type
    const updated = await Models.CallLog.findByIdAndUpdate(
      req.params.id,
      { $set: { ...safeBody, userId: existing.userId } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Call log not found' });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to update call log' });
  }
});

app.delete('/api/calls/:id', auth, async (req, res) => {
  try {
    const existing = await Models.CallLog.findById(req.params.id);
    if (!existing || String(existing.userId) !== String(req.user._id)) {
      return res.status(404).json({ error: 'Call log not found' });
    }
    await Models.CallLog.findByIdAndDelete(req.params.id);
    await logAudit(
      req.user._id,
      'delete',
      'call_log',
      { logId: req.params.id },
      req
    );
    res.json({ message: 'Call log deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete call log' });
  }
});

// User Settings Routes
app.get('/api/user/settings', auth, async (req, res) => {
  try {
    const user = await Models.User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user.settings || {});
  } catch {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.put('/api/user/settings', auth, async (req, res) => {
  try {
    const user = await Models.User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Merge existing settings with updates
    // Use simple object spread for now. For deep merge, we'd need lodash.
    // But settings are usually shallow enough or we replace sections.
    // Let's assume req.body contains the *changes* or full object?
    // Safer to merge.
    user.settings = { ...(user.settings || {}), ...req.body };

    // Mark mixed type as modified
    user.markModified('settings');
    await user.save();
    res.json(user.settings);
  } catch (err) {
    console.error('Settings update error:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// File upload
app.post('/api/upload', auth, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Upload failed' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    res.json({ filePath: `/uploads/${req.file.filename}` });
  });
});

// Search
app.get('/api/search', auth, async (req, res) => {
  const { q } = req.query;
  if (!q || typeof q !== 'string' || q.length > 200) {
    return res.status(400).json({ error: 'Invalid search query' });
  }
  const notes = await Models.Note.find({
    userId: req.user._id,
    content: new RegExp(escapeRegExp(q), 'i'),
  });
  res.json(notes);
});

// Email
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

// Email — constrain open-relay risk
app.post('/api/email/send', auth, (req, res) => {
  const { to, subject, text } = req.body || {};
  const toAddr = String(to || '').trim();
  const subj = String(subject || '').slice(0, 200);
  const body = String(text || '').slice(0, 10000);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toAddr)) {
    return res.status(400).json({ error: 'Invalid recipient email' });
  }
  const domainAllow = (process.env.EMAIL_ALLOW_DOMAINS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (domainAllow.length) {
    const domain = toAddr.split('@')[1].toLowerCase();
    if (!domainAllow.includes(domain)) {
      return res.status(403).json({ error: 'Recipient domain not allowed' });
    }
  }
  transporter.sendMail(
    { from: process.env.EMAIL_USER, to: toAddr, subject: subj, text: body },
    async (err) => {
      if (err) {
        res.status(500).json({ error: 'Email failed' });
      } else {
        await logAudit(req.user._id, 'send', 'email', { to: toAddr }, req);
        res.json({ message: 'Email sent' });
      }
    }
  );
});

// CRM proxy (example for Salesforce)
app.get('/api/crm/salesforce', auth, async (req, res) => {
  // This is a placeholder; in real app, use OAuth and API keys
  res.json({ message: 'CRM integration placeholder' });
});

// Finesse debug — disabled in production unless FINESSE_DEBUG=true.
// Credentials must be POSTed in the body (never query strings).
function finesseDebugEnabled(req, res) {
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.FINESSE_DEBUG !== 'true'
  ) {
    res.status(404).json({ error: 'Not found' });
    return false;
  }
  return true;
}

app.post('/adamas/api/finesse/debug', auth, async (req, res) => {
  if (!finesseDebugEnabled(req, res)) return;
  const { url, username, password } = req.body || {};

  if (!url || !username || !password) {
    return res.status(400).json({
      error: 'Missing required parameters',
      required: ['url', 'username', 'password'],
    });
  }

  try {
    if (!isAllowedFinesseUrl(url)) {
      return res.status(400).json({ error: 'Invalid Finesse server URL' });
    }

    const finesseUrl = `${url.replace(/\/$/, '')}/finesse/api/User/${encodeURIComponent(username)}`;
    const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

    const startTime = Date.now();
    const response = await fetchFinesse(finesseUrl, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
        Accept: 'application/xml',
        'X-Cisco-Finesse-OS': 'CallCenterHelper',
        'User-Agent': 'CallCenterHelper/1.0',
      },
    });
    const endTime = Date.now();
    const responseBody = await response.text();

    res.json({
      request: {
        url: finesseUrl,
        method: 'GET',
        headers: { Authorization: '[REDACTED]', Accept: 'application/xml' },
      },
      response: {
        status: response.status,
        statusText: response.statusText,
        bodyLength: responseBody.length,
        body:
          responseBody.length > 1000
            ? responseBody.substring(0, 1000) + '...'
            : responseBody,
        timing: `${endTime - startTime}ms`,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Legacy GET debug endpoints — permanently disabled (password-in-query risk)
app.get('/adamas/api/finesse/debug', auth, (req, res) => {
  res.status(405).json({
    error: 'Use POST /adamas/api/finesse/debug with credentials in the body',
  });
});

app.get('/adamas/api/finesse/debug/User/:username', auth, (req, res) => {
  res.status(405).json({
    error: 'Use POST /adamas/api/finesse/debug with credentials in the body',
  });
});
// Finesse API proxy (GET)
app.get('/adamas/api/finesse/User/:username', auth, async (req, res) => {
  const { username } = req.params;
  const { url } = req.query;
  const authHeader = req.headers.authorization;

  if (!url || !authHeader) {
    return res
      .status(400)
      .json({ error: 'Missing URL or Authorization header' });
  }

  try {
    if (!isAllowedFinesseUrl(url)) {
      return res.status(400).json({ error: 'Invalid Finesse server URL' });
    }

    const finesseUrl = `${url}/finesse/api/User/${encodeURIComponent(username)}`;
    const response = await fetchFinesse(finesseUrl, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
        Accept: 'application/xml',
        'X-Cisco-Finesse-OS': 'CallCenterHelper',
        'User-Agent': 'CallCenterHelper/1.0',
      },
    });

    res.status(response.status);
    res.set(
      'Content-Type',
      response.headers.get('content-type') || 'application/xml'
    );
    const body = await response.text();
    res.send(body);
  } catch (error) {
    res.status(500).json({ error: `Finesse Proxy Error: ${error.message}` });
  }
});

// Finesse API Proxy (POST - Make Call)
// Route: /finesse/api/User/{id}/Dialogs
app.post('/adamas/api/finesse/User/:username/Dialogs', auth, async (req, res) => {
  const { username } = req.params;
  const { url } = req.query;
  const authHeader = req.headers.authorization;
  // Body is expected to be XML string or JSON depending on client,
  // but Finesse expects XML usually. We'll pass the raw body if possible or reconstruct.
  // Assuming body-parser handles json/urlencoded.
  // If client sends XML string in body with proper content-type, we might need text parser.
  // But likely 'req.body' is JSON from client utility.
  // Let's assume client sends JSON payload `{ destination: '1234' }` or similar wrapper?
  // Or simpler: Client sends the exact XML string to forward?
  // Let's look at how client might implement it. Ideally, proxy just forwards.
  // We'll trust req.body is what we want to send, but Finesse needs XML.

  if (!url || !authHeader) {
    return res
      .status(400)
      .json({ error: 'Missing URL or Authorization header' });
  }

  try {
    if (!isAllowedFinesseUrl(url)) {
      return res.status(400).json({ error: 'Invalid Finesse server URL' });
    }

    const finesseUrl = `${url}/finesse/api/User/${encodeURIComponent(username)}/Dialogs`;

    // Construct XML payload from JSON body if needed, or pass through
    // For Make Call, Finesse expects:
    // <Dialog><requestedAction>MAKE_CALL</requestedAction><toAddress>...</toAddress><fromAddress>...</fromAddress></Dialog>
    // Let's assume client constructs this XML or sends simple JSON we convert.
    // For flexibility, let's support a 'rawXml' field or 'destination' field.

    let requestBody = req.body;

    // If client sent detailed JSON we might need to map it?
    // BUT safest is to let client send the XML string for Finesse.
    // However, body-parser might have parsed it.
    // If client sends { destination: '...' }, we create XML.
    if (req.body.destination) {
      requestBody = `<Dialog>
        <requestedAction>MAKE_CALL</requestedAction>
        <toAddress>${req.body.destination}</toAddress>
        <fromAddress>${username}</fromAddress>
      </Dialog>`;
    } else if (typeof req.body === 'string') {
      // Already string (perhaps text/plain middleware?)
      // Already string (perhaps text/plain middleware?)
      requestBody = req.body;
    } else if (req.body.rawXml) {
      requestBody = req.body.rawXml;
    }

    const response = await fetchFinesse(finesseUrl, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/xml',
        Accept: 'application/xml',
        'X-Cisco-Finesse-OS': 'CallCenterHelper',
      },
      body: requestBody,
    });

    res.status(response.status);
    res.set(
      'Content-Type',
      response.headers.get('content-type') || 'application/xml'
    );
    const body = await response.text();
    res.send(body);
  } catch (error) {
    console.error('Finesse MakeCall Error:', error);
    res.status(500).json({ error: `Make Call Failed: ${error.message}` });
  }
});

// Finesse API Proxy (PUT - Answer, Hold, Retrieve, Drop)
// Route: /finesse/api/Dialog/{id}
app.put('/adamas/api/finesse/Dialog/:dialogId', auth, async (req, res) => {
  const { dialogId } = req.params;
  const { url } = req.query;
  const authHeader = req.headers.authorization;

  if (!url || !authHeader) {
    return res
      .status(400)
      .json({ error: 'Missing URL or Authorization header' });
  }

  try {
    if (!isAllowedFinesseUrl(url)) {
      return res.status(400).json({ error: 'Invalid Finesse server URL' });
    }

    const finesseUrl = `${url}/finesse/api/Dialog/${encodeURIComponent(dialogId)}`;

    // Expecting JSON: { action: 'ANSWER' | 'DROP' | 'HOLD' | 'RETRIEVE' }
    // Finesse expects XML: <Dialog><requestedAction>...</requestedAction></Dialog>
    let requestBody = req.body;

    if (req.body.action) {
      requestBody = `<Dialog>
          <requestedAction>${req.body.action}</requestedAction>
       </Dialog>`;
    } else if (typeof req.body === 'string') {
      requestBody = req.body;
    } else if (req.body.rawXml) {
      requestBody = req.body.rawXml;
    }

    const response = await fetchFinesse(finesseUrl, {
      method: 'PUT',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/xml',
        Accept: 'application/xml',
        'X-Cisco-Finesse-OS': 'CallCenterHelper',
      },
      body: requestBody,
    });

    res.status(response.status);
    res.set(
      'Content-Type',
      response.headers.get('content-type') || 'application/xml'
    );
    const body = await response.text();
    res.send(body);
  } catch (error) {
    console.error('Finesse Action Error:', error);
    res.status(500).json({ error: `Call Action Failed: ${error.message}` });
  }
});

// AI Insights
app.post('/api/ai-insights', auth, async (req, res) => {
  const OpenAI = require('openai');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const { prompt } = req.body;
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
    });
    res.json({ response: completion.choices[0].message.content });
  } catch {
    res.status(500).json({ error: 'AI failed' });
  }
});

// Webhooks for workflows — require shared secret when configured
app.post('/api/webhook/:workflow', (req, res) => {
  const expected = process.env.WEBHOOK_SECRET;
  if (expected) {
    const provided =
      req.header('X-Webhook-Secret') || req.query.secret || req.body?.secret;
    if (provided !== expected) {
      return res.status(401).json({ error: 'Invalid webhook secret' });
    }
  } else if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ error: 'Webhooks disabled' });
  }
  // Trigger workflow for authenticated sockets only (per-user room if userId provided)
  const targetUserId = req.body?.userId || req.query.userId;
  const payload = {
    workflow: String(req.params.workflow || '').slice(0, 100),
    payload: req.body,
  };
  if (targetUserId) {
    io.to(String(targetUserId)).emit('workflow-trigger', payload);
  } else {
    // No broadcast to all sockets — require an explicit room target
    return res.status(400).json({ error: 'userId required for webhook delivery' });
  }
  res.json({ message: 'Webhook received' });
});

// Multichannel: SMS via Twilio
// Twilio initialized inside routes to allow dynamic config or just kept if needed globally
// const twilio = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
// Removing global twilio require as it's unused and we use user-specific creds in /api/sms

app.post('/api/sms', auth, async (req, res) => {
  const { to, message } = req.body;

  try {
    // Get user's Twilio credentials
    const user = await Models.User.findById(req.user._id);
    if (
      !user ||
      !user.twilio.accountSid ||
      !user.twilio.authToken ||
      !user.twilio.phoneNumber
    ) {
      return res.status(400).json({
        error:
          'Twilio not configured. Please set up your Twilio credentials in Settings.',
      });
    }

    // Create Twilio client with user's credentials
    const twilioClient = require('twilio')(
      user.twilio.accountSid,
      user.twilio.authToken
    );

    await twilioClient.messages.create({
      body: message,
      from: user.twilio.phoneNumber,
      to,
    });

    res.json({ message: 'SMS sent successfully' });
  } catch (err) {
    console.error('SMS send error:', err);
    res.status(500).json({ error: 'Failed to send SMS: ' + err.message });
  }
});

// Update user Twilio settings
app.put('/api/user/twilio', auth, async (req, res) => {
  const { accountSid, authToken, phoneNumber } = req.body;

  try {
    const user = await Models.User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Validate Twilio credentials by attempting to create a client
    const twilioClient = require('twilio')(accountSid, authToken);
    await twilioClient.api.accounts(accountSid).fetch();

    // Update user Twilio settings
    user.twilio = { accountSid, authToken, phoneNumber };
    await user.save();

    res.json({ message: 'Twilio settings updated successfully' });
  } catch (err) {
    console.error('Twilio validation error:', err);
    res.status(400).json({
      error:
        'Invalid Twilio credentials. Please check your Account SID and Auth Token.',
    });
  }
});

// Get user Twilio settings (without sensitive data)
app.get('/api/user/twilio', auth, async (req, res) => {
  try {
    const user = await Models.User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return settings without auth token for security
    res.json({
      accountSid: user.twilio.accountSid,
      phoneNumber: user.twilio.phoneNumber,
      isConfigured: !!(
        user.twilio.accountSid &&
        user.twilio.authToken &&
        user.twilio.phoneNumber
      ),
    });
  } catch {
    res.status(500).json({ error: 'Failed to retrieve Twilio settings' });
  }
});

// Socket.io — require valid session JWT on handshake
io.use((socket, next) => {
  try {
    let token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token && socket.handshake.headers && socket.handshake.headers.cookie) {
      const parsed = cookie.parse(socket.handshake.headers.cookie);
      token = parsed[SESSION_COOKIE];
    }
    if (!token) {
      return next(new Error('Unauthorized'));
    }
    socket.user = jwt.verify(token, EFFECTIVE_JWT_SECRET);
    return next();
  } catch {
    return next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  console.log('User connected', socket.user && socket.user._id);
  socket.on('join', (userId) => {
    if (!socket.user || String(userId) !== String(socket.user._id)) {
      return;
    }
    socket.join(String(userId));
  });
  socket.on('note-update', (data) => {
    if (!socket.user || !data || String(data.userId) !== String(socket.user._id)) {
      return;
    }
    socket.to(String(data.userId)).emit('note-updated', data);
  });
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// GDPR: Data export
app.get('/api/export', auth, async (req, res) => {
  const userDoc = await Models.User.findById(req.user._id);
  if (!userDoc) return res.status(404).json({ error: 'User not found' });
  const user = userDoc.toObject ? userDoc.toObject() : { ...userDoc };
  delete user.password;
  if (user.twilio) delete user.twilio.authToken;
  const notes = await Models.Note.find({ userId: req.user._id });
  res.json({ user, notes });
});

// GDPR: Delete account
app.delete('/api/user', auth, async (req, res) => {
  try {
    await deleteUserAccount(req.user._id, res);
  } catch {
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// Parse JSON bodies for popup creation
app.use(bodyParser.json({ limit: '2mb' }));

// Stricter limiter for popup HTML writes (disk DoS)
const popupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many popup requests' },
});

// Endpoint to create a popup page. Expects { html: '<html>...</html>' }
// Requires auth to prevent unauthenticated stored XSS on this origin.
app.post('/popup', auth, popupLimiter, (req, res) => {
  const { html } = req.body || {};
  if (!html || typeof html !== 'string')
    return res.status(400).json({ error: 'Missing html' });
  if (html.length > 200000)
    return res.status(400).json({ error: 'Popup HTML too large' });

  // Cap concurrent popups per user
  let userPopups = 0;
  for (const meta of popupStore.values()) {
    if (meta.userId && String(meta.userId) === String(req.user._id)) {
      userPopups += 1;
    }
  }
  if (userPopups >= 20) {
    return res.status(429).json({ error: 'Too many active popups' });
  }

  const id = nanoid();
  const filename = `${id}.html`;
  const filePath = path.join(popupsDir, filename);

  try {
    const hardened = `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta http-equiv="Content-Security-Policy" content="default-src 'none'; base-uri 'none'; style-src 'unsafe-inline'; img-src data: https: http:; script-src 'none';"/></head><body>${html}</body></html>`;
    fs.writeFileSync(filePath, hardened, 'utf8');
    const createdAt = Date.now();
    popupStore.set(id, { filePath, createdAt, userId: req.user._id });
    res.json({ id, url: `/popups/${filename}` });
  } catch (err) {
    console.error('Error writing popup file', err);
    res.status(500).json({ error: 'Failed to write popup' });
  }
});

// Optional helper endpoint to delete a popup page
app.delete('/popup/:id', auth, (req, res) => {
  const id = req.params.id;
  const meta = popupStore.get(id);
  if (!meta) return res.status(404).json({ error: 'Not found' });
  if (meta.userId && String(meta.userId) !== String(req.user._id)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    fs.unlinkSync(meta.filePath);
    popupStore.delete(id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting popup file', err);
    res.status(500).json({ error: 'Failed to delete popup' });
  }
});

// Redirect convenience route (optional)
app.get('/popup/:id', (req, res) => {
  const id = req.params.id;
  const meta = popupStore.get(id);
  if (!meta) return res.status(404).send('Not found');
  const filename = path.basename(meta.filePath);
  res.redirect(`/popups/${filename}`);
});

// Periodic cleanup: remove popup files older than 24 hours
const CLEANUP_INTERVAL = 1000 * 60 * 60; // 1 hour
const MAX_AGE = 1000 * 60 * 60 * 24; // 24 hours
setInterval(() => {
  const now = Date.now();
  for (const [id, meta] of popupStore.entries()) {
    if (now - meta.createdAt > MAX_AGE) {
      try {
        fs.unlinkSync(meta.filePath);
      } catch {
        // ignore
      }
      popupStore.delete(id);
    }
  }
}, CLEANUP_INTERVAL);

// GDPR Compliance: Data Export
app.get('/api/user/data', auth, async (req, res) => {
  try {
    const userDoc = await Models.User.findById(req.user._id);
    if (!userDoc) return res.status(404).json({ error: 'User not found' });
    const user = userDoc.toObject ? userDoc.toObject() : { ...userDoc };
    delete user.password;
    if (user.twilio) delete user.twilio.authToken;
    const notes = await Models.Note.find({ userId: req.user._id });
    const auditLogs = await Models.AuditLog.find({ userId: req.user._id });
    const data = { user, notes, auditLogs };
    await logAudit(req.user._id, 'export', 'user_data', {}, req);
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// GDPR Compliance: Data Deletion
app.delete('/api/user/delete', auth, async (req, res) => {
  try {
    await logAudit(req.user._id, 'delete', 'user_account', {}, req);
    await Models.AuditLog.deleteMany({ userId: req.user._id });
    await deleteUserAccount(req.user._id, res);
  } catch {
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
