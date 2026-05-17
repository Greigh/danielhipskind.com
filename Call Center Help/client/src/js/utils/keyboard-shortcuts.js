// Keyboard shortcuts utility
// Global keyboard shortcuts for enhanced productivity

// Shortcut registry
const shortcuts = new Map();

// Register a keyboard shortcut
export function registerShortcut(keyCombo, callback, description = '') {
  shortcuts.set(keyCombo.toLowerCase(), { callback, description });
}

// Unregister a keyboard shortcut
export function unregisterShortcut(keyCombo) {
  shortcuts.delete(keyCombo.toLowerCase());
}

// Get all registered shortcuts
export function getAllShortcuts() {
  return Array.from(shortcuts.entries()).map(([combo, { description }]) => ({
    combo,
    description,
  }));
}

// Parse key combination from event
function parseKeyCombo(event) {
  const keys = [];
  if (event.ctrlKey || event.metaKey) keys.push('ctrl');
  if (event.altKey) keys.push('alt');
  if (event.shiftKey) keys.push('shift');
  keys.push(event.key.toLowerCase());
  return keys.join('+');
}

// Setup global keyboard shortcuts
export function setupKeyboardShortcuts() {
  document.addEventListener('keydown', handleKeyDown);

  // Register default shortcuts
  registerShortcut(
    'ctrl+1',
    () => switchToSection('pattern-formatter'),
    'Switch to Pattern Formatter'
  );
  registerShortcut('ctrl+2', () => switchToSection('notes'), 'Switch to Notes');
  registerShortcut(
    'ctrl+3',
    () => switchToSection('call-flow-builder'),
    'Switch to Call Flow'
  );
  registerShortcut(
    'ctrl+4',
    () => switchToSection('hold-timer'),
    'Switch to Timer'
  );
  registerShortcut('ctrl+s', () => showSettings(), 'Open Settings');
  registerShortcut('ctrl+m', () => showMainApp(), 'Return to Main App');
  registerShortcut('ctrl+t', () => toggleTimer(), 'Start/Stop Timer');
  registerShortcut('ctrl+n', () => addNewNote(), 'Add New Note');
  registerShortcut('ctrl+f', () => focusSearch(), 'Focus Search');
  registerShortcut('ctrl+p', () => toggleTheme(), 'Toggle Theme');
  registerShortcut('ctrl+h', () => showHelp(), 'Show Help/Shortcuts');
  registerShortcut('escape', () => closeModals(), 'Close Modals/Dialogs');
  registerShortcut('ctrl+z', () => undoLastAction(), 'Undo Last Action');
  registerShortcut('ctrl+y', () => redoLastAction(), 'Redo Last Action');
}

// Handle keydown events
function handleKeyDown(event) {
  // Don't trigger shortcuts when typing in input fields (except when Ctrl is pressed)
  const activeElement = document.activeElement;
  const isInputField =
    activeElement &&
    (activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.tagName === 'SELECT' ||
      activeElement.contentEditable === 'true');

  // Allow Ctrl+shortcuts even in input fields
  if (isInputField && !event.ctrlKey && !event.metaKey) {
    return;
  }

  const keyCombo = parseKeyCombo(event);
  const shortcut = shortcuts.get(keyCombo);

  if (shortcut) {
    event.preventDefault();
    event.stopPropagation();
    try {
      shortcut.callback();
    } catch (error) {
      console.error('Keyboard shortcut error:', error);
    }
  }
}

// Shortcut action implementations
function switchToSection(sectionId) {
  // Hide all sections
  document.querySelectorAll('.draggable-section').forEach((section) => {
    section.style.display = 'none';
  });

  // Show target section
  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.style.display = '';
    // Scroll into view
    targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Update navigation if present
  const navTabs = document.querySelectorAll('.nav-tab');
  navTabs.forEach((tab) => tab.classList.remove('active'));
  const activeTab = document.querySelector(
    `[data-section="${getSectionKey(sectionId)}"]`
  );
  if (activeTab) activeTab.classList.add('active');
}

function getSectionKey(sectionId) {
  const mapping = {
    'pattern-formatter': 'formatter',
    notes: 'notes',
    'call-flow-builder': 'callflow',
    'hold-timer': 'timer',
  };
  return mapping[sectionId] || sectionId;
}

function showSettings() {
  if (window.showSettings) {
    window.showSettings();
  }
}

function showMainApp() {
  if (window.showMainApp) {
    window.showMainApp();
  }
}

function toggleTimer() {
  // Find timer start/stop button and click it
  const timerBtn = document.querySelector(
    '#hold-timer .timer-btn, #hold-timer button[onclick*="start"], #hold-timer button[onclick*="stop"]'
  );
  if (timerBtn) {
    timerBtn.click();
  }
}

function addNewNote() {
  // Focus on notes input
  const notesInput = document.querySelector(
    '#notes textarea, #notes input[type="text"]'
  );
  if (notesInput) {
    notesInput.focus();
    // Trigger any "add note" functionality
    const addBtn = document.querySelector(
      '#notes .add-note-btn, #notes button[onclick*="addNote"]'
    );
    if (addBtn) {
      addBtn.click();
    }
  }
}

function focusSearch() {
  // Focus on search inputs if they exist
  const searchInput = document.querySelector(
    'input[placeholder*="search"], input[placeholder*="find"]'
  );
  if (searchInput) {
    searchInput.focus();
  }
}

function toggleTheme() {
  if (window.toggleTheme) {
    window.toggleTheme();
  } else {
    // Fallback: toggle data-theme attribute
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  }
}

function showHelp() {
  // Create and show shortcuts help modal
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal" style="max-width: 600px;">
      <div class="modal-header">
        <h3>Keyboard Shortcuts</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
      </div>
      <div class="modal-body">
        <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 10px; font-family: monospace;">
          ${getAllShortcuts()
            .map(
              ({ combo, description }) =>
                `<div>${combo.replace('ctrl', 'Ctrl')}</div><div>${description}</div>`
            )
            .join('')}
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Close on escape
  document.addEventListener('keydown', function closeModal(e) {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', closeModal);
    }
  });
}

function closeModals() {
  // Close any open modals
  document
    .querySelectorAll('.modal-overlay')
    .forEach((modal) => modal.remove());
  // Close floating windows
  if (window.floatingManager) {
    window.floatingManager.floatingWindows.forEach((_, sectionId) => {
      window.floatingManager.dockSection(sectionId);
    });
  }
}

function undoLastAction() {
  // Check if there's a pending pattern deletion to undo
  if (
    window.patterns &&
    window.patterns.lastDeletedPattern &&
    window.patterns.lastDeletedPattern.timeoutId
  ) {
    // Cancel the timeout
    window.clearTimeout(window.patterns.lastDeletedPattern.timeoutId);
    // Restore the pattern
    if (window.patterns.lastDeletedPattern.pattern) {
      window.patterns.patterns.splice(
        window.patterns.lastDeletedPattern.index,
        0,
        window.patterns.lastDeletedPattern.pattern
      );
      window.patterns.savePatterns(window.patterns.patterns);
      window.patterns.updatePatternTable();
      window.showToast('Pattern restored', { type: 'success' });
    }
    window.patterns.lastDeletedPattern = null;
  } else {
    console.log('No action to undo');
  }
}

function redoLastAction() {
  // Basic redo functionality - could be extended per module
  console.log('Redo not implemented yet');
}

// Export for external use
export { shortcuts };
