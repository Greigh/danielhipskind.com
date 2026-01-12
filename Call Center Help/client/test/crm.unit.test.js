/**
 * @jest-environment jsdom
 */
import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

const html = fs.readFileSync(
  path.resolve(__dirname, '../src/settings.html'),
  'utf8'
);

describe('CRM module helpers (unit)', () => {
  let dom, doc;

  beforeEach(() => {
    dom = new JSDOM(html);
    doc = dom.window.document;

    // ensure a basic localStorage stub exists
    if (!global.localStorage) {
      global.localStorage = (function () {
        let s = {};
        return {
          getItem: (k) => (k in s ? s[k] : null),
          setItem: (k, v) => (s[k] = v),
          removeItem: (k) => delete s[k],
          clear: () => (s = {}),
        };
      })();
    }
    // wire window/document globals used by module
    global.window = dom.window;
    global.document = doc;
  });

  afterEach(() => {
    if (dom && dom.window) dom.window.close();
    try {
      global.localStorage.clear();
    } catch {
      // ignore
    }
  });

  test('updateProviderConfig only shows the chosen provider panel', async () => {
    const crm = await import('../src/js/modules/crm.js');
    crm.moduleState.currentProvider = 'five9';
    crm.updateProviderConfig('five9', doc);

    expect(
      doc.getElementById('five9-config-form').classList.contains('hidden')
    ).toBe(false);
    expect(
      doc.getElementById('finesse-config-form').classList.contains('hidden')
    ).toBe(true);
    // ensure hidden panels have inputs disabled and visible one is enabled
    const five9Input = doc.getElementById('five9-domain');
    const finesseInput = doc.getElementById('finesse-url');
    expect(five9Input.disabled).toBe(false);
    expect(finesseInput.disabled).toBe(true);
    // check hidden property + inline style
    expect(doc.getElementById('five9-config-form').hidden).toBe(false);
    expect(doc.getElementById('finesse-config-form').hidden).toBe(true);
    expect(doc.getElementById('finesse-config-form').style.display).toBe(
      'none'
    );
  });

  test('saveConfig writes non-sensitive fields and loadSavedConfig restores them', async () => {
    const crm = await import('../src/js/modules/crm.js');

    const u = doc.getElementById('finesse-url');
    const n = doc.getElementById('finesse-username');
    u.value = 'https://example.finesse';
    n.value = 'tester';

    // ensure the module is saving fields for Finesse
    crm.moduleState.currentProvider = 'finesse';
    crm.saveConfig(doc);

    const saved = JSON.parse(global.localStorage.getItem('crmConfig') || '{}');
    expect(saved.finesseUrl).toBe('https://example.finesse');
    expect(saved.finesseUsername).toBe('tester');

    // now change values and restore
    u.value = '';
    n.value = '';
    crm.loadSavedConfig(doc);
    expect(doc.getElementById('finesse-url').value).toBe(
      'https://example.finesse'
    );
    expect(doc.getElementById('finesse-username').value).toBe('tester');
  });

  test('saveConfig only persists non-sensitive fields for the selected provider', async () => {
    const crm = await import('../src/js/modules/crm.js');

    // Populate several fields across providers
    const finesseUrlInput = doc.getElementById('finesse-url');
    const five9DomainInput = doc.getElementById('five9-domain');
    const salesforceUrlInput = doc.getElementById('salesforce-url');
    const salesforceKeyInput = doc.getElementById('salesforce-consumer-key');
    const hubspotKeyInput = doc.getElementById('hubspot-api-key');

    finesseUrlInput.value = 'https://example.finesse';
    five9DomainInput.value = 'org.five9.com';
    salesforceUrlInput.value = 'https://example.salesforce.com';
    salesforceKeyInput.value = 'CK_12345';
    hubspotKeyInput.value = 'HS_SECRET_KEY';

    // Set current provider to salesforce then save
    crm.moduleState.currentProvider = 'salesforce';
    crm.saveConfig(doc);

    const saved = JSON.parse(global.localStorage.getItem('crmConfig') || '{}');

    // salesforce fields should be present
    expect(saved.salesforceUrl).toBe('https://example.salesforce.com');
    expect(saved.salesforceConsumerKey).toBe('CK_12345');

    // other provider fields should be blank (persist-only-selected)
    expect(saved.finesseUrl).toBe('');
    expect(saved.five9Domain).toBe('');

    // hubspot's API key should not be persisted even when populated
    expect(saved.hubspotApiKey).toBe('');
  });

  test('initializeCRM wires provider selection and persists the choice', async () => {
    global.localStorage.setItem('crmProvider', 'salesforce');
    const crm = await import('../src/js/modules/crm.js');

    // call initializer which will use the DOM
    crm.initializeCRM(doc);
    expect(doc.getElementById('crm-provider').value).toBe('salesforce');
    expect(
      doc.getElementById('salesforce-config-form').classList.contains('hidden')
    ).toBe(false);
    // ensure fields inside salesforce panel are enabled while others are disabled
    expect(doc.getElementById('salesforce-url').disabled).toBe(false);
    expect(doc.getElementById('finesse-url').disabled).toBe(true);
    expect(doc.getElementById('salesforce-config-form').hidden).toBe(false);
    expect(doc.getElementById('finesse-config-form').hidden).toBe(true);
  });
});
