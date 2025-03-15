import { debug } from './utils/debug.js';
import themeManager from './core/themeManager.js';
import contentManager from './core/contentManager.js';
import skillManager from './core/skillManager.js';
import iconManager from './core/iconManager.js';
import navigationManager from './core/navigationManager.js';
import { content } from './config/content.js';
import privacyManager from './core/privacyManager.js';

class App {
  constructor() {
    this.init();
  }

  async init() {
    try {
      debug('Starting application initialization');

      // Initialize privacy manager first
      await privacyManager.initialize();

      const initResults = await Promise.all([
        contentManager.initialize(),
        themeManager.initialize(),
        skillManager.initialize(content.skills),
      ]);

      if (initResults.every(Boolean)) {
        debug('All managers initialized successfully');
      } else {
        debug('Some managers failed to initialize');
      }

      await iconManager.attachAllIcons();
      await navigationManager.initialize();

      debug('Application initialized successfully');
    } catch (error) {
      console.error('Initialization failed:', error);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});

export default App;
