const GITHUB_API_BASE = 'https://api.github.com';
const USERNAME = 'greigh';

// Define your featured projects with custom display names
export const FEATURED_REPOS = [
  {
    repo: 'blockingmachine',
    displayName: 'Blocking Machine',
    order: 1,
  },
  {
    repo: 'danielhipskind.com',
    displayName: 'Portfolio Website',
    order: 3,
  },
  {
    repo: 'WebExpressStudioTemplate',
    displayName: 'Web Express Studio Template',
    order: 4,
  },
  {
    repo: 'notebookitem-fivem',
    displayName: 'Notebook Item for FiveM',
    order: 5,
  },
  {
    repo: 'FiveM-phone',
    displayName: 'Phone App for FiveM',
    order: 2,
  },
];

export async function fetchGitHubData() {
  try {
    const repoPromises = FEATURED_REPOS.map(
      async ({ repo, displayName, order }) => {
        try {
          // Fetch repo data with next.js caching (1 hour)
          const repoResponse = await fetch(
            `${GITHUB_API_BASE}/repos/${USERNAME}/${repo}`,
            {
              headers: {
                // Add token if you have one in env, otherwise anonymous
                ...(process.env.GITHUB_TOKEN && {
                  Authorization: `token ${process.env.GITHUB_TOKEN}`,
                }),
              },
              next: { revalidate: 3600 },
            }
          );

          if (!repoResponse.ok) {
            console.error(
              `Failed to fetch repo ${repo}:`,
              await repoResponse.text()
            );
            return null;
          }
          const repoData = await repoResponse.json();

          // Fetch languages
          const languagesResponse = await fetch(
            `${GITHUB_API_BASE}/repos/${USERNAME}/${repo}/languages`,
            {
              headers: {
                ...(process.env.GITHUB_TOKEN && {
                  Authorization: `token ${process.env.GITHUB_TOKEN}`,
                }),
              },
              next: { revalidate: 3600 },
            }
          );

          let languages = {};
          if (languagesResponse.ok) {
            languages = await languagesResponse.json();
          }

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
    return repos.sort((a, b) => a.order - b.order);
  } catch (error) {
    console.error('Error in fetchGitHubData:', error);
    return [];
  }
}

function getDemoUrl(repo) {
  if (repo.homepage) return repo.homepage;

  if (repo.has_pages) {
    const username = repo.owner.login;
    const repoName = repo.name;
    return `https://${username}.github.io/${repoName}`;
  }

  const demoTopics = repo.topics?.filter(
    (topic) => topic.startsWith('demo-') || topic.includes('deployed-at')
  );

  if (demoTopics?.length > 0) {
    return demoTopics[0].replace(/(demo-|deployed-at-)/, 'https://');
  }

  return null;
}
