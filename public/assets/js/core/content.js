import { debug } from './utils.js';

// Content configuration
export const content = {
  about: {
    intro:
      "I'm Daniel Hipskind, a passionate and dedicated software developer with a focus on creating responsive and user-friendly web applications.",
    paragraphs: [
      'My journey into the world of programming began with a curiosity about how technology shapes our daily lives, and it has since evolved into a deep-seated passion for crafting elegant solutions to complex problems.',
      'With a solid foundation in front-end technologies like HTML, CSS, and JavaScript, as well as experience with modern frameworks like React and Express.js, I strive to build intuitive and engaging user interfaces. My approach to development is centered on creating clean, efficient code that not only meets functional requirements but also enhances user experience.',
      "I'm currently pursuing an Associate's degree in Computer Programming at Grand Rapids Community College, where I'm constantly expanding my knowledge and honing my skills. This formal education, combined with my self-driven learning and practical projects, has given me a well-rounded understanding of software development principles and best practices.",
      "My experience extends beyond front-end development. I've worked on several full-stack projects, utilizing technologies like Node.js and Express.js for backend development and MongoDB (Non-Relational Databases) and PostgreSQL (Relational Databases) for database management. This full-stack experience allows me to understand and contribute to all aspects of web application development.",
      "I'm particularly interested in the intersection of technology and user experience. I believe that great software should not only function flawlessly but also be intuitive and accessible to all users. This philosophy guides my approach to every project I undertake.",
      "When I'm not coding, I enjoy exploring new programming concepts and contributing to open-source projects that challenge me to grow as a developer. Outside of technology, I love spending time in the great outdoors, where I find inspiration and balance. I also appreciate unwinding with a good movie or TV show, and occasionally, I indulge in a video game. As an avid learner, I’m always eager to stay updated with the latest trends in web development.",
      "I believe in the power of technology to make a positive impact, and I'm eager to be part of that change. Whether it's creating applications that simplify daily tasks or developing solutions that address larger societal challenges, I'm committed to using my skills to contribute meaningfully to the tech community and beyond.",
      "I'm always open to new opportunities, collaborations, and challenges that allow me to grow as a developer, make a difference through technology, and make me think outside the box. If you're interested in working together or just want to connect, feel free to reach out. I look forward to hearing from you!",
    ],
  },

  projects: [
    {
      title: 'Blocking Machine',
      description:
        'An advanced discord bot that helps server owners manage their communities effectively with automated moderation tools and custom commands.',
      githubUrl: 'https://github.com/greigh/blockingmachine',
      technologies: {
        languages: [
          { name: 'JavaScript', icon: 'JavaScript' },
          { name: 'NodeJS', icon: 'NodeJS' },
        ],
        workflows: [
          { name: 'Linting', type: 'linting', icon: 'lint' },
          { name: 'Testing', type: 'testing', icon: 'test' },
          { name: 'Error Webhook', type: 'error-webhook', icon: 'discord' },
        ],
      },
    },
    {
      title: 'Portfolio Website',
      description:
        'A responsive personal portfolio website built with modern web technologies, featuring dynamic theme switching and smooth animations.',
      githubUrl: 'https://github.com/greigh/danielhipskind.com',
      technologies: {
        languages: [
          { name: 'HTML', icon: 'HTML' },
          { name: 'CSS', icon: 'CSS' },
          { name: 'JavaScript', icon: 'JavaScript' },
        ],
        workflows: [{ name: 'Linting', type: 'linting', icon: 'lint' }],
      },
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
      languages: project.technologies.languages.map((lang) => lang.name),
      workflows: project.technologies.workflows.map((flow) => flow.type),
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

// Simple validation
const injectAboutContent = () => {
  try {
    const aboutContainer = document.querySelector('[data-content="about"]');
    if (!aboutContainer) {
      throw new Error('About section container not found');
    }

    // Create and append intro paragraph
    const intro = document.createElement('p');
    intro.className = 'about-intro';
    intro.textContent = content.about.intro;
    aboutContainer.appendChild(intro);

    // Create and append other paragraphs
    content.about.paragraphs.forEach((paragraph) => {
      const p = document.createElement('p');
      p.className = 'about-paragraph';
      p.textContent = paragraph;
      aboutContainer.appendChild(p);
    });

    return true;
  } catch (error) {
    console.error('Failed to inject about content:', error);
    return false;
  }
};

// Update validation function
const validateContent = () => {
  try {
    // Validate about section
    if (!content.about || !content.about.intro || !content.about.paragraphs) {
      throw new Error('Invalid about section structure');
    }

    // Inject content after validation
    injectAboutContent();

    return true;
  } catch (error) {
    console.error('Content validation failed:', error);
    return false;
  }
};

// Initialize content
document.addEventListener('DOMContentLoaded', () => {
  validateContent();
});
