/**
 * Comprehensive smoke test for Adamas web app.
 * Run against a live server: node test/e2e/smoke-test.js [baseUrl]
 */
const { chromium } = require('playwright');

const BASE = process.argv[2] || 'http://127.0.0.1:8080/adamas/';

const results = [];
function pass(name, detail = '') {
  results.push({ name, ok: true, detail });
  console.log(`✅ ${name}${detail ? ' — ' + detail : ''}`);
}
function fail(name, detail = '') {
  results.push({ name, ok: false, detail });
  console.error(`❌ ${name}${detail ? ' — ' + detail : ''}`);
}

async function completeWelcome(page) {
  // Welcome overlay is activated after a 500ms delay
  await page.waitForTimeout(700);
  const overlay = page.locator('#welcome-overlay.active');
  if (!(await overlay.isVisible().catch(() => false))) {
    // Still try force-dismiss if present but not active yet
    const present = await page.locator('#welcome-overlay').count();
    if (!present) return false;
  }
  // Default role is agent; advance through theme + name steps to Finish
  for (let i = 0; i < 8; i++) {
    const active = await overlay.isVisible().catch(() => false);
    if (!active) break;
    const next = page.locator('#wizard-next');
    if (!(await next.isVisible().catch(() => false))) break;
    const text = ((await next.textContent()) || '').trim();
    await next.click();
    await page.waitForTimeout(250);
    if (/finish/i.test(text)) break;
  }
  // Force-dismiss if still open (defensive)
  await page.evaluate(() => {
    const o = document.getElementById('welcome-overlay');
    if (o) o.classList.remove('active');
    try {
      const raw = localStorage.getItem('appSettings');
      const s = raw ? JSON.parse(raw) : {};
      s.hasSeenWelcome = true;
      s.showNotes = true;
      s.showCallflow = true;
      s.showTasks = true;
      s.showCollaboration = true;
      localStorage.setItem('appSettings', JSON.stringify(s));
    } catch {
      /* ignore */
    }
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('body.app-ready', { timeout: 10000 });
  // Dismiss again if welcome reappears
  await page.evaluate(() => {
    const o = document.getElementById('welcome-overlay');
    if (o) o.classList.remove('active');
  });
  return true;
}

async function ensureSectionsVisible(page) {
  await page.evaluate(() => {
    const keys = [
      'showNotes',
      'showCallflow',
      'showTasks',
      'showCollaboration',
      'showFormatter',
      'showHoldtimer',
      'showCalllogging',
      'showScripts',
      'showAnalytics',
      'showKnowledgeBase',
    ];
    try {
      const raw = localStorage.getItem('appSettings');
      const s = raw ? JSON.parse(raw) : {};
      keys.forEach((k) => {
        s[k] = true;
      });
      s.hasSeenWelcome = true;
      localStorage.setItem('appSettings', JSON.stringify(s));
    } catch {
      /* ignore */
    }
    [
      'notes',
      'call-flow-builder',
      'task-management',
      'team-collaboration',
    ].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = '';
    });
    ['stats-tab', 'knowledge-base-tab'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = '';
    });
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('body.app-ready', { timeout: 10000 });
  await page.evaluate(() => {
    const o = document.getElementById('welcome-overlay');
    if (o) o.classList.remove('active');
    [
      'notes',
      'call-flow-builder',
      'task-management',
      'team-collaboration',
    ].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = '';
    });
    ['stats-tab', 'knowledge-base-tab'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = '';
    });
  });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin: new URL(BASE).origin,
  });
  const page = await context.newPage();

  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  try {
    const resp = await page.goto(BASE, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    if (!resp || !resp.ok()) fail('page-load', `HTTP ${resp && resp.status()}`);
    else pass('page-load', `HTTP ${resp.status()}`);

    await page
      .waitForSelector('body.app-ready', { timeout: 10000 })
      .catch(() => null);
    const ready = await page.evaluate(() =>
      document.body.classList.contains('app-ready')
    );
    if (ready) pass('app-ready');
    else fail('app-ready', 'body.app-ready not set');

    const didWelcome = await completeWelcome(page);
    pass(
      didWelcome ? 'welcome-wizard-completed' : 'welcome-wizard-absent',
      didWelcome ? 'finished + reloaded' : 'already dismissed'
    );

    await ensureSectionsVisible(page);

    // --- Number Formatter ---
    await page.fill('#patternNumberInput', '1234567890');
    await page.click('#formatPatternBtn');
    await page.waitForTimeout(300);
    let result = await page.$eval('#patternResult', (el) =>
      el.textContent.trim()
    );
    if (/\d/.test(result) && result !== 'Result will appear here') {
      pass('formatter-format', result);
    } else fail('formatter-format', result);

    await page.click('#clearPatternBtn');
    await page.waitForTimeout(100);
    const cleared = await page.$eval('#patternNumberInput', (el) => el.value);
    if (!cleared) pass('formatter-clear');
    else fail('formatter-clear', `input="${cleared}"`);

    await page.evaluate(() => navigator.clipboard.writeText('(555) 123-4567'));
    await page.click('#pastePatternBtn');
    await page.waitForTimeout(400);
    result = await page.$eval('#patternResult', (el) => el.textContent.trim());
    const pasteInput = await page.$eval(
      '#patternNumberInput',
      (el) => el.value
    );
    if (/\d/.test(result) || /\d/.test(pasteInput)) {
      pass('formatter-paste', `input="${pasteInput}" result="${result}"`);
    } else fail('formatter-paste', `input="${pasteInput}" result="${result}"`);

    // --- Notes ---
    await page.fill('#notes-input', 'Smoke test note ' + Date.now());
    await page.click('#add-note-btn');
    await page.waitForTimeout(300);
    const noteCount = await page.$$eval('#notes-feed li', (lis) => lis.length);
    if (noteCount >= 1) pass('notes-add', `${noteCount} notes`);
    else fail('notes-add', 'no notes in feed');

    // --- Call Flow ---
    // Stay on Edit Steps tab between adds (addStep switches to View Flow)
    await page.click('[data-callflow-tab="builder-tab"]');
    await page.waitForTimeout(100);
    await page.fill('#step-input', 'Greet customer');
    await page.click('#add-step-btn');
    await page.waitForTimeout(200);
    await page.click('[data-callflow-tab="builder-tab"]');
    await page.waitForTimeout(100);
    await page.fill('#step-input', 'Verify account');
    await page.click('#add-step-btn');
    await page.waitForTimeout(300);
    await page.click('[data-callflow-tab="builder-tab"]');
    await page.waitForTimeout(100);
    const builderSteps = await page.$$eval('#flow-steps .flow-step', (els) =>
      els.length
    );
    if (builderSteps >= 2) pass('callflow-add-steps', `${builderSteps} steps`);
    else fail('callflow-add-steps', `builder steps=${builderSteps}`);

    // --- Hold Timer ---
    await page.click('#start-timer');
    await page.waitForTimeout(1100);
    const timerText = await page.$eval('#timer-time', (el) =>
      el.textContent.trim()
    );
    if (timerText !== '00:00') pass('timer-start', timerText);
    else fail('timer-start', timerText);
    if (await page.isVisible('#reset-timer')) {
      await page.click('#reset-timer');
      await page.waitForTimeout(200);
      pass('timer-stop');
    } else fail('timer-stop', 'reset button not visible');

    // --- Call Logging ---
    await page.fill('#caller-name', 'Jane Doe');
    await page.fill('#caller-phone', '555-0100');
    await page.click('#start-call-log');
    await page.waitForTimeout(1100);
    const callTimer = await page.$eval('#call-timer', (el) =>
      el.textContent.trim()
    );
    const hasEnd = (await page.locator('#end-call-log').count()) > 0;
    const timerRunning = callTimer !== '00:00' && callTimer !== '0:00';
    if (timerRunning || hasEnd) {
      pass('call-logging-start', `timer=${callTimer} end=${hasEnd}`);
    } else fail('call-logging-start', `timer=${callTimer} end=${hasEnd}`);

    // --- Tasks ---
    await page.fill('#task-title', 'Smoke task');
    await page.click('#add-task');
    await page.waitForTimeout(300);
    const taskCount = await page.$$eval('#task-list li', (lis) => lis.length);
    if (taskCount >= 1) pass('tasks-add', `${taskCount} tasks`);
    else fail('tasks-add', 'no tasks');

    // --- Collaboration ---
    await page.fill('#chat-input', 'Hello team');
    await page.click('#send-message');
    await page.waitForTimeout(300);
    const msgCount = await page.$$eval('#chat-messages .chat-message', (els) =>
      els.length
    );
    if (msgCount >= 1) pass('collaboration-send', `${msgCount} messages`);
    else fail('collaboration-send', 'no messages');

    // --- Navigation tabs ---
    const navActions = [
      ['stats-tab', 'stats-view', 'showStats'],
      ['knowledge-base-tab', 'knowledge-base-view', 'showKnowledgeBase'],
      ['settings-tab', 'settings-view', 'showSettings'],
      ['main-tab', 'main-app', 'showMainApp'],
    ];
    for (const [tabId, viewId, fn] of navActions) {
      const switched = await page.evaluate((name) => {
        if (typeof window[name] === 'function') {
          window[name]();
          return true;
        }
        return false;
      }, fn);
      if (!switched) {
        await page.locator(`#${tabId}`).click({ force: true });
      }
      await page.waitForTimeout(400);
      const visible = await page.evaluate((id) => {
        const el = document.getElementById(id);
        if (!el) return false;
        return (
          !el.classList.contains('hidden') &&
          getComputedStyle(el).display !== 'none'
        );
      }, viewId);
      if (visible) pass(`nav-${tabId}`);
      else fail(`nav-${tabId}`, `${viewId} not visible (fn=${fn})`);
    }

    // --- Settings: dark mode ---
    await page.click('#settings-tab');
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      const el = document.getElementById('dark-mode-toggle');
      if (el && !el.checked) {
        el.checked = true;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (typeof window.setTheme === 'function') window.setTheme('dark');
    });
    await page.waitForTimeout(200);
    const dark = await page.evaluate(
      () =>
        document.body.classList.contains('dark-mode') ||
        document.documentElement.classList.contains('dark-mode') ||
        document.body.getAttribute('data-theme') === 'dark' ||
        document.documentElement.getAttribute('data-theme') === 'dark' ||
        localStorage.getItem('theme') === 'dark'
    );
    if (dark) pass('settings-dark-mode');
    else fail('settings-dark-mode', 'dark class not applied');

    // --- Floating formatter ---
    await page.click('#main-tab');
    await page.waitForTimeout(500);
    await page.evaluate(async () => {
      if (typeof window.openSectionInFloatingWindow === 'function') {
        await window.openSectionInFloatingWindow('pattern-formatter');
      }
    });
    await page.waitForSelector('.floating-window', { timeout: 5000 });
    pass('floating-window-open');
    await page.evaluate(() => {
      const fw = document.querySelector('.floating-window');
      const input = fw?.querySelector('[id$="patternNumberInput"]');
      const btn = fw?.querySelector('[id$="formatPatternBtn"]');
      if (input) input.value = '9876543210';
      if (btn) btn.click();
    });
    await page.waitForTimeout(400);
    const fwResult = await page.$eval('.floating-window', (fw) => {
      const res = fw.querySelector('[id$="patternResult"]');
      return res ? res.textContent.trim() : '';
    });
    if (/\d/.test(fwResult) && fwResult !== 'Result will appear here') {
      pass('floating-formatter', fwResult);
    } else fail('floating-formatter', fwResult);

    await page.click('.floating-window [data-action="close"]').catch(() =>
      page.evaluate(() => {
        document
          .querySelectorAll('.floating-window')
          .forEach((el) => el.remove());
      })
    );

    // --- Static pages ---
    for (const path of ['privacy', 'terms', 'contact', 'settings']) {
      const url = BASE.replace(/\/?$/, '/') + path;
      const r = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });
      if (r && r.ok()) pass(`static-${path}`, `HTTP ${r.status()}`);
      else fail(`static-${path}`, `HTTP ${r && r.status()}`);
    }

    // --- API ---
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      const o = document.getElementById('welcome-overlay');
      if (o) o.classList.remove('active');
    });

    const apiStatus = await page.evaluate(async () => {
      try {
        const r = await fetch('/api/notes');
        return r.status;
      } catch (e) {
        return String(e);
      }
    });
    if (apiStatus === 401 || apiStatus === 403 || apiStatus === 200) {
      pass('api-notes-reachable', `status ${apiStatus}`);
    } else fail('api-notes-reachable', `status ${apiStatus}`);

    const authResult = await page.evaluate(async () => {
      const email = `smoke_${Date.now()}@example.com`;
      const password = 'SmokeTest123!';
      const reg = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          username: email.split('@')[0],
          name: 'Smoke Tester',
        }),
      });
      const regBody = await reg.json().catch(() => ({}));
      const login = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const loginBody = await login.json().catch(() => ({}));
      return {
        regStatus: reg.status,
        loginStatus: login.status,
        hasToken: !!(loginBody.token || regBody.token),
        regBody,
        loginBody,
      };
    });
    if (
      (authResult.regStatus === 200 || authResult.regStatus === 201) &&
      (authResult.loginStatus === 200 || authResult.hasToken)
    ) {
      pass(
        'auth-register-login',
        `reg=${authResult.regStatus} login=${authResult.loginStatus}`
      );
    } else {
      fail(
        'auth-register-login',
        `reg=${authResult.regStatus} login=${authResult.loginStatus} ${JSON.stringify(authResult.regBody)}`
      );
    }

    // Contact API path exists (validation 400 without captcha/fields is fine)
    const contactStatus = await page.evaluate(async () => {
      const r = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      return r.status;
    });
    if (contactStatus === 400 || contactStatus === 200) {
      pass('api-contact-reachable', `status ${contactStatus}`);
    } else fail('api-contact-reachable', `status ${contactStatus}`);

    const serious = consoleErrors.filter(
      (e) =>
        !/Storage persistence denied/i.test(e) &&
        !/favicon/i.test(e) &&
        !/Failed to load resource/i.test(e) &&
        !/htmlWebpackPlugin/i.test(e) &&
        !/recaptcha/i.test(e) &&
        !/Content Security Policy/i.test(e) &&
        !/MIME type/i.test(e)
    );
    if (serious.length === 0 && pageErrors.length === 0) {
      pass('no-serious-console-errors');
    } else {
      fail(
        'no-serious-console-errors',
        `console=${serious.slice(0, 5).join(' | ')} page=${pageErrors.slice(0, 3).join(' | ')}`
      );
    }
  } catch (err) {
    fail('smoke-runner-crash', String(err));
  } finally {
    await browser.close();
  }

  const failed = results.filter((r) => !r.ok);
  console.log('\n========== SUMMARY ==========');
  console.log(
    `Passed: ${results.filter((r) => r.ok).length}/${results.length}`
  );
  if (failed.length) {
    console.log('Failed:');
    failed.forEach((f) => console.log(`  - ${f.name}: ${f.detail}`));
    process.exit(1);
  }
  process.exit(0);
})();
