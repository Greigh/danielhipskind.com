import { TokenManager } from './tokenManager.js';

class AuthHandler {
  constructor() {
    this.tokenManager = new TokenManager();
    this.loginForm = document.getElementById('loginForm');

    // Only set up event listeners if we're on the login page
    if (this.loginForm) {
      this.setupEventListeners();
    }
  }

  setupEventListeners() {
    this.loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const passwordInput = document.getElementById('password');
      const errorMessage = document.getElementById('error-message');

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'same-origin',
          body: JSON.stringify({
            password: passwordInput.value,
          }),
        });

        const data = await response.json();

        if (data.success) {
          window.location.href = '/analytics/dashboard';
        } else {
          errorMessage.textContent = 'Invalid password';
          errorMessage.classList.add('visible');
        }
      } catch (error) {
        console.error('Login failed:', error);
        errorMessage.textContent = 'Login failed. Please try again.';
        errorMessage.classList.add('visible');
      } finally {
        passwordInput.value = '';
      }
    });
  }

  async isAuthenticated() {
    return await this.tokenManager.isAuthenticated();
  }

  async logout() {
    await this.tokenManager.logout();
  }
}

// Export a single instance
export default new AuthHandler();
