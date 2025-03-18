import { theme } from './core/icons.js';

/**
 * Initialize theme based on stored preference or system default
 * This runs immediately to prevent flash of incorrect theme
 */
if (localStorage.getItem('theme-preference')) {
  document.documentElement.setAttribute(
    'data-theme',
    localStorage.getItem('theme-preference')
  );
} else {
  document.documentElement.setAttribute(
    'data-theme',
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );
}

/**
 * Manages theme switching functionality and persistence
 * Implements Singleton pattern to ensure only one instance exists
 * @class ThemeManager
 */
class ThemeManager {
  /** @type {ThemeManager|null} Singleton instance */
  static instance = null;

  /**
   * Creates or returns the singleton instance of ThemeManager
   * Initializes theme state and DOM references
   * @constructor
   */
  constructor() {
    if (ThemeManager.instance) {
      return ThemeManager.instance;
    }
    ThemeManager.instance = this;

    /** @type {HTMLElement} Root HTML element */
    this.html = document.documentElement;

    /** @type {HTMLElement|null} Theme toggle button element */
    this.themeToggle = document.getElementById('theme-toggle');

    /** @type {string} Local storage key for theme preference */
    this.THEME_KEY = 'theme-preference';

    /** @type {MediaQueryList} System dark mode preference */
    this.systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');

    /** @type {string} Current active theme */
    this.currentTheme = this.html.getAttribute('data-theme');

    this.updateIcon();
  }

  /**
   * Determines initial theme based on user preference or system setting
   * @returns {string} 'dark' or 'light'
   */
  determineInitialTheme() {
    if (this.userPreference) {
      return this.userPreference;
    }
    return this.getSystemTheme();
  }

  /**
   * Initializes the theme manager
   * Sets up event listeners and initial state
   * @async
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    try {
      if (!this.themeToggle) {
        throw new Error('Theme toggle button not found');
      }
      this.attachEventListeners();
      return true;
    } catch (error) {
      console.error('Error initializing theme manager:', error);
      return false;
    }
  }

  /**
   * Attaches event listeners for theme changes
   * Handles both manual toggle and system theme changes
   * @private
   */
  attachEventListeners() {
    // Theme toggle click handler
    this.themeToggle?.addEventListener('click', () => {
      const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
      this.setTheme(newTheme, true);
    });

    // System theme change handler
    this.systemThemeQuery.addEventListener('change', (e) => {
      if (!this.userPreference) {
        this.setTheme(e.matches ? 'dark' : 'light', false);
      }
    });
  }

  /**
   * Sets the active theme and updates UI
   * @param {string} theme - 'dark' or 'light'
   * @param {boolean} isUserAction - Whether change was user-initiated
   */
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

  /**
   * Updates the theme toggle button icon
   * @private
   */
  updateIcon() {
    if (!this.themeToggle) return;

    const icon = this.currentTheme === 'dark' ? theme.sunIcon : theme.moonIcon;
    this.themeToggle.innerHTML = icon;
    this.themeToggle.setAttribute(
      'aria-label',
      `Switch to ${this.currentTheme === 'dark' ? 'light' : 'dark'} theme`
    );
  }

  /**
   * Gets the system color scheme preference
   * @returns {string} 'dark' or 'light'
   */
  getSystemTheme() {
    return this.systemThemeQuery.matches ? 'dark' : 'light';
  }
}

// Initialize theme manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const themeManager = new ThemeManager();
  themeManager.initialize();
});

export default ThemeManager;
