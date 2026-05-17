import { NextResponse } from 'next/server';

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

    try {
      new URL(finesseUrl);
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid Finesse server URL format' },
        { status: 400 }
      );
    }

    // params.path is an array from [...path]
    const pathArray = params.path || [];
    const apiPath = pathArray.join('/');

    if (!apiPath) {
      return NextResponse.json(
        { error: 'API path is required' },
        { status: 400 }
      );
    }

    const finesseApiUrl = `${finesseUrl}/finesse/api/${apiPath}`;
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
    });

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
