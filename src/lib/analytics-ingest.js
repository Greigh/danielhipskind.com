import fs from 'fs';
import path from 'path';

const LOGS_DIR = path.join(process.cwd(), 'logs');

export function getRealIP(req) {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }
  return req.headers.get('cf-connecting-ip') || 'unknown';
}

export function parseAnalyticsPayload(text) {
  if (!text || !text.trim()) return {};
  return JSON.parse(text);
}

export function writeAnalyticsRecord(req, payload) {
  const record = {
    timestamp: new Date().toISOString(),
    ip: getRealIP(req),
    ua: req.headers.get('user-agent') || null,
    path: req.headers.get('referer') || payload.path || payload.data?.path || null,
    referrer: payload.referrer || payload.data?.referrer || null,
    event: payload.event || 'unknown',
    data: payload.data ?? null,
    country: req.headers.get('cf-ipcountry') || null,
    city: req.headers.get('cf-ipcity') || null,
  };

  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }

  const dateKey = new Date().toISOString().slice(0, 10);
  const filename = path.join(LOGS_DIR, `analytics-${dateKey}.log`);
  fs.appendFileSync(filename, JSON.stringify(record) + '\n');

  return record;
}
