// Theme management functions
import { saveTheme, loadTheme } from './storage.js';

// Available themes
export const themes = {
  light: {
    name: 'Light',
    colors: {
      primary: '#0e7490',
      secondary: '#0f766e',
      background: '#d8e0e8',
      surface: '#f7fafc',
      text: '#0b1320',
      textSecondary: '#475569',
      border: '#c5d0db',
      success: '#0f766e',
      warning: '#b45309',
      error: '#b91c1c',
      info: '#0e7490',
    },
  },
  dark: {
    name: 'Dark',
    colors: {
      primary: '#22d3ee',
      secondary: '#2dd4bf',
      background: '#070b12',
      surface: '#121a26',
      text: '#e8eef6',
      textSecondary: '#94a3b8',
      border: '#243044',
      success: '#2dd4bf',
      warning: '#fbbf24',
      error: '#f87171',
      info: '#22d3ee',
    },
  },
  highContrast: {
    name: 'High Contrast',
    colors: {
      primary: '#ffffff',
      secondary: '#ffff00',
      background: '#000000',
      surface: '#000000',
      text: '#ffffff',
      textSecondary: '#ffff00',
      border: '#ffffff',
      success: '#00ff00',
      warning: '#ffff00',
      error: '#ff0000',
      info: '#00ffff',
    },
  },
};

export function initializeTheme() {
  const savedTheme = loadTheme() || 'light';
  applyTheme(savedTheme);

  // Set initial toggle state
  updateThemeToggle(savedTheme);
}

export function updateThemeIndicator(theme) {
  const indicator = document.getElementById('current-theme');
  if (indicator) {
    indicator.textContent = themes[theme]?.name || 'Light';
  }
}

export function applyTheme(themeName) {
  const theme = themes[themeName];
  if (!theme) return;

  const root = document.documentElement;

  // Set data-theme attribute
  root.setAttribute('data-theme', themeName);

  // Apply CSS custom properties + Facet aliases
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value);
  });

  const c = theme.colors;
  root.style.setProperty('--primary-blue', c.primary);
  root.style.setProperty('--primary-color', c.primary);
  root.style.setProperty('--page-bg', c.background);
  root.style.setProperty('--bg-color', c.surface);
  root.style.setProperty('--bg-primary', c.surface);
  root.style.setProperty('--bg-secondary', c.background);
  root.style.setProperty('--card-bg', c.surface);
  root.style.setProperty('--surface-raised', c.surface);
  root.style.setProperty('--surface', c.surface);
  root.style.setProperty('--text-color', c.text);
  root.style.setProperty('--text-primary', c.text);
  root.style.setProperty('--text-secondary', c.textSecondary);
  root.style.setProperty('--text-muted', c.textSecondary);
  root.style.setProperty('--border-color', c.border);
  root.style.setProperty('--border-strong', c.border);

  // Special handling for high contrast
  if (themeName === 'highContrast') {
    root.style.setProperty('--focus-outline', '2px solid #ffff00');
    root.style.setProperty('--shadow-sm', '0 1px 2px 0 rgb(255 255 255 / 0.5)');
    root.style.setProperty(
      '--shadow-md',
      '0 4px 6px -1px rgb(255 255 255 / 0.3)'
    );
  } else {
    root.style.removeProperty('--focus-outline');
    root.style.removeProperty('--shadow-sm');
    root.style.removeProperty('--shadow-md');
  }

  // Save theme preference
  saveTheme(themeName);
  updateThemeIndicator(themeName);

  // Sync dark-mode checkbox if present
  updateThemeToggle(themeName);
}

// Expose for wizard / keyboard shortcuts
if (typeof window !== 'undefined') {
  window.setTheme = applyTheme;
  window.applyTheme = applyTheme;
}

export function switchToLight() {
  applyTheme('light');
}

export function switchToDark() {
  applyTheme('dark');
}

export function switchToHighContrast() {
  applyTheme('highContrast');
}

export function setupThemeToggle() {
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle && !themeToggle.hasAttribute('data-theme-toggle-bound')) {
    themeToggle.setAttribute('data-theme-toggle-bound', 'true');
    // Create theme selector dropdown
    themeToggle.innerHTML = `
            <select id="theme-selector" style="padding: 5px; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-color); color: var(--text-color);">
                <option value="light">Light Theme</option>
                <option value="dark">Dark Theme</option>
                <option value="highContrast">High Contrast</option>
            </select>
        `;

    const selector = document.getElementById('theme-selector');
    if (selector) {
      const currentTheme = loadTheme() || 'light';
      selector.value = currentTheme;

      selector.addEventListener('change', (e) => {
        applyTheme(e.target.value);
      });
    }
  }

  // Legacy dark mode toggle support
  const darkModeToggle = document.getElementById('dark-mode-toggle');
  if (
    darkModeToggle &&
    !darkModeToggle.hasAttribute('data-theme-toggle-bound')
  ) {
    darkModeToggle.setAttribute('data-theme-toggle-bound', 'true');
    const currentTheme = loadTheme() || 'light';
    darkModeToggle.checked = currentTheme === 'dark';

    darkModeToggle.addEventListener('change', function () {
      applyTheme(this.checked ? 'dark' : 'light');
    });
  }
}

function updateThemeToggle(theme) {
  const selector = document.getElementById('theme-selector');
  if (selector) {
    selector.value = theme;
  }

  const darkModeToggle = document.getElementById('dark-mode-toggle');
  if (darkModeToggle) {
    darkModeToggle.checked = theme === 'dark';
  }
}
