/**
 * @jest-environment node
 */
const fs = require('fs');
const path = require('path');

function read(rel) {
  return fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8');
}

describe('Privacy Policy & Terms accuracy', () => {
  const privacy = read('src/privacy.html');
  const terms = read('src/terms.html');

  test('privacy documents session cookie and local-first design', () => {
    expect(privacy).toMatch(/adamas_session/);
    expect(privacy).toMatch(/httpOnly/i);
    expect(privacy).toMatch(/localStorage|local-first|browser/i);
    expect(privacy).toMatch(/2026/);
  });

  test('privacy documents Finesse proxy, Cloudflare, and reCAPTCHA', () => {
    expect(privacy).toMatch(/Finesse/i);
    expect(privacy).toMatch(/Cloudflare/i);
    expect(privacy).toMatch(/reCAPTCHA/i);
  });

  test('privacy does not claim we store nothing', () => {
    expect(privacy.toLowerCase()).not.toMatch(
      /we do not (collect|store) any (personal )?data/
    );
  });

  test('terms cover license, integrations, registration gating, Indiana law', () => {
    expect(terms).toMatch(/self-registration/i);
    expect(terms).toMatch(/Finesse|Twilio|Salesforce/i);
    expect(terms).toMatch(/Indiana/i);
    expect(terms).toMatch(/as is/i);
    expect(terms).toMatch(/2026/);
  });

  test('footers use current copyright year', () => {
    for (const file of [
      'src/index.html',
      'src/privacy.html',
      'src/terms.html',
      'src/contact.html',
      'src/settings.html',
    ]) {
      expect(read(file)).toMatch(/© 2026|\&copy; 2026/);
    }
  });
});

describe('welcome overlay placement (scroll / settings trap)', () => {
  test('welcome-overlay is not nested inside settings-view', () => {
    const html = read('src/index.html');
    const settingsOpen = html.indexOf('id="settings-view"');
    const welcomeOpen = html.indexOf('id="welcome-overlay"');
    expect(settingsOpen).toBeGreaterThan(-1);
    expect(welcomeOpen).toBeGreaterThan(-1);

    // Walk from settings-view open tag; find matching close before welcome
    // by counting div depth starting at settings-view.
    const fromSettings = html.slice(settingsOpen);
    let depth = 0;
    let i = 0;
    let closedAt = -1;
    const tagRe = /<\/?div\b[^>]*>/gi;
    let m;
    while ((m = tagRe.exec(fromSettings))) {
      const isClose = m[0].startsWith('</');
      if (!isClose) depth += 1;
      else {
        depth -= 1;
        if (depth === 0) {
          closedAt = settingsOpen + m.index + m[0].length;
          break;
        }
      }
      // safety
      if (++i > 200000) break;
    }
    expect(closedAt).toBeGreaterThan(settingsOpen);
    expect(welcomeOpen).toBeGreaterThan(closedAt);
  });
});

describe('Facet theme & cache-bust assets present', () => {
  test('Facet gem teal token exists in SCSS variables', () => {
    const vars = read('src/styles/base/_variables.scss');
    expect(vars).toMatch(/0e7490/i);
  });

  test('sw.facet.js exists for cache-bust worker', () => {
    expect(
      fs.existsSync(path.resolve(__dirname, '../src/public/sw.facet.js'))
    ).toBe(true);
  });
});
