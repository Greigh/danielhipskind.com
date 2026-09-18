/**
 * Shared security helpers used by server.js and unit tests.
 * Keep this module free of Express/Mongo side effects so Jest can import it.
 */

'use strict';

const SESSION_COOKIE = 'adamas_session';
const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

const FINESSE_ALLOWED_ACTIONS = new Set([
  'MAKE_CALL',
  'ANSWER',
  'DROP',
  'HOLD',
  'RETRIEVE',
  'TRANSFER_SST',
  'CONSULT_CALL',
  'CONFERENCE',
]);

function sessionCookieOptions(env = process.env) {
  const secure =
    env.COOKIE_SECURE === 'true'
      ? true
      : env.COOKIE_SECURE === 'false'
        ? false
        : env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_MS,
  };
}

/** Reject private/link-local literal hosts; require strict Finesse hostnames. */
function isAllowedFinesseUrl(rawUrl, env = process.env) {
  let urlObj;
  try {
    urlObj = new URL(rawUrl);
  } catch {
    return false;
  }
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
  if (host.includes(':')) return false;
  const allowedExactEnv = (env.FINESSE_ALLOWED_HOSTS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (allowedExactEnv.length > 0) {
    return allowedExactEnv.some((h) => host === h || host.endsWith('.' + h));
  }
  const patterns = [/(^|\.)cisco\.com$/i, /(^|\.)lminfosys\.net$/i];
  return patterns.some((p) => p.test(host));
}

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

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

/** Public registration is closed in production unless explicitly enabled. */
function isPublicRegistrationAllowed(env = process.env) {
  return (
    env.ALLOW_PUBLIC_REGISTER === 'true' ||
    (env.NODE_ENV !== 'production' && env.ALLOW_PUBLIC_REGISTER !== 'false')
  );
}

/**
 * Email open-relay guard. In production, EMAIL_ALLOW_DOMAINS must be set.
 * Returns { ok: true } or { ok: false, status, error }.
 */
function assertEmailRecipientAllowed(toAddr, env = process.env) {
  const address = String(toAddr || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
    return { ok: false, status: 400, error: 'Invalid recipient email' };
  }
  const domainAllow = (env.EMAIL_ALLOW_DOMAINS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (env.NODE_ENV === 'production' && domainAllow.length === 0) {
    return {
      ok: false,
      status: 503,
      error: 'Email sending is not configured (EMAIL_ALLOW_DOMAINS required)',
    };
  }
  if (domainAllow.length) {
    const domain = address.split('@')[1].toLowerCase();
    if (!domainAllow.includes(domain)) {
      return { ok: false, status: 403, error: 'Recipient domain not allowed' };
    }
  }
  return { ok: true, address };
}

function isFinesseActionAllowed(action) {
  return FINESSE_ALLOWED_ACTIONS.has(String(action || ''));
}

module.exports = {
  SESSION_COOKIE,
  SESSION_MAX_AGE_MS,
  FINESSE_ALLOWED_ACTIONS,
  sessionCookieOptions,
  isAllowedFinesseUrl,
  escapeXml,
  escapeHtml,
  escapeRegExp,
  maskSsnServer,
  sanitizeCallLogPayload,
  isPublicRegistrationAllowed,
  assertEmailRecipientAllowed,
  isFinesseActionAllowed,
};
