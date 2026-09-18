/**
 * @jest-environment node
 */
const {
  isAllowedFinesseUrl,
  escapeXml,
  escapeHtml,
  maskSsnServer,
  sanitizeCallLogPayload,
  isPublicRegistrationAllowed,
  assertEmailRecipientAllowed,
  isFinesseActionAllowed,
  sessionCookieOptions,
  SESSION_COOKIE,
} = require('../lib/security');

describe('security helpers — Finesse SSRF allowlist', () => {
  const prev = process.env.FINESSE_ALLOWED_HOSTS;

  afterEach(() => {
    if (prev === undefined) delete process.env.FINESSE_ALLOWED_HOSTS;
    else process.env.FINESSE_ALLOWED_HOSTS = prev;
  });

  test('allows default cisco / lminfosys HTTPS hosts', () => {
    delete process.env.FINESSE_ALLOWED_HOSTS;
    expect(isAllowedFinesseUrl('https://ucce.cisco.com')).toBe(true);
    expect(isAllowedFinesseUrl('https://finesse.lminfosys.net')).toBe(true);
  });

  test('rejects http, localhost, private IPs, and credentialed URLs', () => {
    delete process.env.FINESSE_ALLOWED_HOSTS;
    expect(isAllowedFinesseUrl('http://ucce.cisco.com')).toBe(false);
    expect(isAllowedFinesseUrl('https://localhost')).toBe(false);
    expect(isAllowedFinesseUrl('https://127.0.0.1')).toBe(false);
    expect(isAllowedFinesseUrl('https://192.168.1.10')).toBe(false);
    expect(isAllowedFinesseUrl('https://10.0.0.5')).toBe(false);
    expect(isAllowedFinesseUrl('https://169.254.1.1')).toBe(false);
    expect(isAllowedFinesseUrl('https://user:pass@ucce.cisco.com')).toBe(false);
    expect(isAllowedFinesseUrl('not-a-url')).toBe(false);
  });

  test('rejects attacker finesse.* hosts when using default patterns', () => {
    delete process.env.FINESSE_ALLOWED_HOSTS;
    expect(isAllowedFinesseUrl('https://finesse.evil.example')).toBe(false);
    expect(isAllowedFinesseUrl('https://finesse.attacker.com')).toBe(false);
  });

  test('respects FINESSE_ALLOWED_HOSTS exact allowlist', () => {
    process.env.FINESSE_ALLOWED_HOSTS = 'finesse.mycorp.example,partner.net';
    expect(isAllowedFinesseUrl('https://finesse.mycorp.example')).toBe(true);
    expect(isAllowedFinesseUrl('https://a.partner.net')).toBe(true);
    expect(isAllowedFinesseUrl('https://ucce.cisco.com')).toBe(false);
  });
});

describe('security helpers — XML/HTML escaping', () => {
  test('escapeXml neutralizes injection characters', () => {
    expect(escapeXml(`<Dialog>&"'`)).toBe(
      '&lt;Dialog&gt;&amp;&quot;&apos;'
    );
  });

  test('escapeHtml neutralizes script payloads', () => {
    expect(escapeHtml(`<script>alert("x")</script>`)).toContain('&lt;script&gt;');
    expect(escapeHtml(`a&b`)).toBe('a&amp;b');
  });
});

describe('security helpers — SSN masking & call log sanitize', () => {
  test('masks full SSN to last four', () => {
    expect(maskSsnServer('123-45-6789')).toEqual({
      ssn: '***6789',
      ssnLast4: '6789',
    });
  });

  test('strips privileged fields from call log payload', () => {
    const out = sanitizeCallLogPayload(
      {
        userId: 'attacker',
        password: 'secret',
        twilio: { authToken: 'tok' },
        callerName: 'Pat',
        ssn: '111223333',
      },
      'real-user'
    );
    expect(out.userId).toBe('real-user');
    expect(out.password).toBeUndefined();
    expect(out.twilio).toBeUndefined();
    expect(out.ssn).toBe('***3333');
    expect(out.callerName).toBe('Pat');
  });
});

describe('security helpers — registration & email gates', () => {
  test('registration closed in production by default', () => {
    expect(
      isPublicRegistrationAllowed({ NODE_ENV: 'production' })
    ).toBe(false);
    expect(
      isPublicRegistrationAllowed({
        NODE_ENV: 'production',
        ALLOW_PUBLIC_REGISTER: 'true',
      })
    ).toBe(true);
  });

  test('registration can be closed in development', () => {
    expect(
      isPublicRegistrationAllowed({
        NODE_ENV: 'development',
        ALLOW_PUBLIC_REGISTER: 'false',
      })
    ).toBe(false);
  });

  test('email allowlist fails closed in production when unset', () => {
    const r = assertEmailRecipientAllowed('a@b.com', {
      NODE_ENV: 'production',
    });
    expect(r.ok).toBe(false);
    expect(r.status).toBe(503);
  });

  test('email allowlist rejects non-listed domains', () => {
    const r = assertEmailRecipientAllowed('x@evil.com', {
      NODE_ENV: 'production',
      EMAIL_ALLOW_DOMAINS: 'company.com',
    });
    expect(r.ok).toBe(false);
    expect(r.status).toBe(403);
  });

  test('email allowlist accepts listed domains', () => {
    const r = assertEmailRecipientAllowed('x@company.com', {
      NODE_ENV: 'production',
      EMAIL_ALLOW_DOMAINS: 'company.com',
    });
    expect(r.ok).toBe(true);
  });
});

describe('security helpers — Finesse actions & cookies', () => {
  test('only allowlisted dialog actions', () => {
    expect(isFinesseActionAllowed('ANSWER')).toBe(true);
    expect(isFinesseActionAllowed('DROP')).toBe(true);
    expect(isFinesseActionAllowed('DELETE_EVERYTHING')).toBe(false);
    expect(isFinesseActionAllowed('')).toBe(false);
  });

  test('session cookie is httpOnly with Secure in production', () => {
    expect(SESSION_COOKIE).toBe('adamas_session');
    const prod = sessionCookieOptions({ NODE_ENV: 'production' });
    expect(prod.httpOnly).toBe(true);
    expect(prod.secure).toBe(true);
    expect(prod.sameSite).toBe('lax');
    const local = sessionCookieOptions({
      NODE_ENV: 'development',
      COOKIE_SECURE: 'false',
    });
    expect(local.secure).toBe(false);
  });
});
