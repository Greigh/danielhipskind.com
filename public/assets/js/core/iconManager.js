/**
 * @dev Remember to disable debugging in production
 * 1. Set DEBUG_CONFIG.enabled = false in debug.js
 * 2. Or remove debug imports and calls for production build
 */

import { languages, workflow, social, theme, fallback } from './icons.js';
import {
  languageNames,
  workflowNames,
  getIconKey,
  getDisplayName,
  iconKeyMap,
  workflowKeyMap, // Add this import
} from './config/iconNames.js';
import {
  DEBUG_CONFIG,
  debug,
  debugWorkflow,
  debugWorkflowValidation,
} from '../utils/debug.js';

class IconManager {
  constructor() {
    // Initialize icons with validation using imported fallbacks
    this.icons = {
      language: languages || {},
      workflow: workflow || {},
      social: social || {},
      theme: theme || {},
      fallback: fallback,
    };

    // Initialize display names
    this.displayNames = {
      language: languageNames,
      workflow: workflowNames,
    };

    // Use the imported mappings
    this.workflowMapping = workflowNames;
    this.iconMapping = iconKeyMap;

    // Debug initial state
    if (DEBUG_CONFIG?.enabled) {
      debug('IconManager initialized with:', {
        workflowMapping: this.workflowMapping,
        iconMapping: this.iconMapping,
        availableIcons: {
          workflow: Object.keys(this.icons.workflow),
          language: Object.keys(this.icons.language),
        },
        fallbacks: Object.keys(this.icons.fallback),
      });
    }

    // Validate icons after initialization
    this.validateIcons();
  }

  validateIcons() {
    const required = {
      language: ['javascript', 'html', 'css'],
      workflow: ['lint', 'eslint', 'aglint'],
      social: ['github', 'linkedin'],
    };

    debug('Validating icons:', {
      requiredIcons: required,
      availableIcons: {
        language: Object.keys(this.icons.language),
        workflow: Object.keys(this.icons.workflow),
        social: Object.keys(this.icons.social),
      },
      missingIcons: Object.entries(required).reduce(
        (acc, [category, icons]) => {
          acc[category] = icons.filter((icon) => !this.icons[category][icon]);
          return acc;
        },
        {}
      ),
    });

    // Validate each category has required icons
    Object.entries(required).forEach(([category, requiredIcons]) => {
      const missing = requiredIcons.filter(
        (icon) => !this.icons[category][icon]
      );

      if (missing.length > 0) {
        debug(`Missing ${category} icons:`, {
          category,
          missing,
          available: Object.keys(this.icons[category]),
        });
      }
    });

    // Validate fallbacks exist
    const requiredFallbacks = ['default', 'language', 'workflow', 'social'];
    const missingFallbacks = requiredFallbacks.filter(
      (key) => !this.icons.fallback[key]
    );
    if (missingFallbacks.length > 0) {
      debug('Missing fallback icons:', {
        missing: missingFallbacks,
        available: Object.keys(this.icons.fallback),
      });
    }

    // Validate workflow mappings
    const workflowMapping = this.workflowMapping || {};
    const workflowIcons = this.icons?.workflow || {};

    if (workflowMapping) {
      const invalidMappings = Object.entries(workflowMapping).filter(
        ([_, target]) => !workflowIcons[target]
      );

      if (invalidMappings.length > 0) {
        debug('Invalid workflow mappings:', {
          invalid: invalidMappings,
          availableTargets: Object.keys(workflowIcons),
        });
      }
    }

    // Add workflow validation using imported utilities
    const workflowValidation = {
      required: required.workflow,
      available: Object.keys(workflowIcons),
      missing: [],
      mappingValid: false,
      errors: [],
    };

    // Validate workflow names against config
    Object.keys(workflowIcons).forEach((key) => {
      if (!workflowNames[key]) {
        workflowValidation.errors.push(
          `Missing workflow name config for: ${key}`
        );
      }
    });

    // Validate icon keys
    Object.keys(workflowMapping).forEach((key) => {
      const iconKey = getIconKey(key);
      if (!workflowIcons[iconKey]) {
        workflowValidation.missing.push(key);
        workflowValidation.errors.push(
          `Invalid workflow mapping: ${key} -> ${iconKey}`
        );
      }
    });

    workflowValidation.mappingValid = workflowValidation.errors.length === 0;

    // Call debug workflow validation
    debugWorkflowValidation(workflowValidation);

    // Final validation state
    const validationState = {
      hasRequiredLanguages: required.language.every(
        (lang) => this.icons.language[lang]
      ),
      hasRequiredWorkflows: required.workflow.every(
        (flow) => this.icons.workflow[flow]
      ),
      hasRequiredSocial: required.social.every((soc) => this.icons.social[soc]),
      hasFallbacks: requiredFallbacks.every(
        (fall) => this.icons.fallback[fall]
      ),
      hasWorkflowMapping: Boolean(this.workflowMapping),
    };
    debug('Icon validation complete:', validationState);

    // Return validation state
    return validationState;
  }

  // Update getLanguageIcon to use the imported utilities
  getLanguageIcon(name) {
    const rawKey = name?.toLowerCase();
    const iconKey = getIconKey(rawKey);
    const displayName = getDisplayName('language', rawKey);

    debug('Language icon lookup:', {
      originalName: name,
      rawKey,
      iconKey,
      displayName,
      hasIcon: Boolean(this.icons.language[iconKey]),
    });

    if (!name) {
      debug('IconManager: No language name provided');
      return this.icons.fallback.language;
    }

    const icon = this.icons.language[iconKey];
    if (!icon) {
      debug(`No icon found for ${name} (key: ${iconKey})`);
      return {
        icon: this.icons.fallback.language,
        name: this.displayNames.language[iconKey] || name,
      };
    }

    return {
      icon,
      name: this.displayNames.language[iconKey] || name,
    };
  }

  getWorkflowIcon(name) {
    if (!name) {
      debugWorkflow('Empty workflow name provided', {
        validation: { status: 'error', reason: 'empty input' },
      });
      return {
        icon: this.icons.fallback.workflow,
        name: 'Unknown',
      };
    }

    try {
      const rawKey = name.toLowerCase();
      const mappedKey = workflowKeyMap[rawKey] || rawKey;

      debugWorkflow('Processing workflow icon request', {
        validation: {
          input: name,
          normalized: rawKey,
          mapped: mappedKey,
        },
        icons: {
          available: Object.keys(this.icons.workflow),
          requested: mappedKey,
        },
        mapping: {
          success: Boolean(this.icons.workflow[mappedKey]),
          fallbackUsed: !this.icons.workflow[mappedKey],
        },
      });

      const icon = this.icons.workflow[mappedKey];

      if (!icon) {
        return {
          icon: this.icons.fallback.workflow,
          name: workflowNames[mappedKey] || name,
        };
      }

      return {
        icon,
        name: workflowNames[mappedKey] || name,
      };
    } catch (error) {
      debugWorkflow('Error processing workflow', {
        validation: { status: 'error', reason: error.message },
        error: error,
      });
      return {
        icon: this.icons.fallback.workflow,
        name: workflowNames[name] || name,
      };
    }
  }

  getSocialIcon(name) {
    // Initial validation with debug
    if (!name) {
      debug('Social validation:', {
        received: name,
        type: typeof name,
        status: 'empty input',
      });
      return null;
    }

    // Add comprehensive debug output
    debug('Social request:', {
      input: {
        original: name,
        normalized: name.toLowerCase(),
      },
      icons: {
        available: Object.keys(this.icons.social),
        requested: name,
        exists: Boolean(this.icons.social[name]),
      },
      state: {
        hasSocialIcons: Boolean(this.icons.social),
        hasFallback: Boolean(this.icons.fallback.social),
      },
    });

    const icon = this.icons.social[name];
    // Debug icon resolution
    debug('Social resolution:', {
      originalName: name,
      iconFound: Boolean(icon),
      usingFallback: !icon,
      returnValue: {
        icon: icon || this.icons.fallback.social,
        name: name,
      },
    });

    if (!icon) {
      return {
        icon: this.icons.fallback.social,
        name,
      };
    }

    return { icon, name };
  }

  generateSocialLinks() {
    const socialOrder = [
      'github',
      'linkedin',
      'email',
      'discord',
      'twitter',
      'bluesky',
    ];
    const socialLinks = {
      github: 'https://github.com/greigh',
      linkedin: 'https://linkedin.com/in/danielhipskind',
      email: 'mailto:me@danielhipskind.com',
      discord: 'https://discordapp.com/users/greigh.',
      twitter: 'https://twitter.com/danielhipskind_',
      bluesky: 'https://bsky.app/profile/danielhipskind.com',
    };

    const container = document.querySelector('.social-links');
    if (!container) return;

    container.innerHTML = socialOrder
      .map((name) => {
        const iconData = this.getSocialIcon(name);
        if (!iconData) return '';

        return `
          <a href="${socialLinks[name]}"
             class="social-icon"
             aria-label="${name}"
             ${name !== 'email' ? 'target="_blank" rel="noopener noreferrer"' : ''}>
            ${iconData.icon}
          </a>
        `;
      })
      .join('');
  }

  attachThemeIcon() {
    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
      const isDark =
        document.documentElement.getAttribute('data-theme') === 'dark';
      toggle.innerHTML = isDark
        ? this.icons.theme.sunIcon
        : this.icons.theme.moonIcon;
    }
  }

  initialize() {
    try {
      this.generateSocialLinks();
      this.attachThemeIcon();
      return true;
    } catch (error) {
      debug('IconManager initialization failed:', error);
      return false;
    }
  }
}

// Create and export a singleton instance
export default new IconManager();
