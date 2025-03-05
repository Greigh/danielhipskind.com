import { content, generateCopyright, populateAbout } from './content.js';
import iconManager from './iconManager.js';
import { projectManager } from './projectManager.js';
import { initializeSkills } from './skillManager.js';
import { initializeObservers } from './observerManager.js';
import { config } from './config.js';

function loadSocialLinks() {
  const socialContainer = document.getElementById('connect-links');
  if (!socialContainer) return;

  const socialLinks = [
    {
      href: 'mailto:me@danielhipskind.com',
      icon: 'email',
      label: 'Email',
    },
    {
      href: 'https://github.com/greigh',
      icon: 'github',
      label: 'GitHub',
    },
    {
      href: 'https://linkedin.com/in/danielhipskind',
      icon: 'linkedin',
      label: 'LinkedIn',
    },
    {
      href: 'https://twitter.com/danielhipskind_',
      icon: 'twitter',
      label: 'Twitter',
    },
    {
      href: 'https://bsky.app/profile/yourusername',
      icon: 'bluesky',
      label: 'Bluesky',
    },
  ];

  // Clear existing content
  socialContainer.innerHTML = '';

  socialLinks.forEach((link) => {
    const anchor = document.createElement('a');
    anchor.href = link.href;
    anchor.className = 'social-icon';
    anchor.setAttribute('aria-label', link.label);
    anchor.innerHTML = iconManager.getSocialIcon(link.icon);
    socialContainer.appendChild(anchor);
  });
}

const initializeContent = async () => {
  try {
    // Load social links
    loadSocialLinks();

    // Initialize skills
    initializeSkills();

    // Populate about section
    populateAbout();

    // Initialize project data
    if (typeof window.Octokit !== 'undefined' && config.GITHUB_TOKEN) {
      const octokit = new window.Octokit({
        auth: config.GITHUB_TOKEN,
      });
      await projectManager.initialize(octokit);
    } else {
      await projectManager.initialize();
    }

    // Initialize scroll animations
    initializeObservers();

    // Set copyright
    generateCopyright();
  } catch (error) {
    console.error('Error initializing content:', error);
  }
};

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeContent);
} else {
  initializeContent();
}

export { initializeContent };
