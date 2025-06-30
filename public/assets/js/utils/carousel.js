export class Carousel {
  constructor(container, options = {}) {
    // DOM Elements
    this.container = container;
    this.track = null;
    this.slides = [];
    this.controls = null;
    this.pagination = null;
    this.progressBar = null;

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
    this.resizeTimer = null; // Add this line for debounce
    this.lastScreenWidth = window.innerWidth; // Add this line to track screen width

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

    // We need to create slides with multiple items per slide
    const totalItems = children.length;
    const itemsPerSlide = this.getItemsPerSlide();
    const totalSlides = Math.ceil(totalItems / itemsPerSlide);

    // Create the slides with proper grouping of items
    for (let slideIndex = 0; slideIndex < totalSlides; slideIndex++) {
      const slide = document.createElement('div');
      slide.className = 'carousel-slide';
      if (slideIndex === 0) slide.classList.add('active');

      // Calculate which items go in this slide
      const startItemIndex = slideIndex * itemsPerSlide;
      const endItemIndex = Math.min(startItemIndex + itemsPerSlide, totalItems);

      // Add the items to this slide
      for (
        let itemIndex = startItemIndex;
        itemIndex < endItemIndex;
        itemIndex++
      ) {
        slide.appendChild(children[itemIndex]);
      }

      this.track.appendChild(slide);
      this.slides.push(slide);
    }

    this.totalSlides = this.slides.length;

    // Create a container for controls and pagination
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
    } else {
      controlsContainer.innerHTML = '';
    }

    // Add controls if enabled
    if (this.options.showControls && this.totalSlides > 1) {
      this.createControls(controlsContainer);
    }

    // Add pagination if enabled
    if (this.options.showPagination && this.totalSlides > 1) {
      this.createPagination(controlsContainer);
    }
  }

  getItemsPerSlide() {
    const viewportWidth = window.innerWidth;

    if (viewportWidth >= 768) {
      return 3; // 2 items per slide on medium screens
    }
    return 1; // 1 item per slide on small screens
  }

  createControls(container) {
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

    // Append controls to the container
    container.appendChild(this.controls);

    // Add event listeners
    prevButton.addEventListener('click', () => this.prev());
    nextButton.addEventListener('click', () => this.next());
  }

  createPagination(container) {
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

    // Append pagination to the container
    container.appendChild(this.pagination);
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

    // Window resize - debounced to improve performance
    window.addEventListener('resize', () => {
      // Clear the existing timer
      clearTimeout(this.resizeTimer);

      // Set a new timer to delay execution
      this.resizeTimer = setTimeout(() => {
        // Only rebuild if width changed significantly (affecting layout)
        const currentWidth = window.innerWidth;
        const breakpointChanged =
          (this.lastScreenWidth < 768 && currentWidth >= 768) ||
          (this.lastScreenWidth >= 768 && currentWidth < 768) ||
          (this.lastScreenWidth < 1200 && currentWidth >= 1200) ||
          (this.lastScreenWidth >= 1200 && currentWidth < 1200);

        if (breakpointChanged) {
          this.handleResize();
          this.lastScreenWidth = currentWidth;
        }
      }, 250); // 250ms delay
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
    // Store current slide index to maintain position after rebuild
    const currentSlideIndex = this.currentSlide;

    // Get all project cards before destroying carousel
    const originalCards = [];
    this.slides.forEach((slide) => {
      const cards = Array.from(slide.children);
      cards.forEach((card) => originalCards.push(card));
    });

    // Clean up old carousel
    this.destroy(false);

    // Re-add original cards to container for restructuring
    originalCards.forEach((card) => {
      this.container.appendChild(card);
    });

    // Rebuild carousel with new screen size
    this.createStructure();

    // Go to the appropriate slide (make sure it's within bounds)
    const safeSlideIndex = Math.min(currentSlideIndex, this.totalSlides - 1);
    this.goToSlide(safeSlideIndex >= 0 ? safeSlideIndex : 0);

    // Update position
    this.updatePosition();

    // Restart autoplay if it was running
    if (this.options.autoplay && !this.isPaused) {
      this.startAutoplay();
    }
  }

  updatePosition() {
    // Calculate position based on current slide
    const offset = -this.currentSlide * 100;
    this.track.style.transform = `translateX(${offset}%)`;

    // Update active slide class
    this.slides.forEach((slide, index) => {
      if (index === this.currentSlide) {
        slide.classList.add('active');
      } else {
        slide.classList.remove('active');
      }
    });

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

    // Update progress bar
    if (this.progressBar) {
      const progressPercentage =
        ((this.currentSlide + 1) / this.totalSlides) * 100;
      this.progressBar.classList.add(`skill-bar-${progressPercentage}`);
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
    clearTimeout(this.resizeTimer);

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

      // Also remove the controls container if it exists
      const controlsContainer = document.querySelector(
        '.carousel-controls-container'
      );
      if (controlsContainer) {
        controlsContainer.remove();
      }
    } else {
      // Just remove track and controls for rebuilding
      if (this.track) this.track.remove();

      const controlsContainer = document.querySelector(
        '.carousel-controls-container'
      );
      if (controlsContainer) controlsContainer.innerHTML = '';
    }
  }
}
