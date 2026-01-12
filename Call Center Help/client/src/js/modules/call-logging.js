// Call Logging Module
import { lookupContact, logCallToCRM, moduleState as crmState } from './crm.js';
import { startHoldTimer } from './timer.js';
import { applyCallLogSettings } from './call-templates.js';
import { showToast } from '../utils/toast.js';
import { showConfirmModal } from '../utils/modal.js';

export function initializeCallLogging() {
  // Initialize call templates first
  try {
    applyCallLogSettings(); // Initialize dynamic fields
  } catch (error) {
    console.warn('Failed to initialize call templates module:', error);
  }

  const startCallBtn = document.getElementById('start-call-log');
  const endCallBtn = document.getElementById('end-call-log');
  const holdCallBtn = document.getElementById('hold-call-btn');
  const saveCallBtn = document.getElementById('save-call-log');
  const callHistoryList = document.getElementById('call-history-list');
  const searchInput = document.getElementById('call-search');
  const filterSelect = document.getElementById('call-filter');
  const analyticsBtn = document.getElementById('show-analytics');
  const exportBtn = document.getElementById('export-calls');
  const callerNameInput = document.getElementById('caller-name');
  const callerPhoneInput = document.getElementById('caller-phone');
  const callTypeSelect = document.getElementById('call-type');
  const callNotesTextarea = document.getElementById('call-notes');
  const callTimer = document.getElementById('call-timer');
  const holdTimerEl = document.getElementById('active-call-hold-badge');
  const totalCallsEl = document.getElementById('total-calls');
  const avgDurationEl = document.getElementById('avg-duration');

  // New Elements for Advanced Features
  const verificationSection = document.getElementById(
    'call-verification-section'
  );
  const sensitiveSection = document.getElementById('call-sensitive-section');
  const templatesContainer = document.getElementById(
    'call-templates-container'
  );
  const templateSelect = document.getElementById('note-template-select');

  const callerAccount = document.getElementById('caller-account');
  const callerSsn = document.getElementById('caller-ssn');

  // Check if required elements exist (only basic ones required, advanced are optional/conditional)
  if (
    !startCallBtn ||
    !endCallBtn ||
    !saveCallBtn ||
    !callHistoryList ||
    !searchInput ||
    !filterSelect ||
    !analyticsBtn ||
    !exportBtn ||
    !callerNameInput ||
    !callerPhoneInput ||
    !callTypeSelect ||
    !callNotesTextarea ||
    !callTimer ||
    !totalCallsEl ||
    !avgDurationEl
  ) {
    return;
  }

  // Apply Settings for Advanced Features
  const settings = window.appSettings || {};
  if (verificationSection)
    verificationSection.style.display = settings.callLoggingVerification
      ? 'block'
      : 'none';
  if (sensitiveSection)
    sensitiveSection.style.display = settings.callLoggingSensitiveFields
      ? 'block'
      : 'none';
  if (templatesContainer)
    templatesContainer.style.display = settings.callLoggingTemplates
      ? 'block'
      : 'none';

  // Render Dynamic Content

  // renderTemplateOptions(); // Removed

  // Listen for realtime settings updates
  window.addEventListener('appSettingsChanged', () => {
    // Re-read visibility settings
    const currentSettings = window.appSettings || {};
    if (verificationSection)
      verificationSection.style.display =
        currentSettings.callLoggingVerification ? 'block' : 'none';
    if (sensitiveSection)
      sensitiveSection.style.display =
        currentSettings.callLoggingSensitiveFields ? 'block' : 'none';
    if (templatesContainer)
      templatesContainer.style.display = currentSettings.callLoggingTemplates
        ? 'block'
        : 'none';

    // renderTemplateOptions(); // Removed to preserve hardcoded options
  });

  let currentCall = null;
  let callHistory = JSON.parse(localStorage.getItem('callHistory')) || [];
  let callTimerInterval = null;
  let holdTimerInterval = null;
  const token = localStorage.getItem('token'); // Simple check for auth
  const isHybridMode = !!token; // If token exists, we are in 'Cloud' mode

  // Load history based on mode
  if (isHybridMode) {
    fetch('/api/calls', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          callHistory = data.map((log) => ({
            ...log,
            id: log._id || log.id, // Ensure we have an ID for frontend logic
          }));
          updateCallHistory();
        }
      })
      .catch((err) => console.error('Failed to load cloud call history:', err));
  } else {
    // Guest mode: load from local storage (already done above)
    updateCallHistory();
  }

  // function renderTemplateOptions() { ... removed ... }

  // Render Dynamic Form Fields based on Settings

  // Helper to get current custom field values
  // Helper to get current custom field values
  function getCustomFieldValues() {
    const data = {};
    const inputs = document.querySelectorAll(
      '.dynamic-field-container input, .dynamic-field-container select, .dynamic-field-container textarea'
    );

    inputs.forEach((el) => {
      const key = el.name || el.id;
      if (!key) return;

      let val;
      if (el.type === 'checkbox') {
        val = el.checked;
      } else {
        val = el.value;
      }
      data[key] = val;
    });
    return data;
  }

  // Helper to clear fields
  function clearCustomFields() {
    const inputs = document.querySelectorAll(
      '.dynamic-field-container input, .dynamic-field-container select, .dynamic-field-container textarea'
    );
    inputs.forEach((el) => {
      if (el.type === 'checkbox') el.checked = false;
      else if (el.tagName === 'SELECT') el.selectedIndex = 0;
      else el.value = '';
    });
  }

  // Helper to populate fields
  function populateCustomFields(data) {
    if (!data) return;
    const inputs = document.querySelectorAll(
      '.dynamic-field-container input, .dynamic-field-container select, .dynamic-field-container textarea'
    );
    inputs.forEach((el) => {
      const key = el.name || el.id;
      let val = data[key];

      // Fallback for legacy data (names might have changed or used different keys)
      if (val === undefined && el.dataset.label) val = data[el.dataset.label];

      if (val !== undefined) {
        if (el.type === 'checkbox') el.checked = !!val;
        else el.value = val;
      }
    });
  }

  function updateCallHistory(filter = 'all', searchTerm = '') {
    callHistoryList.innerHTML = '';

    let filteredCalls = callHistory.filter((call) => {
      const matchesFilter = filter === 'all' || call.callType === filter;
      const matchesSearch =
        !searchTerm ||
        call.callerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        call.callerPhone.includes(searchTerm) ||
        (call.notes &&
          call.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (call.accountNumber && call.accountNumber.includes(searchTerm));

      return matchesFilter && matchesSearch;
    });

    filteredCalls.slice(0, 20).forEach((call) => {
      const li = document.createElement('li');
      li.className = 'call-history-item';

      // const verificationBadges = 0; // Calculated in template now

      li.innerHTML = `
        <div class="call-icon">${getCallIcon(call.callType)}</div>
        <div class="call-info">
          <div class="call-header">
            <strong class="caller-name">${call.callerName}</strong>
            <span class="call-type type-${call.callType}">${call.callType}</span>
            ${call.crmId ? '<span class="crm-badge">CRM</span>' : ''}
            ${(() => {
              // Count verified (boolean true) fields only
              const data = call.customData || call.verification || {};
              const verifiedCount = Object.values(data).filter(
                (v) => v === true || v === 'true'
              ).length;
              return verifiedCount > 0
                ? `<span class="verification-badge" title="Verified ${verifiedCount} items">✓ ${verifiedCount}</span>`
                : '';
            })()}
          </div>
          <div class="call-details">
            <span class="caller-phone">📞 ${call.callerPhone}</span>
            <span class="call-date">📅 ${new Date(call.startTime).toLocaleDateString()}</span>
            <span class="call-time">⏰ ${new Date(call.startTime).toLocaleTimeString()}</span>
            ${call.duration ? `<span class="call-duration">⏱️ ${formatDuration(call.duration)}</span>` : ''}
          </div>
          ${call.notes ? `<div class="call-notes-preview">${call.notes.substring(0, 100)}${call.notes.length > 100 ? '...' : ''}</div>` : ''}
        </div>
        <div class="call-actions">
          <button class="action-btn btn-edit" data-id="${call.id}" title="Edit Call">
            <span class="btn-icon">✏️</span>
          </button>
          <button class="action-btn btn-delete" data-id="${call.id}" title="Delete Call">
            <span class="btn-icon">🗑️</span>
          </button>
        </div>
      `;

      // Add event listeners
      li.querySelector('.btn-edit').addEventListener('click', () =>
        editCall(call)
      );
      li.querySelector('.btn-delete').addEventListener('click', () =>
        deleteCall(call.id)
      );

      callHistoryList.appendChild(li);
    });

    updateStats();
  }

  function getCallIcon(type) {
    const icons = {
      inbound: '📥',
      outbound: '📤',
      internal: '🏢',
      transfer: '🔄',
      callback: '📞',
    };
    return icons[type] || '📞';
  }

  function formatDuration(durationMs) {
    const minutes = Math.floor(durationMs / 1000 / 60);
    const seconds = Math.floor((durationMs / 1000) % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  function updateStats() {
    const totalCalls = callHistory.length;
    const totalDuration = callHistory.reduce(
      (sum, call) => sum + (call.duration || 0),
      0
    );
    const avgDuration = totalCalls > 0 ? totalDuration / totalCalls : 0;

    totalCallsEl.textContent = totalCalls;
    avgDurationEl.textContent = formatDuration(avgDuration);
  }

  function startCall() {
    const callerName = callerNameInput.value.trim();
    const callerPhone = callerPhoneInput.value.trim();
    // const callType = callTypeSelect.value;

    if (!callerName || !callerPhone) {
      showToast('Please enter caller name and phone number', 'error');
      return;
    }

    // Initialize call object
    currentCall = {
      id: Date.now(),
      callerName: callerNameInput.value,
      callerPhone: callerPhoneInput.value,
      callType: callTypeSelect.value,
      startTime: new Date(),
      notes: '',
      status: 'active',

      // Initialize Advanced Data
      customData: getCustomFieldValues(),
      accountNumber: callerAccount ? callerAccount.value : '',
      ssn: callerSsn ? callerSsn.value : '',
    };

    startCallBtn.disabled = true;
    endCallBtn.disabled = false;
    saveCallBtn.disabled = true;
    if (holdCallBtn) holdCallBtn.disabled = false;

    // Start timer
    updateCallTimer();
    callTimerInterval = setInterval(updateCallTimer, 1000);

    // Auto-start hold timer if enabled
    if (window.appSettings && window.appSettings.timerAutoStart) {
      startHoldTimer();
    }

    // Auto-save notes and other fields
    setInterval(() => {
      if (currentCall && currentCall.status === 'active') {
        currentCall.notes = callNotesTextarea.value;
        // Update live values
        currentCall.customData = getCustomFieldValues();
        if (callerAccount) currentCall.accountNumber = callerAccount.value;
        if (callerSsn) currentCall.ssn = callerSsn.value;
      }
    }, 5000);

    // Trigger CRM lookup if connected
    if (crmState.isConnected) {
      performContactLookup(callerPhone);
    }

    showToast('Call started', 'success');
  }

  function updateCallTimer() {
    if (!currentCall) return;

    // Continuous Wall Clock Timer (Total Elapsed Time)
    // Does NOT pause on hold anymore per user request
    const now = Date.now();
    const duration = now - currentCall.startTime;
    callTimer.textContent = formatDuration(duration);
  }

  function updateHoldTimer() {
    if (!currentCall || !currentCall.holdStartTime) return;
    const now = Date.now();
    const currentHoldDuration = now - currentCall.holdStartTime;
    if (holdTimerEl)
      holdTimerEl.textContent = `Hold: ${formatDuration(currentHoldDuration)}`;
  }

  function toggleHold() {
    if (!currentCall || !holdCallBtn) return;

    if (currentCall.status === 'active') {
      // Start Hold
      currentCall.status = 'on-hold';
      currentCall.holdStartTime = Date.now();
      holdCallBtn.innerHTML = '▶️ Resume';
      holdCallBtn.classList.add('holding');
      // callTimer no longer pauses visually
      // callTimer.classList.add('timer-paused');

      // Show and start Hold Timer
      if (holdTimerEl) {
        holdTimerEl.style.display = 'block';
        updateHoldTimer();
        holdTimerInterval = setInterval(updateHoldTimer, 1000);
      }

      showToast('Call placed on hold', 'info');
    } else if (currentCall.status === 'on-hold') {
      // Resume
      const holdDuration = Date.now() - currentCall.holdStartTime;
      currentCall.totalHoldDuration =
        (currentCall.totalHoldDuration || 0) + holdDuration;
      currentCall.holdStartTime = null;
      currentCall.status = 'active';

      // Stop and hide Hold Timer
      if (holdTimerInterval) clearInterval(holdTimerInterval);
      if (holdTimerEl) holdTimerEl.style.display = 'none';

      holdCallBtn.innerHTML = '⏸️ Hold';
      holdCallBtn.classList.remove('holding');
      // callTimer.classList.remove('timer-paused');
      showToast('Call resumed', 'success');

      updateCallTimer();
    }
  }

  function endCall() {
    if (currentCall) {
      clearInterval(callTimerInterval);
      if (holdTimerInterval) clearInterval(holdTimerInterval);

      // If ending while on hold, add final hold segment
      if (currentCall.status === 'on-hold') {
        const holdDuration = Date.now() - currentCall.holdStartTime;
        currentCall.totalHoldDuration =
          (currentCall.totalHoldDuration || 0) + holdDuration;
      }

      currentCall.endTime = new Date();
      // Duration = (End - Start) - TotalHold
      currentCall.duration =
        currentCall.endTime -
        currentCall.startTime -
        (currentCall.totalHoldDuration || 0);
      currentCall.status = 'completed';

      // Format Notes with Headers
      const holdTimeStr = currentCall.totalHoldDuration
        ? formatDuration(currentCall.totalHoldDuration)
        : '00:00';
      const acctStr = callerAccount ? callerAccount.value : 'N/A';
      const ssnVal = callerSsn ? callerSsn.value : '';
      const ssnStr = ssnVal ? `***${ssnVal.slice(-4)}` : 'N/A';

      const headerBlock = `Hold Time: ${holdTimeStr}\nAccount #: ${acctStr}\nSSN: ${ssnStr}\n\n`;

      // Avoid duplicating if already present (e.g. multiple saves?)
      if (!currentCall.notes.startsWith('Hold Time:')) {
        currentCall.notes = headerBlock + currentCall.notes;
      }

      saveCall(currentCall); // Delegate saving to saveCall function

      // Reset UI
      currentCall = null;
      startCallBtn.disabled = false;
      endCallBtn.disabled = false;
      saveCallBtn.textContent = 'Save Call Log'; // Reset button text
      callTimer.textContent = '00:00';
      if (holdCallBtn) {
        holdCallBtn.disabled = true;
        holdCallBtn.innerHTML = '⏸️ Hold';
        holdCallBtn.classList.remove('holding');
        if (holdTimerEl) holdTimerEl.style.display = 'none';
      }
      clearForm(); // Clear form after saving
      showToast('Call ended and saved', 'success');
    }
  }

  function saveCall(callToSave = null) {
    let callRecord;

    if (callToSave) {
      // This is an active call being completed or updated
      callRecord = { ...callToSave }; // Clone to ensure immutability if needed

      // Log call to CRM if connected
      if (crmState.isConnected) {
        logCallToCRM(callRecord)
          .then((result) => {
            if (result.success) {
              callRecord.crmId = result.id;
              // Update the call in history with CRM ID
              updateCallInHistory(callRecord); // Refactored to helper
              showToast('Call logged to CRM successfully', 'success');
            }
          })
          .catch((error) => {
            console.error('Failed to log call to CRM:', error);
            showToast('Failed to log call to CRM', 'error');
          });
      }

      // Update existing call or add new if it's a completed active call
      updateCallInHistory(callRecord, true);
    } else {
      // Manual log or update of a historical call from the form
      // Get Custom Field Data
      const customFieldData = getCustomFieldValues();

      // Create new call record
      callRecord = {
        id: currentCall ? currentCall.id : Date.now(), // Use existing ID if editing, otherwise new
        callerName: callerNameInput.value,
        callerPhone: callerPhoneInput.value,
        callType: callTypeSelect.value,
        startTime: currentCall ? currentCall.startTime : new Date(),
        endTime: currentCall ? currentCall.endTime : new Date(),
        duration: currentCall ? currentCall.duration : 0,
        notes: callNotesTextarea.value,
        status: currentCall ? currentCall.status : 'completed', // Manual logs are completed

        // Advanced Data
        customData: customFieldData,
        accountNumber: callerAccount ? callerAccount.value : '',
        ssn: callerSsn ? callerSsn.value : '',
      };

      // Format Manual Notes
      const acctStr = callRecord.accountNumber || 'N/A';
      const ssnVal = callRecord.ssn;
      const ssnStr = ssnVal ? `***${ssnVal.slice(-4)}` : 'N/A';
      // Manual logs don't usually track hold time unless we add input. Assume 0 or N/A.
      // Or if editing an existing call, preserve hold time?
      const holdTimeStr =
        currentCall && currentCall.totalHoldDuration
          ? formatDuration(currentCall.totalHoldDuration)
          : '00:00';

      const headerBlock = `Hold Time: ${holdTimeStr}\nAccount #: ${acctStr}\nSSN: ${ssnStr}\n\n`;
      if (!callRecord.notes.startsWith('Hold Time:')) {
        callRecord.notes = headerBlock + callRecord.notes;
      }

      updateCallInHistory(callRecord, true);
      clearForm(); // Clear form after manual save/update
    }
  }

  // Helper to handle updating Call History (Local or Cloud)
  function updateCallInHistory(callRecord, showSuccessToast = false) {
    // Check if updating existing
    const existingIndex = callHistory.findIndex((c) => c.id === callRecord.id);
    const isNew = existingIndex === -1;

    // Apply to local state first for instant UI update
    if (!isNew) {
      callHistory[existingIndex] = callRecord;
    } else {
      callHistory.unshift(callRecord);
    }
    updateCallHistory(); // Update UI immediately

    // Persist
    const token = localStorage.getItem('token');
    if (token) {
      // Cloud Mode
      // const method = isNew ? 'POST' : 'PUT';
      // const url = isNew ? '/api/calls' : `/api/calls/${callRecord.id}`;
      // If it was a mongo ID (string), use it. If number (timestamp), existing backend might need _id.
      // However, for new POST, we don't send ID in URL.
      // For PUT, we need a valid ID. If it's a local timestamp ID and we try to PUT to server, it will fail 404.
      // Sync Issue Strategy:
      // If we created a call LOCALLY (e.g. before login) and then logged in?
      // We only sync from server on load. If we create new while logged in, it works.
      // If we edit an old local call while logged in? It won't have a Mongo _id.
      // Ideally we should disable editing local calls when logged in, or create a copy.
      // For this scope: We assume user starts fresh or we handle 'Not Found' by Creating new.

      // If ID is numeric (local timestamp), treat as NEW POST if we are trying to update?
      // Actually, simplified: Always POST if ID looks local (number)?
      // Start with standard logic:

      // Note: To make PUT work with Mongo, we need the valid Mongo _id.
      // If callRecord.id is a timestamp, we can't PUT to /api/calls/:timestamp.
      // We should probably just POST it as a new log if it doesn't have a Mongo ID.

      const isMongoId =
        typeof callRecord.id === 'string' && callRecord.id.length === 24;

      if (isNew || !isMongoId) {
        fetch('/api/calls', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(callRecord),
        })
          .then((res) => res.json())
          .then((savedLog) => {
            // Update local record with real server ID
            callRecord.id = savedLog._id;
            callRecord._id = savedLog._id;
            // Re-render to ensure buttons have correct ID
            updateCallHistory();
            if (showSuccessToast) showToast(`Call logged to cloud`, 'success');
          })
          .catch(() => showToast('Failed to save to cloud', 'error'));
      } else {
        // Update existing valid Mongo ID
        fetch(`/api/calls/${callRecord.id}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(callRecord),
        }).then(() => {
          if (showSuccessToast) showToast('Call log updated', 'success');
        });
      }
    } else {
      // Local Mode
      localStorage.setItem('callHistory', JSON.stringify(callHistory));
      if (showSuccessToast)
        showToast(
          isNew ? 'Call logged locally' : 'Call log updated',
          'success'
        );
    }
  }

  function clearForm() {
    currentCall = null;
    callerNameInput.value = '';
    callerPhoneInput.value = '';
    callTypeSelect.value = 'inbound';
    callNotesTextarea.value = '';

    // Clear Custom Fields
    clearCustomFields();
    if (callerAccount) callerAccount.value = '';
    if (callerSsn) callerSsn.value = '';

    callTimer.textContent = '00:00';
    startCallBtn.disabled = false;
    endCallBtn.disabled = true;
    saveCallBtn.textContent = 'Save Call Log';
    if (holdCallBtn) {
      holdCallBtn.disabled = true;
      holdCallBtn.innerHTML = '⏸️ Hold';
      holdCallBtn.classList.remove('holding');
      if (holdTimerEl) holdTimerEl.style.display = 'none';
    }

    // Remove CRM info if present
    const contactInfo = document.getElementById('contact-info-display');
    if (contactInfo) contactInfo.remove();
  }

  function editCall(call) {
    currentCall = { ...call }; // Clone to avoid direct mutation issues until save

    callerNameInput.value = call.callerName;
    callerPhoneInput.value = call.callerPhone;
    callTypeSelect.value = call.callType;
    callNotesTextarea.value = call.notes || '';

    // Populate advanced fields
    populateCustomFields(call.customData || call.verification);

    if (callerAccount) callerAccount.value = call.accountNumber || '';
    if (callerSsn) callerSsn.value = call.ssn || '';

    // Scroll to form
    document
      .querySelector('.call-log-form')
      .scrollIntoView({ behavior: 'smooth' });

    // Update UI state
    saveCallBtn.textContent = 'Update Call Log';
    startCallBtn.disabled = true; // Cannot start new call while editing

    showToast('Call loaded for editing', 'info');
  }

  async function deleteCall(id) {
    const confirmed = await showConfirmModal({
      title: 'Delete Call Log?',
      message:
        'Are you sure you want to delete this call log? This action cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
    });

    if (confirmed) {
      // Optimistic update
      callHistory = callHistory.filter((call) => call.id !== id);
      updateCallHistory();

      const token = localStorage.getItem('token');
      if (token) {
        // Cloud Delete
        // Check if it's a real server ID
        if (typeof id === 'string' && id.length === 24) {
          fetch(`/api/calls/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          })
            .then(() => showToast('Call deleted from cloud', 'success'))
            .catch(() => showToast('Failed to delete from cloud', 'error'));
        } else {
          // It was a local-only log that got mixed in? Just ignore server.
          showToast('Call deleted', 'success');
        }
      } else {
        // Local Delete
        localStorage.setItem('callHistory', JSON.stringify(callHistory));
        showToast('Call deleted', 'success');
      }
    }
  }

  function performContactLookup(phoneNumber) {
    if (!phoneNumber || !crmState.isConnected) return;

    lookupContact(phoneNumber, 'phone')
      .then((contacts) => {
        if (contacts && contacts.length > 0) {
          const contact = contacts[0];
          if (!callerNameInput.value.trim()) {
            callerNameInput.value = contact.name || '';
          }
          if (currentCall) {
            currentCall.contactId = contact.id;
            currentCall.contactSource = contact.source;
          }
          showContactInfo(contact);
        }
      })
      .catch((error) => {
        console.log('Contact lookup failed:', error.message);
      });
  }

  function showContactInfo(contact) {
    let contactInfo = document.getElementById('contact-info-display');
    if (!contactInfo) {
      contactInfo = document.createElement('div');
      contactInfo.id = 'contact-info-display';
      contactInfo.className = 'contact-info-display';
      document.querySelector('.call-log-form').appendChild(contactInfo);
    }

    contactInfo.innerHTML = `
      <div class="contact-card">
        <div class="contact-header">
          <div class="contact-icon">👤</div>
          <div class="contact-title">
            <h4>CRM Contact Found</h4>
            <span class="contact-source">Source: ${contact.source}</span>
          </div>
        </div>
        <div class="contact-details">
          <div class="contact-name">${contact.name}</div>
          <div class="contact-company">${contact.company || 'N/A'}</div>
          <div class="contact-email">${contact.email || 'N/A'}</div>
        </div>
      </div>
    `;
  }

  function showAnalytics() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content analytics-modal">
        <div class="modal-header">
          <h3>Call Analytics</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="analytics-grid">
            <div class="analytics-card">
              <h4>Total Calls</h4>
              <div class="metric">${callHistory.length}</div>
            </div>
            <div class="analytics-card">
              <h4>Average Duration</h4>
              <div class="metric">${formatDuration(callHistory.reduce((sum, call) => sum + (call.duration || 0), 0) / Math.max(callHistory.length, 1))}</div>
            </div>
            <div class="analytics-card">
              <h4>Inbound Calls</h4>
              <div class="metric">${callHistory.filter((call) => call.callType === 'inbound').length}</div>
            </div>
            <div class="analytics-card">
              <h4>Outbound Calls</h4>
              <div class="metric">${callHistory.filter((call) => call.callType === 'outbound').length}</div>
            </div>
          </div>
          <div class="analytics-chart">
            <h4>Calls by Type</h4>
            <div class="chart-placeholder">Chart visualization would go here</div>
          </div>
        </div>
      </div>
    `;

    modal
      .querySelector('.modal-close')
      .addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    document.body.appendChild(modal);
  }

  function showFullHistoryModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
      <div class="modal history-modal">
        <div class="modal-header">
          <h3>Full Call History</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
            <div class="history-filters">
                <input type="text" id="full-history-search" placeholder="Search phone, name, notes...">
            </div>
            <div id="full-history-list">
                <!-- List -->
            </div>
        </div>
      </div>
    `;

    const listContainer = modal.querySelector('#full-history-list');
    const searchInput = modal.querySelector('#full-history-search');

    function renderList(search = '') {
      listContainer.innerHTML = '';
      const filtered = callHistory.filter((call) => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (
          (call.callerName && call.callerName.toLowerCase().includes(s)) ||
          (call.callerPhone && call.callerPhone.includes(s)) ||
          (call.notes && call.notes.toLowerCase().includes(s)) ||
          (call.accountNumber && call.accountNumber.includes(s))
        );
      });

      if (filtered.length === 0) {
        listContainer.innerHTML =
          '<div class="no-results" style="text-align:center; padding: 2rem; color: var(--text-muted);">No calls found.</div>';
        return;
      }

      filtered.forEach((call) => {
        const div = document.createElement('div');
        div.className = 'history-item-full';
        div.innerHTML = `
                <div class="item-header">
                    <div>
                        <strong>${call.callerName || 'Unknown'}</strong>
                        ${call.crmId ? '<span class="crm-badge" style="font-size:0.75em; margin-left:0.5rem; background:var(--success); color:white; padding:1px 4px; border-radius:2px;">CRM</span>' : ''}
                    </div>
                    <span class="date">${new Date(call.startTime).toLocaleString()}</span>
                </div>
                <div class="item-meta">
                    <span>📞 ${call.callerPhone}</span>
                    <span>⏱️ ${call.duration ? formatDuration(call.duration) : '0:00'}</span>
                    <span class="call-type type-${call.callType}">${call.callType}</span>
                </div>
                <div class="item-notes">${call.notes || 'No notes'}</div>
             `;
        listContainer.appendChild(div);
      });
    }

    renderList();

    searchInput.addEventListener('input', (e) => renderList(e.target.value));

    modal
      .querySelector('.modal-close')
      .addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    document.body.appendChild(modal);
  }

  function exportCalls() {
    const csvContent = [
      [
        'Caller Name',
        'Phone',
        'Type',
        'Start Time',
        'Duration',
        'Notes',
        'Account',
        'SSN',
        'Verified',
        'CRM ID',
      ],
      ...callHistory.map((call) => {
        const verified = call.verification
          ? Object.keys(call.verification)
              .filter((k) => call.verification[k])
              .join('|')
          : '';
        return [
          call.callerName,
          call.callerPhone,
          call.callType,
          new Date(call.startTime).toLocaleString(),
          call.duration ? formatDuration(call.duration) : '',
          call.notes || '',
          call.accountNumber || '',
          call.ssn ? '***' : '', // Mask SSN in export
          verified,
          call.crmId || '',
        ];
      }),
    ]
      .map((row) => row.map((field) => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `call-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('Call history exported successfully', 'success');
  }

  // Event listeners
  startCallBtn.addEventListener('click', startCall);
  endCallBtn.addEventListener('click', endCall);
  if (holdCallBtn) holdCallBtn.addEventListener('click', toggleHold);
  saveCallBtn.addEventListener('click', saveCall);
  analyticsBtn.addEventListener('click', showAnalytics);
  exportBtn.addEventListener('click', exportCalls);

  searchInput.addEventListener('input', () => {
    updateCallHistory(filterSelect.value, searchInput.value);
  });

  filterSelect.addEventListener('change', () => {
    updateCallHistory(filterSelect.value, searchInput.value);
  });

  callerPhoneInput.addEventListener('blur', () => {
    const phone = callerPhoneInput.value.trim();
    if (phone && crmState.isConnected) {
      performContactLookup(phone);
    }
  });

  // Auto-Note Generation
  function updateAutoNotes() {
    if (!callNotesTextarea) return;

    const autoFields = document.querySelectorAll('[data-auto-note="true"]');
    let autoTextParts = [];

    autoFields.forEach((el) => {
      let val;
      if (el.type === 'checkbox') {
        val = el.checked ? 'Yes' : '';
        // User requested not to log "No"s
      } else {
        val = el.value.trim();
      }

      if (val) {
        const label = el.dataset.label || el.name;
        autoTextParts.push(`${label}: ${val}`);
      }
    });

    if (autoTextParts.length === 0) {
      // If cleared, remove the block
      const current = callNotesTextarea.value;
      const newText = current.replace(
        /^-- Auto Log --\n[\s\S]*?\n----------------\n\n?/,
        ''
      );
      if (newText !== current) {
        callNotesTextarea.value = newText;
      }
      return;
    }

    const autoBlock = `-- Auto Log --\n${autoTextParts.join('\n')}\n----------------\n\n`;

    let current = callNotesTextarea.value;

    if (current.includes('-- Auto Log --')) {
      // Replace existing
      callNotesTextarea.value = current.replace(
        /^-- Auto Log --\n[\s\S]*?\n----------------\n\n?/,
        autoBlock
      );
    } else {
      // Prepend
      callNotesTextarea.value = autoBlock + current;
    }
  }

  // Event delegation for dynamic fields
  document.querySelector('.call-log-form')?.addEventListener('change', (e) => {
    if (e.target.matches('[data-auto-note="true"]')) {
      updateAutoNotes();
    }
  });

  // Input event for text fields (debounce maybe? or just verify logic)
  // 'change' is enough for text inputs (blurs) and selects/checkboxes.
  // 'input' might be too aggressive for textarea updates while typing. 'change' is safer.

  // Template select listener
  if (templateSelect) {
    templateSelect.addEventListener('change', () => {
      const val = templateSelect.value;
      if (val) {
        callNotesTextarea.value += (callNotesTextarea.value ? '\n' : '') + val;
        templateSelect.value = ''; // Reset select
        callNotesTextarea.focus();
      }
    });
  }

  // Initialize View All Button
  const historyHeader = document.querySelector(
    '.call-history-header .history-actions'
  );
  if (historyHeader && !document.getElementById('view-all-history')) {
    const viewAllBtn = document.createElement('button');
    viewAllBtn.id = 'view-all-history';
    viewAllBtn.className = 'button btn-sm btn-icon';
    viewAllBtn.title = 'View All History';
    viewAllBtn.textContent = '📜';
    viewAllBtn.addEventListener('click', showFullHistoryModal);
    historyHeader.appendChild(viewAllBtn);
  }

  // Ensure History List Scroll
  if (callHistoryList) {
    callHistoryList.style.maxHeight = '400px';
    callHistoryList.style.overflowY = 'auto';
    callHistoryList.style.paddingRight = '5px';
  }

  // Initialize
  updateCallHistory();
  updateStats();
}

export function getCallHistory() {
  return JSON.parse(localStorage.getItem('callHistory')) || [];
}
