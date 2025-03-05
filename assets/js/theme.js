// Theme manager class to handle theme switching and persistence
class ThemeManager {
  constructor() {
    this.html = document.documentElement;
    this.themeToggle = document.getElementById('theme-toggle');
    this.darkIcon = this.themeToggle?.querySelector('.moon-icon');
    this.lightIcon = this.themeToggle?.querySelector('.sun-icon');
    this.THEME_KEY = 'theme-preference';

    this.initialize();
  }

  getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  getStoredTheme() {
    return localStorage.getItem(this.THEME_KEY);
  }

  setTheme(theme) {
    this.html.setAttribute('data-theme', theme);
    localStorage.setItem(this.THEME_KEY, theme);
    this.updateIcons(theme);
  }

  updateIcons(theme) {
    if (this.darkIcon && this.lightIcon) {
      const isDark = theme === 'dark';
      this.darkIcon.style.display = isDark ? 'none' : 'block';
      this.lightIcon.style.display = isDark ? 'block' : 'none';
    }
  }

  handleThemeChange() {
    const currentTheme = this.html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  }

  initialize() {
    // Set initial theme
    const storedTheme = this.getStoredTheme();
    const initialTheme = storedTheme || this.getSystemTheme();
    this.setTheme(initialTheme);

    // Add event listeners
    this.themeToggle?.addEventListener('click', () => this.handleThemeChange());

    // Listen for system theme changes
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', (e) => {
        if (!this.getStoredTheme()) {
          this.setTheme(e.matches ? 'dark' : 'light');
        }
      });
  }
}

// Initialize theme manager when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new ThemeManager());
} else {
  new ThemeManager();
}
