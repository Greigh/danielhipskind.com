import { initializeContent } from './contentManager.js';
import { initializeObservers } from './observerManager.js';
import themeManager from './theme.js';
import navigationManager from './navigationManager.js';

const initializeApp = async () => {
  try {
    const { config } = await import('./config.js');
    const { projectManager } = await import('./projectManager.js');

    // Initialize managers
    themeManager.initialize();
    navigationManager.initialize();
    await projectManager.initialize();

    // Initialize content and observers
    await initializeContent();
    initializeObservers();
  } catch (error) {
    console.error('Error initializing application:', error);
  }
};

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

export { initializeApp };
