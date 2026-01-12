/**
 * Legacy/duplicate CRM unit tests — replaced by test/crm.unit.test.js
 *
 * Keeping this file as an explicit skip so older artifacts don't cause
 * duplicate-import / parsing errors in CI while we complete test cleanup.
 */

describe.skip('legacy crm.unit2.test.js - replaced by crm.unit.test.js', () => {
  test('skipped - new tests now live in crm.unit.test.js', () => {
    expect(true).toBe(true);
  });
});
