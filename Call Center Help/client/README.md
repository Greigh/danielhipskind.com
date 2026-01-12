# Adamas (Call Center Helper) [BETA]

**Current Status**: 🚧 Public Beta

A modern web application designed to streamline call center operations, providing tools for workflow management, note-taking, number formatting, and more. Built with HTML, JavaScript (ES Modules), SCSS, and featuring modular architecture, persistent storage, and a responsive UI.

## Features

- **Call Flow Builder**: Create, edit, reorder, and track call flow steps with checkboxes.
- **Notes Management**: Take and organize notes per call or session with persistent storage.
- **Pattern Formatter**: Format phone numbers and other data using customizable patterns with auto-copy functionality.
- **Timer**: Integrated hold timer with pause/resume capabilities.
- **Settings & Themes**: Switch between light and dark modes, customize preferences.
- **Floating Windows**: Pop out sections for multitasking on multiple monitors.
- **Internationalization**: Support for multiple languages (English, Spanish).
- **Accessibility**: Modal dialogs with proper focus management and screen reader support.
- **CRM Integration**: Support for Cisco Finesse, Five9, Salesforce, Zendesk, HubSpot, Dynamics with bi-directional sync.
- **Authentication & Security**: Role-based access control (Admin, Supervisor, Agent), audit logging, GDPR compliance.
- **API Integrations**: REST API, webhooks, telephony (Twilio, Asterisk), email integration.
- **Progressive Web App**: Offline capability, push notifications, camera integration.
- **Training & Onboarding**: Interactive script practice with feedback, certification tracking.
- **Voice Commands**: Speech recognition for hands-free operation.
- **Help System**: Contextual tooltips and help documentation.
- **Testing**: Comprehensive unit and end-to-end tests using Jest and Playwright.

## Project Structure

```text
Call Center Help/client/
├── src/
│   ├── index.html
│   ├── privacy.html
│   ├── terms.html
│   ├── contact.html
│   ├── settings.html
│   ├── js/
│   │   ├── main.js
│   │   ├── modules/
│   │   └── utils/
│   ├── styles/
│   └── locales/
├── public/
├── test/
├── dist/ (generated)
├── package.json
├── webpack.config.js
├── jest.config.js
├── playwright.config.js
├── nodemon.json
├── server.js
└── README.md
```

## Prerequisites

- Node.js (v18 or higher)
- npm (comes with Node.js)

## Installation

1. Clone the repository:

   ```sh
   git clone <repository-url>
   cd "Call Center Help/client"
   ```

2. Install dependencies:

   ```sh
   npm install
   ```

## Development

Start the full development environment (Frontend + Backend):

```sh
npm run dev:local
```

The application will be available at `http://localhost:8080`.

For a simple local server (static files):

```sh
npm start
```

## Building

Create a production build:

```sh
npm run build
```

This generates optimized files in the `dist/` directory.

Clean build (removes old files):

```sh
npm run clean
npm run build
```

## Testing

Run unit tests:

```sh
npm test
```

Run end-to-end tests:

```sh
npm run test:e2e
```

## Deployment

1. Build the application:

   ```sh
   npm run upload
   ```

   This script builds, cleans, and uploads to the server.

For manual deployment, use `upload.sh` after building.

## Usage

- Access the main interface via `index.html`.
- Configure settings in `settings.html`.
- View privacy policy at `privacy.html`.
- Terms of service at `terms.html`.
- Contact information at `contact.html`.

## Contributing

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Run tests: `npm test` and `npm run test:e2e`.
5. Lint and format: `npm run lint` and `npm run format`.
6. Submit a pull request.

## License

**License:** [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/)

This software and its documentation are the exclusive property of Daniel Hipskind.
Unauthorized reproduction or distribution of this work, or any portion of it, may result in severe civil and criminal penalties, and will be prosecuted to the maximum extent possible under law.

See [`LICENSE.html`](./src/LICENSE.html) for the full license text.
