/**
 * Icon configuration and mapping
 * This file contains the mapping between internal names and display names,
 * as well as visibility settings for different technologies
 */

// Utility function for icon lookup
export const getIconKey = (name) => {
  if (!name) return null;
  return name.toLowerCase().replace(/[^a-z0-9-]/g, '');
};

// Core technology display names
export const languageNames = {
  // Web Technologies
  html: 'HTML',
  css: 'CSS',
  javascript: 'JavaScript',
  typescript: 'TypeScript',

  // Backend Technologies
  nodejs: 'Node.js',
  python: 'Python',
  java: 'Java',

  // Systems Programming
  csharp: 'C#',
  cpp: 'C++',
  rust: 'Rust',
  go: 'Go',

  // Other Languages
  ruby: 'Ruby',
  php: 'PHP',
  swift: 'Swift',

  // Template Engines
  ejs: 'Embedded JavaScript',

  // Shell & Scripting
  shell: 'Shell',
  bash: 'Bash',
  zsh: 'Zsh',
  'shell-script': 'Shell Script',
};

// Icon key mapping for special cases
export const iconKeyMap = {
  'node.js': 'nodejs',
  'c++': 'cpp',
  'c#': 'csharp',
  'shell script': 'shell-script',
  'embedded js': 'ejs',
  'embedded javascript': 'ejs',
  '.net': 'dotnet',
  'react.js': 'react',
  'vue.js': 'vue',
  node: 'nodejs',
  'javascript (node.js)': 'nodejs',
  'gh pages': 'pages-build-deployment',
  'github pages': 'pages-build-deployment',
  'bash script': 'shell-script',
  'shell scripting': 'shell-script',
  terminal: 'shell',
  'command line': 'shell',
  cli: 'shell',
};

// Workflow key mappings
export const workflowKeyMap = {
  'pages-build-deployment': 'gh-pages',
  'github-pages': 'gh-pages',
  'gh pages': 'gh-pages',
  'GitHub Pages': 'gh-pages',
  linting: 'lint',
  lint: 'lint',
  mdlint: 'lint',
  markdownlint: 'lint',
  testing: 'test',
  test: 'test',
  eslint: 'eslint',
  aglint: 'aglint',
};

// Helper function to get display name
export const getDisplayName = (type, name) => {
  if (!name) return null;

  if (type === 'language') {
    const mappedKey = iconKeyMap[name.toLowerCase()] || getIconKey(name);
    return languageNames[mappedKey] || name;
  } else {
    // For workflows, first map to the correct key
    const workflowKey = workflowKeyMap[name.toLowerCase()] || getIconKey(name);
    return workflowNames[workflowKey] || name;
  }
};

// Workflow and tooling display names
export const workflowNames = {
  'gh-pages': 'GitHub Pages',
  lint: 'Lint',
  test: 'Testing',
  eslint: 'ESLint',
  aglint: 'AGLint',
};

// Visibility configuration for UI
export const visibility = {
  languages: {
    // Core Web
    html: true,
    css: true,
    javascript: true,
    typescript: true,

    // Backend
    nodejs: true,
    python: true,
    java: true,

    // Systems
    csharp: true,
    cpp: true,
    rust: true,
    go: true,

    // Other Languages
    ruby: true,
    php: true,
    swift: true,

    // Templates
    ejs: true,

    // Shell & Scripting
    shell: true,
    bash: true,
    zsh: true,
    'shell-script': true,
  },

  workflows: {
    linting: true,
    aglint: true,
    testing: true,
    'error webhook': true,
    github: true,
    'pages-build-deployment': true,
  },
};

// Optional: Add type validation (if using TypeScript)
export const isValidLanguage = (name) => name in languageNames;
export const isValidWorkflow = (name) => name in workflowNames;

// Optional: Add grouping metadata
export const groups = {
  languages: {
    web: ['html', 'css', 'javascript', 'typescript'],
    backend: ['nodejs', 'python', 'java'],
    systems: ['csharp', 'cpp', 'rust', 'go'],
    scripting: ['shell', 'bash', 'zsh', 'shell-script'],
  },
  workflows: {
    quality: ['linting', 'aglint'],
    deployment: ['github', 'pages-build-deployment'],
    testing: ['testing', 'error webhook'],
  },
};
