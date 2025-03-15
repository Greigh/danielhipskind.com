# Daniel Hipskind's Portfolio Website

A modern, responsive portfolio website built with vanilla JavaScript and progressive enhancement principles.

- 🌐 Personal portfolio website
- 💻 Built with vanilla JavaScript
- 🎨 Dark/light theme
- ⚡ Performance focused
- 🔄 Dynamic GitHub integration

## 🚀 Live Demo

Visit [danielhipskind.com](https://danielhipskind.com)

## ✨ Features

- **Dynamic Project Cards**: Auto-updates from GitHub repositories
- **Smart Caching**: Efficient data handling with localStorage
- **Responsive Design**: Mobile-first approach
- **Dark Mode**: System preference aware theming
- **Zero Dependencies**: Pure vanilla JavaScript implementation
- **Progressive Enhancement**: Works without JavaScript enabled
- **Offline Support**: Fallback content for API limitations

## 🛠 Tech Stack

- **Frontend**:
  - HTML5 (Semantic markup)
  - CSS3 (Custom properties, Flexbox, Grid)
  - JavaScript (ES6+, Modules)
- **APIs**:
  - GitHub REST API
  - localStorage API
- **Deployment**:
  - VPS Hosting
  - Custom Domain

## 📦 Project Structure

```text
danielhipskind.com/
├── assets/
│   ├── css/
│   │   ├── style.css
│   │   └── media-queries.css
│   ├── images/
│   │   └── danielportfolio.jpg
│   └── js/
│       ├── projectManager.js
│       ├── iconManager.js
│       ├── contentManager.js
│       ├── config.js
│       └── icons.js
├── index.html
├── LICENSE
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Any modern web browser
- Basic understanding of HTML, CSS, and JavaScript

### Local Development

1. Clone the repository:

```bash
git clone https://github.com/Greigh/danielhipskind.com.git
```

2. Open with VS Code:

```bash
cd danielhipskind.com
code .
```

3. Use Live Server extension to run locally:
   - Install "Live Server" extension in VS Code
   - Right-click `index.html` and select "Open with Live Server"

## 🔄 GitHub Integration

The website automatically fetches and displays project information from GitHub:

- Repository descriptions
- Programming languages used
- Workflow information
- Project links

## 📂 Projects

### Visual RSS Feed for Hacker News

A modern, accessible web application that displays Hacker News articles in a visual grid layout. [Learn more](./projects/visual-rss-feed/README.md)

Features:

- Visual Grid Layout
- Dark Mode Support
- Infinite Scroll
- Image Previews
- Accessibility Focus

## 🎨 Customization

1. Update project data in `projectManager.js`
2. Modify styles in `style.css`
3. Edit content in `index.html`

## 📊 Analytics Implementation

### Overview

Built-in analytics system that respects user privacy while providing valuable insights.

### Features

- **Privacy-First Analytics**

  - No third-party tracking
  - Zero cookies implementation
  - GDPR & CCPA compliant by design
  - Full transparency on data collection

- **Real-Time Monitoring**

  - Active visitor tracking
  - Page performance metrics
  - User interaction patterns
  - Session flow analysis

- **Performance Insights**
  - Load time monitoring
  - Resource usage tracking
  - API performance stats
  - Error rate analysis

### Implementation Architecture

```text
danielhipskind.com/
├── api/
│   ├── routes/
│   │   └── analytics.js      # Analytics endpoints
│   ├── middleware/
│   │   ├── clientInfo.js     # Client data collection
│   │   └── rateLimit.js      # Request throttling
│   └── services/
│       └── analyticsService.js
├── html/
│   └── analytics/
│       └── js/
│           ├── auth.js       # Core tracking
│           └── events.js     # Event handlers
└── server.js                 # Main server config
```

### Data Collection

| Category    | Details                  | Storage Duration |
| ----------- | ------------------------ | ---------------- |
| Performance | Load times, API latency  | 30 days          |
| Usage       | Page views, interactions | 7 days           |
| System      | Browser, OS (anonymized) | Session only     |
| Location    | Country code only        | Aggregated only  |

### Security Measures

- **Rate Limiting**

  ```javascript
  Requests: 100/minute/IP
  Burst: 200/minute max
  Block Duration: 15 minutes
  ```

- **Data Protection**
  ```javascript
  IP Anonymization: Last octet removed
  Storage: Encrypted at rest
  Transmission: HTTPS only
  Access: JWT authentication
  ```

### Local Development

```bash
# Start analytics server
npm run dev:analytics

# View real-time dashboard
open http://localhost:3002/analytics

# Test data collection
npm run test:analytics
```

### Production Dashboard

Access the analytics dashboard at:

- URL: `https://danielhipskind.com/analytics`
- Auth: Admin credentials required
- Data: Real-time + historical views

### Privacy Controls

1. **Opt-Out Methods**

   - URL: `/analytics/opt-out`
   - LocalStorage: `analytics_optout`
   - DoNotTrack header support

2. **Data Access**
   - Request: `/analytics/data`
   - Delete: `/analytics/data/delete`
   - Export: `/analytics/data/export`

## 🔒 Compliance

- **GDPR**: Article 6(1)(f) legitimate interests
- **CCPA**: Section 1798.100 compliance
- **PECR**: Cookie-free implementation

## 🔒 Privacy Statement

This implementation adheres to:

- GDPR Article 6(1)(f)
- CCPA Section 1798.100
- PECR Regulation 6

## 🔒 Privacy Considerations

The analytics implementation follows these principles:

- No personal data collection
- Anonymous usage statistics
- GDPR-compliant tracking
- Transparent data handling
- User privacy protection

## 🔒 License & Usage

This project is **All Rights Reserved**. No part of this website, its codebase, or implementation may be reproduced or used without explicit written permission from Daniel Hipskind. See [LICENSE](./LICENSE) for detailed terms.

### Usage Restrictions

- ❌ No copying or modification of source code
- ❌ No reuse of design elements
- ❌ No redistribution of any kind
- ❌ No commercial or personal use without permission
- ❌ No derivative works

### Requesting Permission

To request permission to use any part of this project:

1. Email: [me@danielhipskind.com](mailto:me@danielhipskind.com)
2. Include:
   - Your name and organization
   - Specific parts you want to use
   - Intended use case
   - Project details
   - Implementation timeline

For complete terms and conditions, please refer to the [LICENSE](./LICENSE) file in this repository.

## 🤝 Contributing

Due to the proprietary nature of this project, contributions are currently not accepted. Please contact me directly for any suggestions or feedback.

## 📧 Contact

Daniel Hipskind - [me@danielhipskind.com](mailto:me@danielhipskind.com)

Project Link: [https://github.com/Greigh/danielhipskind.com](https://github.com/Greigh/danielhipskind.com)
