import { icons } from './icons.js';

class IconManager {
  constructor() {
    this.icons = icons;
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

    // Handle special cases that need to be fully uppercase
    const upperCaseLanguages = ['HTML', 'CSS'];
    if (upperCaseLanguages.includes(name.toUpperCase())) {
      const language = this.icons.language[name.toUpperCase()];
      if (language) {
        return language.icon.replace('currentColor', language.color);
      }
    }

    // Special case for JavaScript (maintain camelCase)
    if (name.toLowerCase() === 'javascript') {
      const language = this.icons.language.JavaScript;
      if (language) {
        return language.icon.replace('currentColor', language.color);
      }
    }

    // For all other languages, capitalize first letter
    const properName =
      name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    const language = this.icons.language[properName];
    return language
      ? language.icon.replace('currentColor', language.color)
      : this.icons.workflow.github;
  }

  attachSocialIcons() {
    document.querySelectorAll('[data-icon]').forEach((element) => {
      const iconName = element.dataset.icon;
      if (iconName) {
        element.innerHTML = this.getSocialIcon(iconName);
      }
    });
  }
}

const iconManager = new IconManager();
export default iconManager;
