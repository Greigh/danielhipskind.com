import { NextResponse } from 'next/server';
import dns from 'dns/promises';
import net from 'net';

function isPrivateOrLocalIp(ip) {
  const normalized = ip.replace(/^::ffff:/, '');
  if (normalized === '::1' || normalized === '127.0.0.1') return true;
  if (net.isIPv4(normalized)) {
    const parts = normalized.split('.').map(Number);
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    return false;
  }
  if (net.isIPv6(normalized)) {
    const lower = normalized.toLowerCase();
    if (lower === '::' || lower === '::1') return true;
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // ULA
    if (lower.startsWith('fe80')) return true; // link-local
    return false;
  }
  return true;
}

async function assertSafeFinesseUrl(finesseUrl) {
  let parsed;
  try {
    parsed = new URL(finesseUrl);
  } catch {
    throw new Error('Invalid Finesse server URL format');
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Finesse URL must use http or https');
  }

  // Block obvious local hostnames
  const host = parsed.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host === '0.0.0.0' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.localhost')
  ) {
    throw new Error('Finesse URL host is not allowed');
  }

  // If hostname is a literal IP, check it directly
  if (net.isIP(host)) {
    if (isPrivateOrLocalIp(host)) {
      throw new Error('Finesse URL must not target private/local addresses');
    }
    return parsed;
  }

  // Resolve DNS and reject private/local results (SSRF)
  const results = await dns.lookup(host, { all: true, verbatim: true });
  if (!results.length) {
    throw new Error('Unable to resolve Finesse host');
  }
  for (const { address } of results) {
    if (isPrivateOrLocalIp(address)) {
      throw new Error('Finesse URL must not target private/local addresses');
    }
  }

  return parsed;
}

export async function GET(req, { params }) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const finesseUrl = searchParams.get('url');

    if (!finesseUrl) {
      return NextResponse.json(
        { error: 'Finesse server URL is required as "url" query parameter' },
        { status: 400 }
      );
    }

    let parsedBase;
    try {
      parsedBase = await assertSafeFinesseUrl(finesseUrl);
    } catch (e) {
      return NextResponse.json(
        { error: e.message || 'Invalid Finesse server URL' },
        { status: 400 }
      );
    }

    // params.path is an array from [...path]
    const resolved = await params;
    const pathArray = resolved.path || [];
    const apiPath = pathArray
      .map((segment) => encodeURIComponent(String(segment)))
      .join('/');

    if (!apiPath) {
      return NextResponse.json(
        { error: 'API path is required' },
        { status: 400 }
      );
    }

    // Rebuild from validated origin only — prevents path smuggling via finesseUrl
    const finesseApiUrl = `${parsedBase.origin}/finesse/api/${apiPath}`;
    const authHeader = req.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header is required' },
        { status: 401 }
      );
    }

    const response = await fetch(finesseApiUrl, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
        Accept: 'application/xml',
        'User-Agent': 'CallCenterHelper/1.0',
      },
      redirect: 'manual', // do not follow redirects to private IPs
    });

    // Reject redirect targets that could be SSRF via open redirect
    if (response.status >= 300 && response.status < 400) {
      return NextResponse.json(
        { error: 'Finesse redirect responses are not followed' },
        { status: 502 }
      );
    }

    const body = await response.text();

    return new NextResponse(body, {
      status: response.status,
      headers: {
        'Content-Type':
          response.headers.get('content-type') || 'application/xml',
      },
    });
  } catch (err) {
    console.error('Finesse proxy error:', err);
    return NextResponse.json(
      { error: 'Failed to proxy request to Finesse server' },
      { status: 500 }
    );
  }
}
