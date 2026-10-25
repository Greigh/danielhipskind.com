// Bump when page content changes — Google only trusts lastmod when it's honest.
const LAST_UPDATED = new Date("2026-10-24");

export default function sitemap() {
  const baseUrl = "https://danielhipskind.com";

  const pages = [
    { path: "/", priority: 1, changeFrequency: "monthly" },
    { path: "/adamas/", priority: 0.8, changeFrequency: "monthly" },
    { path: "/adamas/privacy", priority: 0.3, changeFrequency: "yearly" },
    { path: "/adamas/terms", priority: 0.3, changeFrequency: "yearly" },
    { path: "/adamas/contact", priority: 0.5, changeFrequency: "yearly" },
  ];

  return pages.map(({ path, priority, changeFrequency }) => ({
    url: `${baseUrl}${path}`,
    lastModified: LAST_UPDATED,
    changeFrequency,
    priority,
  }));
}
