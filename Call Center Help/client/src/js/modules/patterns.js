// Number pattern formatter module
import { savePatterns, loadPatterns, loadData, saveData } from './storage.js';
import { showToast } from '../utils/toast.js';

export let patterns = [
  { id: 1, start: '81', minLength: 10, format: '@XXX-XXX-XXXX' },
  { id: 2, start: '', minLength: 10, format: '@XXX-XXX-XXXX' },
  { id: 3, start: '', minLength: 9, format: '#XXXXXXXXX' },
];

export let nextPatternId = 4;
export let editingPatternId = null;
export let lastDeletedPattern = null; // { pattern, index, timeoutId }

// Timeout map for debounced history saving (per root element)
const historySaveTimeouts = new Map();

// State for history display
let showAllHistory = false;

// Helper to get all relevant document roots (main window + popups)
function getAllRoots() {
  const roots = new Set();
  try {
    roots.add(document);
  } catch {
    /* ignore */
  }

  // Check for floating manager in current window
  if (window.floatingManager && window.floatingManager.browserWindows) {
    window.floatingManager.browserWindows.forEach((win) => {
      if (!win.closed && win.document) {
        roots.add(win.document);
      }
    });
  }

  // Check if we are a child window
  if (window.opener) {
    try {
      if (window.opener.document) roots.add(window.opener.document);
      if (
        window.opener.floatingManager &&
        window.opener.floatingManager.browserWindows
      ) {
        window.opener.floatingManager.browserWindows.forEach((win) => {
          if (!win.closed && win.document) {
            roots.add(win.document);
          }
        });
      }
    } catch {
      /* ignore security errors */
    }
  }
  return Array.from(roots);
}

export function initializePatterns() {
  const savedPatterns = loadPatterns();
  if (savedPatterns.length > 0) {
    patterns = savedPatterns;
    nextPatternId = Math.max(...patterns.map((p) => p.id)) + 1;
  }
  updatePatternTable();

  // Expose module for testing and keyboard shortcuts
  window.patternsModule = {
    initializePatterns,
    updatePatternTable,
    addPattern,
    deletePattern,
    startEditPattern,
    saveEditPattern,
    cancelEditPattern,
    reorderPattern,
    formatNumber,
    displayHistory,
  };

  // Expose patterns state for keyboard shortcuts
  window.patterns = {
    patterns,
    lastDeletedPattern,
    savePatterns,
    updatePatternTable,
  };
}

export function updatePatternTable(specificRoot) {
  // Update all visible pattern lists within the page (and popups)
  let roots = [];
  if (specificRoot) {
    roots = [specificRoot];
  } else {
    roots = getAllRoots();
  }

  roots.forEach((root) => {
    const tbodies = root.querySelectorAll(
      'tbody#patternList, tbody[id$="-patternList"]'
    );
    if (!tbodies || tbodies.length === 0) return;

    tbodies.forEach((tbody) => {
      tbody.innerHTML = '';
      patterns.forEach((pattern) => {
        const row = document.createElement('tr');
        row.setAttribute('draggable', 'true');
        row.setAttribute('data-pattern-id', pattern.id);
        row.innerHTML = `
        <td class="drag-cell" aria-hidden="true">⣿</td>
        <td class="start-cell">${pattern.start || '(none)'}</td>
        <td class="minlen-cell">${pattern.minLength}</td>
        <td class="format-cell">${pattern.format}</td>
        <td class="row-actions">
          <button class="edit-pattern-btn" data-pattern-id="${pattern.id}" aria-label="Edit pattern">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button class="delete-pattern-btn" data-pattern-id="${pattern.id}" aria-label="Delete pattern">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </td>
      `;
        tbody.appendChild(row);
      });

      // Attach event listeners for edit/move/delete buttons inside this tbody
      tbody.querySelectorAll('.edit-pattern-btn').forEach((btn) => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener('click', function () {
          const id = parseInt(this.getAttribute('data-pattern-id'));
          startEditPattern(id, this.closest('tbody'));
        });
      });

      tbody.querySelectorAll('.delete-pattern-btn').forEach((btn) => {
        // Remove existing listeners by cloning if necessary to avoid duplicates
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener('click', async function () {
          const id = parseInt(this.getAttribute('data-pattern-id'));
          try {
            let confirmed = false;
            try {
              const modalModule = await import('../utils/modal.js');
              if (
                modalModule &&
                typeof modalModule.showConfirmModal === 'function'
              ) {
                confirmed = await modalModule.showConfirmModal({
                  title: 'Delete Pattern',
                  message:
                    'Are you sure you want to delete this pattern? This action can be undone for 5 seconds.',
                  confirmLabel: 'Delete',
                  cancelLabel: 'Cancel',
                  danger: true,
                });
              } else {
                confirmed = window.confirm(
                  'Are you sure you want to delete this pattern?'
                );
              }
            } catch (impErr) {
              console.warn(
                'Modal import failed, falling back to window.confirm',
                impErr
              );
              confirmed = window.confirm(
                'Are you sure you want to delete this pattern?'
              );
            }

            if (confirmed) {
              deletePattern(id, { undoable: true });
              try {
                showToast('Pattern removed', 'info');
              } catch (e) {
                console.warn('showToast failed', e);
              }
            }
          } catch (error) {
            console.error('Error handling delete pattern click:', error);
          }
        });
      });
      // Insert placeholder row for empty patterns
      if (patterns.length === 0) {
        const row = document.createElement('tr');
        row.className = 'no-patterns';
        row.innerHTML = `<td colspan="4" class="text-muted">No patterns configured yet. Add a pattern using the fields above.</td>`;
        tbody.appendChild(row);
      }

      // Drag and drop handlers for reorder
      tbody.querySelectorAll('tr[draggable="true"]').forEach((row) => {
        row.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData(
            'text/plain',
            row.getAttribute('data-pattern-id')
          );
          e.dataTransfer.effectAllowed = 'move';
          row.classList.add('dragging');
        });
        row.addEventListener('dragend', () => {
          row.classList.remove('dragging');
        });
        row.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        });
        row.addEventListener('drop', (e) => {
          e.preventDefault();
          const srcId = parseInt(e.dataTransfer.getData('text/plain'));
          const dstId = parseInt(row.getAttribute('data-pattern-id'));
          if (srcId && dstId && srcId !== dstId) {
            reorderPatternById(srcId, dstId);
            showToast('Pattern reordered', 'info');
          }
        });
      });
    });
  });
}

export function addPattern(root = document) {
  const getElement = (r, id) => {
    if (!r) return null;
    if (typeof r.getElementById === 'function') {
      return (
        r.getElementById(id) ||
        r.querySelector(`#${id}`) ||
        r.querySelector(`[id$="${id}"]`)
      );
    }
    return r.querySelector(`#${id}`) || r.querySelector(`[id$="${id}"]`);
  };

  const start = (
    getElement(root, 'startSequence') || { value: '' }
  ).value.trim();
  const minLength = parseInt(
    (getElement(root, 'minLength') || { value: '' }).value
  );
  const format = (
    getElement(root, 'formatPattern') || { value: '' }
  ).value.trim();

  if (isNaN(minLength) || minLength < 1) {
    alert('Please enter a valid minimum length.');
    return;
  }

  patterns.push({
    id: nextPatternId++,
    start,
    minLength,
    format,
  });
  savePatterns(patterns);
  updatePatternTable();
  showToast('Pattern added', 'success');

  // Clear inputs scoped to the root
  try {
    if (getElement(root, 'startSequence'))
      getElement(root, 'startSequence').value = '';
  } catch {
    /* ignore */
  }
  try {
    if (getElement(root, 'minLength')) getElement(root, 'minLength').value = '';
  } catch {
    /* ignore */
  }
  try {
    if (getElement(root, 'formatPattern'))
      getElement(root, 'formatPattern').value = '';
  } catch {
    /* ignore */
  }
}

export function reorderPattern(id, delta) {
  const idx = patterns.findIndex((p) => p.id === id);
  if (idx < 0) return;
  const newIndex = Math.max(0, Math.min(patterns.length - 1, idx + delta));
  if (newIndex === idx) return;
  const [item] = patterns.splice(idx, 1);
  patterns.splice(newIndex, 0, item);
  savePatterns(patterns);
  updatePatternTable();
}

export function reorderPatternById(srcId, dstId) {
  const srcIdx = patterns.findIndex((p) => p.id === srcId);
  const dstIdx = patterns.findIndex((p) => p.id === dstId);
  if (srcIdx < 0 || dstIdx < 0) return;
  const [item] = patterns.splice(srcIdx, 1);
  patterns.splice(dstIdx, 0, item);
  savePatterns(patterns);
  updatePatternTable();
}

export function startEditPattern(id, root = document) {
  // Replace row with input fields (inline edit)
  editingPatternId = id;
  let tbody = null;
  if (root && root.tagName === 'TBODY') tbody = root;
  else
    tbody =
      (root &&
        root.querySelector &&
        (root.querySelector('tbody#patternList') ||
          root.querySelector('tbody[id$="-patternList"]'))) ||
      document.querySelector('tbody#patternList') ||
      document.querySelector('tbody[id$="-patternList"]');
  if (!tbody) return;
  const row = tbody.querySelector(`tr[data-pattern-id="${id}"]`);
  if (!row) return;
  const pattern = patterns.find((p) => p.id === id);
  if (!pattern) return;
  row.innerHTML = `
    <td class="drag-cell" aria-hidden="true">⣿</td>
    <td><input type="text" class="edit-start" value="${pattern.start || ''}" aria-label="Starting Digits"/></td>
    <td><input type="number" class="edit-minlength" value="${pattern.minLength}" min="1" aria-label="Minimum Length"/></td>
    <td><input type="text" class="edit-format" value="${pattern.format}" aria-label="Format Pattern"/></td>
    <td>
      <button class="save-edit-btn" data-pattern-id="${pattern.id}" aria-label="Save">Save</button>
      <button class="cancel-edit-btn" data-pattern-id="${pattern.id}" aria-label="Cancel">Cancel</button>
    </td>
  `;

  // Attach handlers for save and cancel
  row
    .querySelector('.save-edit-btn')
    ?.addEventListener('click', () => saveEditPattern(id, root));
  row
    .querySelector('.cancel-edit-btn')
    ?.addEventListener('click', () => cancelEditPattern(root));
  // Focus first input for better keyboard accessibility
  try {
    row.querySelector('.edit-start')?.focus();
    row.querySelector('.edit-start')?.select();
  } catch {
    /* ignore */
  }
}

export function saveEditPattern(id, root = document) {
  let tbody = null;
  if (root && root.tagName === 'TBODY') tbody = root;
  else
    tbody =
      (root &&
        root.querySelector &&
        (root.querySelector('tbody#patternList') ||
          root.querySelector('tbody[id$="-patternList"]'))) ||
      document.querySelector('tbody#patternList') ||
      document.querySelector('tbody[id$="-patternList"]');
  if (!tbody) return;
  const row = tbody.querySelector(`tr[data-pattern-id="${id}"]`);
  if (!row) return;
  const start = row.querySelector('.edit-start')?.value || '';
  const minLength = parseInt(
    row.querySelector('.edit-minlength')?.value || '0'
  );
  const format = row.querySelector('.edit-format')?.value || '';
  if (isNaN(minLength) || minLength < 1) {
    alert('Please enter a valid minimum length.');
    return;
  }
  const patternIndex = patterns.findIndex((p) => p.id === id);
  if (patternIndex >= 0) {
    patterns[patternIndex].start = start;
    patterns[patternIndex].minLength = minLength;
    patterns[patternIndex].format = format;
    savePatterns(patterns);
    editingPatternId = null;
    updatePatternTable();
    showToast('Pattern updated', 'success');
  }
}

export function cancelEditPattern() {
  editingPatternId = null;
  updatePatternTable();
}

export function deletePattern(id, options = { undoable: true }) {
  const idx = patterns.findIndex((p) => p.id === id);
  if (idx < 0) return;
  // If there's an existing pending delete, finalize it first
  if (lastDeletedPattern && lastDeletedPattern.timeoutId) {
    window.clearTimeout(lastDeletedPattern.timeoutId);
    lastDeletedPattern.timeoutId = null;
    lastDeletedPattern = null;
  }
  const pattern = patterns[idx];
  // Remove immediately from view & storage for UX immediacy
  patterns.splice(idx, 1);
  savePatterns(patterns);
  updatePatternTable();

  if (options && options.undoable) {
    // Keep pattern in memory until timeout expires
    let timeoutId = null;
    lastDeletedPattern = {
      pattern: { ...pattern },
      index: idx,
      timeoutId: null,
    };
    // Show toast with Undo action
    showToast(`Pattern deleted`, {
      type: 'info',
      timeout: 5000,
      actionLabel: 'Undo',
      actionCallback: () => {
        console.debug('Patterns: undo action callback invoked');
        // Cancel the timeout
        try {
          if (lastDeletedPattern && lastDeletedPattern.timeoutId)
            window.clearTimeout(lastDeletedPattern.timeoutId);
        } catch {
          /* ignore */
        }
        // Restore
        if (lastDeletedPattern) {
          patterns.splice(
            lastDeletedPattern.index,
            0,
            lastDeletedPattern.pattern
          );
          savePatterns(patterns);
          updatePatternTable();
          showToast('Pattern restored', { type: 'success' });
        }
        lastDeletedPattern = null;
      },
    });

    // After timeout, finalize deletion (clear lastDeletedPattern)
    timeoutId = window.setTimeout(() => {
      lastDeletedPattern = null;
    }, 5000);
    if (lastDeletedPattern) lastDeletedPattern.timeoutId = timeoutId;
  } else {
    // Not undoable, finalize immediately
    lastDeletedPattern = null;
  }
}

export function formatNumber(root = document) {
  const getElement = (r, id) => {
    if (!r) return null;
    if (typeof r.getElementById === 'function') {
      return (
        r.getElementById(id) ||
        r.querySelector(`#${id}`) ||
        r.querySelector(`[id$="${id}"]`)
      );
    }
    return r.querySelector(`#${id}`) || r.querySelector(`[id$="${id}"]`);
  };

  const inputEl = getElement(root, 'patternNumberInput');
  const copyButton = getElement(root, 'copyPatternBtn');
  const resultDiv = getElement(root, 'patternResult');
  if (!inputEl || !resultDiv) return;

  const originalDigits = (inputEl.value || '').replace(/\D/g, '');
  const result = formatDigits(originalDigits);

  resultDiv.textContent = result;
  const autoCopy = loadData('autoCopyPattern', true);
  if (result && result !== 'No matching pattern found') {
    // Debounced save to history (3 seconds delay)
    scheduleHistorySave(root, originalDigits, result);
    if (copyButton) {
      copyButton.style.display = 'inline-block';
      copyButton.disabled = false;
    }
    if (autoCopy) {
      copyResult(root); // <-- Only auto-copy if enabled
    }
  } else {
    // Clear any pending history save timeout since input is invalid
    clearHistorySaveTimeout(root);
    if (copyButton) {
      copyButton.style.display = 'none';
      copyButton.disabled = true;
    }
  }
}

// History management functions

// History management functions
function scheduleHistorySave(root, input, result) {
  // Clear any existing timeout for this root
  const rootKey = root === document ? 'document' : root.id || root;
  const existingTimeout = historySaveTimeouts.get(rootKey);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  // Set a new timeout to save after 3 seconds
  const timeoutId = setTimeout(() => {
    saveToHistory(input, result);
    displayHistory(root);
    historySaveTimeouts.delete(rootKey);
  }, 3000);

  historySaveTimeouts.set(rootKey, timeoutId);
}

function clearHistorySaveTimeout(root) {
  const rootKey = root === document ? 'document' : root.id || root;
  const existingTimeout = historySaveTimeouts.get(rootKey);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
    historySaveTimeouts.delete(rootKey);
  }
}

function saveToHistory(input, result) {
  const history = loadData('patternHistory', []);
  const entry = {
    input,
    result,
    timestamp: Date.now(),
  };

  // Remove duplicates (same input and result)
  const filtered = history.filter(
    (item) => !(item.input === input && item.result === result)
  );

  // Add new entry at the beginning
  filtered.unshift(entry);

  // Keep only the last 50 entries
  const trimmed = filtered.slice(0, 50);

  saveData('patternHistory', trimmed);
}

export function loadHistory() {
  return loadData('patternHistory', []);
}

export function clearHistory() {
  saveData('patternHistory', []);
}

export function deleteHistoryItem(index) {
  try {
    console.debug('deleteHistoryItem called with index:', index);
    const history = loadData('patternHistory', []);
    console.debug(
      'Current history length:',
      Array.isArray(history) ? history.length : typeof history
    );
    if (!Array.isArray(history)) return;
    if (index >= 0 && index < history.length) {
      history.splice(index, 1);
      try {
        saveData('patternHistory', history);
        console.debug(
          'History saved after delete, new length:',
          history.length
        );
      } catch (saveErr) {
        console.error('Failed to save history after delete:', saveErr);
      }
    } else {
      console.debug('deleteHistoryItem: index out of range', index);
    }
  } catch (err) {
    console.error('deleteHistoryItem unexpected error:', err);
  }
}

export function displayHistory(root = document) {
  const history = loadHistory();
  const historyContainer =
    root.querySelector('#patternHistory') ||
    root.querySelector('[id$="-patternHistory"]');
  if (!historyContainer) return;

  if (history.length === 0) {
    historyContainer.innerHTML =
      '<p class="no-history">No formatting history yet</p>';
    return;
  }

  // Limit history display if not showing all
  const displayList = showAllHistory ? history : history.slice(-10);
  const hasMore = !showAllHistory && history.length > 10;
  const startIndex = showAllHistory ? 0 : Math.max(0, history.length - 10);

  const historyList = displayList
    .map(
      (entry, index) => `
    <div class="history-item" data-index="${startIndex + index}">
      <div class="history-input">${entry.input}</div>
      <div class="history-arrow">→</div>
      <div class="history-result">${entry.result}</div>
      <div class="history-actions">
        <button class="history-use-btn" title="Use this result">Use</button>
        <button class="history-delete-btn" title="Delete this entry">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </div>
    </div>
  `
    )
    .join('');

  historyContainer.innerHTML = `
    <div class="history-header">
      <h4>Recent Formats ${hasMore ? `(${displayList.length} of ${history.length})` : ''}</h4>
      <div class="history-controls">
        ${hasMore ? '<button id="toggleHistoryBtn" class="button btn-secondary">Show All</button>' : showAllHistory ? '<button id="toggleHistoryBtn" class="button btn-secondary">Show Recent</button>' : ''}
        <button id="clearHistoryBtn" class="button btn-secondary">Clear History</button>
      </div>
    </div>
    <div class="history-list">
      ${historyList}
    </div>
  `;

  // Add event listeners
  historyContainer.querySelectorAll('.history-use-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.closest('.history-item').dataset.index);
      const entry = history[index];
      const inputEl = root.querySelector('#patternNumberInput');
      const resultDiv = root.querySelector('#patternResult');
      if (inputEl) inputEl.value = entry.input;
      if (resultDiv) resultDiv.textContent = entry.result;
      // Trigger format to update UI
      formatNumber(root);
    });
  });

  historyContainer.querySelectorAll('.history-delete-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      try {
        console.debug('history-delete-btn clicked, event target:', e.target);
        const itemEl = e.target.closest && e.target.closest('.history-item');
        if (!itemEl) {
          console.warn(
            'history-delete-btn: could not locate .history-item from event target',
            e.target
          );
        }
        const index = itemEl ? parseInt(itemEl.dataset.index, 10) : NaN;
        console.debug('history-delete-btn resolved index:', index);
        if (isNaN(index)) return;

        // Try dynamic import of modal helper, but be defensive if not available
        let confirmed = false;
        try {
          console.debug(
            'Patterns: attempting to import modal for history delete'
          );
          const modalModule = await import('../utils/modal.js');
          console.debug('Patterns: modalModule loaded', modalModule);
          if (
            modalModule &&
            typeof modalModule.showConfirmModal === 'function'
          ) {
            console.debug('Patterns: calling modalModule.showConfirmModal');
            confirmed = await modalModule.showConfirmModal({
              title: 'Delete History Entry',
              message: 'Are you sure you want to delete this history entry?',
              confirmLabel: 'Delete',
              cancelLabel: 'Cancel',
              danger: true,
            });
            console.debug('Patterns: modal confirmed result', confirmed);
          } else {
            console.debug(
              'Patterns: modalModule.showConfirmModal not a function, falling back to window.confirm',
              typeof modalModule.showConfirmModal
            );
            // Fallback to simple confirm
            confirmed = window.confirm('Delete this history entry?');
          }
        } catch (impErr) {
          // If import fails for any reason, fallback to window.confirm
          console.warn(
            'Modal import failed, falling back to window.confirm',
            impErr
          );
          confirmed = window.confirm('Delete this history entry?');
        }

        if (confirmed) {
          try {
            console.debug('Confirmed delete for index', index);
            deleteHistoryItem(index);
          } catch (delErr) {
            console.error('Error while deleting history item (sync):', delErr);
          }
          // Update the display
          setTimeout(() => {
            try {
              displayHistory();
            } catch (dispErr) {
              console.error('displayHistory failed after delete:', dispErr);
            }
          }, 0);
        }
      } catch (error) {
        console.error('Error deleting history item:', error);
      }
    });
  });

  const clearBtn = historyContainer.querySelector('#clearHistoryBtn');
  if (clearBtn) {
    // Remove any existing event listeners by cloning
    const newClearBtn = clearBtn.cloneNode(true);
    clearBtn.parentNode.replaceChild(newClearBtn, clearBtn);

    newClearBtn.addEventListener('click', async () => {
      try {
        const modalModule = await import('../utils/modal.js');
        const confirmFn =
          (modalModule &&
            typeof modalModule.showConfirmModal === 'function' &&
            modalModule.showConfirmModal) ||
          window.showConfirmModal ||
          ((opts) =>
            Promise.resolve(
              window.confirm(
                opts && opts.message ? opts.message : 'Are you sure?'
              )
            ));
        const confirmed = await confirmFn({
          title: 'Clear History',
          message:
            'Are you sure you want to clear all formatting history? This action cannot be undone.',
          confirmLabel: 'Clear History',
          cancelLabel: 'Cancel',
          danger: true,
        });
        if (confirmed) {
          clearHistory();
          // Update the display to show empty history
          const historyContainer = document.querySelector('#patternHistory');
          if (historyContainer) {
            historyContainer.innerHTML =
              '<p class="no-history">No formatting history yet</p>';
          }
        }
      } catch (error) {
        console.error('Error clearing history:', error);
        try {
          if (
            window.confirm(
              'Are you sure you want to clear all formatting history? This action cannot be undone.'
            )
          ) {
            clearHistory();
            const historyContainer = document.querySelector('#patternHistory');
            if (historyContainer)
              historyContainer.innerHTML =
                '<p class="no-history">No formatting history yet</p>';
          }
        } catch (e) {
          console.error('Clear history fallback also failed', e);
        }
      }
    });
  }

  const toggleBtn = historyContainer.querySelector('#toggleHistoryBtn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      showAllHistory = !showAllHistory;
      displayHistory(root);
    });
  }
}

// Pure function: format a digits-only string using the configured patterns
export function formatDigits(originalDigits) {
  let result = 'No matching pattern found';
  // Sort patterns by specificity (longest start, then longest format)
  const sortedPatterns = [...patterns].sort((a, b) => {
    const startDiff = (b.start?.length || 0) - (a.start?.length || 0);
    if (startDiff !== 0) return startDiff;
    return b.format.length - a.format.length;
  });

  for (const pattern of sortedPatterns) {
    let digits = originalDigits;
    // Enforce start sequence if defined
    if (pattern.start && pattern.start.length > 0) {
      if (!digits.startsWith(pattern.start)) continue;
      digits = digits.slice(pattern.start.length);
    }
    // Only match if there are exactly minLength digits after the start
    if (digits.length !== pattern.minLength) continue;

    let formatted = '';
    let digitIndex = 0;
    for (let i = 0; i < pattern.format.length; i++) {
      const char = pattern.format[i];
      if ((char === '@' || char === '#') && digitIndex < digits.length) {
        formatted += char + digits[digitIndex++];
        // Skip the next X, since the prefix digit is already used
        if (pattern.format[i + 1] === 'X' || pattern.format[i + 1] === 'x') {
          i++;
        }
      } else if ((char === 'X' || char === 'x') && digitIndex < digits.length) {
        formatted += digits[digitIndex++];
      } else {
        formatted += char;
      }
    }
    result = formatted;
    break;
  }

  return result;
}

export function copyResult(root = document) {
  const getElement = (r, id) => {
    if (!r) return null;
    if (typeof r.getElementById === 'function') {
      return (
        r.getElementById(id) ||
        r.querySelector(`#${id}`) ||
        r.querySelector(`[id$="${id}"]`)
      );
    }
    return r.querySelector(`#${id}`) || r.querySelector(`[id$="${id}"]`);
  };
  const resultEl = getElement(root, 'patternResult');
  const resultText = resultEl ? resultEl.textContent : '';
  if (
    resultText &&
    resultText !== 'No matching pattern found' &&
    resultText !== 'Result will appear here'
  ) {
    // Try Clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard
        .writeText(resultText)
        .then(showCopiedMsg, fallbackCopy);
    } else {
      fallbackCopy();
    }
  }

  function fallbackCopy() {
    // Fallback: create a temporary textarea
    const textarea = document.createElement('textarea');
    textarea.value = resultText;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      showCopiedMsg();
    } catch {
      alert('Copy failed. Please copy manually.');
    }
    document.body.removeChild(textarea);
  }

  function showCopiedMsg() {
    let copiedMsg = document.getElementById('pattern-copied-msg');
    if (!copiedMsg) {
      copiedMsg = document.createElement('span');
      copiedMsg.id = 'pattern-copied-msg';
      copiedMsg.style.marginLeft = '10px';
      copiedMsg.style.color = '#16a34a';
      copiedMsg.style.fontWeight = 'bold';
      const copyBtn =
        getElement(root, 'copyPatternBtn') ||
        document.getElementById('copyPatternBtn');
      if (copyBtn && copyBtn.parentNode) {
        copyBtn.parentNode.insertBefore(copiedMsg, copyBtn.nextSibling);
      }
    }
    copiedMsg.textContent = 'Copied!';
    copiedMsg.style.display = 'inline';
    setTimeout(() => {
      copiedMsg.style.display = 'none';
    }, 1500);
  }
}

export function clearPattern(root = document) {
  const getElement = (r, id) => {
    if (!r) return null;
    if (typeof r.getElementById === 'function') {
      return (
        r.getElementById(id) ||
        r.querySelector(`#${id}`) ||
        r.querySelector(`[id$="${id}"]`)
      );
    }
    return r.querySelector(`#${id}`) || r.querySelector(`[id$="${id}"]`);
  };

  const input = getElement(root, 'patternNumberInput');
  const result = getElement(root, 'patternResult');
  const copyBtn = getElement(root, 'copyPatternBtn');
  // Clear any pending history save timeout
  clearHistorySaveTimeout(root);
  if (input) input.value = '';
  if (result) result.textContent = 'Result will appear here';
  if (copyBtn) copyBtn.disabled = true;
}

// Exported helper for pasting so tests or other code can call directly
export async function pasteFromClipboard(providedText, root = document) {
  const getElement = (r, id) => {
    if (!r) return null;
    if (typeof r.getElementById === 'function') {
      return (
        r.getElementById(id) ||
        r.querySelector(`#${id}`) ||
        r.querySelector(`[id$="${id}"]`)
      );
    }
    return r.querySelector(`#${id}`) || r.querySelector(`[id$="${id}"]`);
  };
  const numberInputLocal = getElement(root, 'patternNumberInput');
  let text = providedText || '';
  // Try Clipboard API first
  if (!text && navigator.clipboard && navigator.clipboard.readText) {
    try {
      text = await navigator.clipboard.readText();
    } catch {
      text = '';
    }
  }
  if (!text) {
    try {
      if (typeof window.prompt === 'function') {
        text = window.prompt('Paste number here:') || '';
      }
    } catch {
      text = '';
    }
  }
  if (text && numberInputLocal) {
    const normalized = normalizeNumber(text);
    numberInputLocal.value = normalized || text;
    formatNumber(root);
    return normalized || text;
  }
  return '';
}

// Small utility to normalize arbitrary pasted input to digits-only
export function normalizeNumber(text) {
  if (!text) return '';
  return text.replace(/[\s()\-+.]/g, '').replace(/[^0-9]/g, '');
}

// Ensure this function is exported for dynamic import
// Attach listeners scoped to a root element (defaults to document)
export function attachPatternEventListeners(root = document) {
  // Avoid double-attaching to the same root
  try {
    if (
      root &&
      root.getAttribute &&
      root.getAttribute('data-patterns-attached') === 'true'
    ) {
      return;
    }
  } catch {
    /* ignore */
  }
  // Tabs within the root - No longer needed since tabs were removed
  const getElement = (r, id) => {
    if (!r) return null;
    if (typeof r.getElementById === 'function') {
      return (
        r.getElementById(id) ||
        r.querySelector(`#${id}`) ||
        r.querySelector(`[id$="${id}"]`)
      );
    }
    return r.querySelector(`#${id}`) || r.querySelector(`[id$="${id}"]`);
  };

  // Inputs and buttons scoped to the root
  const numberInput = getElement(root, 'patternNumberInput');
  const copyBtn = getElement(root, 'copyPatternBtn');

  if (numberInput) {
    try {
      numberInput.addEventListener('input', () => formatNumber(root));
    } catch {
      /* ignore */
    }
  }
  if (copyBtn) {
    try {
      copyBtn.addEventListener('click', () => copyResult(root));
    } catch {
      /* ignore */
    }
  }

  const pasteBtn = getElement(root, 'pastePatternBtn');
  if (pasteBtn) {
    try {
      pasteBtn.addEventListener('click', () => {
        pasteFromClipboard(undefined, root);
      });
    } catch {
      /* ignore */
    }
    // Tooltip show/hide for accessibility
    const tooltip = pasteBtn
      .closest('.tooltip-wrapper')
      ?.querySelector('.tooltip-text');
    if (tooltip) {
      pasteBtn.addEventListener('mouseenter', () => {
        tooltip.style.visibility = 'visible';
        tooltip.setAttribute('aria-hidden', 'false');
      });
      pasteBtn.addEventListener('mouseleave', () => {
        tooltip.style.visibility = 'hidden';
        tooltip.setAttribute('aria-hidden', 'true');
      });
      pasteBtn.addEventListener('focus', () => {
        tooltip.style.visibility = 'visible';
        tooltip.setAttribute('aria-hidden', 'false');
      });
      pasteBtn.addEventListener('blur', () => {
        tooltip.style.visibility = 'hidden';
        tooltip.setAttribute('aria-hidden', 'true');
      });
    }
  }

  const formatBtn = getElement(root, 'formatPatternBtn');
  if (formatBtn) {
    try {
      formatBtn.addEventListener('click', () => formatNumber(root));
    } catch {
      /* ignore */
    }
  }

  const clearBtn = getElement(root, 'clearPatternBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => clearPattern(root));
  }

  const addBtn = getElement(root, 'addPatternBtn');
  if (addBtn) {
    try {
      addBtn.addEventListener('click', () => addPattern(root));
    } catch {
      /* ignore */
    }
  }
  // Ensure update pattern table attaches all event handlers and DnD
  try {
    updatePatternTable(root);
  } catch {
    /* ignore */
  }
  // Display history
  try {
    displayHistory(root);
  } catch {
    /* ignore */
  }
  try {
    if (root && root.setAttribute) {
      root.setAttribute('data-patterns-attached', 'true');
    }
  } catch {
    /* ignore */
  }
}

// Backwards-compatible default that wires the document root
export function setupPatternEventListeners() {
  attachPatternEventListeners(document);
  // Initialize patterns on load
}

// Tab switching function no longer needed - patterns moved to settings page
// function openPatternTab(tabId, event, root = document) {
//   const base = root || document;
//   const tabButtons = base.querySelectorAll('.tab-button');
//   const tabContents = base.querySelectorAll('.tab-content');
//   tabContents.forEach((tab) => tab.classList.remove('active'));
//   tabButtons.forEach((button) => button.classList.remove('active'));
//   let activeTab = base.querySelector(`#${tabId}`) || base.querySelector(`[id$="${tabId}"]`) || base.querySelector(`[data-pattern-tab="${tabId}"]`);
//   if (activeTab) activeTab.classList.add('active');
//   if (event && event.currentTarget) event.currentTarget.classList.add('active');
// }
