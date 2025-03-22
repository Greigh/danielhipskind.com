import { fetchGitHubData } from './utils/github.js';

// About section content
export const about = {
  intro:
    "Hi!👋🏻 I'm Daniel Hipskind, a passionate and dedicated software developer with a focus on creating responsive and user-friendly web applications.",
  shortDescription: [
    'My journey into the world of programming began with a curiosity about how technology shapes our daily lives, and it has since evolved into a deep-seated passion for crafting elegant solutions to complex problems.',

    'With a solid foundation in front-end technologies like HTML, CSS, and JavaScript, as well as experience with modern frameworks like React, I strive to build intuitive and engaging user interfaces. My approach to development is centered on creating clean, efficient code that not only meets functional requirements but also enhances user experience.',

    "I'm currently pursuing an Associate's degree in Computer Programming at Grand Rapids Community College, where I'm constantly expanding my knowledge and honing my skills. This formal education, combined with my self-driven learning and practical projects, has given me a well-rounded understanding of software development principles and best practices.",
  ],
  expandedDescription: [
    "My experience extends beyond front-end development. I've worked on several full-stack projects, utilizing technologies like Node.js and Express for backend development, and MongoDB for database management. This full-stack experience allows me to understand and contribute to all aspects of web application development.",

    "I'm particularly interested in the intersection of technology and user experience. I believe that great software should not only function flawlessly but also be intuitive and accessible to all users. This philosophy guides my approach to every project I undertake.",

    "When I'm not coding, I enjoy exploring new programming concepts and contributing to open-source projects that challenge me to grow as a developer. Outside of technology, I love spending time in the great outdoors, where I find inspiration and balance. I also appreciate unwinding with a good movie or TV show, and occasionally, I indulge in a video game. As an avid learner, I’m always eager to stay updated with the latest trends in web development.",

    "I believe in the power of technology to make a positive impact, and I'm eager to be part of that change. Whether it's creating applications that simplify daily tasks or developing solutions that address larger societal challenges, I'm committed to using my skills to contribute meaningfully to the tech community and beyond.",

    "I'm always open to new opportunities, collaborations, and challenges that allow me to grow as a developer, make a difference through technology, and think outside the box. If you're interested in working together or just want to connect, feel free to reach out. I look forward to hearing from you!",
  ],
};

// Projects will be populated from GitHub
let projects = [];

// Social links configuration
export const socialLinks = [
  {
    name: 'GitHub',
    url: 'https://github.com/greigh',
    icon: 'githubSocial',
  },
  {
    name: 'LinkedIn',
    url: 'https://linkedin.com/in/danielhipskind',
    icon: 'linkedin',
  },
  {
    name: 'Twitter',
    url: 'https://twitter.com/danielhipskind',
    icon: 'twitter',
  },
  {
    name: 'Email',
    url: 'mailto:me@danielhipskind.com',
    icon: 'email',
  },
];

// Add the skills definition that was also missing
const skills = {
  technical: [
    { name: 'JavaScript', id: 'javascript', level: 95 },
    { name: 'Python', id: 'python', level: 85 },
    { name: 'React', id: 'react', level: 87 },
    { name: 'Node.js', id: 'nodejs', level: 88 },
    { name: 'HTML/CSS', id: 'html', level: 92 },
    { name: 'Git', id: 'git', level: 85 },
    { name: 'php', id: 'php', level: 80 },
    { name: 'Java', id: 'java', level: 90 },
  ],
  professional: [
    { name: 'Problem Solving', level: 95 },
    { name: 'Team Collaboration', level: 93 },
    { name: 'Adaptability', level: 98 },
    { name: 'Time Management', level: 90 },
    { name: 'Critical Thinking', level: 92 },
    { name: 'Project Management', level: 87 },
    { name: 'Leadership', level: 95 },
    { name: 'Attention to Detail', level: 97 },
  ],
};

// Initialize content
export async function initialize() {
  try {
    const githubProjects = await fetchGitHubData();
    projects = githubProjects;

    return {
      about,
      projects,
      skills,
      social: socialLinks,
    };
  } catch (error) {
    console.error('Failed to initialize content:', error);
    return {
      about,
      projects: [],
      skills,
      social: socialLinks,
    };
  }
}

// Helper functions
export function getProjectsByTech(tech) {
  return projects.filter(
    (project) => project.languages && project.languages[tech]
  );
}

export function getSkillsByLevel(minLevel) {
  return {
    technical: skills.technical.filter((skill) => skill.level >= minLevel),
    professional: skills.professional.filter(
      (skill) => skill.level >= minLevel
    ),
  };
}

// Copyright generator
export function generateCopyright() {
  const year = new Date().getFullYear();
  return `© ${year} Daniel Hipskind`;
}

export const content = {
  about,
  projects,
  skills,
};
