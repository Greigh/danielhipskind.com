import { menuIcon } from './icons.js';

class NavigationManager {
  constructor() {
    this.isMenuOpen = false;
    this.isMobile = window.innerWidth <= 640;
  }

  initialize() {
    console.log('Initializing NavigationManager');

    // Get navigation elements
    this.menuToggle = document.querySelector('.mobile-menu-toggle');
    this.navLinks = document.querySelector('.nav-links');

    if (!this.menuToggle || !this.navLinks) {
      console.error('Critical navigation elements missing');
      return false;
    }

    // Set menu icon
    this.menuToggle.innerHTML = menuIcon;

    // Set initial state
    this.updateNavigationState();
    this.setupEventListeners();

    console.log('NavigationManager initialized');
    return true;
  }

  updateNavigationState() {
    console.log('Updating navigation state:', {
      isMobile: this.isMobile,
      isMenuOpen: this.isMenuOpen,
    });

    if (this.isMobile) {
      this.navLinks.style.display = this.isMenuOpen ? 'block' : 'none';
      this.menuToggle.style.display = 'flex';
      this.menuToggle.setAttribute('aria-expanded', String(this.isMenuOpen));
      this.navLinks.classList.toggle('active', this.isMenuOpen);
    } else {
      this.navLinks.style.display = 'flex';
      this.menuToggle.style.display = 'none';
      this.navLinks.classList.remove('active');
    }
  }

  toggleMenu(e) {
    if (!this.isMobile) return;

    // Prevent event bubbling
    if (e) e.stopPropagation();

    this.isMenuOpen = !this.isMenuOpen;
    console.log('Menu state:', this.isMenuOpen);
    this.updateNavigationState();
  }

  closeMenu() {
    if (!this.isMobile) return;
    this.isMenuOpen = false;
    this.updateNavigationState();
  }

  setupEventListeners() {
    // Single click handler for menu toggle
    this.menuToggle.addEventListener('click', (e) => this.toggleMenu(e));

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

    // Handle window resize
    window.addEventListener('resize', () => {
      const wasMobile = this.isMobile;
      this.isMobile = window.innerWidth <= 640;

      if (wasMobile !== this.isMobile) {
        this.isMenuOpen = false;
        this.updateNavigationState();
      }
    });

    // Handle escape key press
    document.addEventListener('keydown', (e) => {
      if (this.isMobile && e.key === 'Escape' && this.isMenuOpen) {
        this.closeMenu();
      }
    });
  }
}

const navigationManager = new NavigationManager();
export default navigationManager;
