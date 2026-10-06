const DISALLOWED = [
  "/admin/",
  "/api/",
  "/_next/",
  "/cdn-cgi/",
  "/callcenterhelper/",
  "/Adamas/",
  "/uploads/",
];

// Explicitly welcome AI crawlers and answer-engine bots so the site's
// content is available for citation in AI products.
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "meta-externalagent",
  "FacebookBot",
  "Amazonbot",
  "CCBot",
  "Bytespider",
  "cohere-ai",
  "AI2Bot",
  "Diffbot",
  "MistralAI-User",
  "DuckAssistBot",
];

export default function robots() {
  return {
    rules: [
      ...AI_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: DISALLOWED,
      })),
      {
        userAgent: "*",
        allow: "/",
        disallow: DISALLOWED,
      },
    ],
    sitemap: "https://danielhipskind.com/sitemap.xml",
    host: "https://danielhipskind.com",
  };
}
