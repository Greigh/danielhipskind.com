const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

describe('Formatter Paste E2E', () => {
  let browser;
  let page;
  const html = fs.readFileSync(
    path.resolve(__dirname, '../../src/index.html'),
    'utf8'
  );

  beforeAll(async () => {
    browser = await chromium.launch();
    page = await browser.newPage();
  });

  afterAll(async () => {
    await browser.close();
  });

  test('past e2e: clipboard -> paste -> format', async () => {
    // Load the app HTML directly into the page
    await page.setContent(html, { waitUntil: 'domcontentloaded' });

    // Set clipboard content (Playwright API)
    await page.evaluate(() =>
      navigator.clipboard.writeText(' (123) 456-7890 ')
    );

    // Wait for the paste button to be available
    await page.waitForSelector('#pastePatternBtn');
    // Click Paste
    await page.click('#pastePatternBtn');

    // Wait a moment for async paste and formatting
    await page.waitForTimeout(100);

    // Check result text
    const resultText = await page.$eval('#patternResult', (el) =>
      el.textContent.trim()
    );
    expect(resultText).not.toBe('Result will appear here');
    expect(resultText).not.toBe('No matching pattern found');
    expect(/\d/.test(resultText)).toBeTruthy();
  }, 10000);
});
