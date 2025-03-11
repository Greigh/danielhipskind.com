import { sunIcon, moonIcon } from './icons.js';

class ThemeManager {
  constructor() {
    this.html = document.documentElement;
    this.themeToggle = document.getElementById('theme-toggle');
    this.THEME_KEY = 'theme-preference';
    this.systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.platform = this.detectPlatform();

    // Initialize state
    this.userPreference = localStorage.getItem(this.THEME_KEY);
    this.currentTheme = this.determineTheme();

    // Initialize debug properties
    this.debugEl = null;
    this.debugEnabled = false;
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

  isAutoThemeMobile() {
    // Check if device is mobile and in auto theme mode
    if (this.platform === 'iOS' || this.platform === 'Android') {
      const now = new Date();
      const hour = now.getHours();

      // If system theme changes within a short time, device is likely in auto mode
      const initialTheme = this.systemThemeQuery.matches;

      // iOS and Android typically switch at 7PM/7AM
      const shouldBeDark = hour >= 19 || hour < 7;
      return shouldBeDark === initialTheme;
    }
    return false;
  }

  determineTheme() {
    // 1. Check if system has auto theme preference
    if (this.systemThemeQuery.matches !== null) {
      return this.getSystemTheme();
    }

    // 2. Check for mobile auto mode
    if (this.isAutoThemeMobile()) {
      localStorage.removeItem(this.THEME_KEY);
      this.userPreference = null;
      return this.getMobileAutoTheme();
    }

    // 3. Use user preference if available
    if (this.userPreference) {
      return this.userPreference;
    }

    // 4. Default fallback to dark mode
    return 'dark';
  }

  getMobileAutoTheme() {
    const hour = new Date().getHours();
    return hour >= 19 || hour < 7 ? 'dark' : 'light';
  }

  initialize() {
    if (!this.themeToggle) {
      console.error('Theme toggle button not found');
      return false;
    }

    // Create debug indicator before setting initial theme
    this.createDebugIndicator();

    // Set initial theme
    this.setTheme(this.currentTheme, false);

    // Listen for system changes
    this.systemThemeQuery.addEventListener('change', (e) => {
      // Only follow system changes if no user preference
      if (!this.userPreference) {
        this.setTheme(e.matches ? 'dark' : 'light', false);
      }
    });

    // Handle manual toggle
    this.themeToggle.addEventListener('click', () => {
      const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
      this.setTheme(newTheme, true);
    });

    return true;
  }

  handleSystemChange() {
    // Only update if user hasn't set a preference
    if (!localStorage.getItem(this.THEME_KEY)) {
      const newTheme = this.getSystemTheme();
      this.setTheme(newTheme, false);
    }
  }

  setTheme(theme, isUserAction = false) {
    this.currentTheme = theme;
    this.html.setAttribute('data-theme', theme);

    // Always update the icon and store user preference on manual changes
    if (isUserAction) {
      localStorage.setItem(this.THEME_KEY, theme);
      this.userPreference = theme;
    }

    this.updateIcon();
    if (this.debugEnabled) this.updateDebugInfo();
  }

  updateIcon() {
    const icon = this.currentTheme === 'dark' ? sunIcon : moonIcon;
    this.themeToggle.innerHTML = icon;
    this.themeToggle.setAttribute(
      'aria-label',
      `Switch to ${this.currentTheme === 'dark' ? 'light' : 'dark'} theme`
    );
  }

  createDebugIndicator() {
    // Create debug element
    this.debugEl = document.createElement('div');
    this.debugEl.style.cssText = `
      position: fixed;
      bottom: 10px;
      left: 10px;
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 8px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 9999;
      font-family: monospace;
      display: none;
    `;
    document.body.appendChild(this.debugEl);

    // Add debug toggle
    const debugToggle = document.createElement('div');
    debugToggle.style.cssText = `
      position: fixed;
      bottom: 10px;
      left: 10px;
      width: 20px;
      height: 20px;
      background: red;
      border-radius: 50%;
      z-index: 10000;
    `;
    debugToggle.addEventListener('click', () => {
      this.debugEnabled = !this.debugEnabled;
      this.debugEl.style.display = this.debugEnabled ? 'block' : 'none';
      if (this.debugEnabled) {
        this.updateDebugInfo();
      }
    });
    document.body.appendChild(debugToggle);
  }

  updateDebugInfo() {
    // Only update if debug element exists
    if (this.debugEl && this.debugEnabled) {
      this.debugEl.innerHTML = `
        Platform: ${this.platform}<br>
        User Pref: ${this.userPreference || 'none'}<br>
        System: ${this.getSystemTheme()}<br>
        Current: ${this.currentTheme}<br>
        Storage: ${localStorage.getItem(this.THEME_KEY) || 'none'}
      `;
    }
  }
}

export default new ThemeManager();
