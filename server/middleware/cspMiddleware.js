export const cspMiddleware = (req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      // Allow GitHub API and fonts
      "connect-src 'self' https://api.github.com",
      // Allow Google Fonts
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      // Allow inline scripts and external scripts
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.skypack.dev",
      // Allow images from your domain and HTTPS sources
      "img-src 'self' https: data:",
      // Frame restrictions
      "frame-ancestors 'none'",
      // Form submissions
      "form-action 'self'",
      // Base URI restriction
      "base-uri 'self'",
      // Manifest files
      "manifest-src 'self'",
    ].join('; ')
  );
  next();
};
