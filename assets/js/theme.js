import { sunIcon, moonIcon } from './icons.js';

class ThemeManager {
  constructor() {
    this.html = document.documentElement;
    this.themeToggle = document.getElementById('theme-toggle');
    this.THEME_KEY = 'theme-preference';
    this.currentTheme = localStorage.getItem(this.THEME_KEY) || 'light';
  }

  initialize() {
    if (!this.themeToggle) {
      console.error('Theme toggle button not found');
      return false;
    }

    // Check system preference
    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)'
    ).matches;
    const initialTheme =
      localStorage.getItem(this.THEME_KEY) || (prefersDark ? 'dark' : 'light');

    this.currentTheme = initialTheme;
    this.setTheme(initialTheme);
    this.updateIcon();
    this.setupEventListeners();

    return true;
  }

  setTheme(theme) {
    this.currentTheme = theme;
    this.html.setAttribute('data-theme', theme);
    localStorage.setItem(this.THEME_KEY, theme);
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
    this.themeToggle.addEventListener('click', () => {
      const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
      this.setTheme(newTheme);
    });

    // Listen for system theme changes
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', (e) => {
        if (!localStorage.getItem(this.THEME_KEY)) {
          this.setTheme(e.matches ? 'dark' : 'light');
        }
      });
  }
}

const themeManager = new ThemeManager();
export default themeManager;
