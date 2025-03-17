import { debug } from '../utils/debug.js';
import { menuIcon } from './icons.js';

class NavigationManager {
  constructor() {
    this.isMenuOpen = false;
    this.isMobile = window.innerWidth <= 768; // Increased breakpoint
    this.initialized = false;
    this.nav = null;
    this.navItems = null;
  }

  async initialize() {
    try {
      // Validate required dependencies
      if (!menuIcon) {
        throw new Error('Menu icon dependency missing');
      }

      this.menuToggle = document.querySelector('.mobile-menu-toggle');
      this.navLinks = document.querySelector('.nav-links');

      // Create fallback navigation if elements are missing
      if (!this.menuToggle || !this.navLinks) {
        this.createFallbackNav();
        this.menuToggle = document.querySelector('.mobile-menu-toggle');
        this.navLinks = document.querySelector('.nav-links');

        if (!this.menuToggle || !this.navLinks) {
          throw new Error('Failed to create fallback navigation');
        }
      }

      this.navItems = document.querySelectorAll('.nav-item');
      if (!this.navItems?.length) {
        debug('Warning: No navigation items found');
      }

      // Initialize UI state
      this.menuToggle.innerHTML = menuIcon;
      this.menuToggle.setAttribute('aria-label', 'Toggle navigation menu');
      this.menuToggle.setAttribute('aria-controls', 'nav-links');
      this.menuToggle.setAttribute('aria-expanded', 'false');

      this.updateNavigationState();
      this.setupEventListeners();

      this.initialized = true;
      return true;
    } catch (error) {
      debug('Navigation initialization failed:', error);
      return false;
    }
  }

  createFallbackNav() {
    const nav = document.createElement('nav');
    nav.id = 'main-nav';
    nav.className = 'main-nav';

    nav.innerHTML = `
      <div class="nav-container">
        <button class="mobile-menu-toggle" aria-label="Toggle navigation menu">
          <!-- Menu icon will be injected -->
        </button>
        <div class="nav-links">
          <ul class="nav-items">
            <li><a href="#about" class="nav-item">About</a></li>
            <li><a href="#projects" class="nav-item">Projects</a></li>
            <li><a href="#skills" class="nav-item">Skills</a></li>
          </ul>
        </div>
        <button
          id="theme-toggle"
          class="theme-toggle btn"
          aria-label="Toggle theme"
        >
          <span><!-- SVG will be injected by themeToggle.js --></span>
        </button>
      </div>
    `;

    document.body.insertBefore(nav, document.body.firstChild);
    this.nav = nav;
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

    if (!this.navItems?.length) return;

    this.navItems.forEach((item) => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const target = e.currentTarget.getAttribute('href').substring(1);
        this.scrollToSection(target);
      });
    });
  }

  scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return;

    section.scrollIntoView({ behavior: 'smooth' });
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
