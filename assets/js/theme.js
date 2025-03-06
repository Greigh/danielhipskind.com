import { icons } from './icons.js';

class ThemeManager {
  constructor() {
    this.html = document.documentElement;
    this.themeToggle = document.getElementById('theme-toggle');
    this.THEME_KEY = 'theme-preference';
  }

  initialize() {
    const storedTheme = localStorage.getItem(this.THEME_KEY);
    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)'
    ).matches;
    const initialTheme = storedTheme || (prefersDark ? 'dark' : 'light');

    this.setTheme(initialTheme);
    this.updateIcon(initialTheme);

    if (this.themeToggle) {
      this.themeToggle.addEventListener('click', () => {
        const currentTheme = this.html.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
        this.updateIcon(newTheme);
      });
    }
  }

  setTheme(theme) {
    this.html.setAttribute('data-theme', theme);
    localStorage.setItem(this.THEME_KEY, theme);
  }

  updateIcon(theme) {
    if (this.themeToggle) {
      this.themeToggle.innerHTML =
        theme === 'dark' ? icons.theme.light : icons.theme.dark;
    }
  }
}

const themeManager = new ThemeManager();
export default themeManager;
