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
      languages: ['JavaScript'],
      workflows: ['Linting', 'Testing', 'Error Webhook'],
    },
    {
      title: 'Portfolio Website (this website)',
      description:
        'A responsive personal portfolio website built with modern web technologies, featuring dynamic theme switching and smooth animations.',
      githubUrl: 'https://github.com/greigh/danielhipskind.com',
      languages: ['HTML', 'CSS', 'JavaScript'],
      workflows: [],
    },
  ],

  skills: {
    technical: [
      { name: 'JavaScript', level: 90 },
      { name: 'Python', level: 85 },
      { name: 'HTML/CSS', level: 95 },
      { name: 'React', level: 80 },
      { name: 'Node.js', level: 75 },
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
    },
    {
      name: 'LinkedIn',
      url: 'https://linkedin.com/in/danielhipskind',
      icon: 'linkedin',
      label: 'Connect with me on LinkedIn',
    },
    {
      name: 'Email',
      url: 'mailto:me@danielhipskind.com',
      icon: 'email',
      label: 'Send me an email',
    },
    {
      name: 'Discord',
      url: 'https://discordapp.com/users/greigh.',
      icon: 'discord',
      label: 'Connect on Discord',
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

// Helper function to populate About section
export const populateAbout = () => {
  const aboutText = document.querySelector('.about-text');
  if (!aboutText) return;

  const { intro, paragraphs } = content.about;

  // Clear existing content
  aboutText.innerHTML = '';

  // Add intro paragraph
  const introP = document.createElement('p');
  introP.className = 'about-intro';
  introP.textContent = intro;
  aboutText.appendChild(introP);

  // Add remaining paragraphs
  paragraphs.forEach((text) => {
    const p = document.createElement('p');
    p.textContent = text;
    aboutText.appendChild(p);
  });
};
