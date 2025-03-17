import { debug } from './core/utils.js';
import { ReadMore } from './components/readMore.js';
import contentManager from './core/contentManager.js';
import iconManager from './core/iconManager.js';
import navigationManager from './core/navigationManager.js';
import { projectManager } from './core/projectManager.js';

class App {
  constructor() {
    this.readMore = null;
    this.initialize();
  }

  async initialize() {
    try {
      // Initialize content
      await contentManager.initialize();

      // Wait for DOM update
      await new Promise((resolve) => requestAnimationFrame(resolve));

      // Initialize ReadMore
      this.readMore = new ReadMore();

      // Initialize other components
      await Promise.all([
        iconManager.attachAllIcons(),
        navigationManager.initialize(),
        projectManager.initialize(),
      ]);

      return true;
    } catch (error) {
      console.error('App: Initialization failed:', error);
      return false;
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});

export default App;
