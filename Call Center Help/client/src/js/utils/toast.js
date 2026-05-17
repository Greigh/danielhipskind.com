// Toast notification system for better UX than alert()
class ToastManager {
  constructor() {
    this.container = null;
    this.init();
  }

  init() {
    // Create toast container if it doesn't exist
    if (!document.getElementById('toast-container')) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    } else {
      this.container = document.getElementById('toast-container');
    }
  }

  show(message, type = 'info', duration = 5000) {
    // Backwards-compatible: if `type` is an options object, extract fields
    let options = {};
    if (type && typeof type === 'object' && !Array.isArray(type)) {
      options = type;
      type = options.type || 'info';
      duration =
        typeof options.timeout === 'number'
          ? options.timeout
          : options.duration || duration;
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const actionHtml = options.actionLabel
      ? `<button class="toast-action">${options.actionLabel}</button>`
      : '';

    toast.innerHTML = `
      <div class="toast-content">
        <span class="toast-message">${message}</span>
        ${actionHtml}
        <button class="toast-close" aria-label="Close notification">×</button>
      </div>
    `;

    // Add close button functionality
    const closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) closeBtn.addEventListener('click', () => this.remove(toast));

    // Wire action callback if provided
    if (options.actionLabel && typeof options.actionCallback === 'function') {
      const actionBtn = toast.querySelector('.toast-action');
      if (actionBtn) {
        actionBtn.addEventListener('click', () => {
          try {
            options.actionCallback();
          } catch (e) {
            console.error('Toast action callback error:', e);
          }
          this.remove(toast);
        });
      }
    }

    // Auto remove after duration
    const timeoutId = setTimeout(() => this.remove(toast), duration);

    // Store timeout ID for cleanup
    toast._timeoutId = timeoutId;

    this.container.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    return toast;
  }

  remove(toast) {
    if (toast._timeoutId) {
      clearTimeout(toast._timeoutId);
    }

    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300); // Match CSS transition duration
  }

  success(message, duration) {
    return this.show(message, 'success', duration);
  }

  error(message, duration) {
    return this.show(message, 'error', duration);
  }

  warning(message, duration) {
    return this.show(message, 'warning', duration);
  }

  info(message, duration) {
    return this.show(message, 'info', duration);
  }
}

// Global toast manager instance
const toastManager = new ToastManager();

// Export global function for easy use
export function showToast(message, type = 'info', duration = 5000) {
  return toastManager.show(message, type, duration);
}

export { toastManager as ToastManager };

// Expose globally for compatibility with inline scripts or optimized loaders
try {
  if (typeof window !== 'undefined') {
    window.showToast = showToast;
    window.toastManager = toastManager;
  }
} catch {
  // ignore
}
// Flush any deferred toast calls queued before toast module loaded
try {
  if (typeof window !== 'undefined' && Array.isArray(window.__deferredCalls)) {
    window.__deferredCalls = window.__deferredCalls.filter((item) => {
      if (!item) return false;
      if (item.type === 'toast') {
        try {
          showToast(
            item.message,
            item.toastType || 'info',
            item.duration || 5000
          );
        } catch {
          console.warn('Deferred toast failed');
        }
        return false;
      }
      return true;
    });
  }
} catch (e) {
  console.warn('Error flushing deferred toast calls', e);
}
