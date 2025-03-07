import { initializeContent } from './contentManager.js';
import { initializeObservers } from './observerManager.js';
import themeManager from './theme.js';
import navigationManager from './navigationManager.js';
import iconManager from './iconManager.js';

const initializeUI = () => {
  // Initialize navigation and theme together
  const navInit = navigationManager.initialize();
  const themeInit = themeManager.initialize();

  // Check for initialization failures
  if (!navInit || !themeInit) {
    console.error('Failed to initialize UI components');
  }
};

const initializeApp = async () => {
  try {
    const { config } = await import('./config.js');
    const { projectManager } = await import('./projectManager.js');

    // Initialize UI first
    initializeUI();

    // Initialize remaining managers
    await projectManager.initialize();
    await initializeContent();
    initializeObservers();
  } catch (error) {
    console.error('Error initializing application:', error);
  }
};

// Single DOMContentLoaded check
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

export { initializeApp };
