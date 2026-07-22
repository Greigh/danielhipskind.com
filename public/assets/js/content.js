import { fetchGitHubData } from './utils/github.js';

// About section content
export const about = {
  intro:
    "Hi!👋🏻 I'm Daniel Hipskind, a software engineer with a solid foundation in React and full-stack development, committed to creating clean, efficient code.",
  shortDescription: [
    'My journey into programming began with a curiosity about how technology shapes our daily lives, and it has since evolved into a deep-seated passion for crafting elegant solutions to complex problems.',

    'I have a solid foundation in front-end technologies like HTML, CSS, and JavaScript, and experience with modern frameworks like React. My approach is centered on creating clean, efficient code that not only meets functional requirements but also enhances user experience.',

    "My experience extends beyond front-end development. I've worked on several full-stack projects, utilizing technologies like Node.js and Express for backend development, and MongoDB for database management. This full-stack experience allows me to understand and contribute to all aspects of web application development.",
  ],
  expandedDescription: [
    "I'm currently pursuing an Associate's degree in Computer Programming at Grand Rapids Community College, where I'm constantly expanding my knowledge and honing my skills. This formal education, combined with self-driven learning and practical projects, has given me a well-rounded understanding of software development principles and best practices.",

    "I'm particularly interested in the intersection of technology and user experience, believing that great software should be intuitive and accessible to all users. This philosophy guides my approach to every project I undertake.",

    "When I'm not coding, I enjoy exploring new programming concepts and contributing to open-source projects. Outside of technology, I love spending time in the great outdoors, unwinding with a good movie or TV show, and occasionally indulging in a video game. As an avid learner, I’m always eager to stay updated with the latest trends in web development.",

    "I believe in the power of technology to make a positive impact and am committed to using my skills to contribute meaningfully to the tech community and beyond. I'm always open to new opportunities, collaborations, and challenges that allow me to grow as a developer and make a difference.",

    "If you're interested in working together or just want to connect, feel free to reach out. I look forward to hearing from you!",
  ],
};

// Projects will be populated from GitHub, plus our custom project
let projects = [];

// Manual project entry for Call Center Helper
const callCenterHelperProject = {
  title: 'Adamas - Call Center Helper',
  repoName: 'callcenterhelper',
  description:
    'A powerful productivity toolkit designed for call center agents. Streamlines workflows with hold timers, call flow guides, pattern formatters, and quick notes. Features dark/light themes for reduced eye strain. Enhances customer interactions while improving efficiency and compliance.',
  githubUrl: 'https://github.com/Greigh/Adamas',
  languages: {
    JavaScript: 48000, // 48%
    SCSS: 42000, // 42%
    HTML: 8000, // 7%
    SH: 3000, // 3%
  },
  updatedAt: new Date().toLocaleDateString(),
  order: 0, // Put it first in the list
  demoUrl: 'https://danielhipskind.com/adamas/',
  has_pages: false,
  topics: ['utility', 'call-center', 'customer-service'],
};

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
    name: 'Email',
    url: 'mailto:me@danielhipskind.com',
    icon: 'email',
  },
];

// Add the skills definition that was also missing
const skills = {
  technical: [
    { name: 'JavaScript', id: 'javascript', level: 95 },
    { name: 'TypeScript', id: 'typescript', level: 88 },
    { name: 'React', id: 'react', level: 90 },
    { name: 'Next.js', id: 'nextjs', level: 86 },
    { name: 'Node.js', id: 'nodejs', level: 88 },
    { name: 'Tailwind CSS', id: 'tailwindcss', level: 90 },
    { name: 'Swift', id: 'swift', level: 82 },
    { name: 'Kotlin', id: 'kotlin', level: 80 },
    { name: 'Python', id: 'python', level: 85 },
    { name: 'Java', id: 'java', level: 87 },
    { name: 'Git', id: 'git', level: 88 },
  ],
  professional: [
    { name: 'Problem Solving', level: 90 },
    { name: 'Critical Thinking', level: 88 },
    { name: 'Adaptability', level: 92 },
    { name: 'Attention to Detail', level: 90 },
    { name: 'Team Collaboration', level: 85 },
    { name: 'Time Management', level: 78 },
    { name: 'Leadership', level: 75 },
    { name: 'Project Management', level: 72 },
  ],
};

// Initialize content
export async function initialize() {
  try {
    const githubProjects = await fetchGitHubData();
    // Add the manual project to the GitHub projects
    projects = [callCenterHelperProject, ...githubProjects];

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
      // Still include the manual project even if GitHub fetch fails
      projects: [callCenterHelperProject],
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
