import { Octokit } from '@octokit/rest';
import express from 'express';
import { config } from '../config/config.js';

const router = express.Router();

// Initialize Octokit with config
const octokit = new Octokit({
  userAgent: config.github.api.headers['User-Agent'],
});

// Use cache config from main config
const apiCache = new Map();
const CACHE_DURATION = config.cache.duration;

async function fetchGitHubData(owner, repo) {
  try {
    // Try public API first
    const [repoData, languagesData] = await Promise.all([
      octokit.repos.get({ owner, repo }),
      octokit.repos.listLanguages({ owner, repo }),
    ]);

    return formatGitHubResponse(repoData.data, languagesData.data);
  } catch (error) {
    if (error.status === 403) {
      // If rate limited, try with auth token
      const authedOctokit = new Octokit({
        auth: process.env.GITHUB_TOKEN,
        userAgent: config.github.api.headers['User-Agent'],
      });

      const [repoData, languagesData] = await Promise.all([
        authedOctokit.repos.get({ owner, repo }),
        authedOctokit.repos.listLanguages({ owner, repo }),
      ]);

      return formatGitHubResponse(repoData.data, languagesData.data);
    }
    throw error;
  }
}

function formatGitHubResponse(repoData, languagesData) {
  return {
    description: repoData.description || 'No description available',
    languages: Object.keys(languagesData),
    html_url: repoData.html_url,
    stars: repoData.stargazers_count,
    updated_at: repoData.updated_at,
  };
}

router.get('/repos/:owner/:repo', async (req, res) => {
  const { owner, repo } = req.params;
  const cacheKey = `${config.cache.keys.github}-${owner}-${repo}`;

  try {
    // Check cache first
    const cached = apiCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return res.json(cached.data);
    }

    const data = await fetchGitHubData(owner, repo);

    // Cache the successful response
    apiCache.set(cacheKey, {
      timestamp: Date.now(),
      data,
    });

    res.json(data);
  } catch (error) {
    console.error(`Error fetching repo data for ${owner}/${repo}:`, error);
    res.status(500).json({
      error: 'Failed to fetch repository data',
      fallback: true,
      data: {
        description: 'Project information temporarily unavailable',
        languages: [],
        html_url: `https://github.com/${owner}/${repo}`,
      },
    });
  }
});

export default router;
