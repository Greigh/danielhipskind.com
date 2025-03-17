import { debug } from '../core/utils.js';

export class ReadMore {
  constructor() {
    this.aboutSection = document.querySelector('[data-content="about"]');

    if (!this.aboutSection) {
      console.warn('ReadMore: About section not found');
      return;
    }

    this.init();
  }

  init() {
    // Add truncated class to main container
    this.aboutSection.classList.add('truncated');

    // Create button container
    const container = document.createElement('div');
    container.className = 'read-more-container';
    container.innerHTML = `
      <button class="read-more-text">Read More</button>
    `;

    // Add click handler
    container.addEventListener('click', (e) => {
      e.preventDefault();
      this.toggleContent();
    });

    // Append after the about section
    this.aboutSection.parentNode.insertBefore(
      container,
      this.aboutSection.nextSibling
    );
  }

  toggleContent() {
    const isExpanded = this.aboutSection.classList.toggle('expanded');
    const textBtn = this.aboutSection.querySelector('.read-more-text');
    textBtn.textContent = isExpanded ? 'Show Less' : 'Read More';
  }
}
