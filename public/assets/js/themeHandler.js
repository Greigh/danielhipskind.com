import { sunIcon, moonIcon } from './icons.js';

const themeToggle = document.getElementById('theme-toggle');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

function setTheme(isDark) {
  // Update document theme
  document.documentElement.setAttribute(
    'data-theme',
    isDark ? 'dark' : 'light'
  );
  localStorage.setItem('theme', isDark ? 'dark' : 'light');

  // Update SVG icon
  const iconSvg = isDark ? sunIcon : moonIcon;
  themeToggle.innerHTML = iconSvg;

  // Set ARIA label for accessibility
  themeToggle.setAttribute(
    'aria-label',
    `Switch to ${isDark ? 'light' : 'dark'} theme`
  );
}

// Initialize theme
const savedTheme = localStorage.getItem('theme');
setTheme(savedTheme ? savedTheme === 'dark' : prefersDark.matches);

// Event listeners
themeToggle?.addEventListener('click', () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  setTheme(!isDark);
});

// Handle system theme changes
prefersDark.addEventListener('change', (e) => {
  if (!localStorage.getItem('theme')) {
    setTheme(e.matches);
  }
});

export { setTheme };
