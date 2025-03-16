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
      return true;
    } catch (error) {
      debug('Failed to initialize content manager:', error);
      this.handleError(error);
      return false;
    }
  }

  async populateAboutSection() {
    try {
      const aboutContainer = document.querySelector('[data-content="about"]');

      if (!aboutContainer) {
        debug('ContentManager: About container not found!');
        return false;
      }

      const { intro, paragraphs } = content.about;

      // Clear existing content
      aboutContainer.innerHTML = '';

      // Add intro paragraph
      const introP = document.createElement('p');
      introP.className = 'about-intro';
      introP.textContent = intro;
      aboutContainer.appendChild(introP);

      // Create content wrapper for paragraphs
      const contentWrapper = document.createElement('div');
      contentWrapper.className = 'about-content';

      // Add content paragraphs
      paragraphs.forEach((text) => {
        const p = document.createElement('p');
        p.className = 'about-paragraph';
        p.textContent = text;
        contentWrapper.appendChild(p);
      });

      aboutContainer.appendChild(contentWrapper);
      return true;
    } catch (error) {
      debug('ContentManager: Error populating about section', error);
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
