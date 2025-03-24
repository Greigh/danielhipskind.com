import { about } from './content.js';
import { generateCopyright, initialize, socialLinks } from './content.js';
import { languages, social } from './icons.js';
import {} from './themeHandler.js';

// Render projects
function renderProjects(projects = []) {
  const projectGrid = document.querySelector('.project-grid');
  if (!projectGrid) {
    console.error('Project grid element not found');
    return;
  }

  projectGrid.innerHTML = projects
    .map((project) => {
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

      return `
      <article class="project-card glass-effect">
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
              ? `
            <a href="${project.githubUrl}"
               target="_blank"
               rel="noopener"
               class="project-link github">
              View on GitHub
            </a>
          `
              : ''
          }
          ${
            project.demoUrl
              ? `
            <a href="${project.demoUrl}"
               target="_blank"
               rel="noopener"
               class="project-link demo">
              Live Demo
            </a>
          `
              : ''
          }
        </div>
      </article>
    `;
    })
    .join('');
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

  const currentYear = new Date().getFullYear();

  // Render social links
  socialContainer.innerHTML = `
    <div class="social-links">
      ${socialLinks
        .map(
          (link) => `
          <a href="${link.url}"
             target="_blank"
             rel="noopener"
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
    <p>Built with ❤️ using modern web technologies</p>
  `;

  // Render copyright
  copyrightContainer.innerHTML = `
    <p>© ${currentYear} Daniel Hipskind</p>
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
    generateCopyright();
  } catch (error) {
    console.error('Failed to initialize page:', error);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializePage);
