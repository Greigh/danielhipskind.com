// Export Functionality Module
// Provides CSV and PDF export capabilities for reports and data

export function initializeExportFunctionality() {
  createExportInterface();
}

function createExportInterface() {
  // Check if modal already exists
  if (document.getElementById('export-modal')) {
    return; // Modal already exists
  }

  // Create export modal
  const exportModal = document.createElement('div');
  exportModal.id = 'export-modal';
  exportModal.className = 'modal-overlay';
  exportModal.innerHTML = `
    <div class="modal export-modal">
      <div class="modal-header">
        <h3>📤 Export Data</h3>
        <button class="modal-close-btn">&times;</button>
      </div>
      <div class="modal-body">
        <div class="export-options">
          <div class="export-section">
            <h4>Data to Export</h4>
            <div class="checkbox-group">
              <label><input type="checkbox" id="export-calls" checked> Call History</label>
              <label><input type="checkbox" id="export-notes" checked> Notes</label>
              <label><input type="checkbox" id="export-tasks"> Tasks</label>
              <label><input type="checkbox" id="export-performance"> Performance Metrics</label>
            </div>
          </div>

          <div class="export-section">
            <h4>Date Range</h4>
            <div class="date-range">
              <label>
                From: <input type="date" id="export-date-from">
              </label>
              <label>
                To: <input type="date" id="export-date-to">
              </label>
            </div>
          </div>

          <div class="export-section">
            <h4>Export Format</h4>
            <div class="format-options">
              <label><input type="radio" name="export-format" value="csv" checked> CSV</label>
              <label><input type="radio" name="export-format" value="json"> JSON</label>
              <label><input type="radio" name="export-format" value="pdf"> PDF (Coming Soon)</label>
            </div>
          </div>
        </div>

        <div class="export-actions">
          <button id="preview-export-btn" class="btn btn-secondary">Preview</button>
          <button id="download-export-btn" class="btn btn-primary">Download</button>
        </div>

        <div id="export-preview" class="export-preview" style="display: none;">
          <h4>Export Preview</h4>
          <div id="preview-content"></div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(exportModal);
  setupExportEventListeners();
}

function setupExportEventListeners() {
  const modal = document.getElementById('export-modal');
  const closeBtn = modal?.querySelector('.modal-close-btn');
  const previewBtn = document.getElementById('preview-export-btn');
  const downloadBtn = document.getElementById('download-export-btn');

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

  previewBtn?.addEventListener('click', () => {
    showExportPreview();
  });

  downloadBtn?.addEventListener('click', () => {
    performExport();
  });

  // Set default date range (last 30 days)
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  document.getElementById('export-date-to').valueAsDate = today;
  document.getElementById('export-date-from').valueAsDate = thirtyDaysAgo;
}

function showExportPreview() {
  const data = collectExportData();
  const format = document.querySelector(
    'input[name="export-format"]:checked'
  ).value;
  const preview = document.getElementById('export-preview');
  const content = document.getElementById('preview-content');

  let previewHtml = '';

  if (format === 'csv') {
    previewHtml = generateCSVPreview(data);
  } else if (format === 'json') {
    previewHtml = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
  }

  content.innerHTML = previewHtml;
  preview.style.display = 'block';
}

function performExport() {
  const data = collectExportData();
  const format = document.querySelector(
    'input[name="export-format"]:checked'
  ).value;

  if (format === 'csv') {
    exportToCSV(data);
  } else if (format === 'json') {
    exportToJSON(data);
  } else if (format === 'pdf') {
    showToast('PDF export coming soon!', 'info');
  }
}

function collectExportData() {
  const options = {
    calls: document.getElementById('export-calls').checked,
    notes: document.getElementById('export-notes').checked,
    tasks: document.getElementById('export-tasks').checked,
    performance: document.getElementById('export-performance').checked,
  };

  const dateFrom = document.getElementById('export-date-from').value;
  const dateTo = document.getElementById('export-date-to').value;

  const data = {};

  if (options.calls) {
    let calls = JSON.parse(localStorage.getItem('callHistory')) || [];
    if (dateFrom && dateTo) {
      calls = filterByDateRange(calls, dateFrom, dateTo, 'startTime');
    }
    data.calls = calls;
  }

  if (options.notes) {
    let notes = JSON.parse(localStorage.getItem('notes')) || [];
    if (dateFrom && dateTo) {
      notes = filterByDateRange(notes, dateFrom, dateTo, 'timestamp');
    }
    data.notes = notes;
  }

  if (options.tasks) {
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    if (dateFrom && dateTo) {
      tasks = filterByDateRange(tasks, dateFrom, dateTo, 'createdAt');
    }
    data.tasks = tasks;
  }

  if (options.performance) {
    // This would integrate with performance metrics
    data.performance = {
      timestamp: new Date().toISOString(),
      metrics: 'Performance data export coming soon',
    };
  }

  return data;
}

function filterByDateRange(items, dateFrom, dateTo, dateField) {
  const from = new Date(dateFrom);
  const to = new Date(dateTo);
  to.setHours(23, 59, 59, 999); // End of day

  return items.filter((item) => {
    const itemDate = new Date(item[dateField]);
    return itemDate >= from && itemDate <= to;
  });
}

function generateCSVPreview(data) {
  let preview = '<div class="csv-preview">';

  if (data.calls && data.calls.length > 0) {
    preview += `<h5>Call History (${data.calls.length} records)</h5>`;
    preview += '<table class="preview-table"><thead><tr>';
    preview +=
      '<th>Caller Name</th><th>Phone</th><th>Type</th><th>Start Time</th><th>Duration</th>';
    preview += '</tr></thead><tbody>';
    data.calls.slice(0, 3).forEach((call) => {
      preview += `<tr>
        <td>${call.callerName}</td>
        <td>${call.callerPhone}</td>
        <td>${call.callType}</td>
        <td>${new Date(call.startTime).toLocaleString()}</td>
        <td>${call.duration ? Math.floor(call.duration / 1000 / 60) + 'm' : 'N/A'}</td>
      </tr>`;
    });
    preview += '</tbody></table>';
    if (data.calls.length > 3) {
      preview += `<p>...and ${data.calls.length - 3} more records</p>`;
    }
  }

  if (data.notes && data.notes.length > 0) {
    preview += `<h5>Notes (${data.notes.length} records)</h5>`;
    preview += '<table class="preview-table"><thead><tr>';
    preview += '<th>Title</th><th>Content</th><th>Timestamp</th>';
    preview += '</tr></thead><tbody>';
    data.notes.slice(0, 3).forEach((note) => {
      preview += `<tr>
        <td>${note.title}</td>
        <td>${note.content.substring(0, 50)}...</td>
        <td>${new Date(note.timestamp).toLocaleString()}</td>
      </tr>`;
    });
    preview += '</tbody></table>';
  }

  preview += '</div>';
  return preview;
}

function exportToCSV(data) {
  let csvContent = '';

  // Export calls
  if (data.calls && data.calls.length > 0) {
    csvContent += 'Call History\n';
    csvContent += 'Caller Name,Phone,Type,Start Time,Duration,Notes\n';
    data.calls.forEach((call) => {
      csvContent += `"${call.callerName}","${call.callerPhone}","${call.callType}","${new Date(call.startTime).toLocaleString()}","${call.duration ? Math.floor(call.duration / 1000 / 60) + 'm' : 'N/A'}","${call.notes || ''}"\n`;
    });
    csvContent += '\n';
  }

  // Export notes
  if (data.notes && data.notes.length > 0) {
    csvContent += 'Notes\n';
    csvContent += 'Title,Content,Timestamp,Tags\n';
    data.notes.forEach((note) => {
      csvContent += `"${note.title}","${note.content}","${new Date(note.timestamp).toLocaleString()}","${note.tags || ''}"\n`;
    });
    csvContent += '\n';
  }

  // Export tasks
  if (data.tasks && data.tasks.length > 0) {
    csvContent += 'Tasks\n';
    csvContent += 'Title,Description,Priority,Status,Due Date,Created\n';
    data.tasks.forEach((task) => {
      csvContent += `"${task.title}","${task.description || ''}","${task.priority}","${task.completed ? 'Completed' : 'Pending'}","${task.dueDate || ''}","${new Date(task.createdAt).toLocaleString()}"\n`;
    });
  }

  downloadFile(csvContent, 'call-center-export.csv', 'text/csv');
}

function exportToJSON(data) {
  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, 'call-center-export.json', 'application/json');
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast(`Exported data to ${filename}`, 'success');
}

// Function to open export modal (called from toolbar)
export function openExportModal() {
  let modal = document.getElementById('export-modal');
  if (!modal) {
    createExportInterface();
    modal = document.getElementById('export-modal');
  }

  if (modal) {
    modal.classList.add('active');
    document.body.classList.add('modal-open');
  }
}

// Quick export functions for common use cases
export function exportTodaysCalls() {
  const today = new Date().toDateString();
  const calls = JSON.parse(localStorage.getItem('callHistory')) || [];
  const todaysCalls = calls.filter(
    (call) => new Date(call.startTime).toDateString() === today
  );

  if (todaysCalls.length === 0) {
    showToast('No calls to export today', 'info');
    return;
  }

  const data = { calls: todaysCalls };
  exportToCSV(data);
}

export function exportAllData() {
  const data = collectExportData();
  // Enable all options for full export
  document.getElementById('export-calls').checked = true;
  document.getElementById('export-notes').checked = true;
  document.getElementById('export-tasks').checked = true;
  document.getElementById('export-performance').checked = true;

  exportToCSV(data);
}

// Import showToast for notifications
import { showToast } from '../utils/toast.js';
