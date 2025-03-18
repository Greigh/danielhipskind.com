import { debug } from './core/utils.js';
import { ReadMore } from './components/readMore.js';
import contentManager from './core/contentManager.js';
import iconManager from './core/iconManager.js';
import navigationManager from './core/navigationManager.js';
import { projectManager } from './core/projectManager.js';

/**
 * Main application class that orchestrates the initialization of all components
 * @class App
 * @description Manages the initialization sequence and lifecycle of the application
 */
class App {
  /**
   * Creates an instance of App and begins initialization
   * @constructor
   * @description Sets up initial state and triggers async initialization sequence
   */
  constructor() {
    /** @type {ReadMore|null} Instance of ReadMore component */
    this.readMore = null;

    // Begin initialization sequence
    this.initialize();
  }

  /**
   * Initializes all application components in the correct sequence
   * @async
   * @returns {Promise<boolean>} Success status of initialization
   * @throws {Error} If any component initialization fails
   * @description
   * Initialization sequence:
   * 1. Content initialization
   * 2. DOM update pause
   * 3. ReadMore component
   * 4. Parallel initialization of icon, navigation, and project managers
   */
  async initialize() {
    try {
      // Step 1: Initialize content
      await contentManager.initialize();

      // Step 2: Wait for DOM update to ensure content is rendered
      await new Promise((resolve) => requestAnimationFrame(resolve));

      // Step 3: Initialize ReadMore component
      this.readMore = new ReadMore();

      // Step 4: Initialize remaining components in parallel
      await Promise.all([
        iconManager.initialize(),
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

/**
 * Create and expose a single instance of App when DOM is ready
 * @listens DOMContentLoaded
 * @global
 */
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});

export default App;
