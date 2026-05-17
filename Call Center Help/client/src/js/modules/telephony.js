// Telephony Integration Module
// Now a UI wrapper for the unified CRMManager

import { crmManager } from './crm/CRMManager.js';

export function initializeTelephony() {
  setupTelephonyEventListeners();
  renderTelephonyUI();
}

function setupTelephonyEventListeners() {
  // Provider selection change - Managed in CRM Settings now, but we might want to reflect it here
  // or just hide the selector if it exists in the telephony UI.
  const providerSelect = document.getElementById('telephony-provider-select');
  if (providerSelect) {
    // If the element exists, we can sync it or disable it.
    // For now, let's just listen for changes if the user uses this dropdown.
    providerSelect.addEventListener('change', (e) => {
      crmManager.setProvider(e.target.value);
    });
  }

  // Make call button
  const makeCallBtn = document.getElementById('make-call-btn');
  if (makeCallBtn) {
    makeCallBtn.addEventListener('click', async () => {
      const numberInput = document.getElementById('phone-number-input');
      if (numberInput && numberInput.value) {
        try {
          updateCallStatus(`Calling ${numberInput.value}...`);
          const result = await crmManager.makeCall(numberInput.value);
          if (!result.success && result.message) {
            // Handle "Not implemented" or other soft failures
            updateCallStatus(`Call failed: ${result.message}`);
          } else {
            // Success (or promise resolution)
            // Status update usually handled by events, but we can set temp status
          }
        } catch (error) {
          updateCallStatus(`Call failed: ${error.message}`);
        }
      }
    });
  }

  // End call button
  const endCallBtn = document.getElementById('end-call-btn');
  if (endCallBtn) {
    endCallBtn.addEventListener('click', async () => {
      try {
        await crmManager.endCall();
        updateCallStatus('Call ended');
      } catch (error) {
        updateCallStatus(`End call failed: ${error.message}`);
      }
    });
  }
}

function updateCallStatus(status) {
  const statusElement = document.getElementById('call-status');
  if (statusElement) {
    statusElement.textContent = `Status: ${status}`;
  }
}

function renderTelephonyUI() {
  // Set provider selection to match CRM manager
  const providerSelect = document.getElementById('telephony-provider-select');
  if (providerSelect) {
    providerSelect.value = crmManager.currentProviderName;
  }

  // Hide the legacy Finesse config fields if they exist in this section,
  // as they are now in the CRM settings panel.
  const finesseSection = document.getElementById('finesse-config-section');
  if (finesseSection) {
    finesseSection.style.display = 'none';
  }

  updateCallStatus(crmManager.state.isConnected ? 'Connected' : 'Disconnected');
}

// Deprecated/Legacy exports maintained for compatibility if needed, but delegated
export const telephonyState = {
  // Legacy proxy
  get provider() {
    return crmManager.currentProviderName;
  },
  get connected() {
    return crmManager.state.isConnected;
  },
};

export async function makeCall(number) {
  return crmManager.makeCall(number);
}

export async function endCall() {
  return crmManager.endCall();
}

export function getCallHistory() {
  return []; // Call history now managed by call-logging.js or CRM
}
