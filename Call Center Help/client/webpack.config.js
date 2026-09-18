const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');

const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
  mode: isProduction ? 'production' : 'development',
  entry: ['./src/js/main.js', './src/styles/main.scss'],
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'js/[name].[contenthash].js',
    chunkFilename: 'js/[name].[contenthash].chunk.js',
    publicPath: isProduction ? '/adamas/' : '/',
    clean: true,
  },
  devtool: isProduction ? false : 'source-map',
  devServer: {
    // Do NOT serve production `dist/` here — a prior `npm run build` leaves
    // /adamas/-prefixed HTML/CSS that shadows the in-memory Facet rebuild.
    static: [
      {
        directory: path.join(__dirname, 'public'),
        publicPath: '/',
        watch: false,
      },
      {
        directory: path.join(__dirname, 'src/public'),
        publicPath: '/',
        watch: false,
      },
    ],
    proxy: [
      {
        context: ['/adamas/api', '/api', '/socket.io'],
        target: 'http://localhost:8080',
        secure: false,
        changeOrigin: true,
        ws: true,
      },
    ],
    port: 3000,
    hot: true,
    historyApiFallback: {
      rewrites: [
        { from: /^\/contact$/, to: '/contact.html' },
        { from: /^\/privacy$/, to: '/privacy.html' },
        { from: /^\/terms$/, to: '/terms.html' },
        { from: /^\/settings$/, to: '/settings.html' },
      ],
    },
    headers: {
      'X-Content-Type-Options': 'nosniff',
    },
    setupMiddlewares: (middlewares, devServer) => {
      devServer.app.use((req, res, next) => {
        // Set proper content-type headers with UTF-8 charset
        if (req.path.endsWith('.js')) {
          res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
        } else if (req.path.endsWith('.css')) {
          res.setHeader('Content-Type', 'text/css; charset=utf-8');
        } else if (req.path.endsWith('.html')) {
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
        } else if (req.path.endsWith('.json')) {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
        }
        next();
      });
      return middlewares;
    },
  },
  optimization: {
    minimizer: [new TerserPlugin()],
    splitChunks: {
      chunks: 'all',
      minSize: 20000,
      minChunks: 1,
      maxAsyncRequests: 30,
      maxInitialRequests: 30,
      cacheGroups: {
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: -10,
          reuseExistingChunk: true,
        },
        commons: {
          name: 'commons',
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true,
        },
      },
    },
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
      filename: 'index.html',
      inject: true,
    }),
    new HtmlWebpackPlugin({
      template: './src/settings.html',
      filename: 'settings.html',
      inject: true,
    }),
    new HtmlWebpackPlugin({
      template: './src/privacy.html',
      filename: 'privacy.html',
      inject: true,
    }),
    new HtmlWebpackPlugin({
      template: './src/terms.html',
      filename: 'terms.html',
      inject: true,
    }),
    new HtmlWebpackPlugin({
      template: './src/contact.html',
      filename: 'contact.html',
      inject: true,
    }),
    new MiniCssExtractPlugin({
      filename: 'styles/[name].[contenthash].css',
      chunkFilename: 'styles/[name].[contenthash].css',
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'public',
          to: '.',
        },
        {
          from: 'src/public',
          to: '.',
        },
        {
          from: 'src/js/theme-init.js',
          to: 'js/theme-init.js',
        },
        {
          from: 'src/public/sw.facet.js',
          to: 'sw.facet.js',
        },
        {
          from: 'src/js/deferred-stubs.js',
          to: 'js/deferred-stubs.js',
        },
      ],
    }),
    new webpack.DefinePlugin({
      // Client bundle: public values only — never EMAIL_PASS / auth tokens / private keys
      'process.env': {
        VAPID_PUBLIC_KEY: JSON.stringify(process.env.VAPID_PUBLIC_KEY || ''),
        NODE_ENV: JSON.stringify(process.env.NODE_ENV || 'development'),
      },
    }),
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            plugins: ['@babel/plugin-syntax-dynamic-import'],
          },
        },
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'images/[name].[hash][ext]',
        },
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name].[hash][ext]',
        },
      },
      {
        test: /\.s[ac]ss$/i,
        use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader'],
      },
      {
        test: /\.(mp3|wav|ogg)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'audio/[name][ext]',
        },
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  performance: {
    hints: 'warning', // Enable performance hints
    maxAssetSize: 10000000, // 10MB for individual assets
    maxEntrypointSize: 10000000, // 10MB for entry points
  },
};
