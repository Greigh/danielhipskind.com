/**
 * Dev server — replaces webpack-dev-server without its vulnerable
 * http-proxy-middleware -> micromatch -> braces dependency chain.
 * Serves webpack output in-memory (dev-middleware), hot reloads
 * (hot-middleware), static dirs, and proxies /adamas/api, /api,
 * /socket.io (ws) to the API on :8080.
 */
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const path = require('path');
const http = require('http');
const express = require('express');
const httpProxy = require('http-proxy');
const webpack = require('webpack');
const devMiddleware = require('webpack-dev-middleware');
const hotMiddleware = require('webpack-hot-middleware');
const config = require('./webpack.config');

const PORT = 3000;
const API_TARGET = 'http://localhost:8080';
const PROXY_PREFIXES = ['/adamas/api', '/api', '/socket.io'];

// Inject HMR client + plugin (webpack-dev-server did this implicitly via `hot`)
config.entry = [
  'webpack-hot-middleware/client?path=/__webpack_hmr&reload=true',
  ...(Array.isArray(config.entry) ? config.entry : [config.entry]),
];
config.plugins = [...config.plugins, new webpack.HotModuleReplacementPlugin()];

const compiler = webpack(config);
const app = express();
const proxy = httpProxy.createProxyServer({
  target: API_TARGET,
  changeOrigin: true,
  ws: true,
});

// If the API backend isn't running, return 502 instead of crashing the dev server
proxy.on('error', (err, req, res) => {
  if (res instanceof http.ServerResponse) {
    if (!res.headersSent) res.writeHead(502);
    res.end(`Proxy error: ${err.message}`);
  }
});

const isProxied = (url = '') => PROXY_PREFIXES.some((p) => url.startsWith(p));

// UTF-8 content types (same as the old devServer.setupMiddlewares)
app.use((req, res, next) => {
  const type = req.path.endsWith('.js')
    ? 'text/javascript'
    : req.path.endsWith('.css')
      ? 'text/css'
      : req.path.endsWith('.html')
        ? 'text/html'
        : req.path.endsWith('.json')
          ? 'application/json'
          : null;
  if (type) res.setHeader('Content-Type', `${type}; charset=utf-8`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

// API/websocket proxy first so backend routes never hit static fallbacks
app.use((req, res, next) => {
  if (!isProxied(req.url)) return next();
  proxy.web(req, res);
});

// SPA-style history rewrites -> generated HTML pages (served from memory below)
const REWRITES = { '/contact': '/contact.html', '/privacy': '/privacy.html', '/terms': '/terms.html', '/settings': '/settings.html' };
app.use((req, _res, next) => {
  if (REWRITES[req.path]) req.url = REWRITES[req.path];
  next();
});

// Webpack build output from memory (never serves the committed dist/)
app.use(
  devMiddleware(compiler, {
    publicPath: config.output.publicPath,
  })
);
app.use(hotMiddleware(compiler, { path: '/__webpack_hmr' }));

// Static dirs (same as devServer.static)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'src/public')));

const server = http.createServer(app);

// socket.io / websocket upgrade proxy
server.on('upgrade', (req, socket, head) => {
  if (isProxied(req.url)) return proxy.ws(req, socket, head);
  socket.destroy();
});

server.listen(PORT, () => {
  console.log(`Dev server: http://localhost:${PORT}`);
  console.log(`Proxying ${PROXY_PREFIXES.join(', ')} -> ${API_TARGET}`);
});
