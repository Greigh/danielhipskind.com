export default function sitemap() {
  const baseUrl = 'https://danielhipskind.com';
  const now = new Date();

  const pages = [
    { path: '/', priority: 1, changeFrequency: 'monthly' },
    { path: '/adamas/', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/adamas/privacy', priority: 0.3, changeFrequency: 'yearly' },
    { path: '/adamas/terms', priority: 0.3, changeFrequency: 'yearly' },
    { path: '/adamas/contact', priority: 0.5, changeFrequency: 'yearly' },
  ];

  return pages.map(({ path, priority, changeFrequency }) => ({
    url: `${baseUrl}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
