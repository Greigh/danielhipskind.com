export class TokenManager {
  constructor() {
    this.tokenKey = 'analytics_token';
    this.expiryKey = 'analytics_token_expiry';
  }

  loadToken() {
    this.token = localStorage.getItem(this.tokenKey);
  }

  setToken(token, expiresIn) {
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + parseInt(expiresIn));

    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.expiryKey, expiryDate.toISOString());
  }

  getToken() {
    const token = localStorage.getItem(this.tokenKey);
    const expiry = new Date(localStorage.getItem(this.expiryKey));

    if (!token || !expiry) {
      return null;
    }

    // Check if token is expired
    if (expiry < new Date()) {
      this.clearToken();
      return null;
    }

    return token;
  }

  clearToken() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.expiryKey);
  }

  isAuthenticated() {
    return !!this.getToken();
  }
}
