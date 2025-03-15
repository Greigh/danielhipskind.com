import { debug } from '../utils/debug.js';
import iconManager from './iconManager.js';
import { analytics } from '../services/analytics.js';

class ProjectManager {
  constructor() {
    this.projects = new Map();
    this.initialized = false;
    this.observers = new Map();
    this.cacheConfig = {
      key: 'github-projects-cache',
      expirationTime: 3600000, // 1 hour
    };
  }

  cacheConfig = {
    key: 'github-projects-cache',
    expirationTime: 3600000, // 1 hour
  };

  async getCache(owner, repo) {
    try {
      const cacheKey = `${this.cacheConfig.key}-${owner}-${repo}`;
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      const now = new Date().getTime();

      // Check expiration
      if (now - timestamp > this.cacheConfig.expirationTime) {
        this.clearCache(owner, repo);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Cache read error:', error);
      this.clearCache(owner, repo);
      return null;
    }
  }

  setCache(owner, repo, data) {
    try {
      const cacheKey = `${this.cacheConfig.key}-${owner}-${repo}`;
      const cacheData = {
        data,
        timestamp: new Date().getTime(),
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }

  clearCache(owner, repo) {
    const cacheKey = `${this.cacheConfig.key}-${owner}-${repo}`;
    localStorage.removeItem(cacheKey);
  }

  updateCacheStatus(isFresh = true) {
    const statusElement = document.getElementById('cache-status');
    if (statusElement) {
      statusElement.className = `cache-status ${isFresh ? 'fresh' : 'stale'}`;
      statusElement.title = `Cache ${isFresh ? 'is fresh' : 'needs refresh'}`;
    }
  }

  async checkForUpdates(owner, repo) {
    try {
      const etag = localStorage.getItem(`${this.cacheConfig.key}-etag`);
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}`,
        {
          headers: etag ? { 'If-None-Match': etag } : {},
        }
      );

      if (response.status === 304) {
        return false; // No updates available
      }

      // Store new ETag
      const newEtag = response.headers.get('etag');
      if (newEtag) {
        localStorage.setItem(`${this.cacheConfig.key}-etag`, newEtag);
      }

      return true; // Updates available
    } catch (error) {
      console.error('Error checking for updates:', error);
      return false;
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
          { name: 'Linting', icon: iconManager.getWorkflowIcon('linting') },
          { name: 'Testing', icon: iconManager.getWorkflowIcon('testing') },
          {
            name: 'Error Webhook',
            icon: iconManager.getWorkflowIcon('error webhook'),
          },
        ],
        html_url: `https://github.com/${owner}/${repo}`,
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
        html_url: `https://github.com/${owner}/${repo}`,
      },
    };

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

  async updateProjectDisplay(owner, repo, elementIds) {
    try {
      const data = await this.getProjectData(owner, repo);
      if (!data) throw new Error('No project data available');

      const elements = {
        description: document.getElementById(elementIds.description),
        techStack: document.getElementById(elementIds.techStack),
        workflowInfo: document.getElementById(elementIds.workflowInfo),
        githubLink: document.querySelector(elementIds.githubLink),
      };

      // Validate all required elements exist
      Object.entries(elements).forEach(([key, element]) => {
        if (!element) throw new Error(`Element not found: ${key}`);
      });

      // Update elements with animation
      this.animateElement(elements.description, () => {
        elements.description.textContent = data.description;
      });

      this.animateElement(elements.techStack, () => {
        elements.techStack.innerHTML = this.createTechStackHTML(data.languages);
      });

      if (data.workflows?.length) {
        this.animateElement(elements.workflowInfo, () => {
          elements.workflowInfo.innerHTML = this.createWorkflowHTML(
            data.workflows
          );
        });
      } else {
        elements.workflowInfo.style.display = 'none';
      }

      elements.githubLink.href = data.html_url;

      // Track view if analytics enabled
      if (window.analyticsPreferences?.isEnabled()) {
        this.trackProjectView({ owner, repo, ...data });
      }

      return true;
    } catch (error) {
      debug(`Error updating project display for ${repo}:`, error);
      this.handleProjectError(owner, repo, elementIds, error);
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
    const retryButton = this.createRetryButton(owner, repo, elementIds);

    const elements = [
      document.getElementById(elementIds.description),
      document.getElementById(elementIds.techStack),
      document.getElementById(elementIds.workflowInfo),
    ];

    elements.forEach((element) => {
      if (!element) return;
      element.innerHTML = `
        <div class="error-state">
          <p>${message}</p>
          ${retryButton}
        </div>
      `;
    });
  }

  getErrorMessage(error) {
    if (error.message?.includes('rate limit')) {
      return 'GitHub API rate limit reached. Using cached data if available.';
    }
    if (error.response?.status === 404) {
      return 'Project not found. Please check the repository details.';
    }
    if (!navigator.onLine) {
      return 'You appear to be offline. Using cached data if available.';
    }
    return 'Using locally stored project data.';
  }

  createRetryButton(owner, repo, elementIds) {
    const retryFunction = async () => {
      await this.updateProjectDisplay(owner, repo, elementIds);
    };

    return `
      <button
        class="retry-button"
        onclick="document.dispatchEvent(new CustomEvent('retryProjectLoad', {
          detail: {
            owner: '${owner}',
            repo: '${repo}',
            elementIds: ${JSON.stringify(elementIds)}
          }
        }))">
        Try Again
      </button>
    `;
  }

  async getProjectData(owner, repo) {
    try {
      // Try cache first
      const cachedData = await this.getCache(owner, repo);
      if (cachedData) return cachedData;

      // Set up headers for GitHub API
      const headers = {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'danielhipskind-portfolio',
      };

      // Fetch repository data
      const repoResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}`,
        { headers }
      );
      if (!repoResponse.ok) {
        throw new Error(`GitHub API error: ${repoResponse.status}`);
      }
      const repoData = await repoResponse.json();

      // Fetch languages data
      const languagesResponse = await fetch(repoData.languages_url, {
        headers,
      });
      const languagesData = await languagesResponse.json();

      // Process the data
      const data = {
        description: repoData.description || 'No description available',
        languages: Object.keys(languagesData).map((lang) => ({
          name: lang,
          icon: iconManager.getLanguageIcon(lang),
        })),
        workflows:
          repo === 'blockingmachine'
            ? [
                {
                  name: 'Linting',
                  icon: iconManager.getWorkflowIcon('linting'),
                },
                {
                  name: 'Testing',
                  icon: iconManager.getWorkflowIcon('testing'),
                },
                {
                  name: 'Error Webhook',
                  icon: iconManager.getWorkflowIcon('error webhook'),
                },
              ]
            : [], // Empty array for portfolio project
        html_url: repoData.html_url,
      };

      // Cache the processed data
      this.setCache(owner, repo, data);
      return data;
    } catch (error) {
      console.error(`Error fetching project data for ${repo}:`, error);
      return this.getFallbackData(owner, repo);
    }
  }

  async getWorkflows(owner, repo) {
    try {
      const octokit = new window.Octokit();
      const response = await octokit.request(
        'GET /repos/{owner}/{repo}/actions/workflows',
        {
          owner,
          repo,
        }
      );
      return response.data.workflows.map((workflow) => ({
        name: workflow.name,
        state: workflow.state,
      }));
    } catch (error) {
      console.warn(`No workflows found for ${repo}`);
      return [];
    }
  }

  async initialize() {
    try {
      debug('Initializing project manager');

      // Set up retry event listener
      this.setupRetryListener();

      // Show loading state
      this.setLoadingState(true);

      await Promise.all([
        this.updateProjectDisplay('greigh', 'blockingmachine', {
          description: 'project-description',
          techStack: 'tech-stack',
          workflowInfo: 'workflow-info',
          githubLink: '#blocking-machine .github-link',
        }),
        this.updateProjectDisplay('greigh', 'danielhipskind.com', {
          description: 'portfolio-description',
          techStack: 'portfolio-tech-stack',
          workflowInfo: 'portfolio-workflow-info',
          githubLink: '#portfolio .github-link',
        }),
      ]);

      this.initialized = true;
      this.setLoadingState(false);
      debug('Project manager initialized');
      return true;
    } catch (error) {
      debug('Failed to initialize project manager:', error);
      this.handleError(error);
      return false;
    }
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
    const card = document.createElement('div');
    card.className = 'project-card';

    // ...existing project card creation code...

    // Track project views
    if (window.analyticsPreferences?.isEnabled()) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            analytics.trackProjectView(project);
            observer.disconnect();
          }
        });
      });
      observer.observe(card);
    }

    return card;
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
}

export const projectManager = new ProjectManager();
