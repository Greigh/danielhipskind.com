import { initializeContent } from './contentManager.js';
import { initializeObservers } from './observerManager.js';
import themeManager from './theme.js';
import navigationManager from './navigationManager.js';
import iconManager from './iconManager.js';
import { loadAnalytics } from './utils/analyticsLoader.js';

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

const initializePrivacyBanner = () => {
  const privacyBanner = document.getElementById('privacy-banner');
  const hasUserChoice = localStorage.getItem('analytics-enabled') !== null;

  // Show banner only if user hasn't made a choice yet
  if (!hasUserChoice && privacyBanner) {
    privacyBanner.style.display = 'block';

    // Handle accept button
    document.getElementById('accept-privacy')?.addEventListener('click', () => {
      localStorage.setItem('analytics-enabled', 'true');
      privacyBanner.style.display = 'none';
      loadAnalytics();
    });

    // Handle reject button
    document.getElementById('reject-privacy')?.addEventListener('click', () => {
      localStorage.setItem('analytics-enabled', 'false');
      privacyBanner.style.display = 'none';
    });
  }
};

// Single DOMContentLoaded check
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// Load analytics after user interaction
document.getElementById('accept-privacy')?.addEventListener('click', () => {
  localStorage.setItem('analytics-enabled', 'true');
  loadAnalytics();
  // Hide privacy banner or update UI as needed
  const banner = document.getElementById('privacy-banner');
  if (banner) {
    banner.style.display = 'none';
  }
});

initializeApp().then(() => {
  initializePrivacyBanner();
});

export { initializeApp };
