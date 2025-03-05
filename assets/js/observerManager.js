// Create an intersection observer for section animations
const createSectionObserver = () => {
  return new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
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
          const progressFill = entry.target.querySelector(
            '.skill-progress-fill'
          );
          if (progressFill && progressFill.style.width === '0%') {
            const level = entry.target.dataset.level || '0';
            progressFill.style.width = `${level}%`;
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

// Initialize all observers
export const initializeObservers = () => {
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
};
