const GITHUB_API_BASE = 'https://api.github.com';
const USERNAME = 'greigh';

// Define your featured projects with custom display names
const FEATURED_REPOS = [
  {
    repo: 'blockingmachine',
    displayName: 'Blocking Machine',
    order: 1,
  },
  {
    repo: 'danielhipskind.com',
    displayName: 'Portfolio Website',
    order: 2,
  },
  // Add more repos here
];

export async function fetchGitHubData() {
  try {
    const repoPromises = FEATURED_REPOS.map(
      async ({ repo, displayName, order }) => {
        try {
          // Fetch repo data with error handling
          const repoResponse = await fetch(
            `/api/github/repos/${USERNAME}/${repo}`
          );
          if (!repoResponse.ok) {
            console.error(
              `Failed to fetch repo ${repo}:`,
              await repoResponse.text()
            );
            return null;
          }
          const repoData = await repoResponse.json();

          // Fetch languages with error handling
          const languagesResponse = await fetch(
            `/api/github/repos/${USERNAME}/${repo}/languages`
          );
          if (!languagesResponse.ok) {
            console.error(
              `Failed to fetch languages for ${repo}:`,
              await languagesResponse.text()
            );
            return null;
          }
          const languages = await languagesResponse.json();

          return {
            title: displayName,
            repoName: repo,
            description: repoData.description || 'No description available',
            githubUrl: repoData.html_url,
            homepage: repoData.homepage,
            languages: languages || {},
            updatedAt: new Date(repoData.updated_at).toLocaleDateString(),
            order: order,
            demoUrl: getDemoUrl(repoData),
            has_pages: repoData.has_pages,
            topics: repoData.topics || [],
          };
        } catch (error) {
          console.error(`Error processing repo ${repo}:`, error);
          return null;
        }
      }
    );

    const repos = (await Promise.all(repoPromises)).filter(Boolean);
    if (repos.length === 0) {
      console.warn('No repositories were successfully fetched');
    }
    return repos.sort((a, b) => a.order - b.order);
  } catch (error) {
    console.error('Error in fetchGitHubData:', error);
    return [];
  }
}

function getDemoUrl(repo) {
  // Check if repo has a homepage URL
  if (repo.homepage) {
    return repo.homepage;
  }

  // Check for GitHub Pages
  if (repo.has_pages) {
    const username = repo.owner.login;
    const repoName = repo.name;
    return `https://${username}.github.io/${repoName}`;
  }

  // Look for deployment URLs in repo topics
  const demoTopics = repo.topics?.filter(
    (topic) => topic.startsWith('demo-') || topic.includes('deployed-at')
  );

  if (demoTopics?.length > 0) {
    return demoTopics[0].replace(/(demo-|deployed-at-)/, 'https://');
  }

  return null;
}
