import jwt from "jsonwebtoken";

// Must match the Adamas backend (Call Center Help/client/lib/security.js):
// same cookie name + options so sessions work against either server.
export const SESSION_COOKIE = "adamas_session";
export const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12h

export function sessionCookieOptions() {
  const env = process.env;
  const secure =
    env.COOKIE_SECURE === "true"
      ? true
      : env.COOKIE_SECURE === "false"
        ? false
        : env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_MAX_AGE_MS / 1000),
  };
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret && secret !== "secret") return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be set to a strong value in production");
  }
  // Dev-only fallback — never use in production
  return "dev-only-insecure-jwt-secret";
}

// Reads Bearer header first, falls back to the httpOnly session cookie.
function readSessionToken(req) {
  const header = req.headers.get("Authorization");
  if (header?.startsWith("Bearer ")) {
    return header.slice(7).trim();
  }
  return req.cookies.get(SESSION_COOKIE)?.value || null;
}

export async function verifyAuth(req) {
  const token = readSessionToken(req);
  if (!token) return null;

  try {
    const verified = jwt.verify(token, getJwtSecret());
    return verified; // { _id, role, tv, iat }
  } catch {
    return null;
  }
}

export function signAuthToken(payload, expiresIn = "12h") {
  return jwt.sign(payload, getJwtSecret(), { expiresIn });
}
