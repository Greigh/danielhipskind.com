/**
 * @jest-environment jsdom
 */
import fs from 'fs';
import path from 'path';

describe('client config — never persist / expose secrets', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.resetModules();
  });

  test('stripSecrets removes password/token/apiKey fields on load', async () => {
    localStorage.setItem(
      'user-config',
      JSON.stringify({
        telephony: { provider: 'twilio', authToken: 'SECRET', password: 'p' },
        features: { camera: true },
        push: { vapidPublicKey: 'pub', vapidPrivateKey: 'PRIV' },
        apiKey: 'leak',
      })
    );
    const { config, initializeConfig } = await import(
      '../src/js/utils/config.js'
    );
    initializeConfig();
    expect(config.telephony.provider).toBe('twilio');
    expect(config.telephony.authToken).toBeUndefined();
    expect(config.telephony.password).toBeUndefined();
    expect(config.push.vapidPublicKey).toBe('pub');
    expect(config.push.vapidPrivateKey).toBeUndefined();
    expect(config.apiKey).toBeUndefined();
  });

  test('saveUserConfig does not write secrets back to localStorage', async () => {
    const { config, saveUserConfig, initializeConfig } = await import(
      '../src/js/utils/config.js'
    );
    initializeConfig();
    config.telephony.provider = 'twilio';
    saveUserConfig();
    const stored = JSON.parse(localStorage.getItem('user-config'));
    expect(stored.telephony).toEqual({ provider: 'twilio' });
    expect(JSON.stringify(stored)).not.toMatch(/password|authToken|SECRET/i);
  });
});

describe('webpack DefinePlugin — client bundle must not embed server secrets', () => {
  test('webpack.config only exposes VAPID_PUBLIC_KEY and NODE_ENV', () => {
    const cfgPath = path.resolve(__dirname, '../webpack.config.js');
    const src = fs.readFileSync(cfgPath, 'utf8');
    expect(src).toMatch(/VAPID_PUBLIC_KEY/);
    expect(src).toMatch(/NODE_ENV/);
    // Must not inject these into the browser bundle
    const forbidden = [
      'EMAIL_PASS',
      'JWT_SECRET',
      'MONGODB_URI',
      'TWILIO_TOKEN',
      'TWILIO_AUTH',
      'RECAPTCHA_SECRET',
      'VAPID_PRIVATE',
    ];
    for (const key of forbidden) {
      expect(src).not.toMatch(new RegExp(`['"]${key}['"]`));
    }
  });
});

describe('XSS escaping in high-risk UI modules', () => {
  test('patterns / tasks / knowledge-base / feedback import escapeHtml', () => {
    const files = [
      'patterns.js',
      'tasks.js',
      'knowledge-base.js',
      'feedback.js',
      'department-lookup.js',
    ];
    for (const file of files) {
      const src = fs.readFileSync(
        path.resolve(__dirname, `../src/js/modules/${file}`),
        'utf8'
      );
      expect(src).toMatch(/escapeHtml/);
    }
  });

  test('escapeHtml helper escapes markup', async () => {
    const { escapeHtml } = await import('../src/js/utils/helpers.js');
    expect(escapeHtml('<img src=x onerror=alert(1)>')).toBe(
      '&lt;img src=x onerror=alert(1)&gt;'
    );
  });
});
