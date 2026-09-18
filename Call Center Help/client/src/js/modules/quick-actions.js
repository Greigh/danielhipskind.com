// Quick Actions Toolbar Module
// Provides quick access to commonly used functions

export function initializeQuickActionsToolbar() {
  const toolbar = document.getElementById('quick-actions-toolbar');
  const toggleBtn = document.getElementById('toolbar-toggle');

  if (!toolbar) return;

  // Toggle toolbar visibility
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      toolbar.classList.toggle('collapsed');
      const isCollapsed = toolbar.classList.contains('collapsed');
      localStorage.setItem('toolbar-collapsed', isCollapsed);
    });
  }

  // Restore toolbar state
  const isCollapsed = localStorage.getItem('toolbar-collapsed') === 'true';
  if (isCollapsed) {
    toolbar.classList.add('collapsed');
  }

  // Set up quick action buttons
  setupQuickActionButtons();
}

function setupQuickActionButtons() {
  // New Call - Opens a new call template
  document.getElementById('quick-new-call')?.addEventListener('click', () => {
    handleNewCall();
  });

  // Timer - Starts/stops the timer
  document.getElementById('quick-timer')?.addEventListener('click', () => {
    handleQuickTimer();
  });

  // Quick Note - Opens notes section and focuses input
  document.getElementById('quick-note')?.addEventListener('click', () => {
    handleQuickNote();
  });

  // Customer Search - Opens search interface
  document.getElementById('quick-search')?.addEventListener('click', () => {
    handleCustomerSearch();
  });

  // Template - Shows call templates
  document.getElementById('quick-template')?.addEventListener('click', () => {
    handleCallTemplate();
  });

  // Export - Opens export dialog
  document.getElementById('quick-export')?.addEventListener('click', () => {
    handleExport();
  });

  // Dashboard - Opens customizable dashboard
  document.getElementById('quick-dashboard')?.addEventListener('click', () => {
    handleDashboard();
  });

  // Queue - Shows queue status
  document.getElementById('quick-queue')?.addEventListener('click', () => {
    handleQueueStatus();
  });

  // Team Chat - Opens team collaboration
  document.getElementById('quick-chat')?.addEventListener('click', () => {
    handleTeamChat();
  });

  // Department Lookup - Opens department/phone lookup
  document
    .getElementById('quick-department-lookup')
    ?.addEventListener('click', () => {
      handleDepartmentLookup();
    });
}

function handleNewCall() {
  // Switch to main tab and scroll to call logging section
  document.getElementById('main-tab')?.click();

  // Scroll to and focus on call logging section
  const callLoggingSection = document.getElementById('call-logging');
  if (callLoggingSection) {
    // Expand section if minimized
    if (callLoggingSection.classList.contains('minimized')) {
      callLoggingSection.classList.remove('minimized');
      const content = callLoggingSection.querySelector('.section-content');
      if (content) {
        content.style.display = '';
        content.setAttribute('aria-hidden', 'false');
      }
      const btn = callLoggingSection.querySelector('.minimize-btn');
      if (btn) {
        btn.textContent = '−';
        btn.title = 'Minimize';
        btn.setAttribute('aria-expanded', 'true');
      }
    }

    callLoggingSection.scrollIntoView({ behavior: 'smooth' });

    // Focus on the first input field
    const firstInput = callLoggingSection.querySelector('input, textarea');
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 500);
    }
  }

  showToast('New call form opened', 'info');
}

function handleQuickTimer() {
  // Import timer module dynamically
  import('./timer.js').then(() => {
    const timerSection = document.getElementById('hold-timer');
    if (timerSection) {
      // Expand section if minimized
      if (timerSection.classList.contains('minimized')) {
        timerSection.classList.remove('minimized');
        const content = timerSection.querySelector('.section-content');
        if (content) {
          content.style.display = '';
          content.setAttribute('aria-hidden', 'false');
        }
        const btn = timerSection.querySelector('.minimize-btn');
        if (btn) {
          btn.textContent = '−';
          btn.title = 'Minimize';
          btn.setAttribute('aria-expanded', 'true');
        }
      }

      timerSection.scrollIntoView({ behavior: 'smooth' });
      // Try to start the timer if it's not running
      const startBtn = timerSection.querySelector(
        '.start-timer-btn, .timer-btn'
      );
      if (startBtn && !startBtn.disabled) {
        startBtn.click();
      }
    }
  });

  showToast('Timer section opened', 'info');
}

function handleQuickNote() {
  // Switch to main tab and scroll to notes section
  document.getElementById('main-tab')?.click();

  const notesSection = document.getElementById('notes');
  if (notesSection) {
    // Expand section if minimized
    if (notesSection.classList.contains('minimized')) {
      notesSection.classList.remove('minimized');
      const content = notesSection.querySelector('.section-content');
      if (content) {
        content.style.display = '';
        content.setAttribute('aria-hidden', 'false');
      }
      const btn = notesSection.querySelector('.minimize-btn');
      if (btn) {
        btn.textContent = '−';
        btn.title = 'Minimize';
        btn.setAttribute('aria-expanded', 'true');
      }
    }

    notesSection.scrollIntoView({ behavior: 'smooth' });

    // Focus on the note input
    const noteInput = notesSection.querySelector('#note-input, textarea');
    if (noteInput) {
      setTimeout(() => noteInput.focus(), 500);
    }
  }

  showToast('Notes section opened', 'info');
}

function handleCustomerSearch() {
  // Import and open customer search modal
  import('./customer-search.js').then((search) => {
    search.openCustomerSearch();
  });
}

function handleCallTemplate() {
  // Switch to main tab and scroll to script library section
  document.getElementById('main-tab')?.click();

  const scriptsSection = document.getElementById('script-library');
  if (scriptsSection) {
    // Expand section if minimized
    if (scriptsSection.classList.contains('minimized')) {
      scriptsSection.classList.remove('minimized');
      const content = scriptsSection.querySelector('.section-content');
      if (content) {
        content.style.display = '';
        content.setAttribute('aria-hidden', 'false');
      }
      const btn = scriptsSection.querySelector('.minimize-btn');
      if (btn) {
        btn.textContent = '−';
        btn.title = 'Minimize';
        btn.setAttribute('aria-expanded', 'true');
      }
    }

    scriptsSection.scrollIntoView({ behavior: 'smooth' });
  }

  showToast('Call templates opened', 'info');
}

function handleExport() {
  // Open export dialog
  import('./export-functionality.js').then((exportModule) => {
    exportModule.openExportModal();
  });
}

function handleDashboard() {
  // Switch to stats tab for dashboard
  document.getElementById('stats-tab')?.click();

  const analyticsSection = document.getElementById('analytics-dashboard');
  if (analyticsSection) {
    // Expand section if minimized
    if (analyticsSection.classList.contains('minimized')) {
      analyticsSection.classList.remove('minimized');
      const content = analyticsSection.querySelector('.section-content');
      if (content) {
        content.style.display = '';
        content.setAttribute('aria-hidden', 'false');
      }
      const btn = analyticsSection.querySelector('.minimize-btn');
      if (btn) {
        btn.textContent = '−';
        btn.title = 'Minimize';
        btn.setAttribute('aria-expanded', 'true');
      }
    }

    analyticsSection.scrollIntoView({ behavior: 'smooth' });
  }

  showToast('Dashboard opened', 'info');
}

function handleQueueStatus() {
  // For now, show a placeholder - this will be expanded with real-time queue
  showToast('Queue status feature coming soon!', 'info');
}

function handleTeamChat() {
  // For now, show a placeholder - this will be expanded with collaboration
  showToast('Team chat feature coming soon!', 'info');
}

function handleDepartmentLookup() {
  // Import department lookup module dynamically
  import('./department-lookup.js')
    .then((deptModule) => {
      deptModule.openDepartmentLookupModal();
    })
    .catch((err) => {
      console.error('Failed to load department lookup module:', err);
      showToast('Department lookup feature not available', 'error');
    });
}

// Import showToast for notifications
import { showToast } from '../utils/toast.js';
