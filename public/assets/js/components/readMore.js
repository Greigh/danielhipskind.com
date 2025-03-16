import { debug } from '../core/utils.js';
import { readMore } from '../core/icons.js';

// Change to named export
export class ReadMore {
  constructor() {
    this.aboutSection = document.querySelector('[data-content="about"]');

    if (!this.aboutSection) {
      debug('ReadMore: About section not found');
      return;
    }

    this.init();
  }

  init() {
    // Add truncated class
    this.aboutSection.classList.add('truncated');

    // Create and append button container
    const container = document.createElement('div');
    container.className = 'read-more-container';
    container.innerHTML = `
      <button class="read-more-text">Read More</button>
      <button class="read-more-btn" aria-label="Toggle content">
        ${readMore.down}
      </button>
    `;

    // Add click handler
    container.addEventListener('click', (e) => {
      e.preventDefault();
      this.toggleContent();
    });

    this.aboutSection.appendChild(container);
  }

  toggleContent() {
    const isExpanded = this.aboutSection.classList.toggle('expanded');
    const textBtn = this.aboutSection.querySelector('.read-more-text');
    const iconBtn = this.aboutSection.querySelector('.read-more-btn');

    textBtn.textContent = isExpanded ? 'Show Less' : 'Read More';
    iconBtn.innerHTML = isExpanded ? readMore.up : readMore.down;
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new ReadMore();
});
