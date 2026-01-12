/* global showMainApp, showSettings */
// Settings management module

import {
  saveData,
  loadData,
  loadPatterns,
  savePatterns,
  loadSteps,
  saveSteps,
  loadNotes,
  saveNotes,
} from './storage.js';
import { initAccountSettings } from './account.js';
import { initSettingsSearch } from './settings-search.js';

// Draggable helpers for per-section controls (allow settings to be draggable/floating like the main page)
import {
  setupDraggable,
  setupFloating,
  setupSectionToggle,
} from './draggable.js';

import { setupThemeToggle } from './themes.js';
import {
  playAlertSound,
  initAudio,
  setRepeatAlertSoundMode,
} from '../utils/audio.js';

// Helper to update slider visual state
function updateSliderVisual(toggle) {
  if (!toggle) return;
  try {
    // Checkbox-based visual: input[type=checkbox] + <span class="toggle-slider"> as visual
    if (toggle.type === 'checkbox') {
      const span = toggle.nextElementSibling;
      const isOn = !!toggle.checked;
      if (span && span.classList) {
        span.classList.toggle('slider-on', isOn);
        span.setAttribute('role', 'switch');
        span.setAttribute('aria-checked', isOn ? 'true' : 'false');
      } else {
        toggle.classList.toggle('slider-on', isOn);
        toggle.setAttribute('aria-pressed', isOn ? 'true' : 'false');
      }
      return;
    }

    // Fallback for legacy range-based sliders
    if (toggle.type === 'range' || toggle.classList.contains('slider-toggle')) {
      if (String(toggle.value) === '1') {
        toggle.classList.add('slider-on');
        toggle.setAttribute('aria-pressed', 'true');
      } else {
        toggle.classList.remove('slider-on');
        toggle.setAttribute('aria-pressed', 'false');
      }
    }
  } catch {
    // noop - defensive
  }
}

// Settings object for most of the app functionality
export let appSettings = {
  hasSeenWelcome: false, // New user flag
  showFormatter: true, // Show formatter on the main page by default
  showCallflow: false, // Hidden by default to reduce clutter
  showNotes: false, // Notes section (default hidden)
  showHoldtimer: true, // Show hold timer on the main page by default
  showCalllogging: true, // Show call logging tool on the main page by default
  showCrm: false, // CRM (default hidden)
  showScripts: true, // Show scripts library (default visible)
  showTasks: false, // Tasks (default hidden)
  showVoicerecording: false, // Voice recording (default hidden)
  showCollaboration: false, // Collaboration (default hidden)
  showWorkflows: false, // Workflows (default hidden)
  showMultichannel: false, // Multichannel (default hidden)
  showFeedback: false, // Feedback (default hidden)
  showKnowledgeBase: false, // Knowledge Base (default hidden)
  showTimeTracking: false, // Time Tracking (default hidden)
  showAdvancedAnalytics: false, // Advanced Analytics (default hidden)
  showAnalytics: false, // Controls the stats/analytics tab visibility
  showApiIntegration: false, // API Integration (default hidden)
  showTwilio: false, // Twilio integration (default hidden)
  showHoldtimerSettings: true, // Show hold timer settings on the main page by default
  showPerformanceMonitoring: false, // Performance monitoring (default hidden)
  showCrmIntegration: false, // CRM integration (default hidden here but hardcoded into the UI)
  showDataManagement: false, // Data Management (default hidden)
  showCamera: false, // Camera settings for CRM (default hidden) [Not implemented]
  showVoiceCommands: false, // Voice commands (default hidden) [Not implemented]
  showTelephony: false, // Telephony (default hidden) [Not implemented]
  showEmail: false, // Email (default hidden) [Not implemented]
  showTraining: false, // Training (default hidden) [Not implemented]
  showQuickActions: true, // Quick Actions Bar (default visible)
  minimalMode: false, // Hide all non-essential sections
  exportPatterns: true, // Export patterns (default enabled)
  exportSteps: true, // Export steps (default enabled)
  exportNotes: true, // Export notes (default enabled)
  exportSettings: true, // Export settings (default enabled)
  enablePopupWindows: false, // Enable popup windows (default disabled)
  popupAlwaysOnTop: true, // Popup windows always on top (default enabled)
  popupWidth: 600, // Popup window width (default 600px)
  popupHeight: 400, // Popup window height (default 400px)
  preferPopupWindows: false, // Prefer popup windows (default disabled)
  timerAutoStart: true, // Timer auto-start (default enabled)
  timerSoundAlerts: true, // Timer sound alerts (default enabled)
  timerWarningTime: 300, // Timer warning time (default 300 seconds)
  timerShowNotifications: false, // Timer show notifications (default disabled)
  timerLogHolds: true, // Timer log holds (default enabled)
  timerCountdownMode: false, // Timer countdown mode (default disabled)
  timerCountdownDuration: 300, // 5 minutes in seconds, default countdown duration
  timerAllowHistoryDeletion: true, // Setting for hold history deletion
  timerAlertSound: 'endgame', // default, can be 'endgame', 'bell', 'towerbell', 'custom'
  timerCustomSoundUrl: '', // Custom sound URL for timer alert
  repeatAlertSound: true, // Setting for repeat alert sound
  customTitles: {}, // Custom titles for sections and settings

  // collapsed setting-items stored as map: { '<sectionKey>::<labelKey>': true }
  collapsedSettingItems: {},
  layoutMode: 'grid', // Layout mode: 'vertical' or 'grid'
  gridColumns: 2,
  gridSpacing: 24,
  savedLayouts: {},
  // Per-view saved layouts (keyed by view id, e.g., 'main-app' or 'settings-view')
  savedLayoutsPerView: {},
  defaultLayout: {
    columns: 2,
    spacing: 24,
    sections: ['formatter', 'call-flow-builder', 'notes', 'hold-timer'],
  },
  multipleTimers: false, // Setting for multiple timers
  multipleNotes: true, // Setting for multiple notes
  maxTimers: 3, // Maximum number of timers
  maxNotes: 3, // Maximum number of notes shown in the UI
  finesse: {
    enabled: false,
    url: '',
    autoConnect: false,
    autoStartTimer: true,

    autoStopTimer: true,
  },
  callLoggingVerification: true,
  callLoggingSensitiveFields: true,
  callLoggingTemplates: true,
  // Customizable Lists
  verificationOptions: ['Name', 'DOB', 'Address', 'Last 4 SSN'],
  noteTemplates: [
    { label: 'Issue/Resolution', text: 'Issue: \\nResolution: ' },
    {
      label: 'General Inquiry',
      text: 'Customer verified. Caller asked about: \\nAdvised: ',
    },
    {
      label: 'Payment Taken',
      text: 'Payment of $ taken via card ending in . Confirmed email: ',
    },
    { label: 'Callback', text: 'Callback scheduled for: \\nReason: ' },
  ],
};

// Export the saveSettings function
let saveTimeout = null;
export function saveSettings() {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('appSettings', JSON.stringify(appSettings));
  }

  // Cloud Persist (Debounced)
  const token = localStorage.getItem('token');
  if (token) {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appSettings),
      }).catch((err) => console.error('Failed to sync settings:', err));
    }, 1000); // 1-second debounce
  }

  // Notify other modules
  window.dispatchEvent(
    new CustomEvent('appSettingsChanged', { detail: appSettings })
  );
}

// ... (omitted code) ...

// Export the loadSettings function
export function loadSettings() {
  return loadData('appSettings', {});
}

export function initializeSettings() {
  // Initialize drag and drop
  setupDraggable();

  // Initialize floating windows (popouts)
  setupFloating();

  // Initialize Account Settings (Profile/Password)
  initAccountSettings();

  // Initialize Settings Search
  initSettingsSearch();

  // Initialize section toggles
  setupSectionToggle();

  const saved = loadSettings();
  if (Object.keys(saved).length > 0) {
    appSettings = { ...appSettings, ...saved };
  }

  // Cloud Fetch
  const token = localStorage.getItem('token');
  if (token) {
    fetch('/api/user/settings', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((remoteSettings) => {
        if (remoteSettings && Object.keys(remoteSettings).length > 0) {
          console.log('Syncing settings from cloud...');
          appSettings = { ...appSettings, ...remoteSettings };
          // Re-apply settings after fetching from cloud
          applySettings();
          window.dispatchEvent(
            new CustomEvent('appSettingsChanged', { detail: appSettings })
          );
        }
      })
      .catch((err) => console.error('Failed to fetch cloud settings:', err));
  }

  // Backward compatibility: synchronize legacy keys
  if (
    typeof appSettings.showCrmIntegration !== 'undefined' &&
    typeof appSettings.showCrm === 'undefined'
  ) {
    appSettings.showCrm = appSettings.showCrmIntegration;
  }
  if (
    typeof appSettings.showDataManagement === 'undefined' &&
    typeof appSettings.settingsDataManagement !== 'undefined'
  ) {
    appSettings.showDataManagement = appSettings.settingsDataManagement;
  }
  applySettings();

  // Initialize repeat alert sound toggle
  if (repeatAlertSoundToggle) {
    repeatAlertSoundToggle.checked =
      appSettings.timerRepeatAlertSound !== false;
  }

  // Check for welcome screen
  checkWelcomeStatus();
}

export function applySettings() {
  // Handle minimal mode - override settings to show only essential sections
  if (appSettings.minimalMode) {
    appSettings.showFormatter = true;
    appSettings.showNotes = true;
    appSettings.showHoldtimer = true;
    appSettings.showCallflow = false;
    appSettings.showCalllogging = false;
    appSettings.showCrm = false;
    appSettings.showScripts = false;
    appSettings.showTasks = false;
    appSettings.showVoicerecording = false;
    appSettings.showCollaboration = false;
    appSettings.showWorkflows = false;
    appSettings.showMultichannel = false;
    appSettings.showFeedback = false;
    appSettings.showKnowledgeBase = false;
    appSettings.showTimeTracking = false;
    appSettings.showAdvancedAnalytics = false;
    appSettings.showAnalytics = false;
    appSettings.showApiIntegration = false;
    appSettings.showTwilio = false;
    appSettings.showPerformanceMonitoring = false;
    appSettings.showCrmIntegration = false;
    appSettings.showDataManagement = false;
    appSettings.showCamera = false;
    appSettings.showVoiceCommands = false;
    appSettings.showTelephony = false;
    appSettings.showEmail = false;
    appSettings.showTraining = false;
  }

  // Set minimal mode toggle
  const minimalModeToggle = document.getElementById('toggle-minimal-mode');
  if (minimalModeToggle) {
    minimalModeToggle.checked = appSettings.minimalMode;
  }

  // Helper to update slider visual state moved to module scope
  // updateSliderVisual moved to module scope

  // Define feature readiness status
  const featureStatus = {
    // Production quality - no label, fully enabled
    formatter: 'production',
    callflow: 'production',
    analytics: 'production',
    notes: 'production',
    holdtimer: 'production',
    calllogging: 'production',
    scripts: 'production',
    tasks: 'production',
    voicerecording: 'production',
    collaboration: 'beta',

    // Partially production quality - add "Beta" label
    workflows: 'beta',
    multichannel: 'beta',
    feedback: 'beta',
    timetracking: 'beta',
    voice: 'beta',
    camera: 'beta',
    telephony: 'production',

    // Not production quality - add "Coming Soon" label and disable
    knowledgebase: 'coming-soon',
    advancedanalytics: 'coming-soon',
    apiintegration: 'production', // Ready for Auth
    email: 'coming-soon',
    training: 'coming-soon',
    twilio: 'production',
    'quick-actions': 'production',

    performanceMonitoring: 'production',
  };

  const toggles = {
    'toggle-formatter': 'formatter',
    'toggle-callflow': 'callflow',
    'toggle-analytics': 'analytics',
    'toggle-notes': 'notes',
    'toggle-holdtimer': 'holdtimer',
    'toggle-calllogging': 'calllogging',
    'toggle-scripts': 'scripts',
    'toggle-tasks': 'tasks',
    'toggle-voicerecording': 'voicerecording',
    'toggle-collaboration': 'collaboration',
    'toggle-workflows': 'workflows',
    'toggle-multichannel': 'multichannel',
    'toggle-feedback': 'feedback',
    'toggle-knowledge-base': 'knowledgebase',
    'toggle-time-tracking': 'timetracking',
    'toggle-advanced-analytics': 'advancedanalytics',
    'toggle-api-integration': 'apiintegration',
    'toggle-camera': 'camera',
    'toggle-crm': 'crm',
    'toggle-data-management': 'data-management',
    'toggle-voice-commands': 'voice',
    'toggle-telephony': 'telephony',
    'toggle-email': 'email',
    'toggle-training': 'training',
    'toggle-twilio': 'twilio',

    'toggle-performance-monitoring': 'performanceMonitoring',
    // Main page toggles
    'main-toggle-formatter': 'formatter',
    'main-toggle-callflow': 'callflow',
    'main-toggle-analytics': 'analytics',
    'main-toggle-notes': 'notes',
    'main-toggle-holdtimer': 'holdtimer',
    'main-toggle-calllogging': 'calllogging',
    'main-toggle-scripts': 'scripts',
    'main-toggle-tasks': 'tasks',
    'main-toggle-voicerecording': 'voicerecording',
    'main-toggle-collaboration': 'collaboration',
    'main-toggle-workflows': 'workflows',
    'main-toggle-multichannel': 'multichannel',
    'main-toggle-feedback': 'feedback',
    'main-toggle-knowledge-base': 'knowledgebase',
    'main-toggle-time-tracking': 'timetracking',
    'main-toggle-advanced-analytics': 'advancedanalytics',
    'main-toggle-api-integration': 'apiintegration',
    'main-toggle-camera': 'camera',
    'main-toggle-crm': 'crm',
    'main-toggle-data-management': 'data-management',
    'main-toggle-voice-commands': 'voice',
    'main-toggle-telephony': 'telephony',
    'main-toggle-email': 'email',
    'main-toggle-training': 'training',
    'main-toggle-twilio': 'twilio',

    'main-toggle-performance-monitoring': 'performanceMonitoring',
    'toggle-quick-actions': 'quick-actions',
    // Call Logging Settings
    'toggle-call-logging-verification': 'callLoggingVerification',
    'toggle-call-logging-sensitive': 'callLoggingSensitiveFields',
    'toggle-call-logging-templates': 'callLoggingTemplates',
  };

  Object.entries(toggles).forEach(([toggleId, section]) => {
    const toggle = document.getElementById(toggleId);
    // Only target sections inside the main app/stats/knowledge/settings views
    const sectionEls = document.querySelectorAll(
      `#main-app [data-section="${section}"], #stats-view [data-section="${section}"], #knowledge-base-view [data-section="${section}"], #settings-view [data-section="${section}"]`
    );
    if (toggle) {
      // Convert section name to setting key
      let settingKey;
      switch (section) {
        case 'knowledgebase':
          settingKey = 'showKnowledgeBase';
          break;
        case 'timetracking':
          settingKey = 'showTimeTracking';
          break;
        case 'advancedanalytics':
          settingKey = 'showAdvancedAnalytics';
          break;
        case 'apiintegration':
          settingKey = 'showApiIntegration';
          break;
        case 'callLoggingVerification':
        case 'callLoggingSensitiveFields':
        case 'callLoggingTemplates':
          settingKey = section;
          break;
        default:
          // Convert hyphenated names like 'data-management' into 'showDataManagement'
          settingKey =
            'show' +
            section
              .split('-')
              .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
              .join('');
      }

      const status = featureStatus[section];

      // Handle labels and disabling based on status
      // Check if this is a settings page toggle or main page toggle
      let labelContainer = null;
      if (toggleId.startsWith('main-toggle-')) {
        // Main page toggle structure
        const toggleItem = toggle.closest('.toggle-item');
        if (toggleItem) {
          labelContainer = toggleItem.querySelector('.toggle-label');
        }
      } else {
        // Settings page toggle structure
        const settingItem = toggle.closest('.setting-item');
        if (settingItem) {
          labelContainer = settingItem.querySelector('.setting-label');
        }
      }

      if (labelContainer) {
        // Remove existing status labels
        const existingLabel = labelContainer.querySelector('.feature-status');
        if (existingLabel) {
          existingLabel.remove();
        }

        // Add appropriate label
        if (status === 'beta') {
          const betaLabel = document.createElement('span');
          betaLabel.className = 'feature-status beta';
          betaLabel.textContent = 'Beta';
          betaLabel.title =
            'This feature is in beta testing - it may have bugs or incomplete functionality';
          labelContainer.appendChild(betaLabel);
        } else if (status === 'coming-soon') {
          const comingSoonLabel = document.createElement('span');
          comingSoonLabel.className = 'feature-status coming-soon';
          comingSoonLabel.textContent = 'Coming Soon';
          comingSoonLabel.title =
            'This feature is under development and will be available in a future update';
          labelContainer.appendChild(comingSoonLabel);
        }
      }

      // Disable toggles for coming-soon features ONLY if they are not already enabled
      if (status === 'coming-soon' && !appSettings[settingKey]) {
        toggle.disabled = true;
        // for range-based sliders use value '0', otherwise uncheck
        if (
          toggle.type === 'range' ||
          toggle.classList.contains('slider-toggle')
        ) {
          try {
            toggle.value = '0';
          } catch {
            /* ignore */
          }
        } else {
          try {
            toggle.checked = false;
          } catch {
            /* ignore */
          }
        }
        // appSettings[settingKey] = false; // Removed to allow advanced features to stay enabled if set

        if (sectionEls && sectionEls.length) {
          sectionEls.forEach((el) => (el.style.display = 'none'));
        }
      } else {
        toggle.disabled = false;
        if (
          toggle.type === 'range' ||
          toggle.classList.contains('slider-toggle')
        ) {
          // Set numeric value for slider toggles
          try {
            toggle.value = appSettings[settingKey] ? '1' : '0';
          } catch {
            /* ignore */
          }
          const isOn = String(toggle.value) === '1';
          if (sectionEls && sectionEls.length) {
            sectionEls.forEach((el) => (el.style.display = isOn ? '' : 'none'));
          }
        } else {
          try {
            toggle.checked = !!appSettings[settingKey];
          } catch {
            /* ignore */
          }
          if (sectionEls && sectionEls.length) {
            sectionEls.forEach(
              (el) => (el.style.display = toggle.checked ? '' : 'none')
            );
          }
        }
      }
      // Ensure visual state for slider toggles
      try {
        updateSliderVisual(toggle);
      } catch {
        /* ignore */
      }
    }
  });

  // Handle section toggles (Visible Sections)
  document.querySelectorAll('.section-toggle').forEach((toggle) => {
    const section = toggle.dataset.section;
    let settingKey =
      'show' + section.charAt(0).toUpperCase() + section.slice(1);

    // Fix for compound words where simple capitalization isn't enough
    if (section === 'advancedanalytics') settingKey = 'showAdvancedAnalytics';
    if (section === 'apiintegration') settingKey = 'showApiIntegration';
    if (section === 'datamanagement') settingKey = 'showDataManagement';
    if (section === 'voice-commands') settingKey = 'showVoiceCommands';
    if (section === 'knowledge-base') settingKey = 'showKnowledgeBase';
    if (section === 'time-tracking') settingKey = 'showTimeTracking';

    const sectionEls = document.querySelectorAll(
      `#main-app [data-section="${section}"], #stats-view [data-section="${section}"], #knowledge-base-view [data-section="${section}"], #settings-view [data-section="${section}"]`
    );
    const isOn = appSettings[settingKey] !== false;
    toggle.checked = isOn;
    sectionEls.forEach((el) => (el.style.display = isOn ? '' : 'none'));
  });

  // Handle toolbar buttons visibility based on section settings
  const toolbarMappings = {
    'quick-new-call': 'showCalllogging',
    'quick-timer': 'showHoldtimer',
    'quick-note': 'showNotes',
    'quick-template': 'showScripts',
    'quick-chat': 'showCollaboration',
  };

  Object.entries(toolbarMappings).forEach(([buttonId, settingKey]) => {
    const button = document.getElementById(buttonId);
    if (button) {
      button.style.display = appSettings[settingKey] !== false ? '' : 'none';
    }
  });

  // Handle navigation tab visibility for Knowledge Base
  const knowledgeBaseTab = document.getElementById('knowledge-base-tab');
  if (knowledgeBaseTab) {
    knowledgeBaseTab.style.display = appSettings.showKnowledgeBase
      ? ''
      : 'none';

    // If Knowledge Base is being disabled and user is currently on that tab, switch to main
    if (
      !appSettings.showKnowledgeBase &&
      knowledgeBaseTab.classList.contains('active')
    ) {
      // Switch to main tab if available
      if (typeof window.showMainApp === 'function') {
        window.showMainApp();
      }
    }
  }

  // Handle navigation tab visibility for Stats
  const statsTab = document.getElementById('stats-tab');
  if (statsTab) {
    statsTab.style.display = appSettings.showAnalytics ? '' : 'none';

    // If Stats is being disabled and user is currently on that tab, switch to main
    if (!appSettings.showAnalytics && statsTab.classList.contains('active')) {
      // Switch to main tab if available
      if (typeof window.showMainApp === 'function') {
        window.showMainApp();
      }
    }
  }

  // Apply export settings
  const exportSettings = [
    'export-patterns',
    'export-steps',
    'export-notes',
    'export-settings',
  ];
  exportSettings.forEach((settingId) => {
    const toggle = document.getElementById(settingId);
    if (toggle) {
      const settingKey = settingId.replace(/-/g, '');
      toggle.checked = appSettings[settingKey] !== false;
    }
  });

  // Apply popup settings
  const popupEnable = document.getElementById('enable-popup-windows');
  const popupOptions = document.querySelectorAll('.popup-options');
  if (popupEnable) {
    popupEnable.checked = appSettings.enablePopupWindows;
    popupOptions.forEach((option) => {
      option.style.display = appSettings.enablePopupWindows ? '' : 'none';
    });
  }
  const preferPopup = document.getElementById('prefer-popup-windows');
  if (preferPopup) preferPopup.checked = appSettings.preferPopupWindows;
  const popupAlwaysOnTop = document.getElementById('popup-always-on-top');
  if (popupAlwaysOnTop) popupAlwaysOnTop.checked = appSettings.popupAlwaysOnTop;
  const popupWidth = document.getElementById('popup-width');
  if (popupWidth) popupWidth.value = appSettings.popupWidth;
  const popupHeight = document.getElementById('popup-height');
  if (popupHeight) popupHeight.value = appSettings.popupHeight;

  // Apply timer settings
  const timerAutoStart = document.getElementById('timer-auto-start');
  if (timerAutoStart) timerAutoStart.checked = appSettings.timerAutoStart;
  const timerSoundAlerts = document.getElementById('timer-sound-alerts');
  if (timerSoundAlerts) timerSoundAlerts.checked = appSettings.timerSoundAlerts;

  // Repeat alert sound toggle
  if (repeatAlertSoundToggle)
    repeatAlertSoundToggle.checked = appSettings.repeatAlertSound;

  // Apply Quick Actions Bar setting
  const quickActionsToolbar = document.getElementById('quick-actions-toolbar');
  const quickActionsToggle = document.getElementById('toggle-quick-actions');
  if (quickActionsToolbar) {
    quickActionsToolbar.style.display =
      appSettings.showQuickActions !== false ? '' : 'none';
    // If we're hiding the toolbar, also ensure the body padding is adjusted if needed (though stickiness usually handles overlap, removing it might require layout validation)
  }
  if (quickActionsToggle) {
    quickActionsToggle.checked = appSettings.showQuickActions !== false;
  }

  // Add the new setting
  const timerAllowHistoryDeletion = document.getElementById(
    'timer-allow-history-deletion'
  );
  if (timerAllowHistoryDeletion)
    timerAllowHistoryDeletion.checked = appSettings.timerAllowHistoryDeletion;

  // Update warning time display
  const timerWarningInput = document.getElementById('timer-warning-time');
  const timerWarningValue = document.getElementById('timer-warning-time-value');
  if (timerWarningInput && timerWarningValue) {
    const val = parseInt(timerWarningInput.value, 10);
    const min = Math.floor(val / 60);
    const sec = val % 60;
    timerWarningValue.textContent = `${min}:${sec.toString().padStart(2, '0')}`;
  }

  // Apply layout settings
  applyLayout();
  const layoutModeSelect = document.getElementById('layout-mode');
  if (layoutModeSelect) {
    layoutModeSelect.value = appSettings.layoutMode;
  }

  // Apply instance settings
  const multipleTimers = document.getElementById('enable-multiple-timers');
  const maxTimers = document.getElementById('max-timers');
  const maxTimersValue = document.getElementById('max-timers-value');
  const multipleNotes = document.getElementById('enable-multiple-notes');
  const maxNotes = document.getElementById('max-notes');
  const maxNotesValue = document.getElementById('max-notes-value');

  if (multipleTimers) multipleTimers.checked = appSettings.multipleTimers;
  if (maxTimers) maxTimers.value = appSettings.maxTimers;
  if (maxTimersValue) maxTimersValue.textContent = appSettings.maxTimers;
  if (multipleNotes) multipleNotes.checked = appSettings.multipleNotes;
  if (maxNotes) maxNotes.value = appSettings.maxNotes;
  if (maxNotesValue) maxNotesValue.textContent = appSettings.maxNotes;

  // Update visibility of max settings based on multiple instances toggles
  document.querySelectorAll('.instance-option').forEach((option) => {
    if (option.querySelector('#max-timers')) {
      option.style.display = appSettings.multipleTimers ? '' : 'none';
    }
    if (option.querySelector('#max-notes')) {
      option.style.display = appSettings.multipleNotes ? '' : 'none';
    }
  });

  // Update multiple timers visibility
  updateMultipleTimersVisibility(appSettings.multipleTimers);

  // Apply repeat alert sound mode

  if (repeatAlertSoundToggle) {
    repeatAlertSoundToggle.checked =
      appSettings.timerRepeatAlertSound !== false;
    setRepeatAlertSoundMode(repeatAlertSoundToggle.checked);
  }

  // Apply any persisted collapse states for individual setting-items
  try {
    const map = appSettings.collapsedSettingItems || {};
    Object.keys(map).forEach((k) => {
      try {
        const [sectionKey, labelKey] = k.split('::');
        const sectionEl = sectionKey
          ? document.getElementById(sectionKey)
          : null;
        // fallback: attempt to find by header text
        let target = null;
        if (sectionEl) {
          target = Array.from(sectionEl.querySelectorAll('.setting-item')).find(
            (si) => {
              const label =
                si.querySelector('.setting-label')?.textContent?.trim() || '';
              return label.toLowerCase().replace(/\s+/g, '-') === labelKey;
            }
          );
        } else {
          // search globally
          target = Array.from(document.querySelectorAll('.setting-item')).find(
            (si) => {
              const label =
                si.querySelector('.setting-label')?.textContent?.trim() || '';
              return label.toLowerCase().replace(/\s+/g, '-') === labelKey;
            }
          );
        }
        if (target && map[k]) target.classList.add('collapsed');
      } catch {
        /* ignore */
      }
    });
  } catch {
    /* ignore */
  }

  // Update collapse-all button initial state (if present)
  try {
    const headerBtn = document.querySelector(
      '#settings-view .settings-header .header-actions .collapse-all'
    );
    if (headerBtn) {
      const anyExpanded = Array.from(
        document.querySelectorAll(
          '#settings-view .settings-section .setting-item'
        )
      ).some((si) => !si.classList.contains('collapsed'));
      headerBtn.textContent = anyExpanded ? 'Collapse all' : 'Expand all';
      headerBtn.setAttribute('aria-pressed', anyExpanded ? 'false' : 'true');
    }
  } catch {
    /* ignore */
  }

  // Apply any custom titles saved in settings so settings sections match main page
  try {
    const titles = appSettings.customTitles || {};
    Object.entries(titles).forEach(([key, val]) => {
      if (!val) return;
      // find by data-section or id
      // apply to settings view and main app if present
      const el =
        document.querySelector(`#settings-view [data-section="${key}"]`) ||
        document.querySelector(`[data-section="${key}"]`) ||
        document.getElementById(key);
      if (el) {
        const titleElem =
          el.querySelector('.section-title') || el.querySelector('h2, h3');
        if (titleElem) titleElem.textContent = val;
      }
    });
  } catch {
    /* ignore */
  }
  // (defensive restoration removed — previous behavior restored)
}

export function setupSettingsEventListeners() {
  // Initialize audio context
  initAudio();

  // Setup theme toggle first
  setupThemeToggle();

  // Navigation event listeners
  const mainTab = document.getElementById('main-tab');
  const settingsTab = document.getElementById('settings-tab');
  if (mainTab) mainTab.addEventListener('click', showMainApp);
  if (settingsTab) settingsTab.addEventListener('click', showSettings);

  // Settings toggles
  const settingsToggles = [
    'toggle-minimal-mode',
    'toggle-formatter',
    'toggle-callflow',
    'toggle-analytics',
    'toggle-notes',
    'toggle-holdtimer',
    'toggle-calllogging',
    'toggle-scripts',
    'toggle-tasks',
    'toggle-voicerecording',
    'toggle-collaboration',
    'toggle-workflows',
    'toggle-multichannel',
    'toggle-feedback',
    'toggle-knowledge-base',
    'toggle-time-tracking',
    'toggle-advanced-analytics',
    'toggle-api-integration',
    'toggle-camera',
    'toggle-voice-commands',
    'toggle-telephony',
    'toggle-email',
    'toggle-training',
    'toggle-crm',
    'toggle-data-management',
    'toggle-performance-monitoring',
    'toggle-quick-actions',
    // Main page toggles
    'main-toggle-formatter',
    'main-toggle-callflow',
    'main-toggle-analytics',
    'main-toggle-notes',
    'main-toggle-holdtimer',
    'main-toggle-calllogging',
    'main-toggle-scripts',
    'main-toggle-tasks',
    'main-toggle-voicerecording',
    'main-toggle-collaboration',
    'main-toggle-workflows',
    'main-toggle-multichannel',
    'main-toggle-feedback',
    'main-toggle-knowledge-base',
    'main-toggle-time-tracking',
    'main-toggle-advanced-analytics',
    'main-toggle-api-integration',
    'main-toggle-camera',
    'main-toggle-voice-commands',
    'main-toggle-telephony',
    'main-toggle-email',
    'main-toggle-training',
    'main-toggle-crm',
    'main-toggle-data-management',
    'main-toggle-performance-monitoring',
  ];
  settingsToggles.forEach((toggleId) => {
    const toggle = document.getElementById(toggleId);
    if (toggle) {
      toggle.addEventListener('change', function (event) {
        // Prevent changes on disabled toggles (coming soon features)
        if (toggle.disabled) {
          event.preventDefault();
          if (
            toggle.type === 'range' ||
            toggle.classList.contains('slider-toggle')
          )
            toggle.value = '0';
          else toggle.checked = false; // Ensure it stays unchecked
          return;
        }

        const section = toggleId.replace(/^main-/, '').replace('toggle-', '');

        // Determine on/off for range sliders vs checkboxes
        const isOn =
          this.type === 'range' || this.classList.contains('slider-toggle')
            ? this.value === '1'
            : this.checked;

        // Special handling for minimal mode
        if (section === 'minimal-mode') {
          appSettings.minimalMode = isOn;
          saveSettings(appSettings);
          applySettings();
          return;
        }

        // Convert section name to setting key
        let settingKey;
        switch (section) {
          case 'knowledge-base':
            settingKey = 'showKnowledgeBase';
            break;
          case 'time-tracking':
            settingKey = 'showTimeTracking';
            break;
          case 'advanced-analytics':
            settingKey = 'showAdvancedAnalytics';
            break;
          case 'api-integration':
            settingKey = 'showApiIntegration';
            break;
          case 'camera':
            settingKey = 'showCamera';
            break;
          case 'voice-commands':
            settingKey = 'showVoiceCommands';
            break;
          case 'telephony':
            settingKey = 'showTelephony';
            break;
          case 'email':
            settingKey = 'showEmail';
            break;
          case 'quick-actions':
            settingKey = 'showQuickActions';
            break;
          case 'performanceMonitoring':
            settingKey = 'showPerformanceMonitoring';
            break;
          case 'training':
            settingKey = 'showTraining';
            break;

          default:
            settingKey =
              'show' +
              section
                .split('-')
                .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
                .join('');
        }
        appSettings[settingKey] = isOn;
        saveSettings(appSettings);
        applySettings();
      });
    }
  });

  // Add global listener for subsection toggles (collapsible)
  document.querySelectorAll('.subsection-toggle').forEach((btn) => {
    btn.addEventListener('click', function () {
      const subsection = this.closest('.pattern-management-subsection');
      if (!subsection) return;
      const expanded = this.getAttribute('aria-expanded') === 'true';
      const newVal = !expanded;
      this.setAttribute('aria-expanded', newVal ? 'true' : 'false');
      subsection.classList.toggle('collapsed', !newVal);
      appSettings.patternManagementExpanded = newVal;
      saveSettings(appSettings);
    });
  });

  // Insert collapse toggles for setting-items that are complex or verbose so the
  // Settings view stays tidy. Persist collapsed state in appSettings.collapsedSettingItems.
  // Note: Toggles removed from settings page per user request
  // try {
  //   addSettingCollapsibles();
  //   // Add a header-wide Collapse all / Expand all control
  //   try {
  //     const header = document.querySelector('#settings-view .settings-header');
  //     if (header) {
  //       let actions = header.querySelector('.header-actions');
  //       if (!actions) {
  //         actions = document.createElement('div');
  //         actions.className = 'header-actions';
  //         header.appendChild(actions);
  //       }

  //       // Only add if not present
  //       if (!actions.querySelector('.collapse-all')) {
  //         const btn = document.createElement('button');
  //         btn.className = 'collapse-all';
  //         btn.setAttribute('aria-pressed', 'false');
  //         btn.textContent = 'Collapse all';
  //         btn.title = 'Collapse all setting items';

  //         btn.addEventListener('click', (e) => {
  //           // toggleCollapseAll will update the button text
  //           const anyExpanded = Array.from(document.querySelectorAll('#settings-view .settings-section .setting-item')).some(si => !si.classList.contains('collapsed'));
  //           toggleCollapseAll(anyExpanded);
  //         });

  //         actions.appendChild(btn);
  //       }
  //     }
  //   } catch (e) {}
  // } catch (e) { /* non-fatal */ }

  // Ensure settings sections behave like main page sections
  try {
    document
      .querySelectorAll('#settings-view .settings-section')
      .forEach((section) => {
        if (!section) return;
        section.classList.add('draggable-section');
        if (typeof setupDraggable === 'function') setupDraggable(section);
        if (typeof setupFloating === 'function') setupFloating(section);
        if (typeof setupSectionToggle === 'function')
          setupSectionToggle(section);
      });
  } catch {
    /* ignore */
  }

  // NOTE: addSettingCollapsibles is implemented at top-level below (kept here
  // temporarily in setup flow call so tests can invoke it separately)
  // Export toggles
  const exportToggles = [
    'export-patterns',
    'export-steps',
    'export-notes',
    'export-settings',
  ];
  exportToggles.forEach((toggleId) => {
    const toggle = document.getElementById(toggleId);
    if (toggle) {
      // Initialize checked state
      const settingKey = toggleId.replace(/-/g, '');
      toggle.checked = appSettings[settingKey] !== false;

      toggle.addEventListener('change', function () {
        const settingKey = toggleId.replace(/-/g, '');
        appSettings[settingKey] = this.checked;
        saveSettings(appSettings);
      });
    }
  });

  // Popup settings
  const popupEnable = document.getElementById('enable-popup-windows');
  if (popupEnable) {
    popupEnable.addEventListener('change', function () {
      appSettings.enablePopupWindows = this.checked;
      saveSettings(appSettings);
      applySettings();
    });
  }
  const preferPopup = document.getElementById('prefer-popup-windows');
  if (preferPopup) {
    preferPopup.addEventListener('change', function () {
      appSettings.preferPopupWindows = this.checked;
      saveSettings(appSettings);
      applySettings();
    });
  }
  const popupAlwaysOnTop = document.getElementById('popup-always-on-top');
  if (popupAlwaysOnTop) {
    popupAlwaysOnTop.addEventListener('change', function () {
      appSettings.popupAlwaysOnTop = this.checked;
      saveSettings(appSettings);
    });
  }
  const popupWidth = document.getElementById('popup-width');
  if (popupWidth) {
    popupWidth.addEventListener('input', function () {
      appSettings.popupWidth = parseInt(this.value, 10);
      saveSettings(appSettings);
    });
  }
  const popupHeight = document.getElementById('popup-height');
  if (popupHeight) {
    popupHeight.addEventListener('input', function () {
      appSettings.popupHeight = parseInt(this.value, 10);
      saveSettings(appSettings);
    });
  }

  // Timer settings
  const timerToggles = [
    'timer-auto-start',
    'timer-sound-alerts',
    'timer-show-notifications',
    'timer-log-holds',
    'timer-countdown-mode',
  ];
  timerToggles.forEach((toggleId) => {
    const toggle = document.getElementById(toggleId);
    if (toggle) {
      toggle.addEventListener('change', function () {
        const settingKey = toggleId.replace(/-/g, '');
        appSettings[settingKey] = this.checked;
        saveSettings(appSettings);
      });
    }
  });

  // Initialize Customization UIs
  initializeCustomizationUI();

  // Setup additional listeners from the bottom of the file
  setupAdditionalSettingsListeners();

  applySettings();
}

function initializeCustomizationUI() {
  // Legacy migration or empty init
  if (!appSettings.formFields) appSettings.formFields = [];
  if (!appSettings.noteTemplates) appSettings.noteTemplates = [];
}

function setupAdditionalSettingsListeners() {
  // Repeat alert sound toggle
  if (repeatAlertSoundToggle) {
    repeatAlertSoundToggle.addEventListener('change', function () {
      appSettings.timerRepeatAlertSound = this.checked;
      saveSettings(appSettings);
      setRepeatAlertSoundMode(this.checked);
    });
  }

  // Timer warning slider - CORRECTED VERSION
  const timerWarningInput = document.getElementById('timer-warning-time');
  const timerWarningValue = document.getElementById('timer-warning-time-value');
  const timerWarningSlider = document.getElementById(
    'timer-warning-time-slider'
  );

  if (timerWarningInput && timerWarningValue && timerWarningSlider) {
    function updateWarningDisplay() {
      const val = parseInt(timerWarningInput.value, 10);
      const min = Math.floor(val / 60);
      const sec = val % 60;
      timerWarningValue.textContent = `${min}:${sec
        .toString()
        .padStart(2, '0')}`;
    }

    function updateSliderValue(slider, value) {
      const val = parseInt(value, 10);
      slider.value = isNaN(val) ? 0 : val;
    }

    // Single event listener for the slider
    timerWarningInput.addEventListener('input', function () {
      appSettings.timerWarningTime = parseInt(this.value, 10);
      updateWarningDisplay();
      saveSettings(appSettings);
    });

    timerWarningSlider.addEventListener('input', function () {
      appSettings.timerWarningTime = parseInt(this.value, 10);
      updateWarningDisplay();
    });

    // Set initial value from settings
    timerWarningInput.value = appSettings.timerWarningTime;
    updateWarningDisplay();
    updateSliderValue(timerWarningSlider, timerWarningValue);
  }

  // Layout Settings
  const movementMode = document.getElementById('movement-mode');
  if (movementMode) {
    movementMode.value = appSettings.layoutMode;
    movementMode.addEventListener('change', function () {
      appSettings.layoutMode = this.value;
      saveSettings(appSettings);
      applyLayout();
    });
  }

  const gridColumns = document.getElementById('grid-columns');
  const gridColumnsValue = document.getElementById('grid-columns-value');
  if (gridColumns && gridColumnsValue) {
    gridColumns.value = appSettings.gridColumns;
    gridColumnsValue.textContent = appSettings.gridColumns;

    gridColumns.addEventListener('input', function () {
      appSettings.gridColumns = parseInt(this.value);
      gridColumnsValue.textContent = this.value;
      saveSettings(appSettings);
      applyLayout();
    });
  }

  const gridSpacing = document.getElementById('grid-spacing');
  const gridSpacingValue = document.getElementById('grid-spacing-value');
  if (gridSpacing && gridSpacingValue) {
    gridSpacing.value = appSettings.gridSpacing;
    gridSpacingValue.textContent = appSettings.gridSpacing + 'px';

    gridSpacing.addEventListener('input', function () {
      appSettings.gridSpacing = parseInt(this.value);
      gridSpacingValue.textContent = this.value + 'px';
      saveSettings(appSettings);
      applyLayout();
    });
  }

  // Layout mode select
  const layoutModeSelect = document.getElementById('layout-mode');
  if (layoutModeSelect) {
    layoutModeSelect.addEventListener('change', function () {
      appSettings.layoutMode = this.value;
      saveSettings(appSettings);
      applyLayout();
    });
  }

  const resetLayoutBtn = document.getElementById('reset-layout-btn');
  if (resetLayoutBtn) {
    resetLayoutBtn.addEventListener('click', resetLayout);
  }

  const saveLayoutBtn = document.getElementById('save-layout-btn');
  if (saveLayoutBtn) {
    saveLayoutBtn.addEventListener('click', saveCurrentLayout);
  }

  // Save settings button
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', function () {
      saveSettings(appSettings);
      // Show confirmation
      const originalText = this.textContent;
      this.textContent = 'Settings Saved!';
      this.style.background = 'var(--success)';
      setTimeout(() => {
        this.textContent = originalText;
        this.style.background = '';
      }, 2000);
    });
  }

  // Import/Export data
  const exportDataBtn = document.getElementById('export-data-btn');
  if (exportDataBtn) {
    exportDataBtn.addEventListener('click', exportData);
  }
  const importDataBtn = document.getElementById('import-data-btn');
  if (importDataBtn) {
    importDataBtn.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = importData;
      input.click();
    });
  }

  const restoreDataBtn = document.getElementById('restore-data-btn');
  if (restoreDataBtn) {
    restoreDataBtn.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = restoreData;
      input.click();
    });
  }

  // Data Management Statistics
  updateDataStatistics();

  // Backup functionality
  const backupDataBtn = document.getElementById('backup-data-btn');
  if (backupDataBtn) {
    backupDataBtn.addEventListener('click', createBackup);
  }
  const resetAllBtn = document.getElementById('reset-all-btn');
  if (resetAllBtn) {
    resetAllBtn.addEventListener('click', function () {
      (async () => {
        try {
          const modalModule = await import('../utils/modal.js');
          const confirmFn =
            (modalModule &&
              typeof modalModule.showConfirmModal === 'function' &&
              modalModule.showConfirmModal) ||
            window.showConfirmModal ||
            ((opts) =>
              Promise.resolve(
                window.confirm(
                  opts && opts.message ? opts.message : 'Are you sure?'
                )
              ));
          const ok = await confirmFn({
            title: 'Reset All Data',
            message:
              'Are you sure you want to reset ALL data? This cannot be undone!',
            confirmLabel: 'Reset All',
            cancelLabel: 'Cancel',
            danger: true,
          });
          if (ok) {
            localStorage.clear();
            location.reload();
          }
        } catch (err) {
          console.warn('Reset All Data: confirm fallback triggered', err);
          if (
            window.confirm(
              'Are you sure you want to reset ALL data? This cannot be undone!'
            )
          ) {
            localStorage.clear();
            location.reload();
          }
        }
      })();
    });
  }

  // Clear all data button
  const clearDataBtn = document.getElementById('clear-data-btn');
  if (clearDataBtn) {
    clearDataBtn.addEventListener('click', async function () {
      try {
        const modalModule = await import('../utils/modal.js');
        const confirmFn =
          (modalModule &&
            typeof modalModule.showConfirmModal === 'function' &&
            modalModule.showConfirmModal) ||
          window.showConfirmModal ||
          ((opts) =>
            Promise.resolve(
              window.confirm(
                opts && opts.message ? opts.message : 'Are you sure?'
              )
            ));
        const ok = await confirmFn({
          title: 'Clear All Data',
          message:
            'Are you sure you want to permanently delete ALL application data? This action cannot be undone!',
          confirmLabel: 'Clear All Data',
          cancelLabel: 'Cancel',
          danger: true,
        });
        if (ok) {
          try {
            const storageModule = await import('./storage.js');
            const clearAllData =
              (storageModule &&
                typeof storageModule.clearAllData === 'function' &&
                storageModule.clearAllData) ||
              (await import('./storage.js')).clearAllData;
            if (typeof clearAllData === 'function') clearAllData();
            location.reload();
          } catch (e) {
            console.warn('Failed to import clearAllData, aborting reload', e);
          }
        }
      } catch (err) {
        console.warn('Clear All Data: confirm fallback triggered', err);
        if (
          window.confirm(
            'Are you sure you want to permanently delete ALL application data? This action cannot be undone!'
          )
        ) {
          try {
            const storageModule = await import('./storage.js');
            const clearAllData =
              (storageModule &&
                typeof storageModule.clearAllData === 'function' &&
                storageModule.clearAllData) ||
              (await import('./storage.js')).clearAllData;
            if (typeof clearAllData === 'function') clearAllData();
            location.reload();
          } catch (e) {
            console.warn('Failed to import clearAllData in fallback', e);
          }
        }
      }
    });
  }

  // Instance settings
  const multipleTimers = document.getElementById('enable-multiple-timers');
  const maxTimers = document.getElementById('max-timers');
  const maxTimersValue = document.getElementById('max-timers-value');
  const multipleNotes = document.getElementById('enable-multiple-notes');
  const maxNotes = document.getElementById('max-notes');
  const maxNotesValue = document.getElementById('max-notes-value');

  if (multipleTimers) {
    multipleTimers.checked = appSettings.multipleTimers;
    multipleTimers.addEventListener('change', function () {
      appSettings.multipleTimers = this.checked;
      document.querySelectorAll('.instance-option').forEach((option) => {
        if (option.querySelector('#max-timers')) {
          option.style.display = this.checked ? '' : 'none';
        }
      });
      // Update multiple timers visibility
      updateMultipleTimersVisibility(this.checked);
      saveSettings(appSettings);
    });
  }

  if (maxTimers && maxTimersValue) {
    maxTimers.value = appSettings.maxTimers;
    maxTimersValue.textContent = appSettings.maxTimers;
    maxTimers.addEventListener('input', function () {
      appSettings.maxTimers = parseInt(this.value, 10);
      maxTimersValue.textContent = this.value;
      saveSettings(appSettings);
    });
  }

  if (multipleNotes) {
    multipleNotes.checked = appSettings.multipleNotes;
    multipleNotes.addEventListener('change', function () {
      appSettings.multipleNotes = this.checked;
      document.querySelectorAll('.instance-option').forEach((option) => {
        if (option.querySelector('#max-notes')) {
          option.style.display = this.checked ? '' : 'none';
        }
      });
      saveSettings(appSettings);
    });
  }

  if (maxNotes && maxNotesValue) {
    maxNotes.value = appSettings.maxNotes;
    maxNotesValue.textContent = appSettings.maxNotes;
    maxNotes.addEventListener('input', function () {
      appSettings.maxNotes = parseInt(this.value, 10);
      maxNotesValue.textContent = this.value;
      saveSettings(appSettings);
    });
  }

  // Countdown mode toggle
  const countdownToggle = document.getElementById('timer-countdown-mode');

  if (countdownToggle) {
    countdownToggle.checked = appSettings.timerCountdownMode;

    countdownToggle.addEventListener('change', function () {
      appSettings.timerCountdownMode = this.checked;
      saveSettings(appSettings);

      // If timer instance exists, update its mode
      if (window.holdTimer) {
        window.toggleTimerMode();
      }
    });
  }

  // Alert sound selection
  const alertSound = document.getElementById('timer-alert-sound');
  const customSoundOption = document.querySelector('.custom-sound-option');
  const customSoundUrl = document.getElementById('custom-sound-url');

  if (alertSound) {
    alertSound.value = appSettings.timerAlertSound;

    // Show/hide custom sound URL input
    if (customSoundOption) {
      customSoundOption.style.display =
        alertSound.value === 'custom' ? '' : 'none';
    }

    alertSound.addEventListener('change', function () {
      appSettings.timerAlertSound = this.value;
      saveSettings(appSettings);

      // Play a test sound
      if (this.value !== 'custom') {
        playAlertSound(this.value, null, true);
      }
    });
  }

  // Custom sound URL
  if (customSoundUrl) {
    customSoundUrl.value = appSettings.timerCustomSoundUrl;

    customSoundUrl.addEventListener('change', function () {
      appSettings.timerCustomSoundUrl = this.value;
      saveSettings(appSettings);
    });
  }

  // Show/hide custom sound URL input based on alert sound selection
  // Use the already-declared alertSound and customSoundOption
  if (alertSound && customSoundOption && customSoundUrl) {
    function updateCustomUrlVisibility() {
      if (alertSound.value === 'custom') {
        customSoundOption.classList.add('active'); // Use class for visibility/flex
        customSoundUrl.focus();
      } else {
        customSoundOption.classList.remove('active');
        customSoundUrl.blur();
      }
    }
    alertSound.addEventListener('change', updateCustomUrlVisibility);
    // Initial state
    updateCustomUrlVisibility();
  }

  // Test sound button
  const testSoundBtn = document.getElementById('test-sound-btn');
  if (testSoundBtn) {
    testSoundBtn.addEventListener('click', function () {
      const soundType = document.getElementById('timer-alert-sound').value;
      const customUrl = document.getElementById('custom-sound-url').value;
      playAlertSound(soundType, customUrl, true); // Play a short test sound immediately
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard
          .writeText(`${soundType === 'custom' ? customUrl : soundType}`)
          .then(() => {
            testSoundBtn.textContent = 'Copied!';
            setTimeout(() => (testSoundBtn.textContent = 'Test Sound'), 1000);
          })
          .catch(() => {
            alert('Copy failed. Please copy manually.');
          });
      } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = soundType === 'custom' ? customUrl : soundType;
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand('copy');
          testSoundBtn.textContent = 'Copied!';
          setTimeout(() => (testSoundBtn.textContent = 'Test Sound'), 1000);
        } catch {
          alert('Copy failed. Please copy manually.');
        }
        document.body.removeChild(textarea);
      }
    });
  }

  // Scroll to top functionality
  const scrollTopBtn = document.getElementById('scroll-top-btn');
  const settingsView = document.getElementById('settings-view');

  if (scrollTopBtn && settingsView) {
    // Show/hide button based on scroll position
    settingsView.addEventListener('scroll', () => {
      if (settingsView.scrollTop > 300) {
        scrollTopBtn.classList.add('visible');
      } else {
        scrollTopBtn.classList.remove('visible');
      }
    });

    // Scroll to top when clicked
    scrollTopBtn.addEventListener('click', () => {
      settingsView.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    });
  }

  // Auto Copy Pattern Result toggle
  const autoCopyToggle = document.getElementById('auto-copy-toggle');
  if (autoCopyToggle) {
    autoCopyToggle.checked = loadData('autoCopyPattern', true);
    autoCopyToggle.addEventListener('change', (e) => {
      saveData('autoCopyPattern', e.target.checked);
    });
  }
}

// Data import/export helpers
function exportData() {
  const dataToExport = {};
  if (appSettings.exportPatterns) {
    const patterns = loadPatterns();
    if (patterns.length > 0) dataToExport.patterns = patterns;
  }
  if (appSettings.exportSteps) {
    const steps = loadSteps();
    if (steps.length > 0) dataToExport.steps = steps;
  }
  if (appSettings.exportNotes) {
    const notes = loadNotes();
    if (notes.length > 0) dataToExport.notes = notes;
  }
  if (appSettings.exportSettings) {
    dataToExport.settings = appSettings;
  }
  if (Object.keys(dataToExport).length === 0) {
    alert('No data selected for export.');
    return;
  }
  const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `call-center-helper-data-${
    new Date().toISOString().split('T')[0]
  }.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = JSON.parse(e.target.result);

      if (data.patterns) {
        savePatterns(data.patterns);
      }

      if (data.steps) {
        saveSteps(data.steps);
      }

      if (data.notes) {
        saveNotes(data.notes);
      }

      if (data.settings) {
        appSettings = { ...appSettings, ...data.settings };
        saveSettings(appSettings);
        applySettings();
      }

      alert('Data imported successfully! Refresh the page to see changes.');
    } catch (error) {
      alert('Error importing data: Invalid file format.');
      console.error('Import error:', error);
    }
  };

  reader.readAsText(file);
  event.target.value = ''; // Reset file input
}

async function restoreData(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const modalModule = await import('../utils/modal.js');
    const confirmFn =
      (modalModule &&
        typeof modalModule.showConfirmModal === 'function' &&
        modalModule.showConfirmModal) ||
      window.showConfirmModal ||
      ((opts) =>
        Promise.resolve(
          window.confirm(opts && opts.message ? opts.message : 'Are you sure?')
        ));
    if (
      !(await confirmFn({
        title: 'Restore Backup',
        message:
          'Are you sure you want to restore from this backup? This will overwrite all existing data.',
        confirmLabel: 'Restore',
        cancelLabel: 'Cancel',
        danger: true,
      }))
    ) {
      event.target.value = ''; // Reset file input
      return;
    }
  } catch (err) {
    console.warn('Restore Backup: confirm fallback triggered', err);
    if (
      !window.confirm(
        'Are you sure you want to restore from this backup? This will overwrite all existing data.'
      )
    ) {
      event.target.value = '';
      return;
    }
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = JSON.parse(e.target.result);

      // Clear existing data
      localStorage.clear();

      // Restore data
      if (data.patterns) {
        savePatterns(data.patterns);
      }

      if (data.steps) {
        saveSteps(data.steps);
      }

      if (data.notes) {
        saveNotes(data.notes);
      }

      if (data.settings) {
        appSettings = data.settings;
        saveSettings(appSettings);
        applySettings();
      }

      alert('Data restored successfully! The page will now reload.');
      location.reload();
    } catch (error) {
      alert('Error restoring data: Invalid backup file format.');
      console.error('Restore error:', error);
    }
  };

  reader.readAsText(file);
  event.target.value = ''; // Reset file input
}

function createBackup() {
  const dataToBackup = {
    patterns: loadPatterns(),
    steps: loadSteps(),
    notes: loadNotes(),
    settings: appSettings,
    timestamp: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(dataToBackup, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `call-center-helper-backup-${
    new Date().toISOString().split('T')[0]
  }.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  alert('Backup created successfully!');
}

// Update data statistics display
function updateDataStatistics() {
  try {
    // Update patterns count
    const patternsCount = document.getElementById('patterns-count');
    if (patternsCount) {
      const patterns = loadPatterns();
      patternsCount.textContent = patterns.length;
    }

    // Update steps count
    const stepsCount = document.getElementById('steps-count');
    if (stepsCount) {
      const steps = loadSteps();
      stepsCount.textContent = steps.length;
    }

    // Update notes count
    const notesCount = document.getElementById('notes-count');
    if (notesCount) {
      const notes = loadNotes();
      notesCount.textContent = notes.length;
    }

    // Update settings size (approximate)
    const settingsSize = document.getElementById('settings-size');
    if (settingsSize) {
      const settingsString = JSON.stringify(appSettings);
      const sizeInKB = (settingsString.length / 1024).toFixed(1);
      settingsSize.textContent = `${sizeInKB}KB`;
    }
  } catch (error) {
    console.error('Error updating data statistics:', error);
  }
}

// Layout functions
function applyLayout() {
  // Apply layout & ordering to every sortable container (main + settings)
  const containers = Array.from(
    document.querySelectorAll('.sortable-container')
  );
  if (!containers.length) return;

  containers.forEach((container) => {
    // Set data attribute for CSS-based layout
    container.setAttribute('data-layout', appSettings.layoutMode);

    if (appSettings.layoutMode === 'grid') {
      container.style.display = 'grid';
      // Avoid inline gridTemplateColumns — instead add a safe utility class
      // (e.g. "grid-cols-2-safe") so CSS controls min widths and prevents
      // skinny multi-column collapse. This also makes the layout easier to
      // override in devtools.
      // remove any existing safe classes first
      Array.from(container.classList).forEach((cn) => {
        const m = cn.match(/^grid-cols-(\d+)-safe$/);
        if (m) container.classList.remove(cn);
      });
      const cols = Math.max(
        1,
        Math.min(4, parseInt(appSettings.gridColumns, 10) || 2)
      );
      container.classList.add(`grid-cols-${cols}-safe`);
      container.style.gap = `${appSettings.gridSpacing}px`;
      container.style.padding = `${appSettings.gridSpacing}px`;

      // Remove any absolute positioning from sections in this container
      container.querySelectorAll('.draggable-section').forEach((section) => {
        section.style.position = '';
        section.style.left = '';
        section.style.top = '';
      });
    } else {
      // Reset to default (let CSS manage layout)
      container.style.display = '';
      // remove our safe grid classes when leaving grid mode
      Array.from(container.classList).forEach((cn) => {
        const m = cn.match(/^grid-cols-(\d+)-safe$/);
        if (m) container.classList.remove(cn);
      });
      container.style.gap = '';
      container.style.padding = '';
      container.style.position = 'relative';
      container.style.height = '100%';
    }

    // Attempt to apply any saved-per-view ordering for this container if present
    try {
      const view = container.closest('.app-view');
      const viewKey = view?.id || 'root';
      const saved =
        appSettings.savedLayoutsPerView &&
        appSettings.savedLayoutsPerView[viewKey];
      if (saved && Array.isArray(saved.sections) && saved.sections.length) {
        saved.sections.forEach((sectionId) => {
          const sec = document.getElementById(sectionId);
          if (sec && container !== sec.parentElement)
            container.appendChild(sec);
        });
      }
    } catch {
      // non-fatal
    }
  });
}

async function resetLayout() {
  try {
    const modalModule = await import('../utils/modal.js');
    const confirmFn =
      (modalModule &&
        typeof modalModule.showConfirmModal === 'function' &&
        modalModule.showConfirmModal) ||
      window.showConfirmModal ||
      ((opts) =>
        Promise.resolve(
          window.confirm(opts && opts.message ? opts.message : 'Are you sure?')
        ));
    const confirmed = await confirmFn({
      title: 'Reset Layout',
      message:
        'Reset layout to default? This will restore the original section order and grid settings.',
      confirmLabel: 'Reset',
      cancelLabel: 'Cancel',
      danger: false,
    });

    if (!confirmed) return;
  } catch (err) {
    console.warn('Reset Layout: confirm fallback triggered', err);
    if (
      !window.confirm(
        'Reset layout to default? This will restore the original section order and grid settings.'
      )
    )
      return;
  }

  // Restore to default layout values
  appSettings.layoutMode = 'grid';
  appSettings.gridColumns = appSettings.defaultLayout.columns;
  appSettings.gridSpacing = appSettings.defaultLayout.spacing;

  // Restore default section order for the primary container
  const container = document.querySelector('.sortable-container');
  if (container) {
    appSettings.defaultLayout.sections.forEach((sectionId) => {
      const section = document.getElementById(sectionId);
      if (section) container.appendChild(section);
    });
  }

  saveSettings(appSettings);
  applyLayout();

  // Update settings controls if present
  const movementMode = document.getElementById('movement-mode');
  const gridColumns = document.getElementById('grid-columns');
  const gridSpacing = document.getElementById('grid-spacing');

  if (movementMode) movementMode.value = 'grid';
  if (gridColumns) {
    gridColumns.value = appSettings.defaultLayout.columns;
    const gridColumnsValue = document.getElementById('grid-columns-value');
    if (gridColumnsValue)
      gridColumnsValue.textContent = appSettings.defaultLayout.columns;
  }
  if (gridSpacing) {
    gridSpacing.value = appSettings.defaultLayout.spacing;
    const gridSpacingValue = document.getElementById('grid-spacing-value');
    if (gridSpacingValue)
      gridSpacingValue.textContent = appSettings.defaultLayout.spacing + 'px';
  }
}

function saveCurrentLayout() {
  // Save the current layout for each sortable container separately. This will
  // persist a layout keyed by the surrounding app-view container so the main
  // page and the settings page can keep their own layouts.
  const containers = Array.from(
    document.querySelectorAll('.sortable-container')
  );
  if (!containers.length) return;

  containers.forEach((container) => {
    const view = container.closest('.app-view');
    const viewKey = view?.id || 'root';

    const currentLayout = {
      mode: appSettings.layoutMode,
      columns: appSettings.gridColumns,
      spacing: appSettings.gridSpacing,
      sections: Array.from(container.children).map((section) => section.id),
    };

    // keep a rolling history (compat) and store per-view layout
    appSettings.savedLayouts[new Date().toISOString()] = currentLayout;
    appSettings.savedLayoutsPerView = appSettings.savedLayoutsPerView || {};
    appSettings.savedLayoutsPerView[viewKey] = currentLayout;
  });

  saveSettings(appSettings);

  // Show confirmation
  const saveBtn = document.getElementById('save-layout-btn');
  if (saveBtn) {
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'Layout Saved!';
    setTimeout(() => {
      saveBtn.textContent = originalText;
    }, 2000);
  }

  // Settings group collapse toggles (use .collapse-toggle for expand/collapse)
  const collapseToggles = document.querySelectorAll('.collapse-toggle');
  collapseToggles.forEach((toggle) => {
    toggle.addEventListener('click', function () {
      const groupContent = document.getElementById(
        this.getAttribute('aria-controls')
      );
      const isExpanded = this.getAttribute('aria-expanded') === 'true';
      // Toggle the expanded state
      this.setAttribute('aria-expanded', !isExpanded);
      // Toggle the content visibility
      if (groupContent) {
        groupContent.setAttribute('aria-expanded', !isExpanded);
        groupContent.classList.toggle('collapsed', isExpanded);
        groupContent.classList.toggle('expanded', !isExpanded);
      }
    });
  });

  // Group-level enable/disable buttons (Enable All / Disable All)
  const groupEnableBtns = document.querySelectorAll(
    '.group-toggle[data-group]'
  );
  groupEnableBtns.forEach((btn) => {
    btn.addEventListener('click', function () {
      const groupEl = this.closest('.settings-group');
      if (!groupEl) return;
      const inputs = Array.from(
        groupEl.querySelectorAll(
          'input[type="checkbox"], input[type="range"].slider-toggle'
        )
      );
      if (!inputs.length) return;
      const anyOff = inputs.some((inp) =>
        inp.disabled
          ? false
          : inp.type === 'range'
            ? inp.value !== '1'
            : !inp.checked
      );
      const newVal = anyOff ? '1' : '0';
      inputs.forEach((inp) => {
        if (inp.disabled) return;
        if (inp.type === 'range') {
          inp.value = newVal;
        } else {
          inp.checked = newVal === '1';
        }
        // Trigger change handlers
        inp.dispatchEvent(new Event('change', { bubbles: true }));
        try {
          updateSliderVisual(inp);
        } catch {
          /* ignore */
        }
      });
      this.textContent = anyOff ? 'Disable All' : 'Enable All';
    });
  });

  // Initialize group states (expanded by default)
  const groupToggles = document.querySelectorAll('.collapse-toggle');
  groupToggles.forEach((toggle) => {
    toggle.setAttribute('aria-expanded', 'true');
    const groupContent = document.getElementById(
      toggle.getAttribute('aria-controls')
    );
    if (groupContent) {
      groupContent.setAttribute('aria-expanded', 'true');
    }
  });
}

/**
 * Lazy load module for a dynamically created component
 * @param {string} componentId - ID of the component container
 * @param {string} moduleType - Type of module to load ('timer', 'notes', etc.)
 */
export async function lazyLoadDynamicComponent(componentId, moduleType) {
  if (!componentId) return;

  switch (moduleType) {
    case 'timer':
      try {
        const timerModule = await import('./timer.js');
        const initializeTimer =
          (timerModule &&
            typeof timerModule.initializeTimer === 'function' &&
            timerModule.initializeTimer) ||
          (await import('./timer.js')).initializeTimer;
        const setupTimerEventListeners =
          (timerModule &&
            typeof timerModule.setupTimerEventListeners === 'function' &&
            timerModule.setupTimerEventListeners) ||
          (await import('./timer.js')).setupTimerEventListeners;
        if (typeof initializeTimer === 'function') initializeTimer(componentId);
        if (typeof setupTimerEventListeners === 'function')
          setupTimerEventListeners(componentId);
      } catch (e) {
        console.warn('lazyLoadDynamicComponent(timer) import failed', e);
      }
      break;

    case 'notes':
      try {
        const notesModule = await import('./notes.js');
        const initializeNotes =
          (notesModule &&
            typeof notesModule.initializeNotes === 'function' &&
            notesModule.initializeNotes) ||
          (await import('./notes.js')).initializeNotes;
        if (typeof initializeNotes === 'function') initializeNotes(componentId);
      } catch (e) {
        console.warn('lazyLoadDynamicComponent(notes) import failed', e);
      }
      break;

    // Add other component types as needed
  }
}

// Declare once at the top of the module scope
const repeatAlertSoundToggle = document.getElementById(
  'repeat-alert-sound-toggle'
);

// Update multiple timers visibility
function updateMultipleTimersVisibility(enabled) {
  const multipleTimersSection = document.querySelector('.multiple-timers');
  if (multipleTimersSection) {
    multipleTimersSection.style.display = enabled ? '' : 'none';
  }
}

// Add new sound options to the alert sound dropdown if present
document.addEventListener('DOMContentLoaded', () => {
  const alertSound = document.getElementById('timer-alert-sound');
  if (alertSound) {
    // Remove all existing options except custom
    Array.from(alertSound.options).forEach((opt) => {
      if (opt.value !== 'custom') alertSound.removeChild(opt);
    });
    // Add only the three allowed options
    alertSound.insertAdjacentHTML(
      'afterbegin',
      `
      <option value="endgame">End Game</option>
      <option value="bell">Bell</option>
      <option value="towerbell">Tower Bell</option>
    `
    );
  }

  // Initialize Twilio settings
  initializeTwilioSettings();
});

// Twilio Settings Management
async function initializeTwilioSettings() {
  const saveButton = document.getElementById('save-twilio-settings');
  const testButton = document.getElementById('test-twilio');
  const statusElement = document.getElementById('twilio-status');
  const saveStatusElement = document.getElementById('twilio-save-status');

  if (!saveButton || !statusElement) return;

  function showTwilioStatus(message, type) {
    if (saveStatusElement) {
      saveStatusElement.textContent = message;
      saveStatusElement.className = 'status-message ' + type;
      saveStatusElement.style.display = 'block';
      setTimeout(() => {
        saveStatusElement.style.display = 'none';
      }, 3000);
    } else if (statusElement) {
      statusElement.textContent = message;
    }
  }

  // Load current Twilio settings
  await loadTwilioSettings();

  // Save settings event listener
  saveButton.addEventListener('click', async () => {
    const accountSid = document
      .getElementById('twilio-account-sid')
      ?.value?.trim();
    const authToken = document
      .getElementById('twilio-auth-token')
      ?.value?.trim();
    const phoneNumber = document
      .getElementById('twilio-phone-number')
      ?.value?.trim();

    if (!accountSid || !authToken || !phoneNumber) {
      showTwilioStatus('Please fill in all fields', 'error');
      return;
    }

    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';

    try {
      const response = await fetch('/api/user/twilio', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ accountSid, authToken, phoneNumber }),
      });

      const result = await response.json();

      if (response.ok) {
        showTwilioStatus('Twilio settings saved successfully!', 'success');
        await loadTwilioSettings();
      } else {
        showTwilioStatus(result.error || 'Failed to save settings', 'error');
      }
    } catch (error) {
      console.error('Twilio save error:', error);
      showTwilioStatus('Failed to save settings. Please try again.', 'error');
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = 'Save Twilio Settings';
    }
  });

  // Test SMS event listener
  if (testButton) {
    testButton.addEventListener('click', async () => {
      const phoneNumber = document
        .getElementById('twilio-phone-number')
        ?.value?.trim();

      if (!phoneNumber) {
        alert('Please enter a phone number first');
        return;
      }

      testButton.disabled = true;
      testButton.textContent = 'Sending Test...';

      try {
        const response = await fetch('/api/sms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            to: phoneNumber,
            message: 'Test SMS from Call Center Helper',
          }),
        });

        const result = await response.json();

        if (response.ok) {
          alert('Test SMS sent successfully!');
        } else {
          alert(`Test SMS failed: ${result.error}`);
        }
      } catch (error) {
        console.error('Test SMS error:', error);
        alert('Failed to send test SMS. Please check your settings.');
      } finally {
        testButton.disabled = false;
        testButton.textContent = 'Test SMS';
      }
    });
  }
}

async function loadTwilioSettings() {
  const statusElement = document.getElementById('twilio-status');
  const testButton = document.getElementById('test-twilio');

  if (!statusElement) return;

  try {
    const response = await fetch('/api/user/twilio', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });

    if (response.ok) {
      const settings = await response.json();

      // Update status display
      statusElement.textContent = settings.isConfigured
        ? 'Status: Configured'
        : 'Status: Not Configured';

      // Show/hide test button
      if (testButton) {
        testButton.style.display = settings.isConfigured ? '' : 'none';
      }

      // Populate form fields (without auth token for security)
      if (settings.accountSid) {
        const accountSidField = document.getElementById('twilio-account-sid');
        if (accountSidField) accountSidField.value = settings.accountSid;
      }

      if (settings.phoneNumber) {
        const phoneField = document.getElementById('twilio-phone-number');
        if (phoneField) phoneField.value = settings.phoneNumber;
      }
    } else {
      statusElement.textContent = 'Status: Error loading settings';
    }
  } catch (error) {
    console.error('Load Twilio settings error:', error);
    statusElement.textContent = 'Status: Error loading settings';
  }
}

// Collapsible settings groups
const collapseToggle = document.getElementById('toggle-advanced-sections');
if (collapseToggle) {
  collapseToggle.addEventListener('click', function () {
    const content = document.getElementById('advanced-sections-content');
    const isExpanded = this.getAttribute('aria-expanded') === 'true';

    this.setAttribute('aria-expanded', !isExpanded);
    this.querySelector('.toggle-icon').textContent = isExpanded ? '▼' : '▲';
    this.querySelector('.toggle-icon').nextSibling.textContent = isExpanded
      ? 'Show Advanced'
      : 'Hide Advanced';

    if (content) {
      content.style.display = isExpanded ? 'none' : 'block';
      content.classList.toggle('expanded', !isExpanded);
      content.classList.toggle('collapsed', isExpanded);
    }
  });
}

// Settings group collapse toggles
const collapseToggles = document.querySelectorAll('.collapse-toggle');
collapseToggles.forEach((toggle) => {
  toggle.addEventListener('click', function () {
    const groupContent = document.getElementById(
      this.getAttribute('aria-controls')
    );
    const isExpanded = this.getAttribute('aria-expanded') === 'true';
    this.setAttribute('aria-expanded', !isExpanded);
    if (groupContent) {
      groupContent.setAttribute('aria-expanded', !isExpanded);
      groupContent.classList.toggle('collapsed', isExpanded);
      groupContent.classList.toggle('expanded', !isExpanded);
    }
  });
});

// Initialize collapse toggles as collapsed by default
collapseToggles.forEach((toggle) => {
  const groupContent = document.getElementById(
    toggle.getAttribute('aria-controls')
  );
  if (groupContent) {
    groupContent.setAttribute('aria-expanded', 'false');
    groupContent.classList.add('collapsed');
  }
});

// Group enable/disable buttons (Enable All / Disable All)
const groupEnableBtns = document.querySelectorAll('.group-toggle[data-group]');
groupEnableBtns.forEach((btn) => {
  btn.addEventListener('click', function () {
    const groupEl = this.closest('.settings-group');
    if (!groupEl) return;
    const inputs = Array.from(
      groupEl.querySelectorAll(
        'input[type="checkbox"], input[type="range"].slider-toggle'
      )
    );
    if (!inputs.length) return;
    const anyOff = inputs.some((inp) =>
      inp.disabled
        ? false
        : inp.type === 'range'
          ? inp.value !== '1'
          : !inp.checked
    );
    const newVal = anyOff ? '1' : '0';
    inputs.forEach((inp) => {
      if (inp.disabled) return;
      if (inp.type === 'range') {
        inp.value = newVal;
      } else {
        inp.checked = newVal === '1';
      }
      inp.dispatchEvent(new Event('change', { bubbles: true }));
      try {
        updateSliderVisual(inp);
      } catch {
        /* ignore */
      }
    });
    this.textContent = anyOff ? 'Disable All' : 'Enable All';
  });
});

// Welcome Screen Logic
// Welcome Screen Logic
function checkWelcomeStatus() {
  if (!appSettings.hasSeenWelcome) {
    const overlay = document.getElementById('welcome-overlay');
    const nextBtn = document.getElementById('wizard-next');
    const backBtn = document.getElementById('wizard-back');
    const steps = document.querySelectorAll('.wizard-step');
    const dots = document.querySelectorAll('.wizard-dots .dot');

    // State
    let currentStep = 1;
    let selectedRole = 'agent';
    let selectedTheme = 'dark';
    let userName = '';
    let customModules = {};

    if (overlay && nextBtn) {
      setTimeout(() => overlay.classList.add('active'), 500);

      // --- Helpers ---
      function updateStep(step) {
        steps.forEach((s) => {
          s.classList.remove('active');
          if (parseInt(s.dataset.step) === step) s.classList.add('active');
        });

        dots.forEach((d, i) => {
          // Logic for dots needs to match visible steps vs actual steps?
          // Simple approach: just light them up.
          if (i < step) d.classList.add('active');
          else d.classList.remove('active');
        });

        backBtn.style.visibility = step === 1 ? 'hidden' : 'visible';

        if (step === 5) {
          nextBtn.textContent = 'Finish';
        } else {
          nextBtn.textContent = 'Next';
        }
      }

      // --- Interaction Handlers ---

      const welcomeLoginBtn = document.getElementById('welcome-login-btn');
      if (welcomeLoginBtn) {
        welcomeLoginBtn.addEventListener('click', () => {
          overlay.classList.remove('active');
          if (window.showLogin) window.showLogin();
        });
      }

      // Step 1: Role Selection
      const roleCards = document.querySelectorAll('.role-card');
      roleCards.forEach((card) => {
        card.addEventListener('click', () => {
          roleCards.forEach((c) => c.classList.remove('selected'));
          card.classList.add('selected');
          selectedRole = card.dataset.role;
        });
      });

      // Step 2 handled by checkboxes naturally

      // Step 3: Theme Selection
      const themeCards = document.querySelectorAll('.theme-card');
      themeCards.forEach((card) => {
        card.addEventListener('click', () => {
          themeCards.forEach((c) => c.classList.remove('selected'));
          card.classList.add('selected');
          selectedTheme = card.dataset.theme;
        });
      });

      // --- Navigation ---
      nextBtn.addEventListener('click', () => {
        // Logic for moving forward
        let nextStep = currentStep + 1;

        // Skip Step 2 if not custom
        if (currentStep === 1 && selectedRole !== 'custom') {
          nextStep = 3;
        }

        if (currentStep === 3) {
          if (window.setTheme) window.setTheme(selectedTheme);
        }

        if (currentStep < 5) {
          currentStep = nextStep;
          updateStep(currentStep);
        } else {
          // FINISH (Step 5)
          const nameInput = document.getElementById('welcome-name');
          if (nameInput) userName = nameInput.value;

          // Collect modules if custom
          if (selectedRole === 'custom') {
            document.querySelectorAll('input[name="modules"]').forEach((cb) => {
              customModules[cb.value] = cb.checked;
            });
          }

          applyRolePreset(selectedRole, customModules);

          appSettings.theme = selectedTheme;
          if (userName) appSettings.userName = userName;

          appSettings.hasSeenWelcome = true;
          saveSettings(appSettings);

          overlay.classList.remove('active');
          applySettings();
        }
      });

      backBtn.addEventListener('click', () => {
        let prevStep = currentStep - 1;

        // Skip Step 2 going back if not custom
        if (currentStep === 3 && selectedRole !== 'custom') {
          prevStep = 1;
        }

        if (prevStep >= 1) {
          currentStep = prevStep;
          updateStep(currentStep);
        }
      });
    }
  }
}

function applyRolePreset(role, customModules = {}) {
  // Defaults set to false for clarity before enabling
  const allModules = [
    'showFormatter',
    'showCalllogging',
    'showScripts',
    'showHoldtimer',
    'showNotes',
    'showAnalytics',
    'showCrm',
    'showTasks',
    'showCollaboration',
    'showPerformanceMonitoring',
  ];

  // Helper to reset
  const resetAll = () => {
    allModules.forEach((m) => (appSettings[m] = false));
  };

  if (role === 'custom') {
    // Apply exact check states
    Object.keys(customModules).forEach((key) => {
      appSettings[key] = customModules[key];
    });
    // Ensure Quick actions is on by default for custom?
    appSettings.showQuickActions = appSettings.showQuickActions ?? true;
  } else {
    resetAll(); // Clear first for presets

    if (role === 'agent') {
      appSettings.showFormatter = true;
      appSettings.showCalllogging = true;
      appSettings.showScripts = true;
      appSettings.showHoldtimer = true;
      appSettings.showNotes = true;
      appSettings.showQuickActions = true;
    } else if (role === 'manager') {
      appSettings.showAnalytics = true;
      appSettings.showPerformanceMonitoring = true; // Often paired with analytics
      appSettings.showCollaboration = true;
      appSettings.showTasks = true;
      appSettings.showCrm = true;
      appSettings.showFormatter = true; // Useful for everyone
      appSettings.showCalllogging = true; // Reviewing calls
      appSettings.showQuickActions = true;
    } else if (role === 'minimal') {
      appSettings.showFormatter = true;
      appSettings.showHoldtimer = true;
      appSettings.showQuickActions = true;
    }
  }

  saveSettings(appSettings);
}
