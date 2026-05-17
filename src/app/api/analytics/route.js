import { NextResponse } from 'next/server';
import {
  parseAnalyticsPayload,
  writeAnalyticsRecord,
} from '@/lib/analytics-ingest';

export async function POST(req) {
  try {
    const text = await req.text();
    let payload;
    try {
      payload = parseAnalyticsPayload(text);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    writeAnalyticsRecord(req, payload);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
