import { debug } from '../utils/debug.js';

const TEMPLATES = {
  privacyControls: {
    path: '/templates/privacy-controls.html',
    targetId: '#privacy-controls-template',
  },
  analyticsDashboard: {
    path: '/templates/analytics-dashboard.html',
    targetId: '#analytics-dashboard-template',
  },
};

export async function loadTemplates() {
  try {
    debug('Starting template loading');

    const loadPromises = Object.entries(TEMPLATES).map(
      async ([name, config]) => {
        try {
          const response = await fetch(config.path);

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const content = await response.text();
          const target = document.querySelector(config.targetId);

          if (!target) {
            throw new Error(`Target element not found: ${config.targetId}`);
          }

          target.innerHTML = content;
          debug(`Template loaded successfully: ${name}`);
          return true;
        } catch (error) {
          debug(`Error loading template ${name}:`, error);
          return false;
        }
      }
    );

    const results = await Promise.all(loadPromises);
    const allLoaded = results.every(Boolean);

    if (allLoaded) {
      debug('All templates loaded successfully');
    } else {
      debug('Some templates failed to load');
    }

    return allLoaded;
  } catch (error) {
    debug('Critical error loading templates:', error);
    return false;
  }
}

export async function loadTemplate(templateId) {
  if (!TEMPLATES[templateId]) {
    debug(`Template ${templateId} not found in configuration`);
    return false;
  }

  try {
    const config = TEMPLATES[templateId];
    const response = await fetch(config.path);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const content = await response.text();
    const target = document.querySelector(config.targetId);

    if (!target) {
      throw new Error(`Target element not found: ${config.targetId}`);
    }

    target.innerHTML = content;
    debug(`Template ${templateId} loaded successfully`);
    return true;
  } catch (error) {
    debug(`Error loading template ${templateId}:`, error);
    return false;
  }
}
