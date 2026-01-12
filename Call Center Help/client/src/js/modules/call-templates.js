// Call Templates Module
// Provides pre-filled forms for common call types with editing capabilities

import { showToast } from '../utils/toast.js';
import { showConfirmModal } from '../utils/modal.js';

// Default templates to seed if storage is empty
const DEFAULT_TEMPLATES = {
  'customer-support': {
    id: 'customer-support',
    name: 'Customer Support',
    description: 'General customer support inquiry',
    fields: {
      callType: 'Support',
      priority: 'Medium',
      category: 'General Inquiry',
      initialNotes: 'Customer called regarding: ',
      followUpRequired: false,
    },
  },
  'technical-issue': {
    id: 'technical-issue',
    name: 'Technical Issue',
    description: 'Customer reporting a technical problem',
    fields: {
      callType: 'Technical Support',
      priority: 'High',
      category: 'Technical Issue',
      initialNotes:
        'Issue description: \n\nSteps to reproduce: \n\nError messages: ',
      followUpRequired: true,
    },
  },
  'billing-inquiry': {
    id: 'billing-inquiry',
    name: 'Billing Inquiry',
    description: 'Questions about billing or charges',
    fields: {
      callType: 'Billing',
      priority: 'Medium',
      category: 'Billing Question',
      initialNotes: 'Billing inquiry regarding: ',
      followUpRequired: false,
    },
  },
  complaint: {
    id: 'complaint',
    name: 'Customer Complaint',
    description: 'Customer expressing dissatisfaction',
    fields: {
      callType: 'Complaint',
      priority: 'High',
      category: 'Customer Complaint',
      initialNotes:
        'Complaint details: \n\nCustomer expectations: \n\nResolution offered: ',
      followUpRequired: true,
    },
  },
  'sales-inquiry': {
    id: 'sales-inquiry',
    name: 'Sales Inquiry',
    description: 'Potential customer interested in products/services',
    fields: {
      callType: 'Sales',
      priority: 'Medium',
      category: 'Sales Lead',
      initialNotes:
        'Products/services of interest: \n\nBudget/timeline: \n\nCurrent provider: ',
      followUpRequired: true,
    },
  },
  'account-setup': {
    id: 'account-setup',
    name: 'Account Setup',
    description: 'New customer account creation/setup',
    fields: {
      callType: 'Account Management',
      priority: 'Medium',
      category: 'New Account',
      initialNotes:
        'Account setup for: \n\nRequired information collected: \n\nSetup steps completed: ',
      followUpRequired: true,
    },
  },
};

let callTemplates = {};

export function initializeCallTemplates() {
  loadTemplates();
  // createTemplatesUI(); // Removed UI creation
  applyCallLogSettings(); // Apply UI customizations
}

function loadTemplates() {
  const stored = localStorage.getItem('callTemplates');
  if (stored) {
    callTemplates = JSON.parse(stored);
  } else {
    callTemplates = JSON.parse(JSON.stringify(DEFAULT_TEMPLATES)); // Deep copy
    saveTemplates();
  }
}

function saveTemplates() {
  localStorage.setItem('callTemplates', JSON.stringify(callTemplates));
  // updateTemplateSelector(); // Removed as updateTemplateSelector is removed
}

// function createTemplatesUI() { ... removed ... }

// Settings management
const DEFAULT_FIELDS = [
  {
    id: 'priority',
    label: 'Priority',
    type: 'select',
    options: ['Low', 'Medium', 'High', 'Critical'],
    visible: false,
    system: true,
  },
  {
    id: 'category',
    label: 'Category',
    type: 'text',
    placeholder: 'e.g. Billing, Tech Support',
    visible: false,
    system: true,
  },
  {
    id: 'followUp',
    label: 'Follow-up Required',
    type: 'checkbox',
    visible: false,
    system: true,
  },
];

let callLogSettings = {
  fields: JSON.parse(JSON.stringify(DEFAULT_FIELDS)),
};

function loadSettings() {
  const stored = localStorage.getItem('callLogSettings');
  if (stored) {
    const parsed = JSON.parse(stored);

    // Migration: Old format (showPriority etc) -> New format (fields array)
    if (
      parsed.showPriority !== undefined ||
      parsed.showCategory !== undefined
    ) {
      callLogSettings.fields = JSON.parse(JSON.stringify(DEFAULT_FIELDS));
      const pField = callLogSettings.fields.find((f) => f.id === 'priority');
      const cField = callLogSettings.fields.find((f) => f.id === 'category');
      const fField = callLogSettings.fields.find((f) => f.id === 'followUp');

      if (pField) pField.visible = !!parsed.showPriority;
      if (cField) cField.visible = !!parsed.showCategory;
      if (fField) fField.visible = !!parsed.showFollowUp;

      saveSettings(); // Save migrated format immediately
    } else if (parsed.fields) {
      callLogSettings = parsed;
    }
  }
}

function saveSettings() {
  localStorage.setItem('callLogSettings', JSON.stringify(callLogSettings));
  applyCallLogSettings();
}

export function applyCallLogSettings() {
  loadSettings();
  const form = document.querySelector('.call-log-form');
  if (!form) return;

  // Cleanup previously injected fields
  const dynamicContainers = form.querySelectorAll('.dynamic-field-container');
  dynamicContainers.forEach((el) => el.remove());

  // We need injection points.
  // Strategy:
  // - Priority/Category/Selects/Texts -> Try to group before the buttons.
  // - Checkboxes -> Group near bottom.

  // Find injection anchor: The "Call Controls" (Start/End call buttons)
  const controls = form.querySelector('.call-controls');
  if (!controls) return;

  // Clear Verification Container
  const verifContainer = document.getElementById(
    'verification-fields-container'
  );
  const verifSection = document.getElementById('call-verification-section');
  if (verifContainer) {
    verifContainer.innerHTML = '';
    verifContainer.style.display = 'grid';
    verifContainer.style.gridTemplateColumns = 'repeat(2, 1fr)';
    verifContainer.style.gap = '10px';
  }

  // Sort/Iterate fields
  callLogSettings.fields.forEach((field) => {
    if (!field.visible) return;

    const div = document.createElement('div');
    div.className = 'form-group dynamic-field-container';
    div.id = `field-${field.id}-container`;

    const fieldName = field.system ? field.id : `custom_${field.id}`;
    const autoNoteAttr = field.autoNote ? 'data-auto-note="true"' : '';
    const labelAttr = `data-label="${field.label}"`;

    if (field.type === 'select') {
      div.innerHTML = `
            <label for="${fieldName}">${field.label}</label>
            <select id="${fieldName}" name="${fieldName}" class="form-control" ${autoNoteAttr} ${labelAttr}>
                ${(field.options || []).map((opt) => `<option value="${opt}">${opt}</option>`).join('')}
            </select>
          `;
    } else if (field.type === 'text') {
      div.innerHTML = `
            <label for="${fieldName}">${field.label}</label>
            <input type="text" id="${fieldName}" name="${fieldName}" class="form-control" placeholder="${field.placeholder || ''}" ${autoNoteAttr} ${labelAttr}>
          `;
    } else if (field.type === 'textarea') {
      div.innerHTML = `
            <label for="${fieldName}">${field.label}</label>
            <textarea id="${fieldName}" name="${fieldName}" class="form-control" rows="3" placeholder="${field.placeholder || ''}" ${autoNoteAttr} ${labelAttr}></textarea>
          `;
    } else if (field.type === 'checkbox') {
      div.className = 'form-group checkbox-group dynamic-field-container';
      div.style.marginBottom = '1rem';
      div.innerHTML = `
            <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
                <input type="checkbox" id="${fieldName}" name="${fieldName}" ${autoNoteAttr} ${labelAttr}>
                <span>${field.label}</span>
            </label>
          `;
    }

    // Determine placement
    // If explictly verification section OR (no section and is checkbox -> legacy migration)
    const isVerification =
      field.section === 'verification' ||
      (!field.section && field.type === 'checkbox'); // Default checkboxes to verification for now? Or keep them in main if user wants?
    // User requested "Verification section". Checkboxes usually go there.

    if (isVerification && verifContainer) {
      div.style.marginBottom = '0';
      verifContainer.appendChild(div);
      if (verifSection) verifSection.style.display = 'block';
    } else {
      // Standard form field
      // Place before controls
      form.insertBefore(div, controls);
    }
  });

  // Hide verif section if empty (cleaning up if we just cleared it)
  if (verifContainer && verifContainer.children.length === 0 && verifSection) {
    verifSection.style.display = 'none';
  }
}

export function showCallLoggingSettings() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal call-settings-modal" style="max-width: 900px; width: 95%;">
      <div class="modal-header">
        <h3>Call Logging Settings</h3>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="tabs tab-header" style="margin-bottom: 20px;">
            <button class="tab-btn tab-button active" data-mode="templates">Templates</button>
            <button class="tab-btn tab-button" data-mode="fields" data-section="main">Form Fields</button>
            <button class="tab-btn tab-button" data-mode="fields" data-section="verification">Verification</button>
        </div>

        <!-- Tab 1: Templates -->
        <div id="tab-templates" class="tab-content active">
            <div class="template-manager-layout" style="display: flex; gap: 20px; height: 500px;">
              <div class="template-list-sidebar" style="flex: 1; border-right: 1px solid var(--border-color); padding-right: 20px; overflow-y: auto;">
                <div class="list-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h4>Templates</h4>
                    <button id="new-template-btn" class="btn btn-sm btn-primary">+ New</button>
                </div>
                <ul id="manager-template-list" class="manager-list" style="list-style: none; padding: 0;"></ul>
              </div>
              <div class="template-editor-main" style="flex: 2; overflow-y: auto; padding-right: 10px;">
                <form id="template-edit-form" style="display: none;">
                    <input type="hidden" id="edit-template-id">
                    <div class="form-group">
                        <label>Template Name</label>
                        <input type="text" id="edit-template-name" required class="form-control">
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea id="edit-template-desc" class="form-control" rows="2"></textarea>
                    </div>
                    <hr style="margin: 15px 0; border: 0; border-top: 1px solid var(--border-color);">
                    <h5>Default Values</h5>
                    <div class="form-group">
                        <label>Call Type</label>
                        <select id="edit-template-type" class="form-control">
                            <option value="inbound">Inbound</option>
                            <option value="outbound">Outbound</option>
                            <option value="internal">Internal</option>
                            <option value="Support">Support</option>
                            <option value="Sales">Sales</option>
                            <option value="Billing">Billing</option>
                            <option value="Complaint">Complaint</option>
                            <option value="Technical Support">Technical Support</option>
                            <option value="Account Management">Account Management</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Initial Notes / Structure</label>
                        <textarea id="edit-template-notes" class="form-control" rows="5"></textarea>
                    </div>
                    <div class="form-actions" style="margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px;">
                        <button type="button" id="delete-template-btn" class="btn btn-danger" style="margin-right: auto;">Delete</button>
                        <button type="submit" class="btn btn-primary">Save Template</button>
                    </div>
                </form>
                <div id="editor-placeholder" style="text-align: center; color: var(--text-muted); padding-top: 50px;">
                    <p>Select a template to edit or create a new one.</p>
                </div>
              </div>
            </div>
        </div>

        <!-- Tab 2: Fields Manager (Shared) -->
        <div id="tab-fields-manager" class="tab-content" style="display: none;">
            <div class="settings-layout" style="display: flex; gap: 20px; height: 500px;">
                
                <!-- LH: Field List -->
                <div class="field-list-sidebar" style="flex: 1; border-right: 1px solid var(--border-color); padding-right: 20px; overflow-y: auto;">
                    <div class="list-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h4>Fields</h4>
                        <button id="add-field-btn" class="btn btn-sm btn-primary">+ Add</button>
                    </div>
                    <ul id="field-list" class="manager-list" style="list-style: none; padding: 0;"></ul>
                </div>

                <!-- RH: Field Editor -->
                <div class="field-editor-main" style="flex: 1; padding: 0 10px;">
                    <form id="field-edit-form" style="display: none;">
                        <input type="hidden" id="edit-field-id">
                        <input type="hidden" id="edit-field-system">
                        <input type="hidden" id="edit-field-section">
                        
                        <div class="form-group">
                            <label>Field Question / Label</label>
                            <input type="text" id="edit-field-label" required class="form-control">
                        </div>

                        <div class="form-group">
                            <label>Type</label>
                            <select id="edit-field-type" class="form-control">
                                <option value="checkbox">Verification Checkbox</option>
                                <option value="text">Text Input</option>
                                <option value="textarea">Multi-line Text</option>
                                <option value="select">Dropdown (Select)</option>
                            </select>
                        </div>

                        <div id="options-group" class="form-group" style="display:none;">
                            <label>Options (comma separated)</label>
                            <input type="text" id="edit-field-options" class="form-control" placeholder="Option 1, Option 2, Option 3">
                        </div>

                        <div id="placeholder-group" class="form-group">
                            <label>Placeholder Text</label>
                            <input type="text" id="edit-field-placeholder" class="form-control">
                        </div>

                        <div class="form-group checkbox-group" style="display: flex; flex-direction: column; gap: 12px; margin-top: 15px;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <label class="switch" style="cursor: pointer; margin: 0;">
                                    <input type="checkbox" id="edit-field-visible" class="hidden-toggle">
                                    <span class="toggle-slider"></span>
                                </label>
                                <label for="edit-field-visible" style="margin: 0; cursor: pointer;">Visible on Form</label>
                            </div>
                            
                             <div style="display: flex; align-items: center; gap: 12px;">
                                <label class="switch" style="cursor: pointer; margin: 0;">
                                    <input type="checkbox" id="edit-field-auto-note" class="hidden-toggle">
                                    <span class="toggle-slider"></span>
                                </label>
                                <label for="edit-field-auto-note" style="margin: 0; cursor: pointer;">Add to Notes Automatically</label>
                            </div>
                        </div>

                        <div class="form-actions" style="margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px;">
                            <button type="button" id="delete-field-btn" class="btn btn-danger" style="margin-right: auto; display: none;">Delete</button>
                            <button type="submit" class="btn btn-primary">Save Field</button>
                        </div>
                    </form>
                    <div id="field-editor-placeholder" style="text-align: center; color: var(--text-muted); padding-top: 50px;">
                        <p>Select a field to edit or add a new one.</p>
                    </div>
                </div>

            </div>
        </div>

      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Trigger animation & Load Settings
  requestAnimationFrame(() => {
    modal.classList.add('active');
    loadSettings();
    renderFieldList();
  });

  // --- Tab Logic ---
  let currentFieldSection = 'main'; // State for field manager

  const tabs = modal.querySelectorAll('.tab-btn');
  const contents = modal.querySelectorAll('.tab-content');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      contents.forEach((c) => (c.style.display = 'none'));
      tab.classList.add('active');

      const mode = tab.dataset.mode;
      if (mode === 'templates') {
        modal.querySelector('#tab-templates').style.display = 'block';
      } else if (mode === 'fields') {
        modal.querySelector('#tab-fields-manager').style.display = 'block';
        currentFieldSection = tab.dataset.section || 'main';
        renderFieldList();
        // Reset editor
        fieldPlaceholder.style.display = 'block';
        fieldForm.style.display = 'none';
      }
    });
  });

  // --- Field Manager Logic ---
  const fieldListEl = modal.querySelector('#field-list');
  const fieldForm = modal.querySelector('#field-edit-form');
  const fieldPlaceholder = modal.querySelector('#field-editor-placeholder');
  const addFieldBtn = modal.querySelector('#add-field-btn');
  const deleteFieldBtn = modal.querySelector('#delete-field-btn');
  const typeSelect = modal.querySelector('#edit-field-type');
  const optionsGroup = modal.querySelector('#options-group');
  const placeholderGroup = modal.querySelector('#placeholder-group');

  // Toggle editor visibility based on type
  typeSelect.addEventListener('change', () => {
    const type = typeSelect.value;
    optionsGroup.style.display = type === 'select' ? 'block' : 'none';
    placeholderGroup.style.display =
      type === 'text' || type === 'textarea' ? 'block' : 'none';
  });

  function renderFieldList() {
    fieldListEl.innerHTML = '';
    callLogSettings.fields.forEach((field) => {
      // Filter logic: Checkbox -> Verification (Legacy), or explicit section
      const fSection =
        field.section || (field.type === 'checkbox' ? 'verification' : 'main');

      if (fSection !== currentFieldSection) return;

      const li = document.createElement('li');
      li.style.cssText =
        'padding: 10px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; cursor: pointer;';

      li.innerHTML = `
            <div class="info">
                <span style="font-weight: 500;">${field.label}</span>
                <span style="font-size: 0.8em; color: var(--text-muted); margin-left: 8px;">(${field.type})</span>
            </div>
            <div class="status">
                ${field.visible ? '<span style="color: var(--success-color);">Visible</span>' : '<span style="color: var(--text-muted);">Hidden</span>'}
            </div>
          `;

      li.addEventListener('click', () => loadFieldForm(field));
      fieldListEl.appendChild(li);
    });
  }

  function loadFieldForm(field) {
    fieldPlaceholder.style.display = 'none';
    fieldForm.style.display = 'block';

    // Populate form
    modal.querySelector('#edit-field-id').value = field.id;
    modal.querySelector('#edit-field-system').value = field.system
      ? 'true'
      : 'false';

    const fSection =
      field.section || (field.type === 'checkbox' ? 'verification' : 'main');
    modal.querySelector('#edit-field-section').value = fSection;

    modal.querySelector('#edit-field-label').value = field.label;
    modal.querySelector('#edit-field-type').value = field.type;
    modal.querySelector('#edit-field-visible').checked = field.visible;
    modal.querySelector('#edit-field-auto-note').checked = !!field.autoNote;
    modal.querySelector('#edit-field-placeholder').value =
      field.placeholder || '';
    modal.querySelector('#edit-field-options').value = (
      field.options || []
    ).join(', ');

    // Handle System vs Custom constraints
    // System fields: ID lock, Type lock (maybe?), but allow Label edit?
    // User requested "Edit what the Forms are for" -> Label Edit.
    if (field.system) {
      modal.querySelector('#edit-field-type').disabled = true;
      deleteFieldBtn.style.display = 'none';
    } else {
      modal.querySelector('#edit-field-type').disabled = false;
      deleteFieldBtn.style.display = 'block';
    }

    // Trigger type change to set visibility of options/placeholder
    typeSelect.dispatchEvent(new Event('change'));

    // Highlight selection
    Array.from(fieldListEl.children).forEach((child) => {
      child.style.backgroundColor = child.textContent.includes(field.label)
        ? 'var(--primary-blue-light, #eff6ff)'
        : '';
    });
  }

  addFieldBtn.addEventListener('click', () => {
    loadFieldForm({
      id: '',
      label: 'New Field',
      type: currentFieldSection === 'verification' ? 'checkbox' : 'text',
      visible: true,
      autoNote: false, // Default
      system: false,
      section: currentFieldSection,
      options: [],
      placeholder: '',
    });
  });

  fieldForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = modal.querySelector('#edit-field-id').value;
    const label = modal.querySelector('#edit-field-label').value;
    const type = modal.querySelector('#edit-field-type').value;
    const visible = modal.querySelector('#edit-field-visible').checked;
    const autoNote = modal.querySelector('#edit-field-auto-note').checked;
    const placeholder = modal.querySelector('#edit-field-placeholder').value;
    const optionsRaw = modal.querySelector('#edit-field-options').value;
    const isSystem = modal.querySelector('#edit-field-system').value === 'true';
    const section = modal.querySelector('#edit-field-section').value;

    const options = optionsRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    let fieldData = {
      id: id || Date.now().toString(36), // Simple ID gen
      label,
      type,
      visible,
      autoNote,
      system: isSystem,
      section: section || 'main',
    };

    if (type === 'select') fieldData.options = options;
    if (type === 'text' || type === 'textarea')
      fieldData.placeholder = placeholder;

    // Update or Add
    const existingIndex = callLogSettings.fields.findIndex(
      (f) => f.id === fieldData.id
    );
    if (existingIndex >= 0) {
      callLogSettings.fields[existingIndex] = {
        ...callLogSettings.fields[existingIndex],
        ...fieldData,
      };
    } else {
      callLogSettings.fields.push(fieldData);
    }

    saveSettings();
    renderFieldList();
    showToast('Field saved', 'success');
  });

  deleteFieldBtn.addEventListener('click', async () => {
    const id = modal.querySelector('#edit-field-id').value;
    const isSystem = modal.querySelector('#edit-field-system').value === 'true';

    if (isSystem) {
      showToast(
        'Cannot delete system fields. Try hiding them instead.',
        'warning'
      );
      return;
    }

    const confirmed = await showConfirmModal({
      title: 'Delete Field',
      message:
        'Are you sure you want to delete this field? Data in this field for previous calls will not be lost, but it will disappear from the form.',
      confirmLabel: 'Delete',
      danger: true,
    });

    if (confirmed) {
      callLogSettings.fields = callLogSettings.fields.filter(
        (f) => f.id !== id
      );
      saveSettings();
      renderFieldList();
      fieldForm.style.display = 'none';
      fieldPlaceholder.style.display = 'block';
      showToast('Field deleted', 'info');
    }
  });

  // --- Template Manager Logic (Identical to previous) ---
  const listEl = modal.querySelector('#manager-template-list');
  const formEl = modal.querySelector('#template-edit-form');
  const placeholderEl = modal.querySelector('#editor-placeholder');
  const newBtn = modal.querySelector('#new-template-btn');
  const deleteBtn = modal.querySelector('#delete-template-btn');

  const refreshList = () => {
    listEl.innerHTML = '';
    Object.values(callTemplates).forEach((t) => {
      const li = document.createElement('li');
      li.style.cssText =
        'padding: 10px; border-bottom: 1px solid var(--border-color); cursor: pointer; border-radius: 4px;';
      li.textContent = t.name;
      li.addEventListener('click', () => loadForm(t));
      listEl.appendChild(li);
    });
  };

  const loadForm = (template) => {
    placeholderEl.style.display = 'none';
    formEl.style.display = 'block';

    modal.querySelector('#edit-template-id').value = template.id || '';
    modal.querySelector('#edit-template-name').value = template.name || '';
    modal.querySelector('#edit-template-desc').value =
      template.description || '';
    modal.querySelector('#edit-template-type').value =
      template.fields.callType || 'inbound';
    modal.querySelector('#edit-template-notes').value =
      template.fields.initialNotes || '';

    Array.from(listEl.children).forEach((child) => {
      child.style.backgroundColor =
        child.textContent === template.name
          ? 'var(--primary-blue-light, #eff6ff)'
          : '';
    });
  };

  newBtn.addEventListener('click', () => {
    loadForm({
      id: '',
      name: 'New Template',
      description: '',
      fields: { callType: 'inbound', initialNotes: '' },
    });
  });

  formEl.addEventListener('submit', (e) => {
    e.preventDefault();
    const id =
      modal.querySelector('#edit-template-id').value || 'tpl_' + Date.now();
    const name = modal.querySelector('#edit-template-name').value;

    const newTemplate = {
      id: id,
      name: name,
      description: modal.querySelector('#edit-template-desc').value,
      fields: {
        callType: modal.querySelector('#edit-template-type').value,
        initialNotes: modal.querySelector('#edit-template-notes').value,
      },
    };

    callTemplates[id] = newTemplate;
    saveTemplates(); // Templates save
    refreshList();
    showToast('Template saved', 'success');
  });

  deleteBtn.addEventListener('click', async () => {
    const id = modal.querySelector('#edit-template-id').value;
    if (id) {
      const confirmed = await showConfirmModal({
        title: 'Delete Template',
        message:
          'Are you sure you want to delete this template? This action cannot be undone.',
        confirmLabel: 'Delete',
        danger: true,
      });

      if (confirmed) {
        delete callTemplates[id];
        saveTemplates(); // Templates save
        refreshList();
        placeholderEl.style.display = 'block';
        formEl.style.display = 'none';
        showToast('Template deleted', 'info');
      }
    }
  });

  modal.querySelector('.modal-close').addEventListener('click', () => {
    modal.classList.remove('active');
    setTimeout(() => modal.remove(), 300);
  });
  refreshList();
}

export function applyCallTemplate(template) {
  const form = document.querySelector('.call-log-form');
  if (!form) return;

  const fieldMappings = {
    callType: '#call-type, [name="call-type"]',
    priority: '#call-priority, [name="priority"]',
    category: '#call-category, [name="category"]',
    initialNotes: '#call-notes, #initial-notes, textarea[name="notes"]',
    followUpRequired: '#follow-up-required, [name="follow-up"]',
  };

  Object.entries(template.fields).forEach(([fieldName, value]) => {
    const selectors = fieldMappings[fieldName];
    if (selectors) {
      const element = form.querySelector(selectors);
      if (element) {
        if (element.type === 'checkbox') {
          element.checked = value;
        } else {
          element.value = value;
        }
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  });

  const notesField = form.querySelector(
    '#call-notes, #initial-notes, textarea[name="notes"]'
  );
  if (notesField) {
    setTimeout(() => {
      notesField.focus();
      notesField.setSelectionRange(
        notesField.value.length,
        notesField.value.length
      );
    }, 100);
  }
}

export function getCallTemplates() {
  return callTemplates;
}
