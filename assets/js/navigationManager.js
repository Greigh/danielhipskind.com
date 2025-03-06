class NavigationManager {
  constructor() {
    this.isMenuOpen = false;
  }

  initialize() {
    console.group('Navigation Debug');

    // Get navigation elements
    this.menuToggle = document.querySelector('.mobile-menu-toggle');
    console.log('Mobile Menu Toggle:', {
      found: !!this.menuToggle,
      element: this.menuToggle,
      display: this.menuToggle
        ? window.getComputedStyle(this.menuToggle).display
        : 'N/A',
    });

    // Check viewport width
    console.log('Viewport width:', window.innerWidth);
    console.log(
      'Media query active:',
      window.matchMedia('(max-width: 640px)').matches
    );

    this.navLinks = document.querySelector('.nav-links');
    this.navItems = document.querySelector('.nav-items');

    if (!this.menuToggle) {
      console.error('Mobile menu toggle not found in DOM');
      return false;
    }

    // Verify mobile menu HTML structure
    this.menuToggle.innerHTML = `
      <svg viewBox="0 0 24 24" width="24" height="24">
        <path fill="currentColor" d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
      </svg>
    `;

    this.setupEventListeners();
    console.groupEnd();
    return true;
  }

  setupEventListeners() {
    if (this.menuToggle) {
      console.log('Setting up mobile menu click listener');
      this.menuToggle.addEventListener('click', (e) => {
        console.log('Mobile menu clicked');
        e.stopPropagation();
        this.toggleMenu();
      });
    }

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (
        this.isMenuOpen &&
        !this.navLinks?.contains(e.target) &&
        !this.menuToggle?.contains(e.target)
      ) {
        this.closeMenu();
      }
    });

    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isMenuOpen) {
        this.closeMenu();
      }
    });
  }

  toggleMenu() {
    // Toggle state first
    this.isMenuOpen = !this.isMenuOpen;
    console.log('Toggling menu to:', this.isMenuOpen);

    // Apply changes based on new state
    if (this.isMenuOpen) {
      this.navLinks?.classList.add('active');
      this.menuToggle?.setAttribute('aria-expanded', 'true');
    } else {
      this.navLinks?.classList.remove('active');
      this.menuToggle?.setAttribute('aria-expanded', 'false');
    }
  }

  closeMenu() {
    if (!this.isMenuOpen) return;
    this.isMenuOpen = false;
    this.navLinks?.classList.remove('active');
    this.menuToggle?.setAttribute('aria-expanded', 'false');
  }
}

const navigationManager = new NavigationManager();
export default navigationManager;
