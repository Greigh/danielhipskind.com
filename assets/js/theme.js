import { sunIcon, moonIcon } from './icons.js';

class ThemeManager {
  constructor() {
    this.html = document.documentElement;
    this.themeToggle = document.getElementById('theme-toggle');
    this.THEME_KEY = 'theme-preference';
    this.userPreference = localStorage.getItem(this.THEME_KEY);
    this.systemPreference = window.matchMedia('(prefers-color-scheme: dark)');
    this.currentTheme =
      this.userPreference || (this.systemPreference.matches ? 'dark' : 'light');
    this.activeMediaQuery = null;
  }

  initialize() {
    if (!this.themeToggle) {
      console.error('Theme toggle button not found');
      return false;
    }

    // Make button more accessible
    this.themeToggle.setAttribute('role', 'button');
    this.themeToggle.setAttribute('tabindex', '0');

    // Apply initial theme
    this.setTheme(this.currentTheme, false);
    this.updateIcon();
    this.setupEventListeners();

    return true;
  }

  setTheme(theme, savePreference = true) {
    this.currentTheme = theme;
    this.html.setAttribute('data-theme', theme);
    if (savePreference) {
      localStorage.setItem(this.THEME_KEY, theme);
    }
    this.updateIcon();
  }

  updateIcon() {
    this.themeToggle.innerHTML =
      this.currentTheme === 'dark' ? sunIcon : moonIcon;
    this.themeToggle.setAttribute(
      'aria-label',
      `Switch to ${this.currentTheme === 'dark' ? 'light' : 'dark'} theme`
    );
  }

  setupEventListeners() {
    // Handle manual theme toggle
    this.themeToggle.addEventListener('click', () => {
      const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
      localStorage.setItem(this.THEME_KEY, newTheme); // Save explicit preference
      this.setTheme(newTheme, true);
    });

    // Handle keyboard accessibility
    this.themeToggle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.themeToggle.click();
      }
    });

    // Handle system theme changes
    this.systemPreference.addEventListener('change', (e) => {
      // Only follow system preference if user hasn't set a preference
      if (!localStorage.getItem(this.THEME_KEY)) {
        this.setTheme(e.matches ? 'dark' : 'light', false);
      }
    });
  }
}

const themeManager = new ThemeManager();
export default themeManager;
