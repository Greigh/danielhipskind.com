/**
 * Theme Toggle Implementation
 * 
 * This module handles the application's theme switching functionality including:
 * - System preference detection
 * - Manual theme toggling
 * - Theme persistence
 * - Real-time system theme changes
 */

class ThemeService {
    constructor() {
        this.themeToggle = document.getElementById('theme-toggle');
        this.themeToggleIcon = document.getElementById('theme-toggle-icon');
        this.html = document.documentElement;
        this.initTheme();
        this.bindEvents();
    }

    initTheme() {
        const savedTheme = localStorage.getItem('theme') || 
            (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        this.setTheme(savedTheme);
    }

    setTheme(theme) {
        this.html.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        this.themeToggleIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }

    bindEvents() {
        this.themeToggle?.addEventListener('click', () => {
            const currentTheme = this.html.getAttribute('data-theme');
            this.setTheme(currentTheme === 'dark' ? 'light' : 'dark');
        });

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            this.setTheme(e.matches ? 'dark' : 'light');
        });
    }
}

// Initialize theme service when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ThemeService();
});