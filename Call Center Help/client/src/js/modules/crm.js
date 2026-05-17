// CRM Integration Module - Facade for CRMManager (Legacy Compatibility)
import { showToast } from '../utils/toast.js';
import { crmErrorBoundary, safeExecute } from '../utils/error-boundary.js';
import { crmManager } from './crm/CRMManager.js';

// Module-level state (kept for backward compatibility and tests)
// We sync this with crmManager state
export const moduleState = {
  get isConnected() {
    return crmManager.state.isConnected;
  },
  set isConnected(val) {
    crmManager.state.isConnected = val;
  }, // Allow mutation for tests mocking it

  get accessToken() {
    return crmManager.state.accessToken;
  },
  set accessToken(val) {
    crmManager.state.accessToken = val;
  },

  get currentProvider() {
    return crmManager.state.currentProvider;
  },
  set currentProvider(val) {
    crmManager.setProvider(val);
  },
};

function getElements(doc = document) {
  return {
    connectBtn: doc.getElementById('connect-crm'),
    statusDiv: doc.getElementById('crm-status'),
    providerSelect: doc.getElementById('crm-provider'),

    finesseConfig: doc.getElementById('finesse-config-form'),
    five9Config: doc.getElementById('five9-config-form'),
    salesforceConfig: doc.getElementById('salesforce-config-form'),
    zendeskConfig: doc.getElementById('zendesk-config-form'),
    hubspotConfig: doc.getElementById('hubspot-config-form'),
    dynamicsConfig: doc.getElementById('dynamics-config-form'),

    finesseUrl: doc.getElementById('finesse-url'),
    finesseUsername: doc.getElementById('finesse-username'),
    finessePassword: doc.getElementById('finesse-password'),

    five9Domain: doc.getElementById('five9-domain'),
    five9Username: doc.getElementById('five9-username'),
    five9Password: doc.getElementById('five9-password'),

    salesforceUrl: doc.getElementById('salesforce-url'),
    salesforceConsumerKey: doc.getElementById('salesforce-consumer-key'),
    salesforceConsumerSecret: doc.getElementById('salesforce-consumer-secret'),
    salesforceUsername: doc.getElementById('salesforce-username'),
    salesforcePassword: doc.getElementById('salesforce-password'),

    zendeskSubdomain: doc.getElementById('zendesk-subdomain'),
    zendeskApiToken: doc.getElementById('zendesk-api-token'),
    zendeskEmail: doc.getElementById('zendesk-email'),

    hubspotApiKey: doc.getElementById('hubspot-api-key'),

    dynamicsUrl: doc.getElementById('dynamics-url'),
    dynamicsClientId: doc.getElementById('dynamics-client-id'),
    dynamicsClientSecret: doc.getElementById('dynamics-client-secret'),
    dynamicsTenantId: doc.getElementById('dynamics-tenant-id'),
  };
}

// Re-export specific connect functions for backward compatibility/tests
// We delegate these to the general connect flow but populate config map manually
export async function connectToFinesse(doc = document) {
  const el = getElements(doc);
  const config = {
    finesseUrl: el.finesseUrl?.value,
    finesseUsername: el.finesseUsername?.value,
    finessePassword: el.finessePassword?.value,
  };
  crmManager.setProvider('finesse');
  await crmManager.connect(config);
  updateStatus(doc);
  showToast('Successfully connected to Cisco Finesse!', 'success');
}

export async function connectToFive9(doc = document) {
  const el = getElements(doc);
  const config = {
    five9Domain: el.five9Domain?.value,
    five9Username: el.five9Username?.value,
    five9Password: el.five9Password?.value,
  };
  crmManager.setProvider('five9');
  await crmManager.connect(config);
  updateStatus(doc);
  showToast('Successfully connected to Five9!', 'success');
}

export async function connectToSalesforce(doc = document) {
  const el = getElements(doc);
  const config = {
    salesforceUrl: el.salesforceUrl?.value,
    salesforceConsumerKey: el.salesforceConsumerKey?.value,
    salesforceConsumerSecret: el.salesforceConsumerSecret?.value,
    salesforceUsername: el.salesforceUsername?.value,
    salesforcePassword: el.salesforcePassword?.value,
  };
  crmManager.setProvider('salesforce');
  await crmManager.connect(config);
  updateStatus(doc);
  showToast('Successfully connected to Salesforce!', 'success');
}

export async function connectToZendesk(doc = document) {
  const el = getElements(doc);
  const config = {
    zendeskSubdomain: el.zendeskSubdomain?.value,
    zendeskApiToken: el.zendeskApiToken?.value,
    zendeskEmail: el.zendeskEmail?.value,
  };
  crmManager.setProvider('zendesk');
  await crmManager.connect(config);
  updateStatus(doc);
  showToast('Successfully connected to Zendesk!', 'success');
}

export async function connectToHubSpot(doc = document) {
  const el = getElements(doc);
  const config = { hubspotApiKey: el.hubspotApiKey?.value };
  crmManager.setProvider('hubspot');
  await crmManager.connect(config);
  updateStatus(doc);
  showToast('Successfully connected to HubSpot!', 'success');
}

export async function connectToDynamics365(doc = document) {
  const el = getElements(doc);
  const config = {
    dynamicsUrl: el.dynamicsUrl?.value,
    dynamicsClientId: el.dynamicsClientId?.value,
    dynamicsClientSecret: el.dynamicsClientSecret?.value,
    dynamicsTenantId: el.dynamicsTenantId?.value,
  };
  crmManager.setProvider('dynamics');
  await crmManager.connect(config);
  updateStatus(doc);
  showToast('Successfully connected to Microsoft Dynamics 365!', 'success');
}

export function updateProviderConfig(
  currentProvider = crmManager.currentProviderName,
  doc = document
) {
  const el = getElements(doc);
  const panels = [
    el.finesseConfig,
    el.five9Config,
    el.salesforceConfig,
    el.zendeskConfig,
    el.hubspotConfig,
    el.dynamicsConfig,
  ];

  // Hide all
  panels.forEach((p) => {
    if (!p) return;
    p.classList.add('hidden');
    p.setAttribute('aria-hidden', 'true');
    try {
      p.hidden = true;
    } catch {
      /* ignore */
    }
    try {
      p.style.setProperty('display', 'none', 'important');
    } catch {
      /* ignore */
    }
    p.querySelectorAll('input, select, textarea, button').forEach((c) => {
      try {
        c.disabled = true;
      } catch {
        /* ignore */
      }
    });
  });

  // Show active
  let activePanel = null;
  switch (currentProvider) {
    case 'finesse':
      activePanel = el.finesseConfig;
      break;
    case 'five9':
      activePanel = el.five9Config;
      break;
    case 'salesforce':
      activePanel = el.salesforceConfig;
      break;
    case 'zendesk':
      activePanel = el.zendeskConfig;
      break;
    case 'hubspot':
      activePanel = el.hubspotConfig;
      break;
    case 'dynamics':
      activePanel = el.dynamicsConfig;
      break;
  }

  if (activePanel) {
    activePanel.classList.remove('hidden');
    activePanel.removeAttribute('aria-hidden');
    try {
      activePanel.hidden = false;
    } catch {
      /* ignore */
    }
    try {
      activePanel.style.removeProperty('display');
    } catch {
      /* ignore */
    }
    activePanel
      .querySelectorAll('input, select, textarea, button')
      .forEach((c) => {
        try {
          c.disabled = false;
        } catch {
          /* ignore */
        }
      });
  }
}

export function updateStatus(doc = document) {
  const el = getElements(doc);
  if (!el.statusDiv) return;

  const provider = crmManager.currentProviderName;
  const providerNames = {
    finesse: 'Cisco Finesse',
    five9: 'Five9',
    salesforce: 'Salesforce',
    zendesk: 'Zendesk',
    hubspot: 'HubSpot',
    dynamics: 'Microsoft Dynamics 365',
  };

  const providerName = providerNames[provider] || provider;
  const accessToken = crmManager.state.accessToken;
  const isDemoMode = accessToken && accessToken.startsWith('demo_');

  el.statusDiv.textContent = crmManager.state.isConnected
    ? `Connected to ${providerName}`
    : 'Disconnected';
  el.statusDiv.className = 'status-text';
  el.statusDiv.classList.add(
    crmManager.state.isConnected ? 'connected' : 'disconnected'
  );

  if (el.connectBtn)
    el.connectBtn.textContent = crmManager.state.isConnected
      ? 'Disconnect'
      : 'Connect to CRM';

  // Update demo mode indicator
  const demoIndicator = doc.getElementById('demo-mode-indicator');
  if (demoIndicator) {
    demoIndicator.style.display = isDemoMode ? 'inline-block' : 'none';
  }
}

export function saveConfig(doc = document) {
  // This logic is mostly handled by browser saving inputs or local storage
  // But for the 'crmConfig' object logic in original file:
  const el = getElements(doc);
  const provider = crmManager.currentProviderName;

  // We construct a comprehensive config object but only populate current provider fields
  // This mirrors the original behavior
  const config = {
    finesseUrl: (provider === 'finesse' ? el.finesseUrl?.value : '') || '',
    finesseUsername:
      (provider === 'finesse' ? el.finesseUsername?.value : '') || '',

    five9Domain: (provider === 'five9' ? el.five9Domain?.value : '') || '',
    five9Username: (provider === 'five9' ? el.five9Username?.value : '') || '',

    salesforceUrl:
      (provider === 'salesforce' ? el.salesforceUrl?.value : '') || '',
    salesforceConsumerKey:
      (provider === 'salesforce' ? el.salesforceConsumerKey?.value : '') || '',
    salesforceUsername:
      (provider === 'salesforce' ? el.salesforceUsername?.value : '') || '',

    zendeskSubdomain:
      (provider === 'zendesk' ? el.zendeskSubdomain?.value : '') || '',
    zendeskEmail: (provider === 'zendesk' ? el.zendeskEmail?.value : '') || '',

    hubspotApiKey: '', // Intentionally empty to avoid persisting sensitive key

    dynamicsUrl: (provider === 'dynamics' ? el.dynamicsUrl?.value : '') || '',
    dynamicsClientId:
      (provider === 'dynamics' ? el.dynamicsClientId?.value : '') || '',
    dynamicsTenantId:
      (provider === 'dynamics' ? el.dynamicsTenantId?.value : '') || '',
  };

  if (typeof localStorage !== 'undefined')
    localStorage.setItem('crmConfig', JSON.stringify(config));
}

export function loadSavedConfig(doc = document) {
  const el = getElements(doc);
  let config = {};
  try {
    config = JSON.parse(
      (typeof localStorage !== 'undefined' &&
        localStorage.getItem('crmConfig')) ||
        '{}'
    );
  } catch {
    config = {};
  }

  if (el.finesseUrl) el.finesseUrl.value = config.finesseUrl || '';
  if (el.finesseUsername)
    el.finesseUsername.value = config.finesseUsername || '';
  if (el.five9Domain) el.five9Domain.value = config.five9Domain || '';
  if (el.five9Username) el.five9Username.value = config.five9Username || '';
  if (el.salesforceUrl) el.salesforceUrl.value = config.salesforceUrl || '';
  if (el.salesforceConsumerKey)
    el.salesforceConsumerKey.value = config.salesforceConsumerKey || '';
  if (el.salesforceUsername)
    el.salesforceUsername.value = config.salesforceUsername || '';
  if (el.zendeskSubdomain)
    el.zendeskSubdomain.value = config.zendeskSubdomain || '';
  if (el.zendeskEmail) el.zendeskEmail.value = config.zendeskEmail || '';
  if (el.dynamicsUrl) el.dynamicsUrl.value = config.dynamicsUrl || '';
  if (el.dynamicsClientId)
    el.dynamicsClientId.value = config.dynamicsClientId || '';
  if (el.dynamicsTenantId)
    el.dynamicsTenantId.value = config.dynamicsTenantId || '';
}

export async function connectCRM(doc = document) {
  return safeExecute(
    async () => {
      const el = getElements(doc);
      if (!el.statusDiv || !el.connectBtn) return;

      if (crmManager.state.isConnected) {
        await crmManager.disconnect();

        // Clear sensitive input fields when disconnecting (legacy behavior)
        const sensitiveFields = [
          doc.getElementById('finesse-password'),
          doc.getElementById('five9-password'),
          doc.getElementById('salesforce-consumer-secret'),
          doc.getElementById('salesforce-password'),
          doc.getElementById('zendesk-api-token'),
          doc.getElementById('hubspot-api-key'),
          doc.getElementById('dynamics-client-secret'),
        ];
        sensitiveFields.forEach((field) => {
          if (field) field.value = '';
        });

        updateStatus(doc);
        showToast('Disconnected from CRM', 'info');
        return;
      }

      // Gather config from DOM
      const fullConfig = {
        finesseUrl: el.finesseUrl?.value,
        finesseUsername: el.finesseUsername?.value,
        finessePassword: el.finessePassword?.value,

        five9Domain: el.five9Domain?.value,
        five9Username: el.five9Username?.value,
        five9Password: el.five9Password?.value,

        salesforceUrl: el.salesforceUrl?.value,
        salesforceConsumerKey: el.salesforceConsumerKey?.value,
        salesforceConsumerSecret: el.salesforceConsumerSecret?.value,
        salesforceUsername: el.salesforceUsername?.value,
        salesforcePassword: el.salesforcePassword?.value,

        zendeskSubdomain: el.zendeskSubdomain?.value,
        zendeskApiToken: el.zendeskApiToken?.value,
        zendeskEmail: el.zendeskEmail?.value,

        hubspotApiKey: el.hubspotApiKey?.value,

        dynamicsUrl: el.dynamicsUrl?.value,
        dynamicsClientId: el.dynamicsClientId?.value,
        dynamicsClientSecret: el.dynamicsClientSecret?.value,
        dynamicsTenantId: el.dynamicsTenantId?.value,
      };

      // Show loading state
      el.connectBtn.disabled = true;
      el.connectBtn.textContent = 'Connecting...';
      el.connectBtn.classList.add('loading');

      try {
        await crmManager.connect(fullConfig);

        // Success
        const providerName = crmManager.currentProviderName;
        // Check for demo mode in result or state
        if (crmManager.state.accessToken?.startsWith('demo_')) {
          showToast(
            `Demo mode enabled for ${providerName} (real API unavailable)`,
            'warning'
          );
        } else {
          showToast(`Successfully connected to ${providerName}!`, 'success');
        }
      } catch (err) {
        console.error('CRM connection failed:', err);
        showToast(
          `Failed to connect to ${crmManager.currentProviderName}: ${err.message}`,
          'error'
        );
      } finally {
        el.connectBtn.disabled = false;
        el.connectBtn.classList.remove('loading');
        updateStatus(doc);
      }
    },
    crmErrorBoundary,
    'connectCRM'
  );
}

export function initializeCRM(doc = document) {
  const el = getElements(doc);

  // Sync provider select with manager
  if (el.providerSelect)
    el.providerSelect.value = crmManager.currentProviderName;

  el.providerSelect?.addEventListener('change', () => {
    crmManager.setProvider(el.providerSelect.value);
    updateProviderConfig(crmManager.currentProviderName, doc);
    updateStatus(doc);
  });

  el.connectBtn?.addEventListener('click', () => connectCRM(doc));

  // Keyboard support
  el.connectBtn?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      connectCRM(doc);
    }
  });

  // Form validation on blur
  const inputs = doc.querySelectorAll(
    '#crm-integration input[required], #crm-integration select[required]'
  );
  inputs.forEach((input) => {
    input.addEventListener('blur', () => {
      input.classList.remove('error');
      const errorMsg = input.parentNode.querySelector('.error-message');
      if (errorMsg) errorMsg.remove();
      if (!input.value.trim()) {
        input.classList.add('error');
        const error = doc.createElement('div');
        error.className = 'error-message';
        error.textContent = `${input.getAttribute('aria-label') || input.name || 'This field'} is required`;
        input.parentNode.appendChild(error);
      }
    });
  });

  // Event listeners for saving config
  const saveTriggers = [
    el.finesseUrl,
    el.finesseUsername,
    el.five9Domain,
    el.five9Username,
    el.salesforceUrl,
    el.salesforceConsumerKey,
    el.salesforceUsername,
    el.zendeskSubdomain,
    el.zendeskEmail,
    el.dynamicsUrl,
    el.dynamicsClientId,
    el.dynamicsTenantId,
  ];
  saveTriggers.forEach((n) => {
    if (n) n.addEventListener('change', () => saveConfig(doc));
  });

  // Passwords blur trigger save (even though saveConfig intentionally ignores them? original code did this)
  const blurTriggers = [
    el.finessePassword,
    el.five9Password,
    el.salesforceConsumerSecret,
    el.salesforcePassword,
    el.zendeskApiToken,
    el.hubspotApiKey,
    el.dynamicsClientSecret,
  ];
  blurTriggers.forEach((n) => {
    if (n) n.addEventListener('blur', () => saveConfig(doc));
  });

  loadSavedConfig(doc);
  updateProviderConfig(crmManager.currentProviderName, doc);
  updateStatus(doc);
}

export const crmConfig = {
  clientId: 'your_client_id_here',
  clientSecret: 'your_client_secret_here',
  redirectUri:
    (typeof window !== 'undefined' ? window.location.origin : '') +
    '/oauth/callback',
  baseUrl: 'https://api.wxcc-us1.cisco.com',
};

export async function lookupContact(searchTerm, searchType = 'phone') {
  return crmManager.lookupContact(searchTerm, searchType);
}

export async function logCallToCRM(callRecord) {
  return crmManager.logCall(callRecord);
}
