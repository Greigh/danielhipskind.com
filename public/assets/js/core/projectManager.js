import { debug } from '../utils/debug.js';
import iconManager from './iconManager.js';
import { analytics } from '../services/analytics.js';
import { cacheManager } from './cacheManager.js';
import { social } from './icons.js';
class ProjectManager {
  constructor() {
    this.projects = {
      'blocking-machine': {
        name: 'BlockingMachine',
        owner: 'greigh',
        repo: 'BlockingMachine', // Check exact case sensitivity
      },
      portfolio: {
        name: 'Portfolio Website',
        owner: 'greigh',
        repo: 'danielhipskind.com', // Verify this is exact repo name
      },
    };

    // Add validation on initialization
    debug('ProjectManager initialized with:', {
      projects: this.projects,
      validateRepos: Object.values(this.projects).map(
        (p) => `https://github.com/${p.owner}/${p.repo}`
      ),
    });

    this.initialized = false;
    this.cacheConfig = {
      key: 'github-projects-cache',
      expirationTime: 3600000, // 1 hour
    };

    // Initialize with cacheManager
    this.cacheManager = cacheManager;

    debug('ProjectManager initialized with cacheManager:', {
      cacheConfig: this.cacheManager.config,
      cacheAvailable: Boolean(this.cacheManager),
    });
  }

  async initialize() {
    try {
      // Start cache auto-update system
      cacheManager.startAutoUpdate();

      // Initialize projects
      await Promise.all([
        this.updateProjectDisplay('greigh', 'blockingmachine', {
          description: 'project-description',
          techStack: 'tech-stack',
          workflowInfo: 'workflow-info',
          githubLink: '.github-link',
        }),
        this.updateProjectDisplay('greigh', 'danielhipskind.com', {
          description: 'portfolio-description',
          techStack: 'portfolio-tech-stack',
          workflowInfo: 'portfolio-workflow-info',
          githubLink: '.github-link',
        }),
      ]);

      return true;
    } catch (error) {
      console.error('Failed to initialize projects:', error);
      return false;
    }
  }

  async getProjectData(owner, repo) {
    try {
      debug('Getting project data:', { owner, repo });

      // 1. Try cache first using cacheManager
      const cached = await cacheManager.getCachedData(owner, repo);
      if (cached) {
        debug('Using cached data:', { cached });
        return cached;
      }

      // 2. Try public GitHub API
      const publicData = await this.fetchPublicGitHub(owner, repo);
      if (publicData) {
        debug('Got data from public GitHub API:', { publicData });
        await cacheManager.cacheData(owner, repo, publicData);
        return publicData;
      }

      // 3. Try authenticated GitHub API
      const authenticatedData = await this.fetchAuthenticatedGitHub(
        owner,
        repo
      );
      if (authenticatedData) {
        debug('Got data from authenticated GitHub API:', { authenticatedData });
        await cacheManager.cacheData(owner, repo, authenticatedData);
        return authenticatedData;
      }

      // 4. Use fallback data
      debug('Using fallback data');
      const fallbackData = this.getFallbackData(owner, repo);
      await cacheManager.cacheData(owner, repo, fallbackData);
      return fallbackData;
    } catch (error) {
      debug('Error in getProjectData:', error);
      return this.getFallbackData(owner, repo);
    }
  }

  async fetchPublicGitHub(owner, repo) {
    try {
      const headers = {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'danielhipskind-portfolio',
      };

      const [repoResponse, languagesResponse, workflowsResponse] =
        await Promise.all([
          fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers }),
          fetch(`https://api.github.com/repos/${owner}/${repo}/languages`, {
            headers,
          }),
          fetch(
            `https://api.github.com/repos/${owner}/${repo}/actions/workflows`,
            { headers }
          ),
        ]);

      if (!repoResponse.ok) {
        debug('Public GitHub API failed:', {
          status: repoResponse.status,
          statusText: repoResponse.statusText,
        });
        return null;
      }

      return this.processGitHubResponse(
        await repoResponse.json(),
        await languagesResponse.json(),
        workflowsResponse.ok
          ? await workflowsResponse.json()
          : { workflows: [] }
      );
    } catch (error) {
      debug('Public GitHub API Error:', error);
      return null;
    }
  }

  async fetchAuthenticatedGitHub(owner, repo) {
    try {
      // Get token from your API
      const tokenResponse = await fetch('/api/github/token');
      if (!tokenResponse.ok) {
        debug('Failed to get GitHub token');
        return null;
      }

      const token = await tokenResponse.text();
      const headers = {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'danielhipskind-portfolio',
        Authorization: `token ${token}`,
      };

      const [repoResponse, languagesResponse, workflowsResponse] =
        await Promise.all([
          fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers }),
          fetch(`https://api.github.com/repos/${owner}/${repo}/languages`, {
            headers,
          }),
          fetch(
            `https://api.github.com/repos/${owner}/${repo}/actions/workflows`,
            { headers }
          ),
        ]);

      if (!repoResponse.ok) {
        debug('Authenticated GitHub API failed:', {
          status: repoResponse.status,
          statusText: repoResponse.statusText,
        });
        return null;
      }

      return this.processGitHubResponse(
        await repoResponse.json(),
        await languagesResponse.json(),
        workflowsResponse.ok
          ? await workflowsResponse.json()
          : { workflows: [] }
      );
    } catch (error) {
      debug('Authenticated GitHub API Error:', error);
      return null;
    }
  }

  processGitHubResponse(repoData, languagesData, workflowsData) {
    return {
      id: repoData.id,
      name: repoData.name,
      description: repoData.description || 'No description available',
      languages: Object.keys(languagesData).map((lang) => ({
        name: lang,
        icon: iconManager.getLanguageIcon(lang),
      })),
      workflows:
        workflowsData.workflows?.map((workflow) => ({
          name: workflow.name,
          type: this.getWorkflowType(workflow.name),
          icon: iconManager.getWorkflowIcon(
            this.getWorkflowType(workflow.name)
          ),
        })) || [],
      html_url: repoData.html_url,
    };
  }

  async fetchFromGitHub(owner, repo) {
    try {
      debug('Fetching GitHub data:', { owner, repo });

      const headers = {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'danielhipskind-portfolio',
      };

      // Debug rate limit first
      const rateLimitResponse = await fetch(
        'https://api.github.com/rate_limit',
        { headers }
      );
      const rateLimit = await rateLimitResponse.json();

      debug('GitHub API Rate Limit:', {
        remaining: rateLimit.resources.core.remaining,
        reset: new Date(rateLimit.resources.core.reset * 1000).toLocaleString(),
      });

      // If we're rate limited, try using cached data
      if (rateLimit.resources.core.remaining === 0) {
        debug('Rate limited, checking cache...');
        const cached = await this.getCache(owner, repo);
        if (cached) return cached;
      }

      // Fetch repo data
      const repoResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}`,
        { headers }
      );

      debug('GitHub API Response:', {
        status: repoResponse.status,
        ok: repoResponse.ok,
        headers: Object.fromEntries(repoResponse.headers.entries()),
      });

      if (!repoResponse.ok) {
        throw new Error(`GitHub API error: ${repoResponse.status}`);
      }

      // Fetch repo, languages, and workflows in parallel
      const [languagesResponse, workflowsResponse] = await Promise.all([
        fetch(`https://api.github.com/repos/${owner}/${repo}/languages`, {
          headers,
        }),
        fetch(
          `https://api.github.com/repos/${owner}/${repo}/actions/workflows`,
          { headers }
        ),
      ]);

      if (!languagesResponse.ok) {
        throw new Error(`GitHub API error: ${repoResponse.status}`);
      }

      const [repoData, languagesData, workflowsData] = await Promise.all([
        repoResponse.json(),
        languagesResponse.json(),
        workflowsResponse.ok ? workflowsResponse.json() : { workflows: [] },
      ]);

      return {
        id: repoData.id,
        name: repoData.name,
        description: repoData.description || 'No description available',
        languages: Object.keys(languagesData).map((lang) => {
          // Normalize language name to match our icon keys
          const normalizedLang = lang
            .toLowerCase()
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/\./g, '') // Remove dots
            .replace(/\+\+/g, 'pp') // C++ → cpp
            .replace(/#/g, 'sharp'); // C# → csharp

          debug(`Language mapping:`, {
            original: lang,
            normalized: normalizedLang,
            hasIcon: Boolean(iconManager.getLanguageIcon(normalizedLang)),
          });

          const iconData = iconManager.getLanguageIcon(normalizedLang);
          return {
            name: lang, // Keep original name for display
            normalizedName: normalizedLang, // Add normalized name for debugging
            icon: iconData,
          };
        }),
        workflows:
          workflowsData.workflows?.map((workflow) => {
            const type = this.getWorkflowType(workflow.name);
            const iconData = iconManager.getWorkflowIcon(type);
            return {
              name: workflow.name,
              type,
              icon: iconData,
            };
          }) || [],
        html_url: repoData.html_url,
        stars: repoData.stargazers_count,
      };
    } catch (error) {
      debug('GitHub API Error:', {
        message: error.message,
        stack: error.stack,
      });
      return null;
    }
  }

  async fetchWithAuth(url) {
    const headers = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'danielhipskind-portfolio',
    };

    // Try public API first
    try {
      const publicResponse = await fetch(url, { headers });
      if (publicResponse.ok) return publicResponse.json();

      // If we hit rate limit and haven't tried auth yet
      if (publicResponse.status === 403 && !this.githubToken) {
        const tokenResponse = await fetch('/api/github/token');
        this.githubToken = await tokenResponse.text();

        // Retry with auth token
        headers.Authorization = `token ${this.githubToken}`;
        const authResponse = await fetch(url, { headers });
        if (authResponse.ok) return authResponse.json();
      }

      throw new Error(`GitHub API error: ${publicResponse.status}`);
    } catch (error) {
      console.error('GitHub API fetch error:', error);
      return null;
    }
  }

  async fetchGitHubData(owner, repo) {
    try {
      // Check cache first
      const cached = await this.getCache(owner, repo);
      if (cached) {
        return cached;
      }

      // Set up headers for GitHub API
      const headers = {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'danielhipskind-website', // Add User-Agent header
      };

      // Check rate limit first
      const rateLimit = await fetch('https://api.github.com/rate_limit', {
        headers,
      });
      const rateLimitData = await rateLimit.json();

      if (rateLimitData.resources.core.remaining === 0) {
        const resetTime = new Date(rateLimitData.resources.core.reset * 1000);
        console.warn(
          `Rate limit exceeded. Resets at ${resetTime.toLocaleString()}`
        );
        return this.getFallbackData(owner, repo);
      }

      // Fetch fresh data using GitHub API
      const [repoResponse, languagesResponse] = await Promise.all([
        fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers }),
        fetch(`https://api.github.com/repos/${owner}/${repo}/languages`, {
          headers,
        }),
      ]);

      // Check for API rate limiting
      if (repoResponse.status === 403) {
        throw new Error('GitHub API rate limit exceeded');
      }

      // Handle 404 errors
      if (repoResponse.status === 404) {
        throw new Error('Repository not found');
      }

      const repoData = await repoResponse.json();
      const languages = await languagesResponse.json();

      // Process the data
      const processedData = {
        description: repoData.description,
        languages: Object.keys(languages).map((lang) => ({
          name: lang,
          icon: iconManager.getLanguageIcon(lang),
        })),
        workflows: [
          { name: 'Linting', icon: iconManager.getWorkflowIcon('linting') },
          { name: 'Testing', icon: iconManager.getWorkflowIcon('testing') },
          {
            name: 'Error Webhook',
            icon: iconManager.getWorkflowIcon('error webhook'),
          },
        ],
        html_url: repoData.html_url,
      };

      // Cache the new data
      this.setCache(owner, repo, processedData);
      return processedData;
    } catch (error) {
      console.error('Error fetching GitHub data:', error);
      return this.getFallbackData(owner, repo);
    }
  }

  // Add fallback data method
  getFallbackData(owner, repo) {
    const fallbackData = {
      blockingmachine: {
        description:
          'A custom-built aggregator that compiles and standardizes blocking lists, making them adaptable and powerful across platforms.',
        languages: ['JavaScript', 'Python', 'Shell'].map((lang) => ({
          name: lang,
          icon: iconManager.getLanguageIcon(lang),
        })),
        workflows: [
          {
            name: 'CI/CD',
            type: 'github',
            icon: iconManager.getWorkflowIcon('github'),
          },
          {
            name: 'Linting',
            type: 'linting',
            icon: iconManager.getWorkflowIcon('linting'),
          },
          {
            name: 'Testing',
            type: 'testing',
            icon: iconManager.getWorkflowIcon('testing'),
          },
          {
            name: 'Error Webhook',
            type: 'error-webhook',
            icon: iconManager.getWorkflowIcon('error-webhook'),
          },
        ],
        // Fix URL construction to use the passed owner/repo
        html_url: `https://github.com/${owner}/blockingmachine`,
      },
      'danielhipskind.com': {
        description:
          'Personal portfolio website built with vanilla JavaScript and modern web technologies.',
        languages: ['JavaScript', 'HTML', 'CSS'].map((lang) => ({
          name: lang,
          icon: iconManager.getLanguageIcon(lang),
        })),
        workflows: [
          { name: 'Linting', icon: iconManager.getWorkflowIcon('linting') },
          { name: 'Testing', icon: iconManager.getWorkflowIcon('testing') },
        ],
        // Fix URL construction to use the passed owner/repo
        html_url: `https://github.com/${owner}/danielhipskind.com`,
      },
    };

    // Debug the URL construction
    debug('Constructing fallback URL:', {
      owner,
      repo,
      url: fallbackData[repo]?.html_url,
    });

    return fallbackData[repo] || null;
  }

  async validateGitHubUrl(owner, repo) {
    try {
      // Use the GitHub API instead of direct GitHub URL
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}`
      );
      return response.status === 200;
    } catch (error) {
      console.error(
        `Failed to validate GitHub repository: ${owner}/${repo}`,
        error
      );
      return false;
    }
  }

  async updateProjectDisplay(owner, repo, selectors) {
    try {
      const data = await this.getProjectData(owner, repo);
      if (!data) return false;

      // Update description
      const descEl = document.getElementById(selectors.description);
      if (descEl) descEl.textContent = data.description;

      // Update tech stack
      const techEl = document.getElementById(selectors.techStack);
      if (techEl && data.languages) {
        techEl.innerHTML = data.languages
          .map((lang) => {
            debug(`Rendering language: ${lang.name}`, {
              hasIcon: Boolean(lang.icon),
              iconType: typeof lang.icon?.icon,
            });
            return `
              <span class="tech-tag" data-lang="${lang.name}">
                ${lang.icon?.icon ? `<span class="tech-icon">${lang.icon.icon}</span>` : ''}
                ${lang.name}
              </span>
            `;
          })
          .join('');
      }

      // Update workflows
      const workflowEl = document.getElementById(selectors.workflowInfo);
      if (workflowEl && data.workflows) {
        workflowEl.innerHTML = data.workflows
          .map(
            (flow) => `
          <span class="workflow-tag">
            ${flow.icon?.icon ? `<span class="workflow-icon" data-type="${flow.type}">${flow.icon.icon}</span>` : ''}
            ${flow.name}
          </span>
        `
          )
          .join('');
      }

      // Update GitHub link
      const linkEl = document.querySelector(selectors.githubLink);
      if (linkEl) linkEl.href = data.html_url;

      // Update debug logging to handle object structure
      debug(
        'Language data:',
        data.languages.map((l) => ({
          name: l.name,
          iconType: typeof l.icon,
          iconString: l.icon?.icon?.substring(0, 50) + '...' || 'No icon',
        }))
      );

      return true;
    } catch (error) {
      console.error('Failed to update project display:', error);
      return false;
    }
  }

  animateElement(element, updateFn) {
    element.style.opacity = '0';
    element.style.transform = 'translateY(10px)';

    requestAnimationFrame(() => {
      updateFn();
      element.style.transition =
        'opacity 0.3s ease-out, transform 0.3s ease-out';
      element.style.opacity = '1';
      element.style.transform = 'translateY(0)';
    });
  }

  handleProjectError(owner, repo, elementIds, error) {
    const message = this.getErrorMessage(error);

    const elements = [
      document.getElementById(elementIds.description),
      document.getElementById(elementIds.techStack),
      document.getElementById(elementIds.workflowInfo),
    ];

    elements.forEach((element) => {
      if (!element) return;
      element.innerHTML = `<div class="error-state">${message}</div>`;
    });

    // Automatically retry after delay if offline or rate limited
    if (error.message?.includes('rate limit') || !navigator.onLine) {
      setTimeout(() => {
        this.updateProjectDisplay(owner, repo, elementIds);
      }, 30000); // Retry after 30 seconds
    }
  }

  getErrorMessage(error) {
    if (error.message?.includes('rate limit')) {
      return 'Temporarily unavailable. Retrying soon...';
    }
    if (error.response?.status === 404) {
      return 'Project information unavailable.';
    }
    if (!navigator.onLine) {
      return 'Loading cached project data...';
    }
    return 'Loading project information...';
  }

  async getWorkflows(owner, repo) {
    try {
      const response = await this.fetchWithAuth(
        `https://api.github.com/repos/${owner}/${repo}/actions/workflows`
      );

      if (!response.ok) {
        debug(`Failed to fetch workflows for ${owner}/${repo}`);
        return this.getFallbackWorkflows(repo);
      }

      const data = await response.json();
      return data.workflows.map((workflow) => ({
        name: workflow.name,
        type: this.getWorkflowType(workflow.name),
        icon: iconManager.getWorkflowIcon(this.getWorkflowType(workflow.name)),
      }));
    } catch (error) {
      debug('Error fetching workflows:', error);
      return this.getFallbackWorkflows(repo);
    }
  }

  getWorkflowType(name) {
    if (!name) return 'gh-pages'; // Default fallback

    const normalized = name.toLowerCase();
    debug('Mapping workflow type:', {
      original: name,
      normalized: normalized,
    });

    // Exact matches first
    const mappings = {
      'pages-build-deployment': 'gh-pages',
      'github-pages': 'gh-pages',
      'gh-pages': 'gh-pages',
      'deploy-pages': 'gh-pages',
      eslint: 'eslint',
      lint: 'lint',
      linting: 'lint',
      aglint: 'aglint',
    };

    // Check exact matches
    if (mappings[normalized]) {
      debug(
        `Found exact workflow mapping: ${normalized} -> ${mappings[normalized]}`
      );
      return mappings[normalized];
    }

    // Check partial matches
    if (normalized.includes('pages') || normalized.includes('deploy'))
      return 'gh-pages';
    if (normalized.includes('eslint')) return 'eslint';
    if (normalized.includes('aglint')) return 'aglint';
    if (normalized.includes('lint')) return 'lint';

    debug(
      `No specific mapping found for workflow: ${name}, defaulting to gh-pages`
    );
    return 'gh-pages';
  }

  getFallbackWorkflows(repo) {
    debug('Getting fallback workflows for repo:', repo);

    const fallbacks = {
      blockingmachine: [
        { name: 'GitHub Pages', type: 'gh-pages' },
        { name: 'Linting', type: 'lint' },
        { name: 'ESLint', type: 'eslint' },
      ],
      'danielhipskind.com': [
        { name: 'GitHub Pages', type: 'gh-pages' },
        { name: 'AGLint', type: 'aglint' },
      ],
    };

    const workflows = fallbacks[repo] || [];

    debug('Fallback workflows:', {
      repo,
      workflows: workflows.map((w) => ({
        name: w.name,
        type: w.type,
      })),
    });

    return workflows.map((wf) => ({
      name: wf.name,
      type: wf.type,
      icon: iconManager.getWorkflowIcon(wf.type),
    }));
  }

  async fetchProjectData(owner, repo) {
    try {
      const response = await fetch(`/api/github/repos/${owner}/${repo}`);
      const data = await response.json();

      if (data.fallback) {
        console.warn(`Using fallback data for ${owner}/${repo}`);
      }

      return data;
    } catch (error) {
      console.error(
        `Failed to fetch project data for ${owner}/${repo}:`,
        error
      );
      return {
        description: 'Project information temporarily unavailable',
        languages: [],
        html_url: `https://github.com/${owner}/${repo}`,
      };
    }
  }

  async fetchProjectData(repo) {
    try {
      // Fetch repo data, languages, and workflows in parallel
      const [repoData, languages, workflows] = await Promise.all([
        fetch(`https://api.github.com/repos/${repo}`).then((r) => r.json()),
        fetch(`https://api.github.com/repos/${repo}/languages`).then((r) =>
          r.json()
        ),
        fetch(`https://api.github.com/repos/${repo}/actions/workflows`).then(
          (r) => r.json()
        ),
      ]);

      // Update project data
      const project = Object.values(this.projects).find((p) => p.repo === repo);
      if (project) {
        project.description = repoData.description;
        project.languages = Object.keys(languages);
        project.workflows = workflows.workflows.map((w) => w.name);
      }
    } catch (error) {
      console.error(`Failed to fetch data for ${repo}:`, error);
    }
  }

  updateProjectCards() {
    Object.entries(this.projects).forEach(([id, project]) => {
      const card = document.getElementById(id);
      if (!card) return;

      // Update description
      const description = card.querySelector(
        `#${id === 'blocking-machine' ? 'project' : id}-description`
      );
      if (description) {
        description.textContent =
          project.description || 'No description available';
      }

      // Update tech stack
      const techStack = card.querySelector(
        `#${id === 'blocking-machine' ? '' : id + '-'}tech-stack`
      );
      if (techStack && project.languages) {
        techStack.innerHTML = project.languages
          .map((lang) => `<span class="tech-tag">${lang}</span>`)
          .join('');
      }

      // Update workflows
      const workflowInfo = card.querySelector(
        `#${id === 'blocking-machine' ? '' : id + '-'}workflow-info`
      );
      if (workflowInfo && project.workflows) {
        workflowInfo.innerHTML = project.workflows
          .map((workflow) => `<span class="workflow-tag">${workflow}</span>`)
          .join('');
      }

      // Update GitHub link
      const link = card.querySelector('.github-link');
      if (link) {
        link.href = `https://github.com/${project.repo}`;
      }
    });
  }

  setLoadingState(isLoading) {
    const containers = [
      document.getElementById('tech-stack'),
      document.getElementById('portfolio-tech-stack'),
    ];

    containers.forEach((container) => {
      if (!container) return;

      if (isLoading) {
        container.innerHTML =
          '<div class="loading">Loading project details...</div>';
      } else {
        const loading = container.querySelector('.loading');
        if (loading) loading.remove();
      }
    });
  }

  createProjectCard(project) {
    return `
      <div class="project-card" data-project-id="${project.id}">
        <div class="project-content">
          <h3 class="project-title">${project.name}</h3>
          <p class="project-description">${project.description}</p>

          <div class="project-actions">
            <a href="${project.html_url}" class="github-button" target="_blank" rel="noopener noreferrer">
              <span class="github-icon">${social.github}</span>
              <span class="button-text">View on GitHub</span>
            </a>
          </div>

          <div class="technologies-section">
            <!-- ...existing tech stack and workflow sections... -->
          </div>
        </div>
      </div>
    `;
  }

  async loadProject(id) {
    try {
      const project = this.projects.get(id);
      if (project) {
        // Track project view using analytics service
        analytics.trackProjectView(project);
        return project;
      }
      throw new Error('Project not found');
    } catch (error) {
      console.error('Error loading project:', error);
      throw error;
    }
  }

  createTechStackHTML(languages) {
    return languages
      .map(
        (lang) => `
            <span class="tech-tag" data-lang="${lang.name}">
                ${lang.icon ? `<span class="tech-icon">${lang.icon}</span>` : ''}
                ${lang.name}
            </span>
        `
      )
      .join('');
  }

  createWorkflowHTML(workflows) {
    return workflows
      .map(
        (flow) => `
            <span class="workflow-tag">
                ${flow.icon ? `<span class="workflow-icon" data-type="${flow.name.toLowerCase().replace(/\s+/g, '-')}">${flow.icon}</span>` : ''}
                ${flow.name}
            </span>
        `
      )
      .join('');
  }

  async forceRefresh() {
    debug('Force refreshing project data');
    this.cacheManager.clearAllCache();
    await this.initialize();
    debug('Project data refreshed');
  }
}

// Create and export singleton instance
export const projectManager = new ProjectManager();

// Add to window for console access
if (typeof window !== 'undefined') {
  window.projectManager = projectManager;
}
