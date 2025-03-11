# Visual RSS Feed for Hacker News

A modern, accessible web application that displays Hacker News articles in a visual grid layout with infinite scroll, dark mode support, and image previews.

## 🚀 Features

- **Visual Grid Layout**: Articles displayed in a responsive card layout
- **Dark Mode**: Automatic theme detection with manual toggle
- **Infinite Scroll**: Seamless article loading
- **Image Previews**: Automatic image extraction from articles
- **Accessibility**: ARIA labels, keyboard navigation, reduced motion support
- **Performance**: Image lazy loading, content caching, rate limiting

## 🛠 Tech Stack

- **Frontend**: Vanilla JavaScript, EJS templates
- **Backend**: Node.js, Express
- **Caching**: In-memory cache with TTL
- **Image Processing**: Cheerio for OpenGraph extraction
- **Performance**: Service workers, Browser caching
- **Testing**: Jest, Playwright

## 📦 Installation

```bash
# Clone the repository
git clone <your-repo-url>

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

## 🔧 Configuration

Edit `.env` file to customize:

```env
PORT=3002
ARTICLES_PER_PAGE=30
ARTICLE_LIMIT=100
CACHE_TTL=300
DEBUG=true
```

## 🎯 Development

```bash
# Start with debug logging
DEBUG=true npm start

# Run tests
npm test

# Check code style
npm run lint

# Build for production
npm run build
```

## 📱 API Endpoints

| Endpoint | Description |
|----------|-------------|
| GET `/api/articles` | Get paginated articles |
| GET `/api/articles/:id` | Get single article |

## 🎨 Theme Customization

Override theme variables in `css/styles.css`:

```css
:root {
  --accent-color: #6d28d9;
  --text-color: #1f2937;
  --bg-color: #ffffff;
}
```

## 📊 Performance

- Lighthouse Score: 95+
- First Contentful Paint: < 1s
- Time to Interactive: < 2s
- Cache Hit Ratio: ~80%

## 🔒 Security

- CORS enabled
- Rate limiting
- Content Security Policy
- XSS protection
- HTTPS enforced

## 📝 License

© 2024 Visual RSS Feed for Hacker News. All rights reserved.

While all rights are reserved, we welcome collaboration and are open to granting permissions for educational, non-profit, and research purposes. See the [LICENSE](LICENSE) file for details about:
- Educational use cases
- Non-profit projects
- Open source contributions
- Research & development
- Other considered uses

For licensing inquiries, please contact: [Daniel](mailto:me@danielhipskind.com)