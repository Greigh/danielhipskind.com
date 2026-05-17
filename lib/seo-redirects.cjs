/**
 * Canonical URL and legacy-path redirects for Search Console hygiene.
 */
const CANONICAL_ORIGIN = 'https://danielhipskind.com';

async function getSeoRedirects() {
  return [
    {
      source: '/:path*',
      has: [{ type: 'host', value: 'www.danielhipskind.com' }],
      destination: `${CANONICAL_ORIGIN}/:path*`,
      permanent: true,
    },
    {
      source: '/adamas',
      destination: '/adamas/',
      permanent: true,
    },
    {
      source: '/callcenterhelper',
      destination: '/adamas/',
      permanent: true,
    },
    {
      source: '/callcenterhelper/',
      destination: '/adamas/',
      permanent: true,
    },
    {
      source: '/callcenterhelper/:path*',
      destination: '/adamas/:path*',
      permanent: true,
    },
    {
      source: '/Adamas',
      destination: '/adamas/',
      permanent: true,
    },
    {
      source: '/Adamas/:path*',
      destination: '/adamas/:path*',
      permanent: true,
    },
    {
      source: '/adamas/:page(contact|privacy|terms|settings).html',
      destination: '/adamas/:page',
      permanent: true,
    },
    {
      source: '/callcenterhelper/:page(contact|privacy|terms|settings).html',
      destination: '/adamas/:page',
      permanent: true,
    },
    {
      source: '/webexpressstudio/404',
      destination: '/webexpressstudio/',
      permanent: true,
    },
  ];
}

function absoluteRedirect(res, targetPath) {
  const path = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
  return res.redirect(301, `${CANONICAL_ORIGIN}${path}`);
}

function seoRedirectMiddleware(req, res, next) {
  const host = (req.get('host') || '').split(':')[0];
  if (host.startsWith('www.')) {
    return res.redirect(
      301,
      `${CANONICAL_ORIGIN}${req.originalUrl || req.url}`
    );
  }

  const path = req.path || '/';

  if (/%3C%=|htmlWebpackPlugin/i.test(path)) {
    return absoluteRedirect(res, '/adamas/');
  }

  if (path.includes('//')) {
    const normalized = path.replace(/\/{2,}/g, '/');
    return absoluteRedirect(res, normalized);
  }

  // Case-sensitive: only redirect capital-A "/Adamas" (not lowercase "/adamas")
  if (path.startsWith('/Adamas')) {
    return absoluteRedirect(res, path.replace(/^\/Adamas/, '/adamas'));
  }

  if (path === '/adamas') {
    return absoluteRedirect(res, '/adamas/');
  }

  const adamasHtml = path.match(/^\/adamas\/(.+)\.html$/i);
  if (adamasHtml) {
    return absoluteRedirect(res, `/adamas/${adamasHtml[1]}`);
  }

  if (path === '/callcenterhelper' || path === '/callcenterhelper/') {
    return absoluteRedirect(res, '/adamas/');
  }

  if (path.startsWith('/callcenterhelper/')) {
    let sub = path.slice('/callcenterhelper'.length);
    if (sub.endsWith('.html')) sub = sub.slice(0, -5);
    const target = sub === '/' || sub === '' ? '/adamas/' : `/adamas${sub}`;
    return absoluteRedirect(res, target);
  }

  if (path === '/webexpressstudio/404') {
    return absoluteRedirect(res, '/webexpressstudio/');
  }

  next();
}

module.exports = {
  CANONICAL_ORIGIN,
  absoluteRedirect,
  getSeoRedirects,
  seoRedirectMiddleware,
};
