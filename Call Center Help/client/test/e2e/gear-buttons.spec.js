/**
 * @jest-environment node
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

describe('Gear buttons (open settings) - E2E', () => {
  let browser;
  let page;
  let server;
  let baseUrl;
  const html = fs.readFileSync(
    path.resolve(__dirname, '../../src/index.html'),
    'utf8'
  );

  beforeAll(async () => {
    browser = await chromium.launch();
    page = await browser.newPage();

    const http = require('http');
    server = http
      .createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
      })
      .listen(4205, '127.0.0.1');
    baseUrl = 'http://127.0.0.1:4205/';
  });

  afterAll(async () => {
    await browser.close();
    if (server && server.close) server.close();
  });

  test('hold timer gear button opens settings and scrolls to holdtimer section', async () => {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    // Click the hold-timer open-settings button
    await page.waitForSelector('#hold-timer .open-settings-btn');
    await page.click('#hold-timer .open-settings-btn');
    // Wait for settings view to be visible
    await page.waitForSelector('#settings-view');
    // Wait for target section
    await page.waitForSelector('#settings-view [data-section="holdtimer"]');
    const visible = await page.evaluate(() => {
      const el = document.querySelector(
        '#settings-view [data-section="holdtimer"]'
      );
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      return (
        rect.top >= 0 &&
        rect.bottom <=
          (window.innerHeight || document.documentElement.clientHeight)
      );
    });
    expect(visible).toBe(true);
  }, 20000);

  test('crm gear button opens settings and scrolls to crm section', async () => {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-section="crm"] .open-settings-btn');
    await page.click('[data-section="crm"] .open-settings-btn');
    await page.waitForSelector('#settings-view');
    await page.waitForSelector('#settings-view [data-section="crm"]');
    const visible = await page.evaluate(() => {
      const el = document.querySelector('#settings-view [data-section="crm"]');
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      return (
        rect.top >= 0 &&
        rect.bottom <=
          (window.innerHeight || document.documentElement.clientHeight)
      );
    });
    expect(visible).toBe(true);
  }, 20000);

  test('data management gear button opens settings and scrolls to data-management section', async () => {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector(
      '[data-section="data-management"] .open-settings-btn'
    );
    await page.click('[data-section="data-management"] .open-settings-btn');
    await page.waitForSelector('#settings-view');
    await page.waitForSelector(
      '#settings-view [data-section="data-management"]'
    );
    const visible = await page.evaluate(() => {
      const el = document.querySelector(
        '#settings-view [data-section="data-management"]'
      );
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      return (
        rect.top >= 0 &&
        rect.bottom <=
          (window.innerHeight || document.documentElement.clientHeight)
      );
    });
    expect(visible).toBe(true);
  }, 20000);
});
