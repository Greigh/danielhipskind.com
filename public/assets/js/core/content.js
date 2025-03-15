import { debug } from './utils.js';

// Content configuration
export const content = {
  about: {
    intro:
      "I'm Daniel Hipskind, a passionate and dedicated software developer with a focus on creating responsive and user-friendly web applications.",
    paragraphs: [
      'My journey into the world of programming began with a curiosity about how technology shapes our daily lives, and it has since evolved into a deep-seated passion for crafting elegant solutions to complex problems.',
      'With a solid foundation in front-end technologies like HTML, CSS, and JavaScript, as well as experience with modern frameworks like React, I strive to build intuitive and engaging user interfaces.',
      "I'm currently pursuing an Associate's degree in Computer Programming at Grand Rapids Community College, where I'm constantly expanding my knowledge and honing my skills.",
      "When I'm not coding, you can find me exploring new programming concepts, contributing to open-source projects, or enjoying the great outdoors. I believe in the power of technology to make a positive impact, and I'm eager to be part of that change.",
    ],
  },

  projects: [
    {
      title: 'Blocking Machine',
      description:
        'An advanced discord bot that helps server owners manage their communities effectively with automated moderation tools and custom commands.',
      githubUrl: 'https://github.com/greigh/blockingmachine',
      languages: [{ name: 'JavaScript', icon: 'JavaScript' }],
      workflows: [
        { type: 'Linting', icon: 'lint' },
        { type: 'Testing', icon: 'test' },
        { type: 'Error Webhook', icon: 'discord' },
      ],
    },
    {
      title: 'Portfolio Website (this website)',
      description:
        'A responsive personal portfolio website built with modern web technologies, featuring dynamic theme switching and smooth animations.',
      githubUrl: 'https://github.com/greigh/danielhipskind.com',
      languages: [
        { name: 'HTML', icon: 'HTML' },
        { name: 'CSS', icon: 'CSS' },
        { name: 'JavaScript', icon: 'JavaScript' },
      ],
      workflows: [],
    },
  ],

  skills: {
    technical: [
      { name: 'JavaScript', level: 90, language: 'JavaScript' },
      { name: 'Python', level: 85, language: 'Python' },
      { name: 'HTML', level: 95, language: 'HTML' },
      { name: 'CSS', level: 95, language: 'CSS' },
      { name: 'React', level: 80, language: 'JavaScript' },
      { name: 'Node.js', level: 75, language: 'JavaScript' },
      { name: 'Git', level: 85 },
    ],
    professional: [
      { name: 'Problem Solving', level: 90 },
      { name: 'Communication', level: 85 },
      { name: 'Team Collaboration', level: 90 },
      { name: 'Project Management', level: 80 },
      { name: 'Agile Methodologies', level: 75 },
    ],
  },

  social: [
    {
      name: 'GitHub',
      url: 'https://github.com/greigh',
      icon: 'github',
      label: 'Visit my GitHub profile',
      analytics: {
        category: 'social',
        action: 'click',
        label: 'github_profile',
      },
    },
    {
      name: 'LinkedIn',
      url: 'https://linkedin.com/in/danielhipskind',
      icon: 'linkedin',
      label: 'Connect with me on LinkedIn',
      analytics: {
        category: 'social',
        action: 'click',
        label: 'linkedin_profile',
      },
    },
    {
      name: 'Email',
      url: 'mailto:me@danielhipskind.com',
      icon: 'email',
      label: 'Send me an email',
      analytics: {
        category: 'contact',
        action: 'click',
        label: 'email_contact',
      },
    },
    {
      name: 'Discord',
      url: 'https://discordapp.com/users/greigh.',
      icon: 'discord',
      label: 'Connect on Discord',
      analytics: {
        category: 'social',
        action: 'click',
        label: 'discord_profile',
      },
    },
  ],
};

// Generate copyright text
export const generateCopyright = () => {
  const year = new Date().getFullYear();
  const copyright = document.getElementById('copyright');
  if (copyright) {
    copyright.textContent = `© ${year} Daniel Hipskind. All rights reserved.`;
  }
};

// Add new helper for content analytics
export const trackContentView = (section, details = {}) => {
  if (window.analyticsPreferences?.isEnabled()) {
    window.trackEvent('view_content', {
      section,
      timestamp: new Date().toISOString(),
      ...details,
    });
  }
};

export const trackContentInteraction = (section, action, details = {}) => {
  if (window.analyticsPreferences?.isEnabled()) {
    window.trackEvent('content_interaction', {
      section,
      action,
      timestamp: new Date().toISOString(),
      ...details,
    });
  }
};

export const trackSkillView = (skill) => {
  if (window.analyticsPreferences?.isEnabled()) {
    window.trackEvent('skill_view', {
      name: skill.name,
      category: skill.language ? 'technical' : 'professional',
      level: skill.level,
      language: skill.language || 'none',
    });
  }
};

export const trackProjectView = (project) => {
  if (window.analyticsPreferences?.isEnabled()) {
    window.trackEvent('project_view', {
      title: project.title,
      languages: project.languages.map((lang) => lang.name),
      workflows: project.workflows.map((flow) => flow.type),
    });
  }
};

export const initContentTracking = () => {
  if (!window.analyticsPreferences?.isEnabled()) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const section = entry.target.getAttribute('data-section');
          if (section) {
            trackContentView(section, {
              viewport_percentage: Math.round(entry.intersectionRatio * 100),
              visible_time: new Date().toISOString(),
            });
          }
        }
      });
    },
    {
      threshold: [0, 0.25, 0.5, 0.75, 1],
    }
  );

  // Observe sections with data-section attribute
  document.querySelectorAll('[data-section]').forEach((section) => {
    observer.observe(section);
  });
};

// Debug check for content structure
const validateContent = () => {
  try {
    if (!content.about?.intro || !content.about?.paragraphs?.length) {
      console.error('Invalid about content structure:', content.about);
      return false;
    }
    debug('Content structure validated successfully');
    return true;
  } catch (error) {
    console.error('Content validation failed:', error);
    return false;
  }
};

// Run validation only in development
if (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
) {
  validateContent();
}
