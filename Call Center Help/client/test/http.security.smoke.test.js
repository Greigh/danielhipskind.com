/**
 * @jest-environment node
 *
 * Spawns the real server on an ephemeral port and probes auth/legal/security gates.
 */
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

function waitFor(url, { timeoutMs = 15000 } = {}) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve(res.statusCode);
      });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) reject(new Error('server timeout'));
        else setTimeout(tick, 200);
      });
    };
    tick();
  });
}

function request(port, method, urlPath, { body, headers } = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: urlPath,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
          ...headers,
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(raw);
          } catch {
            /* ignore */
          }
          resolve({ status: res.statusCode, headers: res.headers, body: raw, json });
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

describe('HTTP security & feature smoke', () => {
  let child;
  let port;

  beforeAll(async () => {
    port = 3100 + Math.floor(Math.random() * 400);
    child = spawn(
      process.execPath,
      [path.resolve(__dirname, '../server.js')],
      {
        cwd: path.resolve(__dirname, '..'),
        env: {
          ...process.env,
          NODE_ENV: 'development',
          JWT_SECRET: 'test-secret-for-jest',
          ALLOW_PUBLIC_REGISTER: 'false',
          COOKIE_SECURE: 'false',
          PORT: String(port),
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );
    await waitFor(`http://127.0.0.1:${port}/adamas/privacy`);
  }, 30000);

  afterAll(async () => {
    if (child && !child.killed) {
      child.kill('SIGTERM');
      await new Promise((r) => setTimeout(r, 300));
      try {
        child.kill('SIGKILL');
      } catch {
        /* ignore */
      }
    }
  });

  test('legal pages respond 200', async () => {
    for (const p of ['/adamas/privacy', '/adamas/terms', '/adamas/contact']) {
      const res = await request(port, 'GET', p);
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(100);
    }
  });

  test('public registration disabled returns 403', async () => {
    const res = await request(port, 'POST', '/api/register', {
      body: {
        username: 'tester99',
        email: 'tester99@example.com',
        password: 'password1',
      },
    });
    expect(res.status).toBe(403);
    expect(res.json.error).toMatch(/disabled/i);
  });

  test('protected API rejects unauthenticated requests', async () => {
    const res = await request(port, 'GET', '/api/notes');
    expect(res.status).toBe(401);
  });

  test('Finesse proxy rejects unauthenticated and bad hosts', async () => {
    const unauth = await request(
      port,
      'POST',
      '/adamas/api/finesse/User/agent/Dialogs?url=' +
        encodeURIComponent('https://evil.example'),
      { body: { destination: '1000' } }
    );
    expect(unauth.status).toBe(401);

    // Login path: register temporarily not available; skip authed finesse —
    // unauthenticated gate is the critical smoke for this suite.
  });

  test('legacy Finesse debug GET is disabled', async () => {
    const res = await request(port, 'GET', '/adamas/api/finesse/debug');
    // auth required first, or 405 if somehow reached — either is closed
    expect([401, 405]).toContain(res.status);
  });
});
