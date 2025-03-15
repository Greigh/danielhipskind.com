import { debug } from '../../utils/debug.js';

export class AnalyticsPreferences {
  constructor() {
    this.storageKey = 'analytics-preferences';
    this.preferences = this.loadPreferences();
  }

  loadPreferences() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : { enabled: false };
    } catch (error) {
      debug('Failed to load analytics preferences:', error);
      return { enabled: false };
    }
  }

  savePreferences() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.preferences));
    } catch (error) {
      debug('Failed to save analytics preferences:', error);
    }
  }

  setEnabled(enabled) {
    this.preferences.enabled = enabled;
    this.savePreferences();
  }

  isEnabled() {
    return this.preferences.enabled === true;
  }
}

export const analyticsPreferences = new AnalyticsPreferences();

export function getAnalyticsPreferences() {
  return analyticsPreferences.preferences;
}

export async function checkAnalyticsStatus() {
  const statusElement = document.getElementById('analytics-status');
  if (!statusElement) return;

  const indicator = statusElement.querySelector('.status-indicator');
  const text = statusElement.querySelector('.status-text');

  const enabled = analyticsPreferences.isEnabled();

  indicator.classList.toggle('enabled', enabled);
  text.textContent = enabled ? 'Analytics Enabled' : 'Analytics Disabled';
}
