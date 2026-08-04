# Daniel Hipskind's Portfolio

A modern, responsive portfolio website built with **Next.js 16** (Turbopack) and **React 19**.

## 🚀 Key Features

### ✨ Modern UX/UI

- **Dark/Light Mode**: Seamless toggle with `next-themes`, zero-flash implementation, and system preference detection.
- **Scroll Animations**: Smooth intersection-observer based reveal animations for sections.
- **Responsive Design**: Fully optimized for mobile, tablet, and desktop devices.
- **Glassmorphism**: Elegant transparent UI elements in navigation and cards.

### 🛠️ Technical Highlights

- **Framework**: Next.js 16 (App Router) & React 19.
- **Styling**: Vanilla CSS with comprehensive variable system (CSS Variables) for flexible theming.
- **Performance**: Turbopack for lightning-fast HMR and building.
- **Database**: MongoDB integration (via Mongoose) for dynamic content support.

## 🛠️ Tech Stack

- **Frontend**: Next.js 16, React 19, Vanilla CSS
- **Backend (API)**: Next.js API Routes / Server Actions
- **Database**: MongoDB
- **Infrastructure**: NGINX (Reverse Proxy), PM2 (Process Manager)
- **Tools**: ESLint, Turbopack

## 🏃‍♂️ Getting Started

1. **Clone the repository**

   ```bash
   git clone https://github.com/Greigh/danielhipskind.com.git
   cd danielhipskind.com
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up Environment Variables**
   Create a `.env.local` file in the root directory:

   ```env
   # Database Connection
   MONGODB_URI=your_mongodb_connection_string

   # GitHub API (for Projects section)
   GITHUB_TOKEN=your_github_personal_access_token
   ```

4. **Run the development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🚀 Production Deployment

This project is designed for self-hosting with **PM2** and **NGINX**:

1. **Build the application**

   ```bash
   npm run build
   ```

2. **Start with PM2**

   ```bash
   pm2 start npm --name "portfolio" -- start
   ```

3. **Configure NGINX**
   Use NGINX as a reverse proxy to forward traffic to `localhost:3000`.

4. **Self-hosted email**
   Cutover from Porkbun MX to the VPS mail stack is documented in
   [`deploy/mail.md`](deploy/mail.md).

## 📁 Project Structure

```bash
src/
├── app/                 # Next.js App Router
│   ├── layout.js        # Root layout with Theme Providers
│   ├── page.js          # Homepage components
│   └── styles/          # CSS Modules & Global Styles
│       ├── base/        # Reset, typography, variables
│       ├── components/  # Component-specific styles
│       └── utilities/   # Animations, media queries, helpers
├── components/          # React Components (Navbar, Hero, About, etc.)
├── lib/                 # Utilities (DB connection, formatting)
└── data/                # Static content/data definitions
```

## 👤 Author

**Daniel Hipskind** - Full-Stack Software Engineer

- 🌐 Website: [danielhipskind.com](https://danielhipskind.com)
- 💼 GitHub: [@greigh](https://github.com/greigh)
- 📧 Email: [me@danielhipskind.com](mailto:me@danielhipskind.com)
- 🐦 Twitter: [@DanielHipskind\_](https://twitter.com/DanielHipskind_)

## 📄 License

This project is licensed under the **BSD 3-Clause License**. See the [LICENSE](LICENSE) file for complete details.
