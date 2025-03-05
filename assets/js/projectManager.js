import { cacheManager } from './cacheManager.js';
import iconManager from './iconManager.js';

export const projectManager = {
  cacheConfig: {
    key: 'github-projects-cache',
    expirationTime: 3600000, // 1 hour
  },

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
  },

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
  },

  clearCache(owner, repo) {
    const cacheKey = `${this.cacheConfig.key}-${owner}-${repo}`;
    localStorage.removeItem(cacheKey);
  },

  updateCacheStatus(isFresh = true) {
    const statusElement = document.getElementById('cache-status');
    if (statusElement) {
      statusElement.className = `cache-status ${isFresh ? 'fresh' : 'stale'}`;
      statusElement.title = `Cache ${isFresh ? 'is fresh' : 'needs refresh'}`;
    }
  },

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
  },

  async initialize() {
    try {
      await Promise.all([
        this.updateProjectDisplay('greigh', 'blockingmachine', {
          // lowercase to match GitHub
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
    } catch (error) {
      console.error('Error initializing project manager:', error);
    }
  },

  async fetchGitHubData(owner, repo) {
    try {
      // Check cache first
      const cached = await this.getCache(owner, repo);
      if (cached) {
        console.log(`Using cached data for ${owner}/${repo}`);
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
  },

  // Add fallback data method
  getFallbackData(owner, repo) {
    const fallbackData = {
      BlockingMachine: {
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
  },

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
  },

  updateProjectDisplay: async function (owner, repo, elementIds) {
    const projectCard = document
      .querySelector(`#${elementIds.techStack}`)
      .closest('.project-card');

    try {
      // Validate GitHub URL first
      const isValidRepo = await this.validateGitHubUrl(owner, repo);
      if (!isValidRepo) {
        throw new Error('Invalid GitHub repository');
      }

      // Remove any existing error states
      projectCard.classList.remove('error');

      // Set loading state
      projectCard.classList.add('loading');

      // Replace content with loading text
      const description = document.getElementById(elementIds.description);
      const techStack = document.getElementById(elementIds.techStack);
      const workflowInfo = document.getElementById(elementIds.workflowInfo);

      description.innerHTML =
        '<span class="loading-text">Loading project description...</span>';
      techStack.innerHTML =
        '<span class="loading-text">Loading technologies...</span>';
      workflowInfo.innerHTML =
        '<span class="loading-text">Loading workflow info...</span>';

      // Fetch data
      const data = await this.fetchGitHubData(owner, repo);
      if (!data) {
        throw new Error('Failed to fetch project data');
      }

      // Update content
      if (techStack && data.languages) {
        techStack.innerHTML = data.languages
          .map(
            (lang) => `
            <span class="language-tag" title="${lang.name}">
              ${lang.icon}
              <span class="language-name">${lang.name}</span>
            </span>
          `
          )
          .join('');
      }

      // Update other elements
      const elements = {
        description: document.getElementById(elementIds.description),
        workflowInfo: document.getElementById(elementIds.workflowInfo),
        githubLink: document.querySelector(elementIds.githubLink),
      };

      if (elements.description) {
        elements.description.textContent = data.description;
      }

      if (elements.workflowInfo && data.workflows) {
        elements.workflowInfo.innerHTML = data.workflows
          .map(
            (workflow) => `
            <span class="workflow-item" title="${workflow.name}">
              ${workflow.icon}
              ${workflow.name}
            </span>
          `
          )
          .join('');
      }

      if (elements.githubLink) {
        const githubUrl =
          data.html_url || `https://github.com/${owner}/${repo}`;
        elements.githubLink.href = githubUrl.toLowerCase(); // ensure lowercase URL
        elements.githubLink.setAttribute('rel', 'noopener noreferrer');
        elements.githubLink.setAttribute('target', '_blank');
        elements.githubLink.innerHTML = `
          ${iconManager.getSocialIcon('github')}
          <span>View on GitHub</span>
        `;

        // Validate the URL
        const isValid = await this.validateGitHubUrl(owner, repo);
        if (!isValid) {
          elements.githubLink.classList.add('disabled');
          elements.githubLink.title = 'Repository not available';
        }
      }
    } catch (error) {
      console.error('Error updating project display:', error);

      // Show error state
      projectCard.classList.add('error');

      const errorMessage = this.getErrorMessage(error);
      const retryButton = this.createRetryButton(() =>
        this.updateProjectDisplay(owner, repo, elementIds)
      );

      // Update elements with error state
      const elements = {
        description: document.getElementById(elementIds.description),
        techStack: document.getElementById(elementIds.techStack),
        workflowInfo: document.getElementById(elementIds.workflowInfo),
      };

      elements.description.innerHTML = `
        <div class="error-message">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12" y2="16"/>
          </svg>
          ${errorMessage}
        </div>
        ${retryButton}
      `;

      elements.techStack.innerHTML = '';
      elements.workflowInfo.innerHTML = '';
    } finally {
      projectCard.classList.remove('loading');
    }
  },

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
  },

  createRetryButton(retryFunction) {
    return `
      <button
        class="retry-button"
        onclick="(${retryFunction.toString()})()">
        Try Again
      </button>
    `;
  },
};
