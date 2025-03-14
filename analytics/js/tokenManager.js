export class TokenManager {
  constructor() {
    this.initialized = false;
  }

  async init() {
    try {
      // Check if session is valid
      const response = await fetch('/api/auth/verify', {
        credentials: 'same-origin',
      });
      this.initialized = true;
      return response.ok;
    } catch (error) {
      console.error('Session verification failed:', error);
      return false;
    }
  }

  async isAuthenticated() {
    if (!this.initialized) {
      await this.init();
    }
    try {
      const response = await fetch('/api/auth/verify', {
        credentials: 'same-origin',
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async logout() {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
      });
      window.location.href = '/analytics/login';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }
}
