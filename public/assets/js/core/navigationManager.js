import { debug } from '../utils/debug.js';
import { menuIcon } from './icons.js';

class NavigationManager {
  constructor() {
    this.isMenuOpen = false;
    this.isMobile = window.innerWidth <= 768; // Increased breakpoint
    this.initialized = false;
  }

  async initialize() {
    try {
      debug('Initializing navigation manager');

      this.menuToggle = document.querySelector('.mobile-menu-toggle');
      this.navLinks = document.querySelector('.nav-links');
      this.navItems = document.querySelectorAll('.nav-item');

      if (!this.menuToggle || !this.navLinks) {
        throw new Error('Critical navigation elements missing');
      }

      // Set menu icon and initial ARIA states
      this.menuToggle.innerHTML = menuIcon;
      this.menuToggle.setAttribute('aria-label', 'Toggle navigation menu');
      this.menuToggle.setAttribute('aria-controls', 'nav-links');

      // Initialize state and listeners
      this.updateNavigationState();
      this.setupEventListeners();

      this.initialized = true;
      debug('Navigation manager initialized');
      return true;
    } catch (error) {
      debug('Navigation initialization failed:', error);
      return false;
    }
  }

  updateNavigationState() {
    if (this.isMobile) {
      this.navLinks.style.display = this.isMenuOpen ? 'flex' : 'none';
      this.menuToggle.style.display = 'flex';
      this.menuToggle.setAttribute('aria-expanded', String(this.isMenuOpen));
      this.navLinks.classList.toggle('nav-links--active', this.isMenuOpen);

      // Handle animation states
      if (this.isMenuOpen) {
        this.navItems.forEach((item, index) => {
          item.style.animationDelay = `${index * 0.1}s`;
          item.classList.add('nav-item--visible');
        });
      } else {
        this.navItems.forEach((item) => {
          item.classList.remove('nav-item--visible');
        });
      }
    } else {
      // Desktop state
      this.navLinks.style.display = 'flex';
      this.menuToggle.style.display = 'none';
      this.navLinks.classList.remove('nav-links--active');
      this.navItems.forEach((item) => {
        item.classList.add('nav-item--visible');
      });
    }
  }

  setupEventListeners() {
    // Menu toggle with debounce
    let timeout;
    this.menuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      clearTimeout(timeout);
      timeout = setTimeout(() => this.toggleMenu(), 50);
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (
        this.isMobile &&
        this.isMenuOpen &&
        !this.navLinks.contains(e.target) &&
        !this.menuToggle.contains(e.target)
      ) {
        this.closeMenu();
      }
    });

    // Throttled resize handler
    let resizeTimeout;
    window.addEventListener('resize', () => {
      if (resizeTimeout) return;
      resizeTimeout = setTimeout(() => {
        const wasMobile = this.isMobile;
        this.isMobile = window.innerWidth <= 768;

        if (wasMobile !== this.isMobile) {
          this.isMenuOpen = false;
          this.updateNavigationState();
        }
        resizeTimeout = null;
      }, 100);
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isMenuOpen) {
        this.closeMenu();
      }
    });
  }

  toggleMenu() {
    if (!this.isMobile) return;
    this.isMenuOpen = !this.isMenuOpen;
    this.updateNavigationState();
  }

  closeMenu() {
    if (!this.isMobile) return;
    this.isMenuOpen = false;
    this.updateNavigationState();
  }
}

export default new NavigationManager();
