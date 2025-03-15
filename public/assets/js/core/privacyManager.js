import { debug } from '../utils/debug.js';
import { analytics } from '../analytics/core/tracker.js';

class PrivacyManager {
  constructor() {
    this.initialized = false;
    this.storageKey = 'privacy-preferences';
    this.preferences = {
      analytics: false,
      marketing: false,
    };
    this.elements = {
      banner: null,
      controls: null,
      toggles: new Map(),
    };
  }

  async initialize() {
    try {
      debug('Initializing privacy manager');

      // Load saved preferences
      this.loadPreferences();

      // Cache DOM elements
      this.elements.banner = document.getElementById('privacy-banner');
      this.elements.controls = document.getElementById('privacy-controls');

      // Set up event listeners
      this.setupEventListeners();

      // Show banner if first visit
      if (!this.hasPreferences()) {
        this.showBanner();
      }

      // Apply saved preferences
      this.applyPreferences();

      this.initialized = true;
      debug('Privacy manager initialized');
      return true;
    } catch (error) {
      debug('Failed to initialize privacy manager:', error);
      return false;
    }
  }

  setupEventListeners() {
    // Banner actions
    document.querySelectorAll('[data-privacy-action]').forEach((button) => {
      button.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.privacyAction;
        if (action === 'accept') {
          this.acceptAll();
        } else if (action === 'customize') {
          this.showCustomizeModal();
        }
      });
    });

    // Toggle switches
    document.querySelectorAll('[data-privacy-toggle]').forEach((toggle) => {
      const key = toggle.dataset.privacyToggle;
      this.elements.toggles.set(key, toggle);

      toggle.addEventListener('change', (e) => {
        this.updatePreference(key, e.target.checked);
      });
    });
  }

  loadPreferences() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        this.preferences = JSON.parse(saved);
      }
    } catch (error) {
      debug('Error loading privacy preferences:', error);
    }
  }

  savePreferences() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.preferences));
      this.applyPreferences();
    } catch (error) {
      debug('Error saving privacy preferences:', error);
    }
  }

  updatePreference(key, value) {
    this.preferences[key] = value;
    this.savePreferences();
  }

  applyPreferences() {
    // Update UI
    for (const [key, toggle] of this.elements.toggles) {
      toggle.checked = this.preferences[key];
    }

    // Apply analytics preference
    if (this.preferences.analytics) {
      analytics.enable();
    } else {
      analytics.disable();
    }
  }

  showBanner() {
    if (this.elements.banner) {
      requestAnimationFrame(() => {
        this.elements.banner.classList.add('visible');
      });
    }
  }

  hideBanner() {
    if (this.elements.banner) {
      this.elements.banner.classList.remove('visible');
    }
  }

  acceptAll() {
    Object.keys(this.preferences).forEach((key) => {
      this.preferences[key] = true;
    });
    this.savePreferences();
    this.hideBanner();
  }
}

export default new PrivacyManager();
