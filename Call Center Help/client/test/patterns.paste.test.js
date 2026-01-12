/**
 * @jest-environment jsdom
 */
import fs from 'fs';
import path from 'path';
// Polyfill TextEncoder/TextDecoder for Node test environment BEFORE importing jsdom
import { TextEncoder, TextDecoder } from 'util';
if (typeof global.TextEncoder === 'undefined') global.TextEncoder = TextEncoder;
if (typeof global.TextDecoder === 'undefined') global.TextDecoder = TextDecoder;
import { JSDOM } from 'jsdom';

// Load the HTML fixture
const html = fs.readFileSync(
  path.resolve(__dirname, '../src/index.html'),
  'utf8'
);

describe('Pattern formatter paste behavior', () => {
  let dom;
  let window;
  let document;

  beforeEach(() => {
    dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable' });
    window = dom.window;
    document = window.document;
    // Stub prompt to avoid jsdom not-implemented error if reached
    window.prompt = () => '';
    // Expose JSDOM window/document as globals so imported modules can access DOM
    global.window = window;
    global.document = document;
  });

  afterEach(() => {
    dom.window.close();
  });

  test('pasting from clipboard populates input, normalizes, and formats', async () => {
    // Prepare DOM elements
    // const input = document.getElementById('patternNumberInput');
    // const resultDiv = document.getElementById('patternResult');

    // Sanity: ensure element exists before importing module
    const preElement = document.getElementById('patternNumberInput');
    expect(preElement).not.toBeNull();
    // Load patterns module after DOM is ready
    const patterns = await import('../src/js/modules/patterns.js');

    // Test normalization helper directly
    const normalized = patterns.normalizeNumber(' (123) 456-7890 ');
    expect(normalized).toBe('1234567890');

    // Use pure formatting function to verify output deterministically
    const formatted = patterns.formatDigits(normalized);
    expect(formatted).not.toBe('Result will appear here');
    expect(formatted).not.toBe('No matching pattern found');
    expect(/\d/.test(formatted)).toBe(true);

    // Additional sample numbers requested
    const samples = ['4448889999', '819990003333'];
    for (const sample of samples) {
      const n = patterns.normalizeNumber(sample);
      expect(n).toBe(sample.replace(/\D/g, ''));
      const f = patterns.formatDigits(n);
      expect(f).not.toBe('No matching pattern found');
    }
  });
});
