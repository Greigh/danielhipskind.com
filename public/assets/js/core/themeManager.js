import { icons } from './icons.js';
import { debug } from '../utils/debug.js';

class ThemeManager {
  static instance = null;

  constructor() {
    if (ThemeManager.instance) {
      return ThemeManager.instance;
    }
    ThemeManager.instance = this;

    this.html = document.documentElement;
    this.themeToggle = document.getElementById('theme-toggle');
    this.THEME_KEY = 'theme-preference';
    this.systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.initialized = false;

    // Initialize state
    this.userPreference = localStorage.getItem(this.THEME_KEY);
    this.currentTheme = this.determineInitialTheme();
  }

  determineInitialTheme() {
    // Priority: User Preference > System Theme > Default Dark
    if (this.userPreference) {
      return this.userPreference;
    }

    const platform = this.detectPlatform();
    if (platform === 'iOS' || platform === 'Android') {
      return this.getMobileAutoTheme();
    }

    return this.getSystemTheme();
  }

  async initialize() {
    try {
      debug('Initializing theme manager');

      if (!this.themeToggle) {
        throw new Error('Theme toggle button not found');
      }

      // Set initial theme
      this.setTheme(this.currentTheme, false);

      // Attach event listeners
      this.attachEventListeners();

      this.initialized = true;
      debug('Theme manager initialized');
      return true;
    } catch (error) {
      debug('Error initializing theme manager:', error);
      return false;
    }
  }

  attachEventListeners() {
    // Theme toggle click
    this.themeToggle?.addEventListener('click', () => {
      const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
      this.setTheme(newTheme, true);
    });

    // System theme change
    this.systemThemeQuery.addEventListener('change', (e) => {
      if (!this.userPreference) {
        this.setTheme(e.matches ? 'dark' : 'light', false);
      }
    });

    // Handle visibility change for mobile
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        const platform = this.detectPlatform();
        if (
          (platform === 'iOS' || platform === 'Android') &&
          !this.userPreference
        ) {
          this.setTheme(this.getMobileAutoTheme(), false);
        }
      }
    });
  }

  setTheme(theme, isUserAction = false) {
    this.currentTheme = theme;
    this.html.setAttribute('data-theme', theme);

    if (isUserAction) {
      localStorage.setItem(this.THEME_KEY, theme);
      this.userPreference = theme;
    }

    this.updateIcon();
    document.dispatchEvent(
      new CustomEvent('themechange', { detail: { theme } })
    );
  }

  updateIcon() {
    if (!this.themeToggle) return;

    const icon =
      this.currentTheme === 'dark' ? icons.theme.light : icons.theme.dark;
    this.themeToggle.innerHTML = icon;
    this.themeToggle.setAttribute(
      'aria-label',
      `Switch to ${this.currentTheme === 'dark' ? 'light' : 'dark'} theme`
    );
  }

  detectPlatform() {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
      return 'iOS';
    } else if (ua.includes('mac os x')) {
      return 'macOS';
    } else if (ua.includes('android')) {
      return 'Android';
    } else if (ua.includes('windows')) {
      return 'Windows';
    } else if (ua.includes('linux')) {
      return 'Linux';
    }
    return 'Unknown';
  }

  getSystemTheme() {
    return this.systemThemeQuery.matches ? 'dark' : 'light';
  }

  getMobileAutoTheme() {
    const hour = new Date().getHours();
    return hour >= 19 || hour < 7 ? 'dark' : 'light';
  }
}

export default new ThemeManager();
