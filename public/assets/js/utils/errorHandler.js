import { debug } from './debug.js';

class ErrorHandler {
  constructor() {
    this.container = document.getElementById('error-container');
    this.message = this.container?.querySelector('.error-message');
    this.setupListeners();
  }

  setupListeners() {
    const closeBtn = this.container?.querySelector('.error-close');
    closeBtn?.addEventListener('click', () => this.hideError());
  }

  showError(error, context = '') {
    debug('Error occurred:', error);
    console.error(`${context}:`, error);

    if (this.message && this.container) {
      this.message.textContent = this.formatError(error);
      this.container.hidden = false;

      // Auto-hide after 5 seconds
      setTimeout(() => this.hideError(), 5000);
    }
  }

  hideError() {
    if (this.container) {
      this.container.hidden = true;
    }
  }

  formatError(error) {
    if (error instanceof Error) {
      return error.message;
    }
    return typeof error === 'string' ? error : 'An unknown error occurred';
  }

  async handleAsyncError(promise, context = '') {
    try {
      return await promise;
    } catch (error) {
      this.showError(error, context);
      return null;
    }
  }
}

export default new ErrorHandler();
