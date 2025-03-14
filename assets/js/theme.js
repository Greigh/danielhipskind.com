import { sunIcon, moonIcon } from './icons.js';

class ThemeManager {
  static instance = null;

  constructor() {
    // Singleton pattern
    if (ThemeManager.instance) {
      return ThemeManager.instance;
    }
    ThemeManager.instance = this;

    this.html = document.documentElement;
    this.themeToggle = document.getElementById('theme-toggle');
    this.THEME_KEY = 'theme-preference';
    this.systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');

    // Initialize state
    this.userPreference = localStorage.getItem(this.THEME_KEY);
    this.currentTheme = this.determineTheme();

    // Debug flag
    this.initialized = false;
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

  determineTheme() {
    // Use user preference if available
    if (this.userPreference) {
      return this.userPreference;
    }

    // Otherwise use system preference
    return this.getSystemTheme();
  }

  getMobileAutoTheme() {
    const hour = new Date().getHours();
    return hour >= 19 || hour < 7 ? 'dark' : 'light';
  }

  initialize() {
    if (this.initialized) {
      return true;
    }

    if (!this.themeToggle) {
      console.error('Theme toggle button not found');
      return false;
    }

    // Set initial theme
    this.setTheme(this.currentTheme, false);

    // Listen for system changes when no user preference exists
    this.systemThemeQuery.addEventListener('change', (e) => {
      if (!this.userPreference) {
        this.setTheme(e.matches ? 'dark' : 'light', false);
      }
    });

    // Handle manual toggle
    this.themeToggle.addEventListener('click', () => {
      const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
      this.setTheme(newTheme, true); // true marks this as a user action
    });

    this.initialized = true;
    return true;
  }

  setTheme(theme, isUserAction = false) {
    this.currentTheme = theme;
    this.html.setAttribute('data-theme', theme);

    if (isUserAction) {
      localStorage.setItem(this.THEME_KEY, theme);
      this.userPreference = theme;
    }

    this.updateIcon();
  }

  updateIcon() {
    const icon = this.currentTheme === 'dark' ? sunIcon : moonIcon;
    this.themeToggle.innerHTML = icon;
    this.themeToggle.setAttribute(
      'aria-label',
      `Switch to ${this.currentTheme === 'dark' ? 'light' : 'dark'} theme`
    );
  }
}

export default new ThemeManager();
