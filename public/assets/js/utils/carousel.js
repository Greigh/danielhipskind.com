export class Carousel {
  constructor(container, options = {}) {
    // DOM Elements
    this.container = container;
    this.track = null;
    this.slides = [];
    this.controls = null;
    this.pagination = null;

    // Configuration
    this.options = {
      slidesToShow: options.slidesToShow || 1,
      autoplay: options.autoplay || false,
      autoplaySpeed: options.autoplaySpeed || 5000,
      infinite: options.infinite || false,
      showControls: options.showControls !== false,
      showPagination: options.showPagination !== false,
      itemsPerSlide: options.itemsPerSlide || 1,
      ...options,
    };

    // State
    this.currentSlide = 0;
    this.totalSlides = 0;
    this.autoplayInterval = null;
    this.isPaused = false;
    this.isTransitioning = false;
    this.touchStartX = 0;
    this.touchEndX = 0;

    // Initialize carousel
    this.init();
  }

  init() {
    // Create carousel structure
    this.createStructure();

    // Set initial position
    this.goToSlide(0);

    // Set up event listeners
    this.setupEventListeners();

    // Start autoplay if enabled
    if (this.options.autoplay) {
      this.startAutoplay();
    }

    // Make sure everything is positioned correctly
    this.updatePosition();
  }

  createStructure() {
    // Wrap all items in a track
    this.track = document.createElement('div');
    this.track.className = 'carousel-track';

    // Get child elements
    const children = Array.from(this.container.children);
    this.container.innerHTML = '';
    this.container.appendChild(this.track);

    // Group children into slides based on screen size and responsive settings
    const itemsPerSlide = this.getItemsPerSlide();

    // Create slides with multiple items
    for (let i = 0; i < children.length; i += itemsPerSlide) {
      const slide = document.createElement('div');
      slide.className = 'carousel-slide';

      // Add up to itemsPerSlide items to this slide
      const slideItems = children.slice(i, i + itemsPerSlide);
      slideItems.forEach((item) => slide.appendChild(item));

      this.track.appendChild(slide);
      this.slides.push(slide);
    }

    this.totalSlides = this.slides.length;

    // Add controls if enabled
    if (this.options.showControls && this.totalSlides > 1) {
      this.createControls();
    }

    // Add pagination if enabled
    if (this.options.showPagination && this.totalSlides > 1) {
      this.createPagination();
    }
  }

  getItemsPerSlide() {
    const viewportWidth = window.innerWidth;

    if (viewportWidth >= 1200) {
      return 2; // 2 items per slide on large screens
    } else if (viewportWidth >= 768) {
      return 2; // 2 items per slide on medium screens
    }
    return 1; // 1 item per slide on small screens
  }

  createControls() {
    // Remove previous controls if they exist
    if (this.controls) {
      this.controls.remove();
    }

    this.controls = document.createElement('div');
    this.controls.className = 'carousel-controls';

    const prevButton = document.createElement('button');
    prevButton.className = 'carousel-button prev';
    prevButton.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="none" d="M0 0h24v24H0z"/><path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>';
    prevButton.setAttribute('aria-label', 'Previous slide');

    const nextButton = document.createElement('button');
    nextButton.className = 'carousel-button next';
    nextButton.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="none" d="M0 0h24v24H0z"/><path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>';
    nextButton.setAttribute('aria-label', 'Next slide');

    this.controls.appendChild(prevButton);
    this.controls.appendChild(nextButton);

    // Create a container for both controls and pagination
    let controlsContainer = document.querySelector(
      '.carousel-controls-container'
    );
    if (!controlsContainer) {
      controlsContainer = document.createElement('div');
      controlsContainer.className = 'carousel-controls-container';
      this.container.parentNode.insertBefore(
        controlsContainer,
        this.container.nextSibling
      );
    }

    // Append controls to the container
    controlsContainer.appendChild(this.controls);

    // Add event listeners
    prevButton.addEventListener('click', () => this.prev());
    nextButton.addEventListener('click', () => this.next());
  }

  createPagination() {
    // Remove previous pagination if it exists
    if (this.pagination) {
      this.pagination.remove();
    }

    this.pagination = document.createElement('div');
    this.pagination.className = 'carousel-pagination';

    for (let i = 0; i < this.totalSlides; i++) {
      const dot = document.createElement('div');
      dot.className = `carousel-dot ${i === 0 ? 'active' : ''}`;
      dot.setAttribute('data-index', i);
      dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
      dot.setAttribute('role', 'button');
      dot.setAttribute('tabindex', '0');

      dot.addEventListener('click', () => this.goToSlide(i));
      dot.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.goToSlide(i);
        }
      });

      this.pagination.appendChild(dot);
    }

    // Get the controls container
    let controlsContainer = document.querySelector(
      '.carousel-controls-container'
    );
    if (!controlsContainer) {
      controlsContainer = document.createElement('div');
      controlsContainer.className = 'carousel-controls-container';
      this.container.parentNode.insertBefore(
        controlsContainer,
        this.container.nextSibling
      );
    }

    // Append pagination to the container
    controlsContainer.appendChild(this.pagination);
  }

  setupEventListeners() {
    // Pause autoplay on hover
    this.container.addEventListener('mouseenter', () => {
      if (this.options.autoplay) {
        this.pauseAutoplay();
      }
    });

    this.container.addEventListener('mouseleave', () => {
      if (this.options.autoplay && this.isPaused) {
        this.startAutoplay();
      }
    });

    // Touch events for swipe
    this.container.addEventListener(
      'touchstart',
      (e) => {
        this.touchStartX = e.changedTouches[0].screenX;
      },
      { passive: true }
    );

    this.container.addEventListener(
      'touchend',
      (e) => {
        this.touchEndX = e.changedTouches[0].screenX;
        this.handleSwipe();
      },
      { passive: true }
    );

    // Window resize
    window.addEventListener('resize', () => {
      this.handleResize();
    });

    // Keyboard navigation
    this.container.setAttribute('tabindex', '0');
    this.container.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        this.prev();
      } else if (e.key === 'ArrowRight') {
        this.next();
      }
    });
  }

  handleSwipe() {
    const threshold = 50; // Min distance for swipe
    const diff = this.touchEndX - this.touchStartX;

    if (diff > threshold) {
      // Swipe right, go to previous
      this.prev();
    } else if (diff < -threshold) {
      // Swipe left, go to next
      this.next();
    }
  }

  handleResize() {
    // On window resize, recreate the carousel to adjust items per slide
    this.destroy(false);
    this.createStructure();
    this.goToSlide(0);
    this.updatePosition();
  }

  updatePosition() {
    // Calculate position based on current slide
    const offset = -this.currentSlide * 100;
    this.track.style.transform = `translateX(${offset}%)`;

    // Update pagination
    if (this.pagination) {
      const dots = this.pagination.querySelectorAll('.carousel-dot');
      dots.forEach((dot, i) => {
        if (i === this.currentSlide) {
          dot.classList.add('active');
        } else {
          dot.classList.remove('active');
        }
      });
    }
  }

  next() {
    if (this.isTransitioning) return;

    let nextSlide = this.currentSlide + 1;

    if (nextSlide >= this.totalSlides) {
      if (this.options.infinite) {
        nextSlide = 0;
      } else {
        return;
      }
    }

    this.goToSlide(nextSlide);
  }

  prev() {
    if (this.isTransitioning) return;

    let prevSlide = this.currentSlide - 1;

    if (prevSlide < 0) {
      if (this.options.infinite) {
        prevSlide = this.totalSlides - 1;
      } else {
        return;
      }
    }

    this.goToSlide(prevSlide);
  }

  goToSlide(index) {
    if (this.isTransitioning || index === this.currentSlide) return;

    this.isTransitioning = true;
    this.currentSlide = index;
    this.updatePosition();

    setTimeout(() => {
      this.isTransitioning = false;
    }, 500); // Match transition duration
  }

  startAutoplay() {
    this.isPaused = false;
    clearInterval(this.autoplayInterval);
    this.autoplayInterval = setInterval(() => {
      this.next();
    }, this.options.autoplaySpeed);
  }

  pauseAutoplay() {
    this.isPaused = true;
    clearInterval(this.autoplayInterval);
  }

  destroy(removeElements = true) {
    // Clean up event listeners and intervals
    clearInterval(this.autoplayInterval);

    if (removeElements) {
      // Remove carousel structure but keep content
      const projectCards = [];

      // Collect all project cards from slides
      this.slides.forEach((slide) => {
        Array.from(slide.children).forEach((child) => {
          projectCards.push(child);
        });
      });

      // Clear the container
      this.container.innerHTML = '';

      // Re-add the original project cards
      projectCards.forEach((card) => {
        this.container.appendChild(card);
      });
    } else {
      // Just remove track and controls for rebuilding
      if (this.track) this.track.remove();
      if (this.controls) this.controls.remove();
      if (this.pagination) this.pagination.remove();
    }
  }
}
