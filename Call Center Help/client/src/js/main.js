// Import synchronous dependencies
import { io } from 'socket.io-client';
import Chart from 'chart.js/auto';

// Expose libraries globally for legacy code compatibility
window.io = io;
window.Chart = Chart;

import { auth } from './modules/auth.js';
import {
  initializeSettings,
  appSettings,
  saveSettings,
  applySettings,
} from './modules/settings.js';
import { initializeTheme, setupThemeToggle } from './modules/themes.js';
import { setupTimerEventListeners } from './modules/timer.js';
import * as patternsModule from './modules/patterns.js';
window.patternsModule = patternsModule;
import { setupSettingsEventListeners } from './modules/settings.js';
import {
  minimizeSection,
  popOutSection,
  closeFloatingWindow,
  minimizeFloatingWindow,
  openSectionInFloatingWindow,
  openSectionInBrowserPopup,
} from './modules/draggable.js';
import { initFloating, getFloatingManager } from './modules/floating.js';
import { setupKeyboardShortcuts } from './utils/keyboard-shortcuts.js';

// Import new feature modules
import { initializeCallLogging } from './modules/call-logging.js';
import { initializeAnalytics, initializeCharts } from './modules/analytics.js';
import { initializeCRM } from './modules/crm.js';
import { initializeScripts } from './modules/scripts.js';
import { initializeTasks } from './modules/tasks.js';
import { initializeVoiceRecording } from './modules/voice-recording.js';
import { initializeQA } from './modules/qa.js';
import { initializePerformanceMetrics } from './modules/performance-metrics.js';
import { initializeQuickActionsToolbar } from './modules/quick-actions.js';

// Import error boundary for global error handling
import { setupGlobalErrorHandling } from './utils/error-boundary.js';
import { showToast } from './utils/toast.js';

// Lazy load advanced features
let advancedModulesLoaded = false;
const lazyLoadAdvancedModules = async () => {
  if (advancedModulesLoaded) return;

  try {
    const [
      { initializeCollaboration },
      { initializeAdvancedReporting },
      { initializeWorkflows },
      { initializeAIInsights },
      { initializeMultiChannel },
      { initializeFeedback },
      { initializeKnowledgeBase },
      { initializeTimeTracking },
      { initializeAdvancedAnalytics },
      { initializeAPIIntegration },
    ] = await Promise.all([
      import('./modules/collaboration.js').catch((err) => {
        console.warn('Collaboration module not available:', err);
        return { initializeCollaboration: () => {} };
      }),
      import('./modules/reporting.js').catch((err) => {
        console.warn('Reporting module not available:', err);
        return { initializeAdvancedReporting: () => {} };
      }),
      import('./modules/workflows.js').catch((err) => {
        console.warn('Workflows module not available:', err);
        return { initializeWorkflows: () => {} };
      }),
      import('./modules/ai-insights.js').catch((err) => {
        console.warn('AI Insights module not available:', err);
        return { initializeAIInsights: () => {} };
      }),
      import('./modules/multichannel.js').catch((err) => {
        console.warn('Multichannel module not available:', err);
        return { initializeMultiChannel: () => {} };
      }),
      import('./modules/feedback.js').catch((err) => {
        console.warn('Feedback module not available:', err);
        return { initializeFeedback: () => {} };
      }),
      import('./modules/knowledge-base.js').catch((err) => {
        console.warn('Knowledge Base module not available:', err);
        return { initializeKnowledgeBase: () => {} };
      }),
      import('./modules/time-tracking.js').catch((err) => {
        console.warn('Time Tracking module not available:', err);
        return { initializeTimeTracking: () => {} };
      }),
      import('./modules/advanced-analytics.js').catch((err) => {
        console.warn('Advanced Analytics module not available:', err);
        return { initializeAdvancedAnalytics: () => {} };
      }),
      import('./modules/api-integration.js').catch((err) => {
        console.warn('API Integration module not available:', err);
        return { initializeAPIIntegration: () => {} };
      }),
    ]);

    // Wait for DOM to be ready before initializing
    const initializeWhenReady = () => {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeModules);
      } else {
        initializeModules();
      }
    };

    const initializeModules = () => {
      // Initialize lazy-loaded modules with error handling
      try {
        initializeCollaboration();
      } catch (e) {
        console.error('Error initializing collaboration:', e);
      }
      try {
        initializeAdvancedReporting();
      } catch (e) {
        console.error('Error initializing reporting:', e);
      }
      try {
        initializeWorkflows();
      } catch (e) {
        console.error('Error initializing workflows:', e);
      }
      try {
        initializeAIInsights();
      } catch (e) {
        console.error('Error initializing AI insights:', e);
      }
      try {
        initializeMultiChannel();
      } catch (e) {
        console.error('Error initializing multichannel:', e);
      }
      try {
        initializeFeedback();
      } catch (e) {
        console.error('Error initializing feedback:', e);
      }
      try {
        initializeKnowledgeBase();
      } catch (e) {
        console.error('Error initializing knowledge base:', e);
      }
      try {
        initializeTimeTracking();
      } catch (e) {
        console.error('Error initializing time tracking:', e);
      }
      try {
        initializeAdvancedAnalytics();
      } catch (e) {
        console.error('Error initializing advanced analytics:', e);
      }
      try {
        initializeAPIIntegration();
      } catch (e) {
        console.error('Error initializing API integration:', e);
      }
      try {
        patternsModule.initializePatterns();
      } catch (e) {
        console.error('Error initializing patterns:', e);
      }
      try {
        patternsModule.setupPatternEventListeners();
      } catch (e) {
        console.error('Error setting up pattern event listeners:', e);
      }
      try {
        setupTimerEventListeners();
        window.timerEventListenersSet = true;
      } catch (e) {
        console.error('Error setting up timer event listeners:', e);
      }

      advancedModulesLoaded = true;
    };

    initializeWhenReady();
  } catch (error) {
    console.error('Failed to load advanced modules:', error);
  }
};

// Tab navigation functions
function openNotesTab() {
  document.querySelectorAll('.tab-content').forEach((tab) => {
    tab.style.display = 'none';
  });
  document.getElementById('notes').style.display = 'block';
  document.querySelectorAll('.tab-link').forEach((link) => {
    link.classList.remove('active');
  });
  document.querySelector('[data-section="notes"]').classList.add('active');
}

function openTimerTab() {
  document.querySelectorAll('.tab-content').forEach((tab) => {
    tab.style.display = 'none';
  });
  document.getElementById('hold-timer').style.display = 'block';
  document.querySelectorAll('.tab-link').forEach((link) => {
    link.classList.remove('active');
  });
  document.querySelector('[data-section="timer"]').classList.add('active');
}

// Expose tab functions globally for backward compatibility
window.openNotesTab = openNotesTab;
window.openTimerTab = openTimerTab;

// Expose floating window helpers for inline handlers / popups
window.closeFloatingWindow = closeFloatingWindow;
window.minimizeFloatingWindow = minimizeFloatingWindow;
window.openSectionInFloatingWindow = openSectionInFloatingWindow;
window.openSectionInBrowserPopup = openSectionInBrowserPopup;

// Check if element is in viewport
function isElementInViewport(element) {
  const rect = element.getBoundingClientRect();
  return (
    rect.top <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.bottom >= 0 &&
    rect.left <= (window.innerWidth || document.documentElement.clientWidth) &&
    rect.right >= 0
  );
}

// Lazy load modules when element is visible
function lazyLoadOnVisible(elementId, loadCallback) {
  const element = document.getElementById(elementId);
  if (!element) return;

  // If element is already visible, load immediately
  if (isElementInViewport(element)) {
    try {
      loadCallback();
    } catch (err) {
      console.error(`Error loading module for element ${elementId}:`, err);
    }
    return;
  }

  // Otherwise, set up intersection observer
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          try {
            loadCallback();
          } catch (err) {
            console.error(
              `Error loading module for element ${elementId}:`,
              err
            );
          }
          observer.disconnect();
        }
      });
    },
    { threshold: 0.1 }
  );

  observer.observe(element);
}

// Handle resize events for responsive layout
function handleResize() {
  const width = window.innerWidth;
  document.body.classList.toggle('small-screen', width < 768);
  document.body.classList.toggle('medium-screen', width >= 768 && width < 1024);
  document.body.classList.toggle('large-screen', width >= 1024);
}

// Show the main app content
function showMainApp() {
  document.getElementById('main-app').classList.remove('hidden');
  document.getElementById('settings-view').classList.add('hidden');
  document.getElementById('stats-view').classList.add('hidden');
  document.getElementById('knowledge-base-view').classList.add('hidden');
  document.getElementById('main-tab')?.classList.add('active');
  document.getElementById('settings-tab')?.classList.remove('active');
  document.getElementById('stats-tab')?.classList.remove('active');
  document.getElementById('knowledge-base-tab')?.classList.remove('active');

  // Apply visibility settings to sections
  applySettings();

  // Lazy load advanced modules when main app is shown
  lazyLoadAdvancedModules();
}

// Expose for inline scripts / external callers that expect a global
window.showMainApp = showMainApp;

// Show settings panel
function showSettings() {
  document.getElementById('main-app').classList.add('hidden');
  document.getElementById('settings-view').classList.remove('hidden');
  document.getElementById('stats-view').classList.add('hidden');
  document.getElementById('knowledge-base-view').classList.add('hidden');
  document.getElementById('main-tab')?.classList.remove('active');
  document.getElementById('settings-tab')?.classList.add('active');
  document.getElementById('stats-tab')?.classList.remove('active');
  document.getElementById('knowledge-base-tab')?.classList.remove('active');

  // Apply visibility settings to toggles
  applySettings();

  // Ensure the patterns are loaded for settings
  try {
    if (window.patternsModule) {
      // Already loaded, just update table
      window.patternsModule.updatePatternTable();
    } else {
      // Load patterns module
      import('./modules/patterns.js')
        .then((module) => {
          window.patternsModule = module;
          module.initializePatterns();
        })
        .catch((err) => {
          console.warn('Error loading patterns module for settings:', err);
        });
    }
  } catch (err) {
    console.warn('Error loading patterns for settings:', err);
  }
}

window.showSettings = showSettings;

//console.log('showSettings assigned:', window.showSettings);

window.test = window.showSettings;

// Show stats panel
function showStats() {
  document.getElementById('main-app').classList.add('hidden');
  document.getElementById('settings-view').classList.add('hidden');
  document.getElementById('stats-view').classList.remove('hidden');
  document.getElementById('knowledge-base-view').classList.add('hidden');
  document.getElementById('main-tab')?.classList.remove('active');
  document.getElementById('settings-tab')?.classList.remove('active');
  document.getElementById('stats-tab')?.classList.add('active');
  document.getElementById('knowledge-base-tab')?.classList.remove('active');

  // Apply visibility settings to sections
  applySettings();

  // Lazy load advanced modules when stats tab is accessed
  lazyLoadAdvancedModules();
}

// Show knowledge base panel
function showKnowledgeBase() {
  document.getElementById('main-app').classList.add('hidden');
  document.getElementById('settings-view').classList.add('hidden');
  document.getElementById('stats-view').classList.add('hidden');
  document.getElementById('knowledge-base-view').classList.remove('hidden');
  document.getElementById('main-tab')?.classList.remove('active');
  document.getElementById('settings-tab')?.classList.remove('active');
  document.getElementById('stats-tab')?.classList.remove('active');
  document.getElementById('knowledge-base-tab')?.classList.add('active');

  // Apply visibility settings to sections
  applySettings();

  // Initialize knowledge base if not already done
  if (!window.knowledgeBaseInitialized) {
    lazyLoadAdvancedModules().then(() => {
      // The knowledge base should be initialized by the lazy loading
      window.knowledgeBaseInitialized = true;
    });
  }
}

function updateAuthHeader() {
  const btn = document.getElementById('header-login-btn');
  if (!btn) return;

  if (auth.isLoggedIn()) {
    const user = auth.getUser();
    btn.textContent = `Logout (${user ? user.username : 'User'})`;
    btn.onclick = () => {
      auth.logout();
      showToast('Logged out successfully', 'success');
      updateAuthHeader();
      // Optional: Reload to clear state if needed, but for now just stay
      window.location.reload();
    };
  } else {
    btn.textContent = 'Login';
    btn.onclick = () => showLogin();
  }
}

// Show Register Modal
function showRegister() {
  const modal = document.createElement('div');
  modal.className = 'confirm-modal-overlay';
  modal.innerHTML = `
    <div class="confirm-modal login-modal">
      <div class="modal-header">
        <h3>Create Account</h3>
        <button type="button" class="modal-close" id="modal-close-x">×</button>
      </div>
      <div class="modal-body">
        <form id="register-form" class="auth-form">
          <div class="form-group">
            <label for="reg-username">Username</label>
            <input id="reg-username" type="text" placeholder="Desired Username" required autocomplete="username" />
          </div>
           <div class="form-group">
            <label for="reg-email">Email</label>
            <input id="reg-email" type="email" placeholder="name@example.com" required autocomplete="email" />
          </div>
          <div class="form-group">
            <label for="reg-password">Password</label>
            <input id="reg-password" type="password" placeholder="Create a password" required autocomplete="new-password" />
          </div>
          <button type="submit" id="do-register-submit" class="button btn-primary btn-full">Create Account</button>
        </form>
         <div class="auth-footer">
          <p>Already have an account? <button type="button" id="switch-to-login" class="btn-link">Log In</button></p>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Trigger animation
  requestAnimationFrame(() => {
    modal.classList.add('active');
  });

  document.getElementById('reg-username').focus();

  document
    .getElementById('register-form')
    .addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('reg-username').value;
      const email = document.getElementById('reg-email').value;
      const password = document.getElementById('reg-password').value;

      const submitBtn = document.getElementById('do-register-submit');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Creating...';
      submitBtn.disabled = true;

      try {
        await auth.register(username, email, password);
        showToast('Registration successful! Please login.', 'success');
        modal.classList.add('closing');
        setTimeout(() => modal.remove(), 200);
        showLogin(); // Switch to login after success
      } catch (err) {
        showToast(err.message, 'error');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    });

  document.getElementById('switch-to-login').addEventListener('click', () => {
    modal.remove();
    showLogin();
  });

  // Close buttons
  const close = () => {
    modal.classList.add('closing');
    setTimeout(() => modal.remove(), 200);
  };

  document.getElementById('modal-close-x').addEventListener('click', close);

  // click outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });
}

// Make available globally
window.showLogin = showLogin;
window.showRegister = showRegister;

function showLogin() {
  // Simple modal for login/register
  const modal = document.createElement('div');
  modal.className = 'confirm-modal-overlay';
  modal.innerHTML = `
    <div class="confirm-modal login-modal">
      <div class="modal-header">
        <h3>Welcome Back</h3>
        <button type="button" class="modal-close" id="modal-close-x">×</button>
      </div>
      <div class="modal-body">
        <form id="login-form-submit" class="auth-form">
          <div class="form-group">
            <label for="login-email">Email</label>
            <input id="login-email" type="email" placeholder="name@example.com" required autocomplete="username" />
          </div>
          <div class="form-group">
            <label for="login-password">Password</label>
            <input id="login-password" type="password" placeholder="••••••••" required autocomplete="current-password" />
          </div>
          <button type="submit" id="login-submit" class="button btn-primary btn-full">Log In</button>
        </form>
        
        <div class="auth-footer">
          <p>Don't have an account? <button type="button" id="switch-to-register" class="btn-link">Sign Up</button></p>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Trigger animation
  requestAnimationFrame(() => {
    modal.classList.add('active');
  });

  // Focus email
  const emailInput = document.getElementById('login-email');
  if (emailInput) emailInput.focus();

  document
    .getElementById('login-form-submit')
    .addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;

      const submitBtn = document.getElementById('login-submit');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Logging in...';
      submitBtn.disabled = true;

      try {
        await auth.login(email, password);
        showToast('Logged in successfully');
        modal.classList.add('closing'); // nice closing animation
        setTimeout(() => modal.remove(), 200);
        updateAuthHeader();

        // Trigger Sync
        try {
          const { syncManager } = await import('./modules/sync.js');
          await syncManager.handleLoginSync();
        } catch (syncErr) {
          console.warn('Sync skipped:', syncErr);
          window.location.reload();
        }
      } catch (err) {
        showToast(err.message, 'error');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    });

  // Switch to Register Modal
  document
    .getElementById('switch-to-register')
    .addEventListener('click', () => {
      modal.remove();
      showRegister();
    });

  // Close buttons
  const close = () => {
    modal.classList.add('closing');
    setTimeout(() => modal.remove(), 200);
  };

  document.getElementById('modal-close-x').addEventListener('click', close);

  // click outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });
}

// Show service worker update notification
function showUpdateNotification() {
  const notification = document.createElement('div');
  notification.className = 'update-notification';
  notification.innerHTML = `
    <div class="update-notification-content">
      <div class="update-notification-icon">🔄</div>
      <div class="update-notification-text">
        <div class="update-notification-title">Update Available</div>
        <div class="update-notification-message">A new version of the app is available.</div>
      </div>
      <div class="update-notification-actions">
        <button class="update-btn update-refresh">Refresh</button>
        <button class="update-btn update-dismiss">Later</button>
      </div>
    </div>
  `;

  document.body.appendChild(notification);

  // Add event listeners
  notification
    .querySelector('.update-refresh')
    .addEventListener('click', () => {
      window.location.reload();
    });

  notification
    .querySelector('.update-dismiss')
    .addEventListener('click', () => {
      notification.remove();
    });

  // Auto-dismiss after 10 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 10000);
}

// Secondary modules loading (lazy-loaded)
function loadSecondaryModules() {
  // Timer functionality
  lazyLoadOnVisible('hold-timer', () => {
    import('./modules/timer.js')
      .then((module) => {
        module.initializeTimer();
        // Only setup event listeners if not already done
        if (!window.timerEventListenersSet) {
          module.setupTimerEventListeners();
          window.timerEventListenersSet = true;
        }
        module.initializeMultipleTimers();
      })
      .catch((err) => {
        console.error('Error loading timer module:', err);
      });
  });

  // Call flow functionality
  lazyLoadOnVisible('call-flow-builder', () => {
    import('./modules/callflow.js')
      .then((module) => {
        module.initializeCallFlow();
        module.setupCallFlowEventListeners();
      })
      .catch((err) => {
        console.error('Error loading callflow module:', err);
      });
  });

  // Notes functionality
  lazyLoadOnVisible('notes', () => {
    import('./modules/notes.js')
      .then((module) => {
        module.initializeNotes();
      })
      .catch((err) => {
        console.error('Error loading notes module:', err);
      });
  });

  // Initialize audio system on first user interaction
  document.addEventListener(
    'click',
    () => {
      if (!window.audioInitialized) {
        import('./utils/audio.js')
          .then((module) => {
            module.initAudio();
            window.audioInitialized = true;
          })
          .catch((err) => {
            console.error('Error loading audio module:', err);
          });
      }
    },
    { once: true }
  );

  // Advanced modules - lazy load when sections become visible
  lazyLoadOnVisible('team-collaboration', lazyLoadAdvancedModules);
  lazyLoadOnVisible('automated-workflows', lazyLoadAdvancedModules);
  lazyLoadOnVisible('multichannel-integration', lazyLoadAdvancedModules);
  lazyLoadOnVisible('customer-feedback', lazyLoadAdvancedModules);
  lazyLoadOnVisible('knowledge-base-main', lazyLoadAdvancedModules);
  lazyLoadOnVisible('time-tracking', lazyLoadAdvancedModules);
  lazyLoadOnVisible('advanced-analytics', lazyLoadAdvancedModules);
  lazyLoadOnVisible('api-integration-section', lazyLoadAdvancedModules);
}

// Ensure floating overlay exists for floating windows
if (!document.getElementById('floating-overlay')) {
  const overlay = document.createElement('div');
  overlay.id = 'floating-overlay';
  overlay.className = 'floating-overlay';
  document.body.appendChild(overlay);
}

function setupAllEventListeners() {
  // Navigation
  document.getElementById('main-tab')?.addEventListener('click', showMainApp);
  document
    .getElementById('settings-tab')
    ?.addEventListener('click', showSettings);
  document.getElementById('stats-tab')?.addEventListener('click', showStats);
  document
    .getElementById('knowledge-base-tab')
    ?.addEventListener('click', showKnowledgeBase);
  // Login button - attempt to load a single-page `login.html` once, fall back to modal
  const loginBtn = document.getElementById('login-btn');
  if (loginBtn) {
    loginBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      // Only attempt to fetch once per page load; afterwards use modal fallback
      if (loginBtn.dataset.attempted === 'true') {
        showLogin();
        return;
      }
      loginBtn.dataset.attempted = 'true';
      try {
        const resp = await fetch('login.html', { cache: 'no-cache' });
        if (!resp.ok) throw new Error('login.html not found');
        const html = await resp.text();
        const container = document.createElement('div');
        container.id = 'login-view';
        container.className = 'inpage-login-view';
        container.innerHTML = html;
        document.body.appendChild(container);

        // Wire basic login handlers if present in injected markup
        const submit = container.querySelector('#login-submit');
        if (submit) {
          submit.addEventListener('click', async () => {
            const email = container.querySelector('#login-email')?.value;
            const password = container.querySelector('#login-password')?.value;
            try {
              await auth.login(email, password);
              showToast('Logged in successfully');
              container.remove();
            } catch (err) {
              showToast(err.message, 'error');
            }
          });
        }
        // Wire register and close if present
        const registerBtn = container.querySelector('#register-submit');
        if (registerBtn) {
          registerBtn.addEventListener('click', async () => {
            const email = container.querySelector('#login-email')?.value;
            const password = container.querySelector('#login-password')?.value;
            const username = prompt('Username:');
            try {
              await auth.register(username, email, password);
              showToast('Registered successfully');
              container.remove();
            } catch (err) {
              showToast(err.message, 'error');
            }
          });
        }
        const closeBtn = container.querySelector('#login-close');
        if (closeBtn) {
          closeBtn.addEventListener('click', () => container.remove());
        }
      } catch (err) {
        console.warn('login.html not available, falling back to modal', err);
        showLogin();
      }
    });
  }

  // Event delegation for section controls (minimize, float, etc.)
  const container = document.querySelector('.container');
  if (container) {
    container.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button) return;

      const section = button.closest('.draggable-section');
      if (!section) return;

      if (button.classList.contains('minimize-btn')) {
        minimizeSection(section.id);
      } else if (button.classList.contains('float-btn')) {
        // Open in a floating window or browser popup depending on preference
        popOutSection(section.id);
      }
      // Add handling for edit-title-btn if needed
      else if (button.classList.contains('edit-title-btn')) {
        const titleContainer = button.closest('.title-container');
        if (!titleContainer) return;
        const titleElem = titleContainer.querySelector('.section-title');
        if (!titleElem) return;
        // Prevent multiple inputs
        if (titleContainer.querySelector('.title-input')) return;
        const currentTitle = titleElem.textContent;
        // Create input
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentTitle;
        input.className = 'title-input';
        input.style.marginLeft = '0.5rem';
        input.style.fontSize = '1.1em';
        input.style.fontWeight = '600';
        input.style.width = Math.max(120, currentTitle.length * 12) + 'px';
        titleElem.style.display = 'none';
        button.style.display = 'none';
        titleContainer.appendChild(input);
        input.focus();
        input.select();
        // Save on blur or Enter
        function saveTitle() {
          const newTitle = input.value.trim() || currentTitle;
          titleElem.textContent = newTitle;
          titleElem.style.display = '';
          button.style.display = '';
          input.remove();
          // Persist custom title for section so settings and main page keep it
          try {
            const sectionEl =
              button.closest('.draggable-section') || button.closest('.card');
            const key =
              sectionEl?.getAttribute('data-section') || sectionEl?.id || null;
            if (key) {
              window.appSettings = window.appSettings || appSettings;
              window.appSettings.customTitles =
                window.appSettings.customTitles || {};
              window.appSettings.customTitles[key] = newTitle;
              if (typeof saveSettings === 'function')
                saveSettings(window.appSettings);
            }
          } catch {
            /* non-fatal */
          }
        }
        input.addEventListener('blur', saveTitle);
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            saveTitle();
          } else if (e.key === 'Escape') {
            input.value = currentTitle;
            saveTitle();
          }
        });
      }
    });
  }

  // Only setup listeners for components that are NOT lazy-loaded
  setupSettingsEventListeners(); // This will handle settings page events
}

import { initializeSectionSettings } from './modules/section-settings.js';

// Main initialization function
document.addEventListener('DOMContentLoaded', function () {
  try {
    // Core services
    initializeSectionSettings();
    // Set up global error handling first
    setupGlobalErrorHandling();

    // Request persistent storage to prevent browser from clearing data
    import('./modules/storage.js')
      .then((storage) => {
        if (storage.requestPersistentStorage) {
          storage.requestPersistentStorage();
        }
      })
      .catch((err) => {
        console.warn('Could not request persistent storage:', err);
      });

    initializeSettings();
    window.appSettings = appSettings;
    initializeTheme();
    setupThemeToggle();

    // Apply settings to initialize section visibility
    applySettings();
    window.applySettings = applySettings;
    window.saveSettings = saveSettings;

    // Set up all event listeners for the application
    setupAllEventListeners();
    updateAuthHeader();

    // Initialize keyboard shortcuts
    setupKeyboardShortcuts();

    // Initialize the enhanced floating system
    initFloating();

    // Make floating manager globally available
    window.floatingManager = getFloatingManager();

    // Ensure patterns module is available and wired (eagerly attach listeners)
    try {
      if (
        patternsModule &&
        typeof patternsModule.setupPatternEventListeners === 'function'
      ) {
        patternsModule.setupPatternEventListeners();
        window.patternsModule = patternsModule;

        // Attach to the main pattern formatter root explicitly (scoped listeners)
        try {
          const mainPatternRoot = document.getElementById('pattern-formatter');
          if (
            mainPatternRoot &&
            typeof patternsModule.attachPatternEventListeners === 'function'
          ) {
            patternsModule.attachPatternEventListeners(mainPatternRoot);
          }
        } catch (err) {
          console.warn('Could not attach pattern listeners to main root:', err);
        }

        // Attach to the settings Pattern Management subsection if present
        try {
          const settingsPatternRoot =
            document.getElementById('pattern-management') ||
            document.getElementById('pattern-management-subsection') ||
            document.querySelector('.pattern-management') ||
            document.querySelector('.pattern-management-subsection');
          if (
            settingsPatternRoot &&
            typeof patternsModule.attachPatternEventListeners === 'function'
          ) {
            patternsModule.attachPatternEventListeners(settingsPatternRoot);
          }
        } catch (err) {
          console.warn(
            'Could not attach pattern listeners to settings root:',
            err
          );
        }
      }
    } catch (e) {
      console.error('Error initializing patterns module eagerly:', e);
    }
    // If floating clones are created dynamically, the opener will dispatch
    // a `floating:created` CustomEvent with detail.root = cloned root.
    // Ensure any loaded patternsModule attaches to those clones.
    try {
      document.addEventListener('floating:created', (ev) => {
        try {
          const root = ev && ev.detail && ev.detail.root;
          if (!root) return;
          if (
            window.patternsModule &&
            typeof window.patternsModule.attachPatternEventListeners ===
              'function'
          ) {
            window.patternsModule.attachPatternEventListeners(root);
            try {
              root.setAttribute &&
                root.setAttribute('data-patterns-attached', 'true');
            } catch {
              /* ignore */
            }
          }
        } catch (err) {
          console.error('Error handling floating:created event:', err);
        }
      });
    } catch (err) {
      console.error('Error registering floating:created listener:', err);
    }

    // Initialize new feature modules
    try {
      initializeCallLogging();
      initializeAnalytics();
      initializeCharts();
      initializeCRM();
      initializeScripts();
      initializeTasks();
      initializeVoiceRecording();
      initializeQA();
      initializePerformanceMetrics();
      initializeQuickActionsToolbar();
      // Lazy load advanced modules when needed
      // mobile companion feature removed
    } catch (error) {
      console.error('Error initializing new feature modules:', error);
    }

    // Set initial UI state
    showMainApp();

    // Start lazy loading of other modules
    setTimeout(loadSecondaryModules, 100);

    // Set up resize handler for responsive behavior
    window.addEventListener('resize', handleResize);
    handleResize(); // Call once to set initial responsive state

    // Handle service worker for offline functionality
    if ('serviceWorker' in navigator) {
      if (
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1'
      ) {
        // In development mode, unregister any existing service workers
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => {
            registration.unregister().then(() => {
              //console.log('Service Worker unregistered in development mode');
            });
          });
        });
      } else {
        // In production mode, register service worker
        navigator.serviceWorker
          .register('/adamas/sw.js')
          .then((registration) => {
            //console.log('Service Worker registered successfully:', registration.scope);

            // Check for updates
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (
                    newWorker.state === 'installed' &&
                    navigator.serviceWorker.controller
                  ) {
                    // New version available
                    showUpdateNotification();
                  }
                });
              }
            });
          })
          .catch((error) => {
            console.error('Service Worker registration failed:', error);
          });
      }
    }

    // Show "app ready" indication if needed
    document.body.classList.add('app-ready');
  } catch (error) {
    console.error('Error initializing application:', error);
  }
});
