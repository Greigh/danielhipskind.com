import { initializeContent } from './contentManager.js';
import { initializeObservers } from './observerManager.js';

// Function to initialize the application
const initializeApp = async () => {
  try {
    // Initialize GitHub API if the script is loaded
    if (typeof Octokit !== 'undefined') {
      window.Octokit = Octokit;
    }

    // Initialize content (includes projects, skills, and social links)
    await initializeContent();

    // Initialize intersection observers for animations
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

// Export for potential use in other modules
export { initializeApp };
