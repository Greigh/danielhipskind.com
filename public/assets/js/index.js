import { about } from './content.js';
import { generateCopyright, initialize, socialLinks } from './content.js';
import { languages, social } from './icons.js';
import {} from './themeHandler.js';
import { Carousel } from './utils/carousel.js';

let projectCarousel = null;

// Render projects
function renderProjects(projects = []) {
  const projectSection = document.getElementById('projects');
  if (!projectSection) {
    console.error('Project section not found');
    return;
  }

  // Create or get container
  let projectGrid = projectSection.querySelector('.project-grid');
  if (!projectGrid) {
    projectGrid = document.createElement('div');
    projectGrid.className = 'project-grid carousel-container';
    projectSection.appendChild(projectGrid);
  } else {
    projectGrid.className = 'project-grid carousel-container';
  }

  // Empty the container
  projectGrid.innerHTML = '';

  // Create project cards
  projects.forEach((project) => {
    // Calculate language percentages
    const totalBytes = Object.values(project.languages).reduce(
      (a, b) => a + b,
      0
    );
    const languagePercentages = Object.entries(project.languages)
      .map(([name, bytes]) => ({
        name,
        icon: languages[name.toLowerCase()] || '',
        percentage: ((bytes / totalBytes) * 100).toFixed(1),
      }))
      .sort((a, b) => b.percentage - a.percentage);

    const projectCard = document.createElement('article');
    projectCard.className = 'project-card glass-effect';

    projectCard.innerHTML = `
      <div class="project-header">
        <h3>${project.title}</h3>
      </div>
      <p class="project-description">${
        project.description || 'No description available'
      }</p>
      <div class="languages-list">
        ${languagePercentages
          .map(
            (lang) => `
            <div class="language-item">
              <span class="language-icon">${lang.icon}</span>
              <span class="language-name">${lang.name}</span>
              <span class="language-percentage">${lang.percentage}%</span>
            </div>
          `
          )
          .join('')}
      </div>
      <div class="project-footer">
        ${
          project.githubUrl
            ? `<a href="${project.githubUrl}" target="_blank" rel="noopener" class="project-link github">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                View on GitHub
              </a>`
            : ''
        }
        ${
          project.demoUrl
            ? `<a href="${project.demoUrl}" target="_blank" rel="noopener" class="project-link demo">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
                Live Demo
              </a>`
            : ''
        }
      </div>
    `;

    projectGrid.appendChild(projectCard);
  });

  // Initialize carousel with dynamic options based on screen size
  if (projectCarousel) {
    projectCarousel.destroy();
  }

  projectCarousel = new Carousel(projectGrid, {
    autoplay: true,
    autoplaySpeed: 7000,
    infinite: true,
    showControls: true,
    showPagination: true,
  });
}

// Render skills
function renderSkills(skills) {
  if (!skills) {
    console.error('No skills data provided');
    return;
  }

  const technicalGrid = document.querySelector(
    '.skills-group:nth-child(1) .skills-grid'
  );
  const professionalGrid = document.querySelector(
    '.skills-group:nth-child(2) .skills-grid'
  );

  if (!technicalGrid || !professionalGrid) {
    console.error('Skills grid elements not found', {
      technicalGrid: !!technicalGrid,
      professionalGrid: !!professionalGrid,
    });
    return;
  }

  if (skills.technical?.length) {
    technicalGrid.innerHTML = skills.technical
      .map(
        (skill) => `
        <div class="skill-card">
          <span class="skill-name" data-lang="${skill.id}">
            ${languages[skill.id?.toLowerCase()] || ''}
            ${skill.name}
          </span>
          <div class="skill-bar">
            <div class="skill-level" style="width: ${skill.level}%"></div>
          </div>
        </div>
      `
      )
      .join('');
  }

  if (skills.professional?.length) {
    professionalGrid.innerHTML = skills.professional
      .map(
        (skill) => `
        <div class="skill-card">
          <span class="skill-name">${skill.name}</span>
          <div class="skill-bar">
            <div class="skill-level" style="width: ${skill.level}%"></div>
          </div>
        </div>
      `
      )
      .join('');
  }
}

function renderFooter() {
  const socialContainer = document.querySelector('.footer-social');
  const techContainer = document.querySelector('.footer-tech');
  const copyrightContainer = document.querySelector('.footer-copyright');

  if (!socialContainer || !techContainer || !copyrightContainer) return;

  // Render social links
  socialContainer.innerHTML = `
    <div class="social-links">
      ${socialLinks
        .map(
          (link) => `
          <a href="${link.url}"
             target="_blank"
             rel="${link.rel || 'noopener'}"
             class="social-link">
            ${social[link.icon]}
            <span class="sr-only">${link.name}</span>
          </a>`
        )
        .join('')}
    </div>
  `;

  // Render tech stack text
  techContainer.innerHTML = `
    <p>Built with <span class="heart">♥</span> using modern web technologies</p>
  `;

  // Render copyright
  copyrightContainer.innerHTML = `
    ${generateCopyright()}
    <p class="license">All rights reserved. Read <a href="https://github.com/Greigh/danielhipskind.com/blob/main/LICENSE">LICENSE</a> for more info.</p>
  `;
}

function renderAbout() {
  const aboutSection = document.querySelector('.about-text');
  if (!aboutSection) {
    console.error('About section not found');
    return;
  }

  aboutSection.innerHTML = `
    <p class="about-intro">${about.intro}</p>
    <div class="initial-content">
      ${about.shortDescription.map((text) => `<p>${text}</p>`).join('')}
    </div>
    <div class="expanded-content">
      ${about.expandedDescription.map((text) => `<p>${text}</p>`).join('')}
    </div>
    <div class="about-gradient"></div>
    <button class="read-more-btn">
      Read More
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </button>
  `;

  // Add event listener for the Read More button
  const readMoreBtn = aboutSection.querySelector('.read-more-btn');
  const expandedContent = aboutSection.querySelector('.expanded-content');
  const gradient = aboutSection.querySelector('.about-gradient');

  if (readMoreBtn && expandedContent && gradient) {
    expandedContent.style.display = 'none';

    readMoreBtn.addEventListener('click', () => {
      const isExpanded = aboutSection.classList.contains('expanded');
      aboutSection.classList.toggle('expanded');

      if (!isExpanded) {
        expandedContent.style.display = 'block';
        gradient.style.opacity = '0';
        readMoreBtn.innerHTML = `
          Show Less
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="18 15 12 9 6 15"></polyline>
          </svg>
        `;
      } else {
        expandedContent.style.display = 'none';
        gradient.style.opacity = '1';
        readMoreBtn.innerHTML = `
          Read More
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        `;
        document.getElementById('about').scrollIntoView({ behavior: 'smooth' });
      }
    });
  }
}

async function initializePage() {
  try {
    const initializedContent = await initialize();

    renderAbout();
    renderProjects(initializedContent.projects);
    renderSkills(initializedContent.skills);
    renderFooter();
  } catch (error) {
    console.error('Failed to initialize page:', error);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializePage);
