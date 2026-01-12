// Call flow builder module with checkmarks and clear functionality

// Import the functions from storage.js, but rename the imported saveSteps
import {
  saveData,
  loadData,
  saveSteps as storageSteps,
  loadSteps,
} from './storage.js';

export let steps = [];
export let completedSteps = new Set(); // Track which steps are completed

// Load steps and completed state from storage
export function initializeCallFlow() {
  steps = loadSteps() || [];
  const savedCompletedSteps = loadData('completedSteps', []);
  completedSteps = new Set(savedCompletedSteps);
  renderSteps();
}

// Save completed steps state
function saveCompletedSteps() {
  saveData('completedSteps', Array.from(completedSteps));
}

// Add a new step to the flow
export function addStep() {
  const input = document.getElementById('step-input');
  if (!input) return;
  const stepText = input.value.trim();
  if (stepText && !steps.includes(stepText)) {
    steps.push(stepText);
    storageSteps(steps);
    renderSteps();
    generateFlow(); // Ensure flow view updates after adding
    input.value = '';
    // Switch to the View Flow tab after adding step
    const flowTabButton = document.querySelector(
      '#call-flow-builder .tab-button[data-callflow-tab="flow-tab"]'
    );
    if (flowTabButton) {
      openCallFlowTab('flow-tab', { currentTarget: flowTabButton });
    }
  }
}

// Remove a step
export function removeStep(index) {
  if (index >= 0 && index < steps.length) {
    steps.splice(index, 1);
    // Remove from completed steps if it was checked
    completedSteps.delete(index);
    // Recalculate completed steps indices after removal
    const newCompletedSteps = new Set();
    completedSteps.forEach((oldIndex) => {
      if (oldIndex > index) {
        newCompletedSteps.add(oldIndex - 1);
      } else if (oldIndex < index) {
        newCompletedSteps.add(oldIndex);
      }
    });
    completedSteps = newCompletedSteps;
    storageSteps(steps); // Use renamed imported function
    saveCompletedSteps();
    renderSteps();
  }
}

// Update a step
export function updateStep(index, newText) {
  if (index >= 0 && index < steps.length && newText.trim()) {
    steps[index] = newText.trim();
    storageSteps(steps); // Use renamed imported function
    renderSteps();
  }
}

// Render the editable steps
export function renderSteps() {
  const stepsContainer = document.getElementById('flow-steps');
  if (!stepsContainer) return;

  // Always render the Delete All Steps button and make steps draggable
  stepsContainer.innerHTML = `
    <div class="steps-header">
      <button id="delete-all-steps-btn" class="button btn-danger" ${
        steps.length === 0 ? 'disabled' : ''
      }>Delete All Steps</button>
    </div>
    <div class="draggable-steps-list">
      ${
        steps.length === 0
          ? '<div class="empty-steps-msg">No steps added yet. Use the input above or bulk add to get started.</div>'
          : steps
              .map(
                (step, index) => `
                <div class="flow-step" draggable="true" data-index="${index}">
                    <span class="step-number">${index + 1}.</span>
                    <input type="text" class="step-input" id="step-input-${index}" name="step-input-${index}"
                        value="${step}">
                    <button class="remove-step-btn" id="remove-step-btn-${index}" name="remove-step-btn-${index}">Delete</button>
                    <span class="drag-handle" title="Drag to reorder">☰</span>
                </div>
            `
              )
              .join('')
      }
    </div>
  `;

  // Attach event listeners for edit and remove after rendering
  steps.forEach((_, index) => {
    const input = document.getElementById(`step-input-${index}`);
    const removeBtn = document.getElementById(`remove-step-btn-${index}`);
    if (input) {
      input.addEventListener('change', (e) =>
        updateStep(index, e.target.value)
      );
    }
    if (removeBtn) {
      removeBtn.addEventListener('click', () => removeStep(index));
    }
  });

  // Drag and drop logic for reordering steps
  const stepElems = stepsContainer.querySelectorAll('.flow-step');
  let dragSrcIndex = null;
  stepElems.forEach((stepElem) => {
    stepElem.addEventListener('dragstart', (e) => {
      dragSrcIndex = Number(stepElem.getAttribute('data-index'));
      stepElem.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    stepElem.addEventListener('dragend', () => {
      stepElem.classList.remove('dragging');
    });
    stepElem.addEventListener('dragover', (e) => {
      e.preventDefault();
      stepElem.classList.add('drag-over');
    });
    stepElem.addEventListener('dragleave', () => {
      stepElem.classList.remove('drag-over');
    });
    stepElem.addEventListener('drop', (e) => {
      e.preventDefault();
      stepElem.classList.remove('drag-over');
      const dropIndex = Number(stepElem.getAttribute('data-index'));
      if (dragSrcIndex !== null && dragSrcIndex !== dropIndex) {
        const moved = steps.splice(dragSrcIndex, 1)[0];
        steps.splice(dropIndex, 0, moved);
        storageSteps(steps);
        renderSteps();
        generateFlow();
      }
      dragSrcIndex = null;
    });
  });

  // Attach event listener for Delete All Steps button
  const deleteAllBtn = document.getElementById('delete-all-steps-btn');
  if (deleteAllBtn) {
    deleteAllBtn.addEventListener('click', () => {
      if (steps.length === 0) return;
      (async () => {
        try {
          const modalModule = await import('../utils/modal.js');
          const confirmFn =
            modalModule && typeof modalModule.showConfirmModal === 'function'
              ? modalModule.showConfirmModal
              : window.showConfirmModal ||
                ((opts) =>
                  Promise.resolve(
                    window.confirm(
                      opts && opts.message ? opts.message : 'Are you sure?'
                    )
                  ));
          const confirmed = await confirmFn({
            title: 'Clear All Steps',
            message: 'Are you sure you want to delete all steps?',
            confirmLabel: 'Clear',
            cancelLabel: 'Cancel',
            danger: true,
          });
          if (confirmed) {
            steps.length = 0;
            completedSteps.clear();
            storageSteps(steps);
            saveCompletedSteps();
            renderSteps();
            generateFlow();
          }
        } catch (err) {
          console.warn(
            'Clear all steps confirmation failed, falling back to window.confirm',
            err
          );
          if (window.confirm('Are you sure you want to delete all steps?')) {
            steps.length = 0;
            completedSteps.clear();
            storageSteps(steps);
            saveCompletedSteps();
            renderSteps();
            generateFlow();
          }
        }
      })();
    });
  }
}

// Toggle step completion status
export function toggleStep(index) {
  if (completedSteps.has(index)) {
    completedSteps.delete(index);
  } else {
    completedSteps.add(index);
  }
  saveCompletedSteps();
  generateFlow();
}

// Clear all checkmarks
export function clearCheckmarks() {
  completedSteps.clear();
  saveCompletedSteps();
  generateFlow();
}

// Generate the flow for viewing
export function generateFlow() {
  const flowContainer = document.getElementById('generated-flow');
  if (!flowContainer) return;

  if (steps.length === 0) {
    flowContainer.innerHTML =
      '<div class="empty-steps-msg">No steps added yet. Add steps in the Edit Steps tab to build your call flow.</div>';
    return;
  }

  // Calculate progress
  const completedCount = completedSteps.size;
  const totalSteps = steps.length;
  const progressPercentage =
    totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  flowContainer.innerHTML = `
        <div class="flow-header">
            <h3>Call Flow Guide</h3>
            <button id="clear-checkmarks" class="button btn-secondary">Clear All</button>
        </div>

        <div class="flow-progress">
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progressPercentage}%"></div>
            </div>
            <div class="progress-text">
                <span>${completedCount} of ${totalSteps} steps completed</span>
                <span>${progressPercentage}%</span>
            </div>
        </div>

        <ol class="flow-steps-list">
            ${steps
              .map(
                (step, index) => `
                <li class="flow-step-item ${
                  completedSteps.has(index) ? 'completed' : ''
                }">
                    <div class="step-number">${index + 1}</div>
                    <label class="step-checkbox">
                        <input type="checkbox" id="step-checkbox-${index}" name="step-checkbox-${index}"
                            ${completedSteps.has(index) ? 'checked' : ''}>
                        <span class="checkmark"></span>
                    </label>
                    <span class="step-text">${step}</span>
                </li>
            `
              )
              .join('')}
        </ol>
    `;

  // Attach event listener to clear button
  const clearBtn = document.getElementById('clear-checkmarks');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearCheckmarks);
  }

  // Attach event listeners to checkboxes
  steps.forEach((_, index) => {
    const checkbox = document.getElementById(`step-checkbox-${index}`);
    if (checkbox) {
      checkbox.addEventListener('change', () => toggleStep(index));
    }
  });
}

// Handle tab switching
function openCallFlowTab(tabId, event) {
  const callFlowSection = document.getElementById('call-flow-builder');
  if (!callFlowSection) return;

  // Only modify tabs within this specific section
  const tabButtons = callFlowSection.querySelectorAll('.tab-button');
  const tabContents = callFlowSection.querySelectorAll('.tab-content');

  // Remove active class from all tabs in this section
  tabContents.forEach((tab) => tab.classList.remove('active'));
  tabButtons.forEach((button) => button.classList.remove('active'));

  // Activate the selected tab
  const activeTab = document.getElementById(tabId);
  if (activeTab) activeTab.classList.add('active');
  if (event && event.currentTarget) event.currentTarget.classList.add('active');

  // If switching to edit tab, re-render steps
  if (tabId === 'builder-tab' && typeof renderSteps === 'function') {
    renderSteps();
  }
  // If switching to flow tab, re-render flow
  if (tabId === 'flow-tab' && typeof generateFlow === 'function') {
    generateFlow();
  }
}

// Setup all event listeners
export function setupCallFlowEventListeners() {
  // Attach tab switching listeners
  const callFlowSection = document.getElementById('call-flow-builder');
  if (callFlowSection) {
    const editTabBtn = callFlowSection.querySelector(
      '[data-callflow-tab="builder-tab"]'
    );
    const viewTabBtn = callFlowSection.querySelector(
      '[data-callflow-tab="flow-tab"]'
    );
    if (editTabBtn) {
      editTabBtn.addEventListener('click', (event) =>
        openCallFlowTab('builder-tab', event)
      );
    }
    if (viewTabBtn) {
      viewTabBtn.addEventListener('click', (event) =>
        openCallFlowTab('flow-tab', event)
      );
    }
  }
  document.getElementById('add-step-btn')?.addEventListener('click', addStep);
  // Enter key support
  const stepInput = document.getElementById('step-input');
  if (stepInput) {
    stepInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        addStep();
      }
    });
  }
  // Bulk add support
  const bulkAddBtn = document.getElementById('bulk-add-btn');
  if (bulkAddBtn) {
    bulkAddBtn.addEventListener('click', () => {
      const textarea = document.getElementById('bulk-steps-area');
      if (!textarea) return;
      const newSteps = textarea.value
        .split('\n')
        .map((step) => step.trim())
        .filter((step) => step && !steps.includes(step));
      if (newSteps.length > 0) {
        steps.push(...newSteps);
        storageSteps(steps);
        renderSteps();
        generateFlow(); // Ensure flow view updates
      }
    });
  }
}
