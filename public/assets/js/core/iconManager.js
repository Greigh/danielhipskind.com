import * as icons from './icons.js';
import { debug } from './utils.js';

class IconManager {
  constructor() {
    this.icons = {
      ...icons,
      language: icons.languages, // Add alias for consistency
    };
  }

  getSocialIcon(name) {
    return this.icons.social[name.toLowerCase()] || '';
  }

  getWorkflowIcon(type) {
    switch (type.toLowerCase()) {
      case 'linting':
        return this.icons.workflow.lint;
      case 'testing':
        return this.icons.workflow.test;
      case 'error webhook':
        return this.icons.workflow.discord; // Only return Discord icon
      default:
        return this.icons.workflow.github;
    }
  }

  getLanguageIcon(name) {
    if (!name) return this.icons.workflow.github;

    // Create a mapping of normalized names to their correct cases
    const caseMap = {
      html: 'HTML',
      css: 'CSS',
      javascript: 'JavaScript',
      typescript: 'TypeScript',
      nodejs: 'NodeJS',
      python: 'Python',
      java: 'Java',
      csharp: 'CSharp',
      cpp: 'CPP',
      ruby: 'Ruby',
      go: 'Go',
      rust: 'Rust',
      php: 'PHP',
      swift: 'Swift',
      ejs: 'EJS',
    };

    // Normalize the input name
    const normalizedName = name.toLowerCase().replace(/[^a-z]/g, '');

    // Get the correct casing from the map or capitalize first letter
    const properName =
      caseMap[normalizedName] ||
      name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();

    // Look up the icon in our languages collection
    const language = this.icons.languages[properName];
    return language ? language.icon : this.icons.workflow.github;
  }

  attachSocialIcons() {
    document.querySelectorAll('[data-icon]').forEach((element) => {
      const iconName = element.dataset.icon;
      if (iconName) {
        element.innerHTML = this.getSocialIcon(iconName);
      }
    });
  }

  getAnalyticsIcon(name, subcategory = null) {
    if (subcategory) {
      return this.icons.analytics[subcategory][name] || '';
    }
    return this.icons.analytics[name] || '';
  }

  getPreferencesIcon(name) {
    return this.icons.preferences[name] || '';
  }

  getStatusIcon(isActive) {
    return isActive
      ? this.icons.analytics.status.active
      : this.icons.analytics.status.inactive;
  }

  getDashboardIcon(type) {
    return this.icons.analytics.dashboard[type] || '';
  }

  attachAnalyticsIcons() {
    // Attach main analytics icons
    document.querySelectorAll('[data-analytics-icon]').forEach((element) => {
      const iconName = element.dataset.analyticsIcon;
      const subcategory = element.dataset.subcategory;
      if (iconName) {
        element.innerHTML = this.getAnalyticsIcon(iconName, subcategory);
      }
    });

    // Attach dashboard icons
    document.querySelectorAll('[data-dashboard-icon]').forEach((element) => {
      const type = element.dataset.dashboardIcon;
      if (type) {
        element.innerHTML = this.getDashboardIcon(type);
      }
    });

    // Attach status icons
    document.querySelectorAll('[data-status-icon]').forEach((element) => {
      const isActive = element.dataset.statusIcon === 'true';
      element.innerHTML = this.getStatusIcon(isActive);
    });
  }

  attachPreferencesIcons() {
    document.querySelectorAll('[data-preferences-icon]').forEach((element) => {
      const iconName = element.dataset.preferencesIcon;
      if (iconName) {
        element.innerHTML = this.getPreferencesIcon(iconName);
      }
    });
  }

  async attachAllIcons() {
    try {
      const iconElements = document.querySelectorAll('[data-icon]');
      if (!iconElements.length) return true;

      // Your icon attachment logic here
      return true;
    } catch (error) {
      console.error('Icon attachment failed:', error);
      return false;
    }
  }

  // Add new method for theme icon
  async attachThemeIcon() {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      themeToggle.innerHTML =
        currentTheme === 'dark'
          ? this.icons.theme.light
          : this.icons.theme.dark;
    }
  }
}

export default new IconManager();
