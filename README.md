# Daniel Hipskind's Portfolio & Tools

A comprehensive web platform featuring a personal portfolio website built with Node.js/Express and vanilla JavaScript.

## 🚀 Key Features

### Portfolio Website

- **Modern Design**: Clean, responsive UI with dark/light theme support
- **GitHub Integration**: Real-time project repository display via GitHub API
- **Performance Optimized**: Advanced caching, CDN-ready static assets
- **Analytics**: Privacy-focused, first-party analytics with opt-in consent
- **Admin Dashboard**: Secure analytics management and export capabilities

### Infrastructure & Security

- **Secure Admin Access**: Multi-layer authentication (nginx basic auth + app-level tokens)
- **Redis Integration**: Session management and caching layer
- **Rate Limiting**: GitHub API proxy with intelligent retry/backoff
- **Security Headers**: Helmet.js, CORS, CSP implementation
- **Automated Deployment**: Robust deployment pipeline with health checks

## 🛠️ Tech Stack

### Backend

- **Runtime**: Node.js with ES modules
- **Framework**: Express.js with modern middleware
- **Session Store**: Redis for scalable session management
- **Process Manager**: PM2 for production deployment
- **Reverse Proxy**: Nginx for static assets and SSL termination

### Frontend

- **Core**: Vanilla JavaScript (ES6+), CSS3, HTML5
- **Build Tools**: Custom webpack-based build system and Shell scripts
- **PWA Features**: Service workers, app manifest, offline capability
- **UI Framework**: Custom CSS with CSS Grid/Flexbox, responsive design

### APIs & Integration

- **GitHub API**: Custom proxy with retry/backoff and caching
- **Analytics**: First-party analytics with Redis storage and file persistence
- **Admin Interface**: Token-based authentication with export capabilities

### Infrastructure

- **Caching**: Redis + in-memory fallback for multi-instance deployments
- **Security**: Helmet.js, CORS, rate limiting, secure headers
- **Monitoring**: Health checks, request logging, error tracking
- **Deployment**: Automated pipeline with artifact verification

## 📁 Project Structure

```
├── public/                    # Static assets for portfolio site
│   ├── admin/                # Admin dashboard interface
│   │   ├── analytics.html    # Analytics management UI
│   │   ├── analytics.js      # Admin functionality
│   │   └── analytics.css     # Admin styling
│   ├── assets/               # Core static assets
│   │   ├── css/             # Stylesheets and components
│   │   ├── js/              # Client-side JavaScript modules
│   │   ├── images/          # Images and icons
│   │   └── manifest.json    # PWA manifest
│   └── index.html           # Main portfolio page
│
├── logs/                    # Application logs (not in repo)
│   ├── analytics-*.log      # Daily analytics logs
│   └── combined.log         # Application logs
│
└── README.md               # This file
```

### Key Files (Not in Repository)

- `server.js` - Main Express application server
- `ecosystem.config.cjs` - PM2 process configuration
- `deploy.sh` - Automated deployment script
- `nginx/` - Nginx configuration files
- `scripts/` - Utility and maintenance scripts
- `.env.production` - Production environment variables


## � Key Features Detail

### Analytics System

- **Privacy-First**: First-party analytics with explicit user opt-in
- **Data Storage**: Dual persistence (Redis + daily rotating log files)
- **Admin Dashboard**: Secure analytics viewing, filtering, and export
- **Export Formats**: JSON (cursor-based pagination), CSV (streaming), RSS feeds
- **Session Management**: Redis-backed admin sessions with secure token handling

### GitHub Integration

- **Smart Caching**: Multi-layer caching with Redis and memory fallback
- **Rate Limit Handling**: Intelligent retry logic with exponential backoff
- **Error Recovery**: Graceful degradation when API limits are reached
- **Real-time Updates**: Dynamic repository display with live commit data

### Security & Performance

- **Multi-layer Auth**: Nginx basic auth + Express middleware + Redis sessions
- **Request Caching**: Conditional caching with smart TTL management
- **Security Headers**: Comprehensive CSP, HSTS, and security middleware
- **Health Monitoring**: Application health checks and error logging

## � Development Tools & Environment

### Build System

- **Asset Processing**: Automatic file hashing, compression, and optimization
- **Development Server**: Hot-reload development environment
- **Build Verification**: Automated artifact checking and validation

### Deployment Pipeline

- **Automated Deploy**: One-command deployment with health checks
- **SSH Security**: Key-based authentication with ssh-agent integration
- **Build Validation**: Pre-deployment artifact verification
- **Health Monitoring**: Post-deployment service validation

### Development Stack

- **[Node.js](https://nodejs.org)**: JavaScript runtime environment
- **[Express.js](https://expressjs.com)**: Web application framework
- **[Redis](https://redis.io)**: In-memory data structure store
- **[PM2](https://pm2.keymetrics.io)**: Production process manager
- **[Nginx](https://nginx.org)**: High-performance web server and reverse proxy

### Recommended Development Tools

- **[VSCode](https://code.visualstudio.com)**: Primary development environment
- **[ForkLift 4](https://binarynights.com/)**: Advanced file management (macOS)
- **[Core Shell](https://coreshell.app)**: Modern terminal experience (macOS)
- **[Vivaldi](https://vivaldi.com)**: Feature-rich browser for testing

### Music for Coding 🎵
- **[Spotify](https://spotify.com)**: Background music and focus playlists

## 🌐 Live Deployment

- **Portfolio**: [danielhipskind.com](https://danielhipskind.com)
- **Admin Dashboard**: [danielhipskind.com/admin](https://danielhipskind.com/admin) (Protected)

## 👤 Author

**Daniel Hipskind** - Full-Stack Software Engineer

- 🌐 Website: [danielhipskind.com](https://danielhipskind.com)
- 💼 GitHub: [@greigh](https://github.com/greigh)
- 📧 Email: [me@danielhipskind.com](mailto:me@danielhipskind.com)
- 🐦 Twitter: [@DanielHipskind_](https://twitter.com/DanielHipskind_)

## 📄 License

This project is licensed under the **BSD 3-Clause License**. See the [LICENSE](LICENSE) file for complete details.

### 📋 License Summary

**Permissions** ✅
- ✅ Commercial use
- ✅ Modification
- ✅ Distribution
- ✅ Private use

**Conditions** ❗
- ❗ License and copyright notice must be included
- ❗ Cannot use contributors' names for endorsement

**Limitations** ❌
- ❌ No liability
- ❌ No warranty

### 🤝 Usage Guidelines

1. **Attribution Required**: Retain original copyright notice and license text
2. **No Endorsement**: Don't use author's name to promote derivative works
3. **Commercial Use**: Permitted with proper attribution
4. **Modifications**: Allowed, but must maintain license terms

For commercial use or questions about licensing, please [contact me](mailto:me@danielhipskind.com).

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/Greigh/danielhipskind.com/issues).

### Contributing Guidelines

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Code Standards

- Follow existing code style and conventions
- Update documentation for any new features
- Test your changes thoroughly
- Keep commits atomic and well-described

## � Support & Contact

- 📧 **Email**: [me@danielhipskind.com](mailto:me@danielhipskind.com)
- 🐛 **Issues**: [GitHub Issues](https://github.com/Greigh/danielhipskind.com/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/Greigh/danielhipskind.com/discussions)

---

⭐ **Star this repository** if you found it helpful!

**Project Repository**: [https://github.com/Greigh/danielhipskind.com](https://github.com/Greigh/danielhipskind.com)
