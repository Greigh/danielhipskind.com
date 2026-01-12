// Customer History Search Module
// Provides quick lookup across all customer interactions

export function initializeCustomerHistorySearch() {
  createSearchInterface();
  setupSearchEventListeners();
}

function createSearchInterface() {
  // Check if modal already exists
  if (document.getElementById('customer-search-modal')) {
    return; // Modal already exists
  }

  // Create a search modal/section that can be opened from the toolbar
  const searchModal = document.createElement('div');
  searchModal.id = 'customer-search-modal';
  searchModal.className = 'modal-overlay';
  searchModal.innerHTML = `
    <div class="modal customer-search-modal">
      <div class="modal-header">
        <h3>🔍 Customer History Search</h3>
        <button class="modal-close-btn">&times;</button>
      </div>
      <div class="modal-body">
        <div class="search-input-group">
          <input type="text" id="customer-search-input" placeholder="Search by name, phone, email, or notes..." class="search-input">
          <button id="customer-search-btn" class="btn btn-primary">Search</button>
        </div>
        <div class="search-filters">
          <label><input type="checkbox" id="search-calls" checked> Call History</label>
          <label><input type="checkbox" id="search-notes" checked> Notes</label>
          <label><input type="checkbox" id="search-tasks" checked> Tasks</label>
          <label><input type="checkbox" id="search-crm" checked> CRM Data</label>
        </div>
        <div id="search-results" class="search-results">
          <div class="search-placeholder">
            Enter search terms to find customer history
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(searchModal);
}

function setupSearchEventListeners() {
  // Modal controls
  const modal = document.getElementById('customer-search-modal');
  const closeBtn = modal?.querySelector('.modal-close-btn');
  const searchInput = document.getElementById('customer-search-input');
  const searchBtn = document.getElementById('customer-search-btn');

  closeBtn?.addEventListener('click', () => {
    modal.classList.remove('active');
    document.body.classList.remove('modal-open');
  });

  modal?.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
      document.body.classList.remove('modal-open');
    }
  });

  // Search functionality
  const performSearch = () => {
    const query = searchInput?.value.trim();
    if (!query) return;

    const results = performCustomerSearch(query);
    displaySearchResults(results);
  };

  searchBtn?.addEventListener('click', performSearch);
  searchInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      performSearch();
    }
  });
}

function performCustomerSearch(query) {
  const results = {
    calls: [],
    notes: [],
    tasks: [],
    crm: [],
  };

  const searchFilters = {
    calls: document.getElementById('search-calls')?.checked,
    notes: document.getElementById('search-notes')?.checked,
    tasks: document.getElementById('search-tasks')?.checked,
    crm: document.getElementById('search-crm')?.checked,
  };

  // Search call history
  if (searchFilters.calls) {
    const callHistory = JSON.parse(localStorage.getItem('callHistory')) || [];
    results.calls = callHistory.filter((call) =>
      matchesQuery(call, query, [
        'callerName',
        'callerPhone',
        'notes',
        'callType',
      ])
    );
  }

  // Search notes
  if (searchFilters.notes) {
    const notes = JSON.parse(localStorage.getItem('notes')) || [];
    results.notes = notes.filter((note) =>
      matchesQuery(note, query, ['title', 'content', 'tags'])
    );
  }

  // Search tasks
  if (searchFilters.tasks) {
    const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    results.tasks = tasks.filter((task) =>
      matchesQuery(task, query, ['title', 'description', 'priority'])
    );
  }

  // Search CRM data (if available)
  if (searchFilters.crm) {
    const crmData = JSON.parse(localStorage.getItem('crm-contacts')) || [];
    results.crm = crmData.filter((contact) =>
      matchesQuery(contact, query, [
        'name',
        'phone',
        'email',
        'company',
        'notes',
      ])
    );
  }

  return results;
}

function matchesQuery(item, query, fields) {
  const lowerQuery = query.toLowerCase();
  return fields.some((field) => {
    const value = item[field];
    if (typeof value === 'string') {
      return value.toLowerCase().includes(lowerQuery);
    }
    return false;
  });
}

function displaySearchResults(results) {
  const resultsContainer = document.getElementById('search-results');
  if (!resultsContainer) return;

  const totalResults =
    results.calls.length +
    results.notes.length +
    results.tasks.length +
    results.crm.length;

  if (totalResults === 0) {
    resultsContainer.innerHTML =
      '<div class="no-results">No matching records found</div>';
    return;
  }

  let html = `<div class="results-summary">Found ${totalResults} matching records</div>`;

  // Display calls
  if (results.calls.length > 0) {
    html += `<div class="result-section">
      <h4>📞 Call History (${results.calls.length})</h4>
      ${results.calls
        .slice(0, 5)
        .map(
          (call) => `
        <div class="result-item call-result">
          <div class="result-header">
            <strong>${call.callerName}</strong> - ${call.callerPhone}
            <span class="result-type">${call.callType}</span>
          </div>
          <div class="result-meta">${new Date(call.startTime).toLocaleString()}</div>
          ${call.notes ? `<div class="result-content">${call.notes.substring(0, 100)}...</div>` : ''}
        </div>
      `
        )
        .join('')}
    </div>`;
  }

  // Display notes
  if (results.notes.length > 0) {
    html += `<div class="result-section">
      <h4>📝 Notes (${results.notes.length})</h4>
      ${results.notes
        .slice(0, 5)
        .map(
          (note) => `
        <div class="result-item note-result">
          <div class="result-header">
            <strong>${note.title}</strong>
          </div>
          <div class="result-meta">${new Date(note.timestamp).toLocaleString()}</div>
          <div class="result-content">${note.content.substring(0, 100)}...</div>
        </div>
      `
        )
        .join('')}
    </div>`;
  }

  // Display tasks
  if (results.tasks.length > 0) {
    html += `<div class="result-section">
      <h4>✅ Tasks (${results.tasks.length})</h4>
      ${results.tasks
        .slice(0, 5)
        .map(
          (task) => `
        <div class="result-item task-result">
          <div class="result-header">
            <strong>${task.title}</strong>
            <span class="result-type priority-${task.priority}">${task.priority}</span>
          </div>
          <div class="result-meta">Due: ${task.dueDate || 'No due date'}</div>
          ${task.description ? `<div class="result-content">${task.description.substring(0, 100)}...</div>` : ''}
        </div>
      `
        )
        .join('')}
    </div>`;
  }

  // Display CRM data
  if (results.crm.length > 0) {
    html += `<div class="result-section">
      <h4>🏢 CRM Contacts (${results.crm.length})</h4>
      ${results.crm
        .slice(0, 5)
        .map(
          (contact) => `
        <div class="result-item crm-result">
          <div class="result-header">
            <strong>${contact.name}</strong>
            ${contact.company ? `- ${contact.company}` : ''}
          </div>
          <div class="result-meta">${contact.phone} | ${contact.email}</div>
          ${contact.notes ? `<div class="result-content">${contact.notes.substring(0, 100)}...</div>` : ''}
        </div>
      `
        )
        .join('')}
    </div>`;
  }

  resultsContainer.innerHTML = html;
}

// Function to open the search modal (called from toolbar)
export function openCustomerSearch() {
  let modal = document.getElementById('customer-search-modal');
  if (!modal) {
    createSearchInterface();
    setupSearchEventListeners();
    modal = document.getElementById('customer-search-modal');
  }

  if (modal) {
    modal.classList.add('active');
    document.body.classList.add('modal-open');
    const searchInput = document.getElementById('customer-search-input');
    if (searchInput) {
      setTimeout(() => searchInput.focus(), 100);
    }
  }
}

// Function to search for a specific customer (for API integration)
export function searchCustomer(query) {
  return performCustomerSearch(query);
}
