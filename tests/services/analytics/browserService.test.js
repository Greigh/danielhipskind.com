import { expect } from 'chai';
import browserService from '../../../server/services/analytics/browserService.js';

describe('BrowserService', () => {
  // Combined test suites
  describe('browser detection', () => {
    const testCases = [
      {
        name: 'Chrome Desktop',
        ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        expected: { name: 'chrome', mobile: false, bot: false },
      },
      // ...more test cases...
    ];

    testCases.forEach(({ name, ua, expected }) => {
      it(`should detect ${name} correctly`, () => {
        const result = browserService.getBrowserInfo(ua);
        expect(result.name).to.equal(expected.name);
        expect(result.mobile).to.equal(expected.mobile);
        expect(result.bot).to.equal(expected.bot);
      });
    });
  });
});
