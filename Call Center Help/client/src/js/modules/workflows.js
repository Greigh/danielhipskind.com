// Automated Workflows Module
import { saveData, loadData } from './storage.js';

export function initializeWorkflows() {
  const workflowSteps = document.getElementById('workflow-steps');
  const stepTypeSelector = document.getElementById('step-type-selector');
  const stepConfigForm = document.getElementById('step-config-form');
  const addStepBtn = document.getElementById('add-workflow-step');
  const saveWorkflowBtn = document.getElementById('save-workflow');
  const testWorkflowBtn = document.getElementById('test-workflow');
  const clearWorkflowBtn = document.getElementById('clear-workflow');
  const activeWorkflowsList = document.getElementById('active-workflows-list');

  // Check if required elements exist
  if (
    !workflowSteps ||
    !stepTypeSelector ||
    !stepConfigForm ||
    !addStepBtn ||
    !saveWorkflowBtn ||
    !testWorkflowBtn ||
    !clearWorkflowBtn ||
    !activeWorkflowsList
  ) {
    return;
  }

  let workflows = loadData('workflows') || [];
  let currentWorkflow = { steps: [] };
  let selectedStepType = null;
  // let editingStepIndex = -1;

  // Initialize event listeners
  initializeEventListeners();

  // Load and display existing workflows
  updateActiveWorkflows();

  function initializeEventListeners() {
    // Step type selection
    stepTypeSelector.addEventListener('click', handleStepTypeSelection);

    // Action buttons
    addStepBtn.addEventListener('click', addWorkflowStep);
    saveWorkflowBtn.addEventListener('click', saveWorkflow);
    testWorkflowBtn.addEventListener('click', testWorkflow);
    clearWorkflowBtn.addEventListener('click', clearWorkflow);

    // Form handling
    stepConfigForm.addEventListener('submit', handleStepConfigSubmit);
    stepConfigForm.addEventListener('click', handleFormActions);
  }

  function handleStepTypeSelection(e) {
    const option = e.target.closest('.step-type-option');
    if (!option) return;

    const stepType = option.dataset.type;

    // Update selection UI
    document
      .querySelectorAll('.step-type-option')
      .forEach((opt) => opt.classList.remove('selected'));
    option.classList.add('selected');

    selectedStepType = stepType;
    showStepConfigForm(stepType);
  }

  function showStepConfigForm(stepType) {
    const formHtml = generateStepConfigForm(stepType);
    stepConfigForm.innerHTML = formHtml;
    stepConfigForm.style.display = 'block';

    // Scroll to form
    stepConfigForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function generateStepConfigForm(stepType) {
    const forms = {
      call: `
        <div class="modal-header">
          <h3>📞 Configure Call Step</h3>
          <button class="close-btn" onclick="hideStepConfigForm()">×</button>
        </div>
        <form onsubmit="return false;">
          <div class="form-group">
            <label for="call-phone">Phone Number *</label>
            <input type="tel" id="call-phone" required placeholder="+1 (555) 123-4567">
          </div>
          <div class="form-group">
            <label for="call-message">Message to Play</label>
            <textarea id="call-message" placeholder="Hello, this is an automated call..." rows="3"></textarea>
          </div>
          <div class="form-group">
            <label for="call-timeout">Timeout (seconds)</label>
            <input type="number" id="call-timeout" value="30" min="10" max="120">
          </div>
          <div class="form-actions">
            <button type="button" class="button" onclick="hideStepConfigForm()">Cancel</button>
            <button type="submit" class="button btn-primary">Add Call Step</button>
          </div>
        </form>
      `,
      email: `
        <div class="modal-header">
          <h3>📧 Configure Email Step</h3>
          <button class="close-btn" onclick="hideStepConfigForm()">×</button>
        </div>
        <form onsubmit="return false;">
          <div class="form-group">
            <label for="email-to">Recipient Email *</label>
            <input type="email" id="email-to" required placeholder="customer@example.com">
          </div>
          <div class="form-group">
            <label for="email-subject">Subject *</label>
            <input type="text" id="email-subject" required placeholder="Follow-up on your recent call">
          </div>
          <div class="form-group">
            <label for="email-body">Email Body *</label>
            <textarea id="email-body" required placeholder="Dear customer..." rows="5"></textarea>
          </div>
          <div class="form-group">
            <label for="email-priority">Priority</label>
            <select id="email-priority">
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div class="form-actions">
            <button type="button" class="button" onclick="hideStepConfigForm()">Cancel</button>
            <button type="submit" class="button btn-primary">Add Email Step</button>
          </div>
        </form>
      `,
      task: `
        <div class="modal-header">
          <h3>📋 Configure Task Step</h3>
          <button class="close-btn" onclick="hideStepConfigForm()">×</button>
        </div>
        <form onsubmit="return false;">
          <div class="form-group">
            <label for="task-title">Task Title *</label>
            <input type="text" id="task-title" required placeholder="Follow up with customer">
          </div>
          <div class="form-group">
            <label for="task-description">Description</label>
            <textarea id="task-description" placeholder="Task details..." rows="3"></textarea>
          </div>
          <div class="form-group">
            <label for="task-assignee">Assignee</label>
            <input type="text" id="task-assignee" placeholder="agent@example.com">
          </div>
          <div class="form-group">
            <label for="task-priority">Priority</label>
            <select id="task-priority">
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="low">Low</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div class="form-group">
            <label for="task-due-date">Due Date</label>
            <input type="datetime-local" id="task-due-date">
          </div>
          <div class="form-actions">
            <button type="button" class="button" onclick="hideStepConfigForm()">Cancel</button>
            <button type="submit" class="button btn-primary">Add Task Step</button>
          </div>
        </form>
      `,
      wait: `
        <div class="modal-header">
          <h3>⏱️ Configure Wait Step</h3>
          <button class="close-btn" onclick="hideStepConfigForm()">×</button>
        </div>
        <form onsubmit="return false;">
          <div class="form-group">
            <label for="wait-duration">Wait Duration *</label>
            <div style="display: flex; gap: 10px; align-items: center;">
              <input type="number" id="wait-duration" required value="5" min="1" max="1440" style="flex: 1;">
              <select id="wait-unit" style="flex: 1;">
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label for="wait-description">Description</label>
            <input type="text" id="wait-description" placeholder="Waiting for customer response">
          </div>
          <div class="form-actions">
            <button type="button" class="button" onclick="hideStepConfigForm()">Cancel</button>
            <button type="submit" class="button btn-primary">Add Wait Step</button>
          </div>
        </form>
      `,
      condition: `
        <div class="modal-header">
          <h3>🔀 Configure Condition Step</h3>
          <button class="close-btn" onclick="hideStepConfigForm()">×</button>
        </div>
        <form onsubmit="return false;">
          <div class="form-group">
            <label for="condition-field">Field to Check *</label>
            <select id="condition-field" required>
              <option value="call_duration">Call Duration</option>
              <option value="customer_satisfaction">Customer Satisfaction</option>
              <option value="issue_resolved">Issue Resolved</option>
              <option value="callback_requested">Callback Requested</option>
              <option value="escalation_needed">Escalation Needed</option>
            </select>
          </div>
          <div class="form-group">
            <label for="condition-operator">Operator *</label>
            <select id="condition-operator" required>
              <option value="equals">Equals</option>
              <option value="not_equals">Not Equals</option>
              <option value="greater_than">Greater Than</option>
              <option value="less_than">Less Than</option>
              <option value="contains">Contains</option>
              <option value="not_contains">Does Not Contain</option>
            </select>
          </div>
          <div class="form-group">
            <label for="condition-value">Value *</label>
            <input type="text" id="condition-value" required placeholder="Value to compare against">
          </div>
          <div class="form-group">
            <label for="condition-true-label">If True: Next Step</label>
            <input type="text" id="condition-true-label" value="Continue" placeholder="Label for true path">
          </div>
          <div class="form-group">
            <label for="condition-false-label">If False: Next Step</label>
            <input type="text" id="condition-false-label" value="Skip" placeholder="Label for false path">
          </div>
          <div class="form-actions">
            <button type="button" class="button" onclick="hideStepConfigForm()">Cancel</button>
            <button type="submit" class="button btn-primary">Add Condition Step</button>
          </div>
        </form>
      `,
      notification: `
        <div class="modal-header">
          <h3>🔔 Configure Notification Step</h3>
          <button class="close-btn" onclick="hideStepConfigForm()">×</button>
        </div>
        <form onsubmit="return false;">
          <div class="form-group">
            <label for="notification-type">Notification Type *</label>
            <select id="notification-type" required>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="push">Push Notification</option>
              <option value="slack">Slack</option>
              <option value="webhook">Webhook</option>
            </select>
          </div>
          <div class="form-group">
            <label for="notification-recipient">Recipient *</label>
            <input type="text" id="notification-recipient" required placeholder="email@domain.com or phone number">
          </div>
          <div class="form-group">
            <label for="notification-message">Message *</label>
            <textarea id="notification-message" required placeholder="Notification message..." rows="3"></textarea>
          </div>
          <div class="form-group">
            <label for="notification-urgent">Mark as Urgent</label>
            <input type="checkbox" id="notification-urgent">
          </div>
          <div class="form-actions">
            <button type="button" class="button" onclick="hideStepConfigForm()">Cancel</button>
            <button type="submit" class="button btn-primary">Add Notification Step</button>
          </div>
        </form>
      `,
    };

    return forms[stepType] || '<p>Unknown step type</p>';
  }

  function handleStepConfigSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const config = {};

    for (let [key, value] of formData.entries()) {
      config[key.replace(`${selectedStepType}-`, '')] = value;
    }

    addStepToWorkflow(selectedStepType, config);
    hideStepConfigForm();
  }

  function handleFormActions(e) {
    if (e.target.classList.contains('close-btn') || e.target.onclick) {
      return; // Already handled
    }
  }

  function addStepToWorkflow(stepType, config) {
    const step = {
      id: Date.now(),
      type: stepType,
      config: config,
      order: currentWorkflow.steps.length,
    };

    currentWorkflow.steps.push(step);
    updateWorkflowSteps();
    updateButtonsState();
  }

  function addWorkflowStep() {
    if (!selectedStepType) {
      alert('Please select a step type first');
      return;
    }
  }

  function updateWorkflowSteps() {
    if (currentWorkflow.steps.length === 0) {
      workflowSteps.innerHTML = `
        <div class="empty-workflow">
          <div class="empty-icon">⚙️</div>
          <p>No workflow steps added yet.<br>Select a step type above to get started.</p>
        </div>
      `;
      return;
    }

    workflowSteps.innerHTML = '';

    currentWorkflow.steps.forEach((step, index) => {
      const stepDiv = document.createElement('div');
      stepDiv.className = `workflow-step`;
      stepDiv.dataset.stepId = step.id;
      stepDiv.innerHTML = `
        <div class="step-header">
          <span class="step-number">${index + 1}</span>
          <span class="step-type ${step.type}">${formatStepType(step.type)}</span>
          <div class="step-actions">
            <button class="step-action-btn" onclick="editWorkflowStep(${step.id})" title="Edit">✏️</button>
            <button class="step-action-btn" onclick="duplicateWorkflowStep(${step.id})" title="Duplicate">📋</button>
            <button class="step-action-btn btn-danger" onclick="removeWorkflowStep(${step.id})" title="Remove">🗑️</button>
          </div>
        </div>
        <div class="step-config">
          ${formatStepConfig(step)}
        </div>
      `;
      workflowSteps.appendChild(stepDiv);
    });
  }

  function formatStepType(type) {
    const types = {
      call: 'Make Call',
      email: 'Send Email',
      task: 'Create Task',
      wait: 'Wait/Delay',
      condition: 'Condition',
      notification: 'Notification',
    };
    return types[type] || type;
  }

  function formatStepConfig(step) {
    const config = step.config;
    let html = '';

    switch (step.type) {
      case 'call':
        html = `
          <div><strong>Phone:</strong> ${config.phone || 'N/A'}</div>
          ${config.message ? `<div><strong>Message:</strong> ${config.message.substring(0, 50)}${config.message.length > 50 ? '...' : ''}</div>` : ''}
          ${config.timeout ? `<div><strong>Timeout:</strong> ${config.timeout}s</div>` : ''}
        `;
        break;
      case 'email':
        html = `
          <div><strong>To:</strong> ${config.to || 'N/A'}</div>
          <div><strong>Subject:</strong> ${config.subject || 'N/A'}</div>
          ${config.priority && config.priority !== 'normal' ? `<div><strong>Priority:</strong> ${config.priority}</div>` : ''}
        `;
        break;
      case 'task':
        html = `
          <div><strong>Title:</strong> ${config.title || 'N/A'}</div>
          ${config.assignee ? `<div><strong>Assignee:</strong> ${config.assignee}</div>` : ''}
          ${config.priority && config.priority !== 'medium' ? `<div><strong>Priority:</strong> ${config.priority}</div>` : ''}
        `;
        break;
      case 'wait':
        html = `
          <div><strong>Duration:</strong> ${config.duration || 'N/A'} ${config.unit || 'minutes'}</div>
          ${config.description ? `<div><strong>Description:</strong> ${config.description}</div>` : ''}
        `;
        break;
      case 'condition':
        html = `
          <div><strong>Check:</strong> ${config.field || 'N/A'} ${config.operator || ''} ${config.value || ''}</div>
          <div><strong>If True:</strong> ${config.trueLabel || 'Continue'}</div>
          <div><strong>If False:</strong> ${config.falseLabel || 'Skip'}</div>
        `;
        break;
      case 'notification':
        html = `
          <div><strong>Type:</strong> ${config.type || 'N/A'}</div>
          <div><strong>To:</strong> ${config.recipient || 'N/A'}</div>
          ${config.urgent ? `<div><strong>Urgent:</strong> Yes</div>` : ''}
        `;
        break;
    }

    return html;
  }

  function updateButtonsState() {
    const hasSteps = currentWorkflow.steps.length > 0;
    saveWorkflowBtn.disabled = !hasSteps;
    testWorkflowBtn.disabled = !hasSteps;
  }

  function saveWorkflow() {
    if (currentWorkflow.steps.length === 0) {
      alert('Please add at least one step to the workflow');
      return;
    }

    const name = prompt('Workflow name:');
    if (!name) return;

    const workflow = {
      id: Date.now(),
      name,
      steps: currentWorkflow.steps,
      createdAt: new Date(),
      active: true,
      lastRun: null,
      runCount: 0,
    };

    workflows.push(workflow);
    saveData('workflows', workflows);
    updateActiveWorkflows();

    // Reset current workflow
    currentWorkflow = { steps: [] };
    updateWorkflowSteps();
    updateButtonsState();

    alert('Workflow saved successfully!');
  }

  function testWorkflow() {
    if (currentWorkflow.steps.length === 0) {
      alert('Please add steps to the workflow first');
      return;
    }

    alert(
      `Testing workflow with ${currentWorkflow.steps.length} steps...\n\nThis would execute each step in sequence.`
    );
  }

  async function clearWorkflow() {
    if (currentWorkflow.steps.length === 0) return;
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
        title: 'Clear Steps',
        message: 'Are you sure you want to clear all workflow steps?',
        confirmLabel: 'Clear',
        cancelLabel: 'Cancel',
        danger: true,
      });
      if (confirmed) {
        currentWorkflow = { steps: [] };
        updateWorkflowSteps();
        updateButtonsState();
        hideStepConfigForm();
      }
    } catch (err) {
      console.warn(
        'Clear workflow confirmation failed, falling back to window.confirm',
        err
      );
      if (
        window.confirm('Are you sure you want to clear all workflow steps?')
      ) {
        currentWorkflow = { steps: [] };
        updateWorkflowSteps();
        updateButtonsState();
        hideStepConfigForm();
      }
    }
  }

  function updateActiveWorkflows() {
    if (workflows.length === 0) {
      activeWorkflowsList.innerHTML = `
        <div class="no-workflows">
          <p>No workflows created yet.<br>Build your first workflow above.</p>
        </div>
      `;
      return;
    }

    activeWorkflowsList.innerHTML = '';

    workflows.forEach((workflow) => {
      const workflowDiv = document.createElement('div');
      workflowDiv.className = 'workflow-item';
      workflowDiv.innerHTML = `
        <div class="workflow-info">
          <strong>${workflow.name}</strong>
          <span>Steps: ${workflow.steps.length} | Created: ${new Date(workflow.createdAt).toLocaleDateString()}</span>
          ${workflow.lastRun ? `<span>Last run: ${new Date(workflow.lastRun).toLocaleString()}</span>` : ''}
        </div>
        <div class="workflow-actions">
          <button class="button" onclick="runWorkflow(${workflow.id})">▶️ Run</button>
          <button class="button btn-secondary" onclick="editWorkflow(${workflow.id})">✏️ Edit</button>
          <button class="button btn-danger" onclick="deleteWorkflow(${workflow.id})">🗑️ Delete</button>
        </div>
      `;
      activeWorkflowsList.appendChild(workflowDiv);
    });
  }

  function runWorkflow(workflowId) {
    const workflow = workflows.find((w) => w.id === workflowId);
    if (!workflow) return;

    // Update run statistics
    workflow.lastRun = new Date();
    workflow.runCount = (workflow.runCount || 0) + 1;
    saveData('workflows', workflows);

    // Execute workflow steps
    executeWorkflow(workflow);
  }

  async function executeWorkflow(workflow) {
    console.log(`Executing workflow: ${workflow.name}`);

    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i];
      console.log(`Executing step ${i + 1}: ${step.type}`);

      try {
        await executeStep(step);
      } catch (error) {
        console.error(`Step ${i + 1} failed:`, error);
        alert(`Workflow execution failed at step ${i + 1}: ${error.message}`);
        return;
      }
    }

    alert(`Workflow "${workflow.name}" completed successfully!`);
    updateActiveWorkflows();
  }

  async function executeStep(step) {
    // Simulate step execution with delays
    switch (step.type) {
      case 'call':
        console.log(`Making call to ${step.config.phone}`);
        await delay(2000); // Simulate call setup
        break;

      case 'email':
        console.log(`Sending email to ${step.config.to}`);
        await delay(1000); // Simulate email sending
        break;

      case 'task':
        console.log(`Creating task: ${step.config.title}`);
        await delay(500); // Simulate task creation
        break;

      case 'wait': {
        const duration =
          parseInt(step.config.duration) *
          (step.config.unit === 'hours'
            ? 3600000
            : step.config.unit === 'days'
              ? 86400000
              : 60000);
        console.log(`Waiting for ${step.config.duration} ${step.config.unit}`);
        await delay(duration);
        break;
      }

      case 'condition':
        console.log(
          `Evaluating condition: ${step.config.field} ${step.config.operator} ${step.config.value}`
        );
        await delay(500); // Simulate condition evaluation
        break;

      case 'notification':
        console.log(
          `Sending ${step.config.type} notification to ${step.config.recipient}`
        );
        await delay(1000); // Simulate notification sending
        break;
    }
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function editWorkflow(workflowId) {
    const workflow = workflows.find((w) => w.id === workflowId);
    if (!workflow) return;

    currentWorkflow = { ...workflow };
    updateWorkflowSteps();
    updateButtonsState();
  }

  async function deleteWorkflow(workflowId) {
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
        title: 'Delete Workflow',
        message:
          'Are you sure you want to delete this workflow? This action cannot be undone.',
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        danger: true,
      });
      if (confirmed) {
        workflows = workflows.filter((w) => w.id !== workflowId);
        saveData('workflows', workflows);
        updateActiveWorkflows();
      }
    } catch (err) {
      console.warn(
        'Delete workflow confirmation failed, falling back to window.confirm',
        err
      );
      if (
        window.confirm(
          'Are you sure you want to delete this workflow? This action cannot be undone.'
        )
      ) {
        workflows = workflows.filter((w) => w.id !== workflowId);
        saveData('workflows', workflows);
        updateActiveWorkflows();
      }
    }
  }

  // Global functions for HTML onclick handlers
  function hideStepConfigForm() {
    stepConfigForm.style.display = 'none';
    document
      .querySelectorAll('.step-type-option')
      .forEach((opt) => opt.classList.remove('selected'));
    selectedStepType = null;
  }
  window.hideStepConfigForm = hideStepConfigForm;

  window.removeWorkflowStep = function (stepId) {
    currentWorkflow.steps = currentWorkflow.steps.filter(
      (step) => step.id !== stepId
    );
    updateWorkflowSteps();
    updateButtonsState();
  };

  window.editWorkflowStep = function (stepId) {
    const step = currentWorkflow.steps.find((s) => s.id === stepId);
    if (!step) return;

    // editingStepIndex = currentWorkflow.steps.findIndex((s) => s.id === stepId);
    selectedStepType = step.type;
    showStepConfigForm(step.type);

    // Pre-fill form with existing data
    setTimeout(() => {
      Object.entries(step.config).forEach(([key, value]) => {
        const input = document.getElementById(`${step.type}-${key}`);
        if (input) input.value = value;
      });
    }, 100);
  };

  window.duplicateWorkflowStep = function (stepId) {
    const step = currentWorkflow.steps.find((s) => s.id === stepId);
    if (!step) return;

    const duplicatedStep = {
      ...step,
      id: Date.now(),
      order: currentWorkflow.steps.length,
    };

    currentWorkflow.steps.push(duplicatedStep);
    updateWorkflowSteps();
    updateButtonsState();
  };

  window.runWorkflow = runWorkflow;
  window.editWorkflow = editWorkflow;
  window.deleteWorkflow = deleteWorkflow;
}
