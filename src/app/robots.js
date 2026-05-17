export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/',
        '/api/',
        '/_next/',
        '/cdn-cgi/',
        '/callcenterhelper/',
        '/Adamas/',
        '/uploads/',
      ],
    },
    sitemap: 'https://danielhipskind.com/sitemap.xml',
    host: 'https://danielhipskind.com',
  };
}
