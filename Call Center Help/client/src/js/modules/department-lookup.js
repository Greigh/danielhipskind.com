// Department/Location Phone Number Lookup Module
// Provides quick lookup for internal department and location phone numbers

import { showToast } from '../utils/toast.js';
import { showConfirmModal } from '../utils/modal.js';

export function initializeDepartmentLookup() {
  createLookupInterface();
  setupLookupEventListeners();
  loadDepartmentData();
}

function createLookupInterface() {
  // Check if modal already exists
  if (document.getElementById('department-lookup-modal')) {
    return; // Modal already exists
  }

  // Generate filter checkboxes dynamically
  const filterHtml = filterConfig
    .map(
      (filter) =>
        `<label><input type="checkbox" id="search-${filter.id}" ${filter.checked ? 'checked' : ''}> ${filter.label}</label>`
    )
    .join('');

  // Create a lookup modal that can be opened from the toolbar
  const lookupModal = document.createElement('div');
  lookupModal.id = 'department-lookup-modal';
  lookupModal.className = 'modal-overlay';
  lookupModal.innerHTML = `
    <div class="modal department-lookup-modal">
      <div class="modal-header">
        <h3>🏢 Department & Location Lookup</h3>
        <div class="modal-header-actions">
          <button class="btn btn-sm" id="manage-departments-btn">Manage</button>
          <button class="modal-close-btn">&times;</button>
        </div>
      </div>
      <div class="modal-body">
        <div class="lookup-input-group">
          <input type="text" id="department-search-input" placeholder="Search departments or locations..." class="search-input">
          <button id="department-search-btn" class="btn btn-primary">Search</button>
          <button id="department-clear-btn" class="btn btn-secondary">Clear All</button>
        </div>
        <div class="lookup-filters">
          ${filterHtml}
        </div>
        <div id="lookup-results" class="lookup-results">
          <div class="lookup-placeholder">
            Enter search terms to find departments or locations
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(lookupModal);
}

function setupLookupEventListeners() {
  const modal = document.getElementById('department-lookup-modal');
  const searchInput = document.getElementById('department-search-input');
  const searchBtn = document.getElementById('department-search-btn');
  const clearBtn = document.getElementById('department-clear-btn');
  const manageBtn = document.getElementById('manage-departments-btn');

  // Modal controls
  modal?.addEventListener('click', (e) => {
    if (e.target === modal || e.target.classList.contains('modal-close-btn')) {
      modal.classList.remove('active');
      document.body.classList.remove('modal-open');
    }
  });

  // Manage departments button
  manageBtn?.addEventListener('click', () => {
    openDepartmentManagement();
  });

  // Clear all button
  clearBtn?.addEventListener('click', () => {
    clearAllFilters();
  });

  // Search on Enter key
  searchInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      performLookup();
    }
  });

  // Search button click
  searchBtn?.addEventListener('click', () => {
    performLookup();
  });

  // Real-time search as user types (debounced)
  let searchTimeout;
  searchInput?.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      if (searchInput.value.trim().length > 0) {
        performLookup();
      } else {
        showPlaceholder();
      }
    }, 300);
  });
}

function clearAllFilters() {
  // Clear search input
  const searchInput = document.getElementById('department-search-input');
  if (searchInput) {
    searchInput.value = '';
  }

  // Reset all filter checkboxes to their default checked state
  filterConfig.forEach((filter) => {
    const checkbox = document.getElementById(`search-${filter.id}`);
    if (checkbox) {
      checkbox.checked = filter.checked;
    }
  });

  // Clear results and show placeholder
  showPlaceholder();
}

function loadDepartmentData() {
  // Load department/location data from localStorage or use defaults
  const stored = localStorage.getItem('departmentData');
  if (stored) {
    try {
      departmentData = JSON.parse(stored);
    } catch {
      console.warn('Failed to parse stored department data, using defaults');
      initializeDefaultData();
    }
  } else {
    initializeDefaultData();
  }
}

function initializeDefaultData() {
  departmentData = [
    // Emergency contacts
    {
      id: 'emergency-911',
      name: 'Emergency Services',
      number: '911',
      type: 'emergency',
      category: 'Emergency',
      description: 'Emergency services - Call 911',
    },
    {
      id: 'emergency-security',
      name: 'Campus Security',
      number: '555-0101',
      type: 'emergency',
      category: 'Emergency',
      description: 'Campus security office',
    },
    {
      id: 'emergency-medical',
      name: 'Medical Emergency',
      number: '555-0111',
      type: 'emergency',
      category: 'Emergency',
      description: 'Medical emergency response',
    },

    // Departments
    {
      id: 'dept-it',
      name: 'IT Support',
      number: '555-1000',
      type: 'department',
      category: 'Information Technology',
      description: 'Technical support and help desk',
    },
    {
      id: 'dept-hr',
      name: 'Human Resources',
      number: '555-1001',
      type: 'department',
      category: 'Human Resources',
      description: 'HR department and employee services',
    },
    {
      id: 'dept-finance',
      name: 'Finance Department',
      number: '555-1002',
      type: 'department',
      category: 'Finance',
      description: 'Accounting and financial services',
    },
    {
      id: 'dept-sales',
      name: 'Sales Department',
      number: '555-1003',
      type: 'department',
      category: 'Sales',
      description: 'Sales team and customer inquiries',
    },
    {
      id: 'dept-marketing',
      name: 'Marketing Department',
      number: '555-1004',
      type: 'department',
      category: 'Marketing',
      description: 'Marketing and communications',
    },
    {
      id: 'dept-operations',
      name: 'Operations',
      number: '555-1005',
      type: 'department',
      category: 'Operations',
      description: 'Operations and logistics',
    },
    {
      id: 'dept-customer-service',
      name: 'Customer Service',
      number: '555-1006',
      type: 'department',
      category: 'Customer Service',
      description: 'Customer support and service',
    },
    {
      id: 'dept-facilities',
      name: 'Facilities Management',
      number: '555-1007',
      type: 'department',
      category: 'Facilities',
      description: 'Building maintenance and facilities',
    },
    {
      id: 'dept-legal',
      name: 'Legal Department',
      number: '555-1008',
      type: 'department',
      category: 'Legal',
      description: 'Legal counsel and compliance',
    },
    {
      id: 'dept-procurement',
      name: 'Procurement',
      number: '555-1009',
      type: 'department',
      category: 'Procurement',
      description: 'Purchasing and vendor management',
    },

    // Locations
    {
      id: 'loc-main-office',
      name: 'Main Office',
      number: '555-2000',
      type: 'location',
      category: 'Headquarters',
      description: 'Main corporate office',
    },
    {
      id: 'loc-branch-east',
      name: 'East Branch Office',
      number: '555-2001',
      type: 'location',
      category: 'Branch Office',
      description: 'Eastern regional office',
    },
    {
      id: 'loc-branch-west',
      name: 'West Branch Office',
      number: '555-2002',
      type: 'location',
      category: 'Branch Office',
      description: 'Western regional office',
    },
    {
      id: 'loc-warehouse',
      name: 'Central Warehouse',
      number: '555-2003',
      type: 'location',
      category: 'Warehouse',
      description: 'Main distribution warehouse',
    },
    {
      id: 'loc-retail-store',
      name: 'Retail Store',
      number: '555-2004',
      type: 'location',
      category: 'Retail',
      description: 'Customer-facing retail location',
    },
    {
      id: 'loc-data-center',
      name: 'Data Center',
      number: '555-2005',
      type: 'location',
      category: 'Technology',
      description: 'Primary data center operations',
    },
    {
      id: 'loc-remote-office',
      name: 'Remote Office',
      number: '555-2006',
      type: 'location',
      category: 'Remote',
      description: 'Remote work coordination office',
    },
  ];

  // Save to localStorage
  localStorage.setItem('departmentData', JSON.stringify(departmentData));
}

let departmentData = [];

// Filter configuration
export let filterConfig = [];

export function loadFilterConfig() {
  // Load filter configuration from localStorage or use defaults
  const stored = localStorage.getItem('departmentFilterConfig');
  if (stored) {
    try {
      filterConfig = JSON.parse(stored);
    } catch {
      console.warn('Failed to parse stored filter config, using defaults');
      initializeDefaultFilters();
    }
  } else {
    initializeDefaultFilters();
  }
}

export function initializeDefaultFilters() {
  filterConfig = [
    {
      id: 'departments',
      label: 'Departments',
      type: 'department',
      checked: true,
    },
    { id: 'locations', label: 'Locations', type: 'location', checked: true },
    { id: 'emergency', label: 'Emergency', type: 'emergency', checked: true },
  ];

  // Save to localStorage
  localStorage.setItem('departmentFilterConfig', JSON.stringify(filterConfig));
}

export function saveFilterConfig() {
  localStorage.setItem('departmentFilterConfig', JSON.stringify(filterConfig));
}

// function addFilterConfig(newFilter) {
//   filterConfig.push(newFilter);
//   saveFilterConfig();
// }

// function removeFilterConfig(filterId) {
//   filterConfig = filterConfig.filter((filter) => filter.id !== filterId);
//   saveFilterConfig();
// }

// function updateFilterConfig(filterId, updates) {
//   const index = filterConfig.findIndex((filter) => filter.id === filterId);
//   if (index !== -1) {
//     filterConfig[index] = { ...filterConfig[index], ...updates };
//     saveFilterConfig();
//   }
// }

function performLookup() {
  const searchInput = document.getElementById('department-search-input');
  const searchTerm = searchInput?.value?.trim()?.toLowerCase();

  if (!searchTerm) {
    showPlaceholder();
    return;
  }

  // Get filter preferences dynamically
  const activeFilters = filterConfig.filter((filter) => {
    const checkbox = document.getElementById(`search-${filter.id}`);
    return checkbox?.checked;
  });

  // Filter data based on search term and active filters
  const filtered = departmentData.filter((item) => {
    // Check if item type is in active filters
    const typeFilter = activeFilters.find(
      (filter) => filter.type === item.type
    );
    if (!typeFilter) return false;

    // Check search term match
    return (
      item.name.toLowerCase().includes(searchTerm) ||
      item.category.toLowerCase().includes(searchTerm) ||
      item.description.toLowerCase().includes(searchTerm) ||
      item.number.includes(searchTerm)
    );
  });

  displayResults(filtered, searchTerm);
}

function displayResults(results, searchTerm) {
  const resultsContainer = document.getElementById('lookup-results');

  if (results.length === 0) {
    resultsContainer.innerHTML = `
      <div class="no-results">
        <p>No departments or locations found for "${searchTerm}"</p>
        <p class="text-muted">Try adjusting your search terms or filters</p>
      </div>
    `;
    return;
  }

  // Group results by type
  const grouped = results.reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {});

  let html = `<div class="results-count">${results.length} result${results.length !== 1 ? 's' : ''} found</div>`;

  // Display emergency contacts first
  if (grouped.emergency) {
    html += `<div class="result-group">
      <h4 class="group-title">🚨 Emergency Contacts</h4>
      ${grouped.emergency.map((item) => createResultItem(item, searchTerm)).join('')}
    </div>`;
  }

  // Then departments
  if (grouped.department) {
    html += `<div class="result-group">
      <h4 class="group-title">🏢 Departments</h4>
      ${grouped.department.map((item) => createResultItem(item, searchTerm)).join('')}
    </div>`;
  }

  // Then locations
  if (grouped.location) {
    html += `<div class="result-group">
      <h4 class="group-title">📍 Locations</h4>
      ${grouped.location.map((item) => createResultItem(item, searchTerm)).join('')}
    </div>`;
  }

  resultsContainer.innerHTML = html;
}

function createResultItem(item, searchTerm) {
  const highlightedName = highlightMatch(item.name, searchTerm);
  const highlightedDesc = highlightMatch(item.description, searchTerm);

  return `
    <div class="lookup-result-item" data-id="${item.id}">
      <div class="result-header">
        <div class="result-name">${highlightedName}</div>
        <div class="result-number">${item.number}</div>
      </div>
      <div class="result-details">
        <div class="result-category">${item.category}</div>
        <div class="result-description">${highlightedDesc}</div>
      </div>
      <div class="result-actions">
        <button class="btn btn-sm btn-outline call-btn" data-number="${item.number}" title="Call this number">
          📞 Call
        </button>
        <button class="btn btn-sm btn-outline copy-btn" data-number="${item.number}" title="Copy number">
          📋 Copy
        </button>
      </div>
    </div>
  `;
}

function highlightMatch(text, searchTerm) {
  if (!searchTerm) return text;
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

function showPlaceholder() {
  const resultsContainer = document.getElementById('lookup-results');
  resultsContainer.innerHTML = `
    <div class="lookup-placeholder">
      Enter search terms to find departments or locations
    </div>
  `;
}

// Event delegation for result actions
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('call-btn')) {
    const number = e.target.dataset.number;
    initiateCall(number);
  } else if (e.target.classList.contains('copy-btn')) {
    const number = e.target.dataset.number;
    copyToClipboard(number);
  }
});

function initiateCall(number) {
  // Try to use the telephony integration if available
  if (window.telephonyState && window.telephonyState.connected) {
    // Use integrated telephony
    console.log('Initiating call via telephony integration:', number);
    // This would integrate with the telephony module
  } else {
    // Fallback to tel: link
    window.open(`tel:${number}`, '_self');
  }

  // Close the modal
  const modal = document.getElementById('department-lookup-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

function copyToClipboard(number) {
  navigator.clipboard
    .writeText(number)
    .then(() => {
      // Show success feedback
      const toast = document.createElement('div');
      toast.className = 'toast toast-success';
      toast.textContent = `Copied ${number} to clipboard`;
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.remove();
      }, 2000);
    })
    .catch((err) => {
      console.error('Failed to copy:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = number;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    });
}

// Function to open the lookup modal
export function openDepartmentLookup() {
  const modal = document.getElementById('department-lookup-modal');
  if (modal) {
    modal.style.display = 'flex';
    const searchInput = document.getElementById('department-search-input');
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  }
}

// Function to add or update department/location data
export function addDepartmentEntry(entry) {
  const newEntry = {
    id: entry.id || `custom-${Date.now()}`,
    name: entry.name,
    number: entry.number,
    type: entry.type || 'department',
    category: entry.category || 'Custom',
    description: entry.description || '',
  };

  // Check if entry already exists
  const existingIndex = departmentData.findIndex(
    (item) => item.id === newEntry.id
  );
  if (existingIndex >= 0) {
    departmentData[existingIndex] = newEntry;
  } else {
    departmentData.push(newEntry);
  }

  // Save to localStorage
  localStorage.setItem('departmentData', JSON.stringify(departmentData));
}

// Function to get all department data
export function getDepartmentData() {
  return [...departmentData];
}

// Function to remove a department entry
export function removeDepartmentEntry(id) {
  departmentData = departmentData.filter((item) => item.id !== id);
  localStorage.setItem('departmentData', JSON.stringify(departmentData));
}

// Department Management Interface
function openDepartmentManagement() {
  // Create management modal
  let manageModal = document.getElementById('department-management-modal');
  if (!manageModal) {
    createManagementInterface();
    manageModal = document.getElementById('department-management-modal');
  }

  // Populate the management interface
  populateManagementList();
  populateFilterList();

  // Show the management modal
  manageModal.classList.add('active');
  document.body.classList.add('modal-open');
}

function createManagementInterface() {
  const manageModal = document.createElement('div');
  manageModal.id = 'department-management-modal';
  manageModal.className = 'modal-overlay';
  manageModal.innerHTML = `
    <div class="modal department-management-modal">
      <div class="modal-header">
        <h3>⚙️ Manage Departments & Locations</h3>
        <button class="modal-close-btn">&times;</button>
      </div>
      <div class="modal-body">
        <div class="management-actions">
          <button class="btn btn-primary" id="add-department-btn">Add New Entry</button>
          <button class="btn btn-danger" id="delete-all-btn">Delete All</button>
          <button class="btn btn-secondary" id="reset-defaults-btn">Reset to Defaults</button>
        </div>
        <div class="department-list" id="department-management-list">
          <!-- Department entries will be populated here -->
        </div>
        <div class="filter-management-section">
          <h4>🔍 Manage Filters</h4>
          <div class="filter-list" id="filter-management-list">
            <!-- Filter options will be populated here -->
          </div>
          <div class="filter-actions">
            <button class="btn btn-primary" id="add-filter-btn">Add Filter</button>
            <button class="btn btn-secondary" id="reset-filters-btn">Reset Filters</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(manageModal);
  setupManagementEventListeners();
}

function setupManagementEventListeners() {
  const manageModal = document.getElementById('department-management-modal');
  const addBtn = document.getElementById('add-department-btn');
  const deleteBtn = document.getElementById('delete-all-btn');
  const resetBtn = document.getElementById('reset-defaults-btn');

  // Modal controls
  manageModal?.addEventListener('click', (e) => {
    if (
      e.target === manageModal ||
      e.target.classList.contains('modal-close-btn')
    ) {
      manageModal.classList.remove('active');
      document.body.classList.remove('modal-open');
    }
  });

  // Add new entry
  addBtn?.addEventListener('click', () => {
    openEditDialog();
  });

  // Delete all entries
  deleteBtn?.addEventListener('click', async () => {
    const confirmed = await showConfirmModal({
      title: 'Delete All Entries',
      message:
        'Are you sure you want to delete ALL department entries? This action cannot be undone.',
      confirmLabel: 'Delete All',
      cancelLabel: 'Cancel',
      danger: true,
    });

    if (confirmed) {
      departmentData = [];
      localStorage.setItem('departmentData', JSON.stringify(departmentData));
      populateManagementList();
      showToast('All entries deleted', 'warning');
    }
  });

  // Reset to defaults
  resetBtn?.addEventListener('click', async () => {
    const confirmed = await showConfirmModal({
      title: 'Reset to Defaults',
      message:
        'Are you sure you want to reset all department data to defaults? This will remove all custom entries.',
      confirmLabel: 'Reset to Defaults',
      cancelLabel: 'Cancel',
      danger: false,
    });

    if (confirmed) {
      initializeDefaultData();
      populateManagementList();
      showToast('Department data reset to defaults', 'info');
    }
  });

  // Filter management
  const addFilterBtn = document.getElementById('add-filter-btn');
  const resetFiltersBtn = document.getElementById('reset-filters-btn');

  addFilterBtn?.addEventListener('click', () => {
    openFilterEditDialog();
  });

  resetFiltersBtn?.addEventListener('click', async () => {
    const confirmed = await showConfirmModal({
      title: 'Reset Filters',
      message: 'Are you sure you want to reset all filter options to defaults?',
      confirmLabel: 'Reset Filters',
      cancelLabel: 'Cancel',
      danger: false,
    });

    if (confirmed) {
      initializeDefaultFilters();
      populateFilterList();
      showToast('Filters reset to defaults', 'info');
    }
  });
}

function populateManagementList() {
  const listContainer = document.getElementById('department-management-list');
  if (!listContainer) return;

  listContainer.innerHTML = '';

  departmentData.forEach((item) => {
    const itemElement = document.createElement('div');
    itemElement.className = 'department-item';
    itemElement.innerHTML = `
      <div class="department-info">
        <div class="department-name">${item.name}</div>
        <div class="department-details">
          <span class="department-number">${item.number}</span>
          <span class="department-type type-${item.type}">${item.type}</span>
          <span class="department-category">${item.category}</span>
        </div>
        <div class="department-description">${item.description}</div>
      </div>
      <div class="department-actions">
        <button class="btn btn-sm btn-outline edit-btn" data-id="${item.id}">Edit</button>
        <button class="btn btn-sm btn-danger delete-btn" data-id="${item.id}">Delete</button>
      </div>
    `;

    // Add event listeners
    const editBtn = itemElement.querySelector('.edit-btn');
    const deleteBtn = itemElement.querySelector('.delete-btn');

    editBtn?.addEventListener('click', () => {
      openEditDialog(item.id);
    });

    deleteBtn?.addEventListener('click', async () => {
      const confirmed = await showConfirmModal({
        title: 'Delete Entry',
        message: `Are you sure you want to delete "${item.name}"?`,
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        danger: true,
      });

      if (confirmed) {
        removeDepartmentEntry(item.id);
        populateManagementList();
        showToast('Entry deleted', 'success');
      }
    });

    listContainer.appendChild(itemElement);
  });
}

function populateFilterList() {
  const filterContainer = document.getElementById('filter-management-list');
  if (!filterContainer) return;

  filterContainer.innerHTML = '';

  filterConfig.forEach((filter, index) => {
    const filterElement = document.createElement('div');
    filterElement.className = 'filter-item';
    filterElement.innerHTML = `
      <div class="filter-info">
        <div class="filter-name">${filter.label}</div>
        <div class="filter-type">${filter.type}</div>
      </div>
      <div class="filter-actions">
        <button class="btn btn-sm btn-outline edit-filter-btn" data-index="${index}">Edit</button>
        <button class="btn btn-sm btn-danger delete-filter-btn" data-index="${index}">Delete</button>
      </div>
    `;

    // Add event listeners
    const editBtn = filterElement.querySelector('.edit-filter-btn');
    const deleteBtn = filterElement.querySelector('.delete-filter-btn');

    editBtn?.addEventListener('click', () => {
      openFilterEditDialog(index);
    });

    deleteBtn?.addEventListener('click', async () => {
      const confirmed = await showConfirmModal({
        title: 'Delete Filter',
        message: `Are you sure you want to delete the "${filter.label}" filter?`,
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        danger: true,
      });

      if (confirmed) {
        filterConfig.splice(index, 1);
        saveFilterConfig();
        populateFilterList();
        showToast('Filter deleted', 'success');
      }
    });

    filterContainer.appendChild(filterElement);
  });
}

function openFilterEditDialog(filterIndex = null) {
  const existingFilter =
    filterIndex !== null ? filterConfig[filterIndex] : null;

  const dialog = document.createElement('div');
  dialog.className = 'edit-dialog-overlay';
  dialog.innerHTML = `
    <div class="edit-dialog">
      <h4>${existingFilter ? 'Edit Filter' : 'Add New Filter'}</h4>
      <form id="filter-edit-form">
        <div class="form-group">
          <label for="filter-label">Filter Label:</label>
          <input type="text" id="filter-label" value="${existingFilter ? existingFilter.label : ''}" required>
        </div>
        <div class="form-group">
          <label for="filter-type">Filter Type:</label>
          <input type="text" id="filter-type" value="${existingFilter ? existingFilter.type : ''}" placeholder="e.g., department, location, emergency, or custom type" required>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" id="cancel-filter-btn">Cancel</button>
          <button type="submit" class="btn btn-primary">${existingFilter ? 'Update' : 'Add'} Filter</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(dialog);

  // Setup form submission
  const form = dialog.querySelector('#filter-edit-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const label = document.getElementById('filter-label').value.trim();
    const type = document.getElementById('filter-type').value.trim();

    if (!label) {
      showToast('Filter label is required', 'error');
      return;
    }

    if (!type) {
      showToast('Filter type is required', 'error');
      return;
    }

    if (existingFilter) {
      filterConfig[filterIndex] = { label, type };
    } else {
      filterConfig.push({ label, type });
    }

    saveFilterConfig();
    populateFilterList();
    dialog.remove();
    showToast(`Filter ${existingFilter ? 'updated' : 'added'}`, 'success');
  });

  // Setup cancel button
  const cancelBtn = dialog.querySelector('#cancel-filter-btn');
  cancelBtn.addEventListener('click', () => {
    dialog.remove();
  });
}

function openEditDialog(entryId = null) {
  const existingEntry = entryId
    ? departmentData.find((item) => item.id === entryId)
    : null;

  const dialog = document.createElement('div');
  dialog.className = 'edit-dialog-overlay';
  dialog.innerHTML = `
    <div class="edit-dialog">
      <h4>${existingEntry ? 'Edit Entry' : 'Add New Entry'}</h4>
      <form id="department-edit-form">
        <div class="form-group">
          <label for="edit-name">Name:</label>
          <input type="text" id="edit-name" value="${existingEntry?.name || ''}" required>
        </div>
        <div class="form-group">
          <label for="edit-number">Phone Number:</label>
          <input type="text" id="edit-number" value="${existingEntry?.number || ''}" required>
        </div>
        <div class="form-group">
          <label for="edit-type">Type:</label>
          <select id="edit-type" required>
            <option value="department" ${existingEntry?.type === 'department' ? 'selected' : ''}>Department</option>
            <option value="location" ${existingEntry?.type === 'location' ? 'selected' : ''}>Location</option>
            <option value="emergency" ${existingEntry?.type === 'emergency' ? 'selected' : ''}>Emergency</option>
          </select>
        </div>
        <div class="form-group">
          <label for="edit-category">Category:</label>
          <input type="text" id="edit-category" value="${existingEntry?.category || ''}" required>
        </div>
        <div class="form-group">
          <label for="edit-description">Description:</label>
          <textarea id="edit-description" rows="3">${existingEntry?.description || ''}</textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" id="cancel-edit">Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(dialog);

  const form = document.getElementById('department-edit-form');
  const cancelBtn = document.getElementById('cancel-edit');

  cancelBtn?.addEventListener('click', () => {
    dialog.remove();
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();

    const formData = {
      name: document.getElementById('edit-name').value.trim(),
      number: document.getElementById('edit-number').value.trim(),
      type: document.getElementById('edit-type').value,
      category: document.getElementById('edit-category').value.trim(),
      description: document.getElementById('edit-description').value.trim(),
    };

    if (existingEntry) {
      // Update existing entry
      const index = departmentData.findIndex((item) => item.id === entryId);
      if (index !== -1) {
        departmentData[index] = { ...departmentData[index], ...formData };
      }
    } else {
      // Add new entry
      const newEntry = {
        id: `custom-${Date.now()}`,
        ...formData,
      };
      departmentData.push(newEntry);
    }

    // Save to localStorage
    localStorage.setItem('departmentData', JSON.stringify(departmentData));

    // Refresh the list
    populateManagementList();

    // Close dialog
    dialog.remove();

    showToast(existingEntry ? 'Entry updated' : 'Entry added', 'success');
  });
}

// Function to open the department lookup modal (called from toolbar)
export function openDepartmentLookupModal() {
  // Create the modal if it doesn't exist
  let modal = document.getElementById('department-lookup-modal');
  if (!modal) {
    loadFilterConfig();
    createLookupInterface();
    setupLookupEventListeners();
    loadDepartmentData();
    modal = document.getElementById('department-lookup-modal');
  }

  // Show the modal
  modal.classList.add('active');
  document.body.classList.add('modal-open');

  // Focus on search input
  const searchInput = document.getElementById('department-search-input');
  if (searchInput) {
    setTimeout(() => searchInput.focus(), 100);
  }
}
