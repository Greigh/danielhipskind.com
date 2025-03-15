import { debug } from '../utils/debug.js';
import { content } from './content.js';
import { analyticsPreferences } from '../analytics/utils/preferences.js';
import { trackEvent } from '../analytics/core/tracker.js';

class ContentManager {
  constructor() {
    this.initialized = false;
    this.contentTargets = {
      about: null,
    };
  }

  async initialize() {
    try {
      debug('Initializing content manager');

      // Initialize DOM references
      this.contentTargets.about = document.querySelector(
        '[data-content="about"]'
      );

      if (!this.contentTargets.about) {
        throw new Error('About section target not found');
      }

      // Ensure content exists
      if (!content?.about?.intro || !content?.about?.paragraphs) {
        throw new Error('Required content not found');
      }

      // Build and insert content
      await this.populateAboutSection();

      this.initialized = true;
      debug('Content manager initialized successfully');
      return true;
    } catch (error) {
      debug('Failed to initialize content manager:', error);
      this.handleError(error);
      return false;
    }
  }

  async populateAboutSection() {
    try {
      const { intro, paragraphs } = content.about;

      // Build content HTML
      const aboutContent = `
        <div class="about-content">
          <p class="intro">${intro}</p>
          ${paragraphs.map((p) => `<p class="about-paragraph">${p}</p>`).join('')}
        </div>
      `;

      // Insert content with animation
      this.contentTargets.about.innerHTML = aboutContent;

      // Trigger animation
      requestAnimationFrame(() => {
        const section = this.contentTargets.about.closest('.section');
        if (section) {
          section.classList.add('visible');
        }
      });

      // Track content load if analytics enabled
      if (analyticsPreferences.isEnabled()) {
        trackEvent('content_loaded', {
          section: 'about',
          paragraphs: paragraphs.length,
        });
      }

      return true;
    } catch (error) {
      debug('Error populating about section:', error);
      this.handleError(error);
      return false;
    }
  }

  handleError(error) {
    if (this.contentTargets.about) {
      this.contentTargets.about.innerHTML = `
        <div class="error-state">
          <p>Failed to load content. Please refresh the page.</p>
          <small>${error.message}</small>
        </div>
      `;
    }
  }
}

// Export singleton instance
export default new ContentManager();
