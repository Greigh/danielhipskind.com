// Theme management functions
import { saveTheme, loadTheme } from './storage.js';

// Available themes
export const themes = {
  light: {
    name: 'Light',
    colors: {
      primary: '#1976d2',
      secondary: '#dc004e',
      background: '#ffffff',
      surface: '#f5f5f5',
      text: '#333333',
      textSecondary: '#666666',
      border: '#e0e0e0',
      success: '#4caf50',
      warning: '#ff9800',
      error: '#f44336',
      info: '#2196f3',
    },
  },
  dark: {
    name: 'Dark',
    colors: {
      primary: '#90caf9',
      secondary: '#f48fb1',
      background: '#121212',
      surface: '#1e1e1e',
      text: '#ffffff',
      textSecondary: '#b0b0b0',
      border: '#333333',
      success: '#81c784',
      warning: '#ffb74d',
      error: '#ef5350',
      info: '#64b5f6',
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

  // Apply CSS custom properties
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value);
  });

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
  if (themeToggle) {
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
      // Set current theme
      const currentTheme = loadTheme() || 'light';
      selector.value = currentTheme;

      selector.addEventListener('change', (e) => {
        applyTheme(e.target.value);
      });
    }
  }

  // Legacy dark mode toggle support
  const darkModeToggle = document.getElementById('dark-mode-toggle');
  if (darkModeToggle) {
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
