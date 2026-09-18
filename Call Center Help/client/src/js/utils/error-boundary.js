// Error Boundary Utility
// Provides error handling and recovery for critical application functions
import { showToast } from './toast.js';

export class ErrorBoundary {
  constructor(name = 'Component') {
    this.name = name;
    this.errors = [];
  }

  // Wrap a function with error handling
  wrap(fn, fallback = null) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.handleError(error, fn.name || 'anonymous function');
        if (fallback) {
          try {
            return await fallback(error, ...args);
          } catch (fallbackError) {
            console.error(
              `Fallback also failed for ${this.name}:`,
              fallbackError
            );
          }
        }
        throw error;
      }
    };
  }

  // Handle errors with logging and user notification
  handleError(error, context = '') {
    const errorInfo = {
      name: this.name,
      context,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      userAgent:
        typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    };

    this.errors.push(errorInfo);

    // Log to console with structured format
    console.error(`[${this.name}] Error in ${context}:`, errorInfo);

    // Show user-friendly error message
    if (typeof showToast === 'function') {
      showToast(
        `An error occurred in ${this.name}. Please try again.`,
        'error'
      );
    }

    // Limit stored errors to prevent memory leaks
    if (this.errors.length > 50) {
      this.errors = this.errors.slice(-25);
    }
  }

  // Get recent errors for debugging
  getRecentErrors(count = 5) {
    return this.errors.slice(-count);
  }

  // Clear error history
  clearErrors() {
    this.errors = [];
  }
}

// Global error boundary instances
export const crmErrorBoundary = new ErrorBoundary('CRM Integration');
export const uiErrorBoundary = new ErrorBoundary('UI Components');
export const apiErrorBoundary = new ErrorBoundary('API Calls');

// Utility function to create error boundaries for modules
export function createModuleErrorBoundary(moduleName) {
  return new ErrorBoundary(moduleName);
}

// Global error handler for unhandled errors
export function setupGlobalErrorHandling() {
  if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      try {
        // Provide richer diagnostics to help debug minified stack traces
        const info = {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error:
            event.error && event.error.stack ? event.error.stack : event.error,
          showConfirmModalType: typeof window.showConfirmModal,
          showToastType: typeof window.showToast,
          toastManagerType: typeof window.toastManager,
          patternsModuleType: typeof window.patternsModule,
          userAgent: navigator.userAgent,
        };
        console.error('Global error caught:', info);
      } catch (e) {
        console.error('Global error handler failure:', e, event);
      }
      if (typeof showToast === 'function') {
        try {
          showToast(
            'An unexpected error occurred. Please refresh the page.',
            'error'
          );
        } catch (e) {
          console.warn('showToast failed in error handler', e);
        }
      }
    });

    window.addEventListener('unhandledrejection', (event) => {
      try {
        const reason = event && event.reason;
        const info = {
          reasonType: reason && typeof reason,
          reason: reason && (reason.stack || reason.message || reason),
          showConfirmModalType: typeof window.showConfirmModal,
          showToastType: typeof window.showToast,
          toastManagerType: typeof window.toastManager,
          patternsModuleType: typeof window.patternsModule,
          userAgent: navigator.userAgent,
        };
        console.error('Unhandled promise rejection:', info);
      } catch (e) {
        console.error('Unhandled rejection handler failed', e, event);
      }
      if (typeof showToast === 'function') {
        try {
          showToast(
            'An unexpected error occurred. Please refresh the page.',
            'error'
          );
        } catch (e) {
          console.warn('showToast failed in unhandledrejection handler', e);
        }
      }
    });
  }
}

// Safe execution wrapper for critical operations
export async function safeExecute(operation, errorBoundary, context = '') {
  return errorBoundary.wrap(operation)(context);
}
