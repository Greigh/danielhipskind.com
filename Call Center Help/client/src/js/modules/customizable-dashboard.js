// Customizable Dashboard Module
// Allows agents to arrange and customize dashboard widgets

export const availableWidgets = {
  'call-stats': {
    id: 'call-stats',
    title: 'Call Statistics',
    description: 'Daily call counts and metrics',
    defaultSize: { width: 2, height: 1 },
    render: renderCallStatsWidget,
  },
  'active-timer': {
    id: 'active-timer',
    title: 'Active Timer',
    description: 'Current call timer status',
    defaultSize: { width: 1, height: 1 },
    render: renderActiveTimerWidget,
  },
  'recent-calls': {
    id: 'recent-calls',
    title: 'Recent Calls',
    description: 'Last 5 call interactions',
    defaultSize: { width: 2, height: 2 },
    render: renderRecentCallsWidget,
  },
  'pending-tasks': {
    id: 'pending-tasks',
    title: 'Pending Tasks',
    description: 'Outstanding tasks and follow-ups',
    defaultSize: { width: 2, height: 1 },
    render: renderPendingTasksWidget,
  },
  'performance-metrics': {
    id: 'performance-metrics',
    title: 'Performance Metrics',
    description: 'Key performance indicators',
    defaultSize: { width: 2, height: 1 },
    render: renderPerformanceMetricsWidget,
  },
  'quick-actions': {
    id: 'quick-actions',
    title: 'Quick Actions',
    description: 'Frequently used actions',
    defaultSize: { width: 2, height: 1 },
    render: renderQuickActionsWidget,
  },
};

export function initializeCustomizableDashboard() {
  const dashboardSection = document.getElementById('analytics-dashboard');
  if (!dashboardSection) {
    // Nothing to do when the analytics/dashboard section is not present
    return;
  }

  createDashboardInterface();
  loadDashboardLayout();
}

function createDashboardInterface() {
  const dashboardSection = document.getElementById('analytics-dashboard');
  if (!dashboardSection) return;

  // Add dashboard controls
  const controls = document.createElement('div');
  controls.className = 'dashboard-controls';
  controls.innerHTML = `
    <div class="dashboard-header">
      <h3>📊 Custom Dashboard</h3>
      <div class="dashboard-actions">
        <button id="add-widget-btn" class="btn btn-secondary">Add Widget</button>
        <button id="reset-dashboard-btn" class="btn btn-outline">Reset Layout</button>
        <button id="save-dashboard-btn" class="btn btn-primary">Save Layout</button>
      </div>
    </div>
    <div id="widget-selector" class="widget-selector" style="display: none;">
      <h4>Add Widget</h4>
      <div class="widget-grid">
        ${Object.values(availableWidgets)
          .map(
            (widget) => `
          <div class="widget-option" data-widget-id="${widget.id}">
            <div class="widget-icon">${getWidgetIcon(widget.id)}</div>
            <div class="widget-info">
              <h5>${widget.title}</h5>
              <p>${widget.description}</p>
            </div>
            <button class="add-widget-to-dashboard btn btn-small">Add</button>
          </div>
        `
          )
          .join('')}
      </div>
    </div>
  `;

  // Add dashboard grid
  const grid = document.createElement('div');
  grid.id = 'dashboard-grid';
  grid.className = 'dashboard-grid';

  // Insert controls at the top of analytics section
  const sectionContent =
    dashboardSection.querySelector('.section-content') || dashboardSection;
  sectionContent.insertBefore(controls, sectionContent.firstChild);
  sectionContent.appendChild(grid);

  setupDashboardEventListeners();
}

function setupDashboardEventListeners() {
  const addWidgetBtn = document.getElementById('add-widget-btn');
  const widgetSelector = document.getElementById('widget-selector');
  const resetBtn = document.getElementById('reset-dashboard-btn');
  const saveBtn = document.getElementById('save-dashboard-btn');

  // Toggle widget selector
  addWidgetBtn?.addEventListener('click', () => {
    widgetSelector.style.display =
      widgetSelector.style.display === 'none' ? 'block' : 'none';
  });

  // Add widget to dashboard
  document.querySelectorAll('.add-widget-to-dashboard').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const widgetId = e.target.closest('.widget-option').dataset.widgetId;
      addWidgetToDashboard(widgetId);
      widgetSelector.style.display = 'none';
    });
  });

  // Reset dashboard
  resetBtn?.addEventListener('click', () => {
    if (confirm('Reset dashboard to default layout?')) {
      resetDashboard();
    }
  });

  // Save dashboard
  saveBtn?.addEventListener('click', () => {
    saveDashboardLayout();
    showToast('Dashboard layout saved!', 'success');
  });
}

function addWidgetToDashboard(widgetId, showToast = true) {
  const widget = availableWidgets[widgetId];
  if (!widget) return;
  const grid = document.getElementById('dashboard-grid');
  if (!grid) {
    console.warn('Dashboard grid not found; cannot add widget:', widgetId);
    return;
  }
  const widgetElement = document.createElement('div');
  widgetElement.className = `dashboard-widget widget-${widgetId}`;
  widgetElement.dataset.widgetId = widgetId;
  widgetElement.style.gridColumn = `span ${widget.defaultSize.width}`;
  widgetElement.style.gridRow = `span ${widget.defaultSize.height}`;

  widgetElement.innerHTML = `
    <div class="widget-header">
      <h4>${widget.title}</h4>
      <button class="widget-remove-btn" title="Remove widget">×</button>
    </div>
    <div class="widget-content">
      ${widget.render()}
    </div>
  `;

  grid.appendChild(widgetElement);

  // Add remove functionality
  widgetElement
    .querySelector('.widget-remove-btn')
    .addEventListener('click', () => {
      widgetElement.remove();
    });

  if (showToast) {
    showToast(`Added ${widget.title} widget`, 'success');
  }
}

function resetDashboard() {
  const grid = document.getElementById('dashboard-grid');
  if (!grid) return;
  grid.innerHTML = '';

  // Add default widgets
  const defaultWidgets = ['call-stats', 'active-timer', 'recent-calls'];
  defaultWidgets.forEach((widgetId) => {
    addWidgetToDashboard(widgetId, false); // Don't show toast for default widgets
  });

  saveDashboardLayout();
}

function saveDashboardLayout() {
  const grid = document.getElementById('dashboard-grid');
  if (!grid) return;
  const widgets = Array.from(grid.children).map((widget) => ({
    id: widget.dataset.widgetId,
    position: Array.from(grid.children).indexOf(widget),
  }));

  localStorage.setItem('dashboard-layout', JSON.stringify(widgets));
}

function loadDashboardLayout() {
  const saved = localStorage.getItem('dashboard-layout');
  const grid = document.getElementById('dashboard-grid');
  if (!grid) return;

  if (saved) {
    try {
      const layout = JSON.parse(saved);
      if (Array.isArray(layout)) {
        layout.forEach((item) => {
          if (
            item &&
            typeof item === 'object' &&
            item.id &&
            availableWidgets[item.id]
          ) {
            addWidgetToDashboard(item.id, false); // Don't show toast when loading saved layout
          }
        });
      } else {
        console.warn(
          'Saved dashboard layout is not an array, resetting to default'
        );
        resetDashboard();
      }
    } catch (e) {
      console.error('Error loading dashboard layout:', e);
      resetDashboard();
    }
  } else {
    // Load default layout
    resetDashboard();
  }
}

// Widget rendering functions
function renderCallStatsWidget() {
  const callHistory = JSON.parse(localStorage.getItem('callHistory')) || [];
  const today = new Date().toDateString();
  const todayCalls = callHistory.filter(
    (call) => new Date(call.startTime).toDateString() === today
  );

  return `
    <div class="stats-grid">
      <div class="stat-item">
        <span class="stat-number">${todayCalls.length}</span>
        <span class="stat-label">Today's Calls</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">${callHistory.length}</span>
        <span class="stat-label">Total Calls</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">${Math.round(todayCalls.reduce((acc, call) => acc + (call.duration || 0), 0) / 1000 / 60)}m</span>
        <span class="stat-label">Talk Time</span>
      </div>
    </div>
  `;
}

function renderActiveTimerWidget() {
  return `
    <div class="timer-display">
      <div class="timer-value">--:--:--</div>
      <div class="timer-status">No active timer</div>
    </div>
  `;
}

function renderRecentCallsWidget() {
  const callHistory = JSON.parse(localStorage.getItem('callHistory')) || [];
  const recentCalls = callHistory.slice(0, 5);

  return `
    <div class="recent-calls-list">
      ${
        recentCalls.length === 0
          ? '<p>No recent calls</p>'
          : recentCalls
              .map(
                (call) => `
          <div class="recent-call-item">
            <div class="call-info">
              <strong>${call.callerName}</strong>
              <span class="call-time">${new Date(call.startTime).toLocaleTimeString()}</span>
            </div>
            <span class="call-type ${call.callType}">${call.callType}</span>
          </div>
        `
              )
              .join('')
      }
    </div>
  `;
}

function renderPendingTasksWidget() {
  const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
  const pendingTasks = tasks.filter((task) => !task.completed);

  return `
    <div class="pending-tasks-list">
      ${
        pendingTasks.length === 0
          ? '<p>No pending tasks</p>'
          : pendingTasks
              .slice(0, 3)
              .map(
                (task) => `
          <div class="task-item">
            <input type="checkbox" ${task.completed ? 'checked' : ''}>
            <span class="${task.completed ? 'completed' : ''}">${task.title}</span>
            <span class="priority priority-${task.priority}">${task.priority}</span>
          </div>
        `
              )
              .join('')
      }
      ${pendingTasks.length > 3 ? `<p>...and ${pendingTasks.length - 3} more</p>` : ''}
    </div>
  `;
}

function renderPerformanceMetricsWidget() {
  // Placeholder - would integrate with performance-metrics.js
  return `
    <div class="performance-metrics">
      <div class="metric-item">
        <span class="metric-value">--</span>
        <span class="metric-label">Avg Handle Time</span>
      </div>
      <div class="metric-item">
        <span class="metric-value">--</span>
        <span class="metric-label">First Call Resolution</span>
      </div>
    </div>
  `;
}

function renderQuickActionsWidget() {
  return `
    <div class="widget-quick-actions">
      <button class="quick-action-widget-btn">📞 New Call</button>
      <button class="quick-action-widget-btn">⏱️ Start Timer</button>
      <button class="quick-action-widget-btn">📝 Add Note</button>
    </div>
  `;
}

function getWidgetIcon(widgetId) {
  const icons = {
    'call-stats': '📊',
    'active-timer': '⏱️',
    'recent-calls': '📞',
    'pending-tasks': '✅',
    'performance-metrics': '📈',
    'quick-actions': '⚡',
  };
  return icons[widgetId] || '📦';
}

// Function to refresh all dashboard widgets
export function refreshDashboardWidgets() {
  const widgets = document.querySelectorAll('.dashboard-widget');
  widgets.forEach((widget) => {
    const widgetId = widget.dataset.widgetId;
    const content = widget.querySelector('.widget-content');
    if (availableWidgets[widgetId] && content) {
      content.innerHTML = availableWidgets[widgetId].render();
    }
  });
}

// Import showToast for notifications
import { showToast } from '../utils/toast.js';
