import { debug } from '../utils/debug.js';

// Create an intersection observer for section animations
const createSectionObserver = () => {
  return new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          // Remove loading placeholder if present
          const loading = entry.target.querySelector('.loading');
          if (loading) {
            loading.remove();
          }
        }
      });
    },
    {
      root: null,
      rootMargin: '0px',
      threshold: 0.1,
    }
  );
};

// Create an observer for skill progress bars
const createSkillObserver = () => {
  return new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const skillItem = entry.target;
          const progressFill = skillItem.querySelector('.skill-progress-fill');

          // Handle progress bar animation
          if (progressFill) {
            const level = skillItem.dataset.level || '0';
            // Only animate if not already animated
            if (
              progressFill.style.width === '0%' ||
              !progressFill.style.width
            ) {
              requestAnimationFrame(() => {
                progressFill.style.width = `${level}%`;
              });
            }
          }

          // Remove loading state
          const loading = skillItem.querySelector('.loading');
          if (loading) {
            loading.remove();
          }

          // Show skill content
          const content = skillItem.querySelector('.skill-content');
          if (content) {
            content.classList.add('visible');
          }
        }
      });
    },
    {
      root: null,
      rootMargin: '0px',
      threshold: 0.2, // Increased threshold for better timing
    }
  );
};

// Initialize all observers
export const initializeObservers = () => {
  try {
    debug('Initializing observers');
    const sectionObserver = createSectionObserver();
    const skillObserver = createSkillObserver();

    // Observe all sections
    document.querySelectorAll('.section').forEach((section) => {
      sectionObserver.observe(section);
    });

    // Observe all skill items
    document.querySelectorAll('.skill-item').forEach((item) => {
      skillObserver.observe(item);
    });

    // Observe project cards
    document.querySelectorAll('.project-card').forEach((card) => {
      sectionObserver.observe(card);
    });

    debug('Observers initialized successfully');
    return true;
  } catch (error) {
    debug('Error initializing observers:', error);
    return false;
  }
};
