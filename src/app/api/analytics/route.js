import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Helper to get real IP
function getRealIP(req) {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }

  // In Next.js middleware/edge, ip might be available on req
  // But here in node runtime:
  return 'unknown';
  // Note: For accurate IP in Next.js deployed environment, middleware is often better, or trusting headers configured in next.config.js
}

export async function POST(req) {
  try {
    const payload = await req.json();
    const record = {
      timestamp: new Date().toISOString(),
      ip: getRealIP(req),
      ua: req.headers.get('user-agent'),
      path: req.headers.get('referer') || payload.path,
      event: payload.event || 'unknown',
      data: payload.data || null,
    };

    // Ensure logs dir exists
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const dateKey = new Date().toISOString().slice(0, 10);
    const filename = path.join(logsDir, `analytics-${dateKey}.log`);

    // Append to file
    fs.appendFileSync(filename, JSON.stringify(record) + '\n');

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
