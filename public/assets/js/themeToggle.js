import { sunIcon, moonIcon } from './core/icons.js';

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

    return this.getSystemTheme();
  }

  async initialize() {
    try {
      if (!this.themeToggle) {
        throw new Error('Theme toggle button not found');
      }

      // Set initial theme
      this.setTheme(this.currentTheme, false);

      // Attach event listeners
      this.attachEventListeners();

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing theme manager:', error);
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

    const icon = this.currentTheme === 'dark' ? sunIcon : moonIcon;
    this.themeToggle.innerHTML = icon;
    this.themeToggle.setAttribute(
      'aria-label',
      `Switch to ${this.currentTheme === 'dark' ? 'light' : 'dark'} theme`
    );
  }

  getSystemTheme() {
    return this.systemThemeQuery.matches ? 'dark' : 'light';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const themeManager = new ThemeManager();
  themeManager.initialize();
});

export default ThemeManager;
