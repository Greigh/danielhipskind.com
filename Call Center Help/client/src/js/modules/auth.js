// Auth Module — httpOnly cookie sessions (token never stored in localStorage)
import { showToast } from '../utils/toast.js';
import { apiFetch } from '../utils/api.js';

const USER_KEY = 'user';

export class Auth {
  constructor() {
    // Migrate away from legacy localStorage JWT
    try {
      localStorage.removeItem('token');
    } catch {
      /* ignore */
    }
    this.user = JSON.parse(sessionStorage.getItem(USER_KEY) || 'null');
    this._ready = this.restoreSession();
  }

  /** Resolves when /api/me session probe finishes */
  whenReady() {
    return this._ready;
  }

  async restoreSession() {
    try {
      const res = await apiFetch('/api/me');
      if (res.ok) {
        const data = await res.json();
        this.user = data.user || data;
        sessionStorage.setItem(USER_KEY, JSON.stringify(this.user));
        return true;
      }
      // Explicit unauthenticated response — drop stale profile
      this.user = null;
      sessionStorage.removeItem(USER_KEY);
      return false;
    } catch {
      // Offline / server down — keep optimistic sessionStorage profile
      return !!this.user;
    }
  }

  async login(email, password) {
    const res = await apiFetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error(`Server error: ${res.statusText || 'Unknown error'}`);
    }

    if (res.ok) {
      this.user = data.user;
      sessionStorage.setItem(USER_KEY, JSON.stringify(this.user));
      // Drop any leftover bearer token from older builds
      try {
        localStorage.removeItem('token');
      } catch {
        /* ignore */
      }
      return true;
    }

    console.error('Login error response:', data);
    const errorMessage = data.errors
      ? data.errors.map((e) => e.msg).join(', ')
      : data.error || 'Login failed';

    throw new Error(errorMessage);
  }

  async register(username, email, password, role = 'agent') {
    const res = await apiFetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, role }),
    });

    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error(`Server error: ${res.statusText || 'Unknown error'}`);
    }

    if (res.ok) {
      return true;
    }

    console.error('Registration error response:', data);
    const errorMessage = data.errors
      ? data.errors.map((e) => e.msg).join(', ')
      : data.error || 'Registration failed';

    throw new Error(errorMessage);
  }

  async updateProfile(username, email) {
    const res = await apiFetch('/api/user/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
      },
      body: JSON.stringify({ username, email }),
    });

    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error(`Server error: ${res.statusText || 'Unknown error'}`);
    }

    if (res.ok) {
      this.user = { ...this.user, ...data };
      sessionStorage.setItem(USER_KEY, JSON.stringify(this.user));
      return true;
    }

    console.error('Update profile error:', data);
    const errorMessage = data.errors
      ? data.errors.map((e) => e.msg).join(', ')
      : data.error || 'Update failed';
    throw new Error(errorMessage);
  }

  async updatePassword(currentPassword, newPassword) {
    const res = await apiFetch('/api/user/password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error(`Server error: ${res.statusText || 'Unknown error'}`);
    }

    if (res.ok) {
      return true;
    }

    console.error('Update password error:', data);
    const errorMessage = data.errors
      ? data.errors.map((e) => e.msg).join(', ')
      : data.error || 'Update failed';
    throw new Error(errorMessage);
  }

  async logout() {
    try {
      await apiFetch('/api/logout', { method: 'POST' });
    } catch {
      /* best-effort */
    }
    this.user = null;
    sessionStorage.removeItem(USER_KEY);
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('crmAccessToken');
      sessionStorage.removeItem('crmAccessToken');
    } catch {
      /* ignore */
    }
    try {
      if (typeof window !== 'undefined' && window.adamasSocket) {
        window.adamasSocket.disconnect();
        window.adamasSocket = null;
      }
    } catch {
      /* ignore */
    }
    try {
      const { crmManager } = await import('./crm/CRMManager.js');
      if (crmManager && typeof crmManager.clearPersistedSecrets === 'function') {
        crmManager.clearPersistedSecrets();
      }
    } catch {
      /* ignore */
    }
  }

  /** Cookie carries the JWT; Authorization header kept empty for same-origin calls. */
  getAuthHeader() {
    return {};
  }

  isLoggedIn() {
    return !!this.user;
  }

  getUser() {
    return this.user;
  }

  getRole() {
    return this.user?.role || 'agent';
  }

  hasPermission(permission) {
    const rolePermissions = {
      admin: [
        'read',
        'write',
        'delete',
        'manage_users',
        'view_reports',
        'audit',
      ],
      supervisor: ['read', 'write', 'delete', 'view_reports'],
      agent: ['read', 'write'],
    };
    return rolePermissions[this.getRole()]?.includes(permission) || false;
  }

  canManageUsers() {
    return this.hasPermission('manage_users');
  }

  canViewReports() {
    return this.hasPermission('view_reports');
  }

  canAudit() {
    return this.hasPermission('audit');
  }
}

export const auth = new Auth();

// UI functions for login/register forms
export function initializeAuthUI() {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const showRegisterBtn = document.getElementById('show-register-btn');
  const showLoginBtn = document.getElementById('show-login-btn');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;

      try {
        const success = await auth.login(email, password);
        if (success) {
          showToast('Login successful!', 'success');
          window.showMainApp();
        }
      } catch (error) {
        showToast(`Login failed: ${error.message}`, 'error');
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('register-username').value;
      const email = document.getElementById('register-email').value;
      const password = document.getElementById('register-password').value;

      try {
        const success = await auth.register(username, email, password);
        if (success) {
          showToast('Registration successful! Please login.', 'success');
          showLoginForm();
        }
      } catch (error) {
        showToast(`Registration failed: ${error.message}`, 'error');
      }
    });
  }

  if (showRegisterBtn) {
    showRegisterBtn.addEventListener('click', (e) => {
      e.preventDefault();
      showRegisterForm();
    });
  }

  if (showLoginBtn) {
    showLoginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      showLoginForm();
    });
  }

  const skipLoginBtn = document.getElementById('skip-login-btn');
  if (skipLoginBtn) {
    skipLoginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.showMainApp();
    });
  }
}

function showLoginForm() {
  document.getElementById('login-form-container').classList.add('active');
  document.getElementById('register-form-container').classList.remove('active');
}

function showRegisterForm() {
  document.getElementById('login-form-container').classList.remove('active');
  document.getElementById('register-form-container').classList.add('active');
}
