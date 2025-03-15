import {
  analyticsPreferences,
  checkAnalyticsStatus,
} from './analytics/utils/preferences.js';
import { loadAnalytics } from './analytics/utils/loader.js';

class PrivacyControls {
  constructor() {
    this.elements = {
      optOutBtn: document.getElementById('opt-out-btn'),
      exportBtn: document.getElementById('export-data'),
      deleteBtn: document.getElementById('delete-data'),
      privacyBanner: document.getElementById('privacy-banner'),
      acceptBtn: document.getElementById('accept-privacy'),
      rejectBtn: document.getElementById('reject-privacy'),
      preferencesBtn: document.getElementById('privacy-preferences'),
    };

    this.storageKey = 'privacy_preference';
  }

  async initialize() {
    if (!this.hasPrivacyPreference()) {
      this.showPrivacyBanner();
    }

    this.setupEventListeners();
    await checkAnalyticsStatus();
  }

  hasPrivacyPreference() {
    return localStorage.getItem(this.storageKey) !== null;
  }

  showPrivacyBanner() {
    if (this.elements.privacyBanner) {
      this.elements.privacyBanner.removeAttribute('hidden');
    }
  }

  hidePrivacyBanner() {
    if (this.elements.privacyBanner) {
      this.elements.privacyBanner.setAttribute('hidden', '');
    }
  }

  setupEventListeners() {
    // Privacy Banner Controls
    this.elements.acceptBtn?.addEventListener('click', () =>
      this.handleAccept()
    );
    this.elements.rejectBtn?.addEventListener('click', () =>
      this.handleReject()
    );

    // Privacy Controls
    this.elements.optOutBtn?.addEventListener('click', () =>
      this.handleOptOut()
    );
    this.elements.exportBtn?.addEventListener('click', () =>
      this.handleExport()
    );
    this.elements.deleteBtn?.addEventListener('click', () =>
      this.handleDelete()
    );
    this.elements.preferencesBtn?.addEventListener('click', () =>
      this.showPreferences()
    );
  }

  async handleAccept() {
    localStorage.setItem(this.storageKey, 'accepted');
    analyticsPreferences.setEnabled(true);
    this.hidePrivacyBanner();
    await loadAnalytics();
  }

  handleReject() {
    localStorage.setItem(this.storageKey, 'rejected');
    analyticsPreferences.setEnabled(false);
    this.hidePrivacyBanner();
  }

  async handleOptOut() {
    const isEnabled = analyticsPreferences.isEnabled();
    analyticsPreferences.setEnabled(!isEnabled);
    await checkAnalyticsStatus();

    const btn = this.elements.optOutBtn;
    if (btn) {
      btn.textContent = !isEnabled
        ? 'Opt Out of Analytics'
        : 'Opt In to Analytics';
    }
  }

  async handleExport() {
    try {
      const data = {
        preferences: {
          analytics: analyticsPreferences.preferences,
          theme: localStorage.getItem('theme-preference'),
          timestamp: new Date().toISOString(),
        },
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `privacy-data-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export data:', error);
    }
  }

  async handleDelete() {
    if (
      confirm(
        'Are you sure you want to delete all stored preferences? This cannot be undone.'
      )
    ) {
      analyticsPreferences.setEnabled(false);
      localStorage.clear();
      await checkAnalyticsStatus();
      alert('All stored preferences have been deleted.');
    }
  }

  showPreferences() {
    window.location.href = '/privacy-policy.html#privacy-controls';
  }
}

export const initPrivacyControls = async () => {
  const controls = new PrivacyControls();
  await controls.initialize();
  return controls;
};

export default initPrivacyControls;
