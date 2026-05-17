// Time Tracking & Billing Module
// Handles time tracking for billable calls and billing management

export const timeTrackingState = {
  activeTimers: new Map(),
  timeEntries: [],
  billingRates: [],
  projects: [],
  currentSession: null,
};

// Default billing rates
const defaultRates = [
  {
    id: 'standard-support',
    name: 'Standard Support',
    rate: 75.0,
    currency: 'USD',
    unit: 'hour',
    description: 'General technical support',
  },
  {
    id: 'premium-support',
    name: 'Premium Support',
    rate: 125.0,
    currency: 'USD',
    unit: 'hour',
    description: 'Priority technical support with faster response',
  },
  {
    id: 'consultation',
    name: 'Consultation',
    rate: 150.0,
    currency: 'USD',
    unit: 'hour',
    description: 'Expert consultation and advisory services',
  },
];

// Default projects
const defaultProjects = [
  {
    id: 'general-support',
    name: 'General Support',
    client: 'Internal',
    billingRate: 'standard-support',
    status: 'active',
  },
  {
    id: 'premium-client',
    name: 'Premium Client Support',
    client: 'Acme Corp',
    billingRate: 'premium-support',
    status: 'active',
  },
];

export function initializeTimeTracking(doc = document) {
  loadTimeTrackingData();
  setupTimeTrackingEventListeners(doc);
  renderTimeTrackingUI(doc);
  startBackgroundTimer();
}

function loadTimeTrackingData() {
  try {
    const saved = localStorage.getItem('time-tracking-data');
    if (saved) {
      const data = JSON.parse(saved);
      timeTrackingState.timeEntries = data.timeEntries || [];
      timeTrackingState.billingRates = data.billingRates || defaultRates;
      timeTrackingState.projects = data.projects || defaultProjects;
    } else {
      timeTrackingState.billingRates = defaultRates;
      timeTrackingState.projects = defaultProjects;
      timeTrackingState.timeEntries = [];
      saveTimeTrackingData();
    }
  } catch (error) {
    console.error('Error loading time tracking data:', error);
    timeTrackingState.billingRates = defaultRates;
    timeTrackingState.projects = defaultProjects;
  }
}

function saveTimeTrackingData() {
  try {
    const data = {
      timeEntries: timeTrackingState.timeEntries,
      billingRates: timeTrackingState.billingRates,
      projects: timeTrackingState.projects,
    };
    localStorage.setItem('time-tracking-data', JSON.stringify(data));
  } catch (error) {
    console.error('Error saving time tracking data:', error);
  }
}

function setupTimeTrackingEventListeners(doc) {
  // Integration with call logging
  doc.addEventListener('call:started', handleCallStarted);
  doc.addEventListener('call:ended', handleCallEnded);

  // Manual timer controls
  doc.addEventListener('click', handleTimerControls);
}

function renderTimeTrackingUI(doc) {
  const container = doc.getElementById('time-tracking-container');
  if (!container) return;

  const activeTimers = Array.from(timeTrackingState.activeTimers.values());
  const todayEntries = getTodayEntries();

  container.innerHTML = `
    <div class="time-tracking-section">
      <div class="tt-header">
        <h3>Time Tracking & Billing</h3>
        <div class="tt-controls">
          <button class="btn-sm" onclick="startManualTimer()">Start Timer</button>
          <button class="btn-sm btn-secondary" onclick="exportTimeReport()">Export Report</button>
        </div>
      </div>

      <div class="tt-stats">
        <div class="stat-card">
          <h4>Today's Hours</h4>
          <span class="stat-value">${calculateTodayHours().toFixed(2)}</span>
        </div>
        <div class="stat-card">
          <h4>Today's Revenue</h4>
          <span class="stat-value">$${calculateTodayRevenue().toFixed(2)}</span>
        </div>
        <div class="stat-card">
          <h4>Active Timers</h4>
          <span class="stat-value">${activeTimers.length}</span>
        </div>
        <div class="stat-card">
          <h4>This Week</h4>
          <span class="stat-value">${calculateWeekHours().toFixed(2)}h</span>
        </div>
      </div>

      <div class="tt-content">
        <div class="tt-active-timers" id="active-timers-list">
          ${renderActiveTimers(activeTimers)}
        </div>

        <div class="tt-recent-entries">
          <h4>Today's Entries</h4>
          <div class="entries-list" id="today-entries-list">
            ${renderTimeEntries(todayEntries)}
          </div>
        </div>
      </div>

      <div class="tt-projects">
        <h4>Projects</h4>
        <div class="projects-list" id="projects-list"></div>
      </div>
    </div>
  `;

  renderProjectsList(doc);
}

function renderActiveTimers(timers) {
  if (timers.length === 0) {
    return '<div class="empty-state">No active timers</div>';
  }

  return timers
    .map(
      (timer) => `
    <div class="active-timer-card">
      <div class="timer-info">
        <h5>${timer.description || 'Manual Timer'}</h5>
        <div class="timer-meta">
          <span class="timer-project">${timer.projectName || 'No Project'}</span>
          <span class="timer-duration" id="timer-${timer.id}">${formatDuration(timer.elapsed)}</span>
        </div>
      </div>
      <div class="timer-controls">
        <button class="btn-icon" onclick="pauseTimer('${timer.id}')" title="Pause">⏸️</button>
        <button class="btn-icon" onclick="stopTimer('${timer.id}')" title="Stop">⏹️</button>
      </div>
    </div>
  `
    )
    .join('');
}

function renderTimeEntries(entries) {
  if (entries.length === 0) {
    return '<div class="empty-state">No time entries today</div>';
  }

  return entries
    .map(
      (entry) => `
    <div class="time-entry-card">
      <div class="entry-info">
        <h5>${entry.description}</h5>
        <div class="entry-meta">
          <span class="entry-project">${entry.projectName}</span>
          <span class="entry-duration">${formatDuration(entry.duration)}</span>
          <span class="entry-time">${new Date(entry.startTime).toLocaleTimeString()}</span>
        </div>
      </div>
      <div class="entry-amount">
        $${calculateEntryAmount(entry).toFixed(2)}
      </div>
    </div>
  `
    )
    .join('');
}

function renderProjectsList(doc) {
  const container = doc.getElementById('projects-list');
  if (!container) return;

  container.innerHTML = timeTrackingState.projects
    .map(
      (project) => `
    <div class="project-card">
      <div class="project-info">
        <h5>${project.name}</h5>
        <div class="project-meta">
          <span class="project-client">${project.client}</span>
          <span class="project-rate">${getRateDisplay(project.billingRate)}</span>
        </div>
      </div>
      <div class="project-actions">
        <button class="btn-icon" onclick="startProjectTimer('${project.id}')" title="Start Timer">▶️</button>
        <button class="btn-icon" onclick="editProject('${project.id}')" title="Edit">✏️</button>
      </div>
    </div>
  `
    )
    .join('');
}

function getRateDisplay(rateId) {
  const rate = timeTrackingState.billingRates.find((r) => r.id === rateId);
  return rate ? `$${rate.rate}/${rate.unit}` : 'No rate';
}

function startBackgroundTimer() {
  setInterval(() => {
    timeTrackingState.activeTimers.forEach((timer, id) => {
      timer.elapsed = Date.now() - timer.startTime;
      updateTimerDisplay(id);
    });
  }, 1000);
}

function updateTimerDisplay(timerId) {
  const timerElement = document.getElementById(`timer-${timerId}`);
  if (timerElement && timeTrackingState.activeTimers.has(timerId)) {
    const timer = timeTrackingState.activeTimers.get(timerId);
    timerElement.textContent = formatDuration(timer.elapsed);
  }
}

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

export function startTimer(description = 'Manual Timer', projectId = null) {
  const timerId = `timer-${Date.now()}`;

  const project = projectId
    ? timeTrackingState.projects.find((p) => p.id === projectId)
    : null;

  const timer = {
    id: timerId,
    description,
    projectId,
    projectName: project?.name || 'No Project',
    startTime: Date.now(),
    elapsed: 0,
    status: 'running',
  };

  timeTrackingState.activeTimers.set(timerId, timer);
  renderTimeTrackingUI(document);
  showToast(`Timer started: ${description}`, 'success');

  return timerId;
}

export function stopTimer(timerId) {
  const timer = timeTrackingState.activeTimers.get(timerId);
  if (!timer) return;

  const duration = Date.now() - timer.startTime;

  // Create time entry
  const entry = {
    id: `entry-${Date.now()}`,
    description: timer.description,
    projectId: timer.projectId,
    projectName: timer.projectName,
    startTime: new Date(timer.startTime).toISOString(),
    endTime: new Date().toISOString(),
    duration: duration,
    billable: true,
  };

  timeTrackingState.timeEntries.push(entry);
  timeTrackingState.activeTimers.delete(timerId);

  saveTimeTrackingData();
  renderTimeTrackingUI(document);
  showToast(`Timer stopped: ${formatDuration(duration)}`, 'info');
}

export function pauseTimer(timerId) {
  // For simplicity, pause just stops the timer for now
  stopTimer(timerId);
}

function handleCallStarted(event) {
  const { callData } = event.detail;
  if (callData && callData.customerName) {
    // Auto-start timer for billable calls
    const description = `Call: ${callData.customerName}`;
    const timerId = startTimer(description, 'general-support');
    timeTrackingState.currentSession = { timerId, callData };
  }
}

function handleCallEnded() {
  if (timeTrackingState.currentSession) {
    stopTimer(timeTrackingState.currentSession.timerId);
    timeTrackingState.currentSession = null;
  }
}

function handleTimerControls(event) {
  const button = event.target.closest('button[data-timer-action]');
  if (!button) return;

  const action = button.dataset.timerAction;
  const timerId = button.dataset.timerId;

  switch (action) {
    case 'stop':
      stopTimer(timerId);
      break;
    case 'pause':
      pauseTimer(timerId);
      break;
  }
}

function getTodayEntries() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return timeTrackingState.timeEntries.filter((entry) => {
    const entryDate = new Date(entry.startTime);
    return entryDate >= today && entryDate < tomorrow;
  });
}

function calculateTodayHours() {
  const todayEntries = getTodayEntries();
  const totalMs = todayEntries.reduce((sum, entry) => sum + entry.duration, 0);
  return totalMs / (1000 * 60 * 60); // Convert to hours
}

function calculateTodayRevenue() {
  const todayEntries = getTodayEntries();
  return todayEntries.reduce(
    (sum, entry) => sum + calculateEntryAmount(entry),
    0
  );
}

function calculateWeekHours() {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const weekEntries = timeTrackingState.timeEntries.filter((entry) => {
    const entryDate = new Date(entry.startTime);
    return entryDate >= weekAgo;
  });

  const totalMs = weekEntries.reduce((sum, entry) => sum + entry.duration, 0);
  return totalMs / (1000 * 60 * 60);
}

function calculateEntryAmount(entry) {
  const project = timeTrackingState.projects.find(
    (p) => p.id === entry.projectId
  );
  if (!project) return 0;

  const rate = timeTrackingState.billingRates.find(
    (r) => r.id === project.billingRate
  );
  if (!rate) return 0;

  const hours = entry.duration / (1000 * 60 * 60);
  return hours * rate.rate;
}

export function exportTimeReport() {
  const report = {
    generatedAt: new Date().toISOString(),
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString(),
    },
    summary: {
      totalHours: calculateWeekHours(),
      totalRevenue: calculateTodayRevenue(),
      totalEntries: timeTrackingState.timeEntries.length,
    },
    entries: timeTrackingState.timeEntries.slice(-50), // Last 50 entries
    projects: timeTrackingState.projects,
    rates: timeTrackingState.billingRates,
  };

  const blob = new Blob([JSON.stringify(report, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `time-report-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);

  showToast('Time report exported!', 'success');
}

// Global functions for UI
window.startManualTimer = () => {
  const description = prompt('Timer description:');
  if (description) {
    startTimer(description);
  }
};

window.startProjectTimer = (projectId) => {
  const project = timeTrackingState.projects.find((p) => p.id === projectId);
  if (project) {
    startTimer(`Project: ${project.name}`, projectId);
  }
};

window.stopTimer = stopTimer;
window.pauseTimer = pauseTimer;
window.editProject = () => {
  // TODO: Implement project editor
  showToast('Project editor coming soon!', 'info');
};

window.exportTimeReport = exportTimeReport;

// Billing calculation functions
export function calculateTimeEntryCost(timeEntry) {
  const project = timeTrackingState.projects.find(
    (p) => p.id === timeEntry.projectId
  );
  if (!project) return 0;

  const rate = timeTrackingState.billingRates.find(
    (r) => r.id === project.billingRate
  );
  if (!rate) return 0;

  const hours = timeEntry.duration / (1000 * 60 * 60); // Convert milliseconds to hours
  return hours * rate.rate;
}

export function calculateProjectTotal(projectId, dateRange = null) {
  let entries = timeTrackingState.timeEntries.filter(
    (entry) => entry.projectId === projectId
  );

  if (dateRange) {
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    entries = entries.filter((entry) => {
      const entryDate = new Date(entry.startTime);
      return entryDate >= startDate && entryDate <= endDate;
    });
  }

  return entries.reduce(
    (total, entry) => total + calculateTimeEntryCost(entry),
    0
  );
}

export function generateInvoice(projectId, dateRange) {
  const project = timeTrackingState.projects.find((p) => p.id === projectId);
  if (!project) {
    throw new Error('Project not found');
  }

  const entries = timeTrackingState.timeEntries.filter((entry) => {
    if (entry.projectId !== projectId) return false;
    if (!dateRange) return true;

    const entryDate = new Date(entry.startTime);
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    return entryDate >= startDate && entryDate <= endDate;
  });

  const totalAmount = entries.reduce(
    (total, entry) => total + calculateTimeEntryCost(entry),
    0
  );
  const totalHours = entries.reduce(
    (total, entry) => total + entry.duration / (1000 * 60 * 60),
    0
  );

  return {
    invoiceId: `INV-${Date.now()}`,
    projectId,
    projectName: project.name,
    client: project.client,
    dateRange,
    entries: entries.map((entry) => ({
      ...entry,
      cost: calculateTimeEntryCost(entry),
    })),
    totalHours: Math.round(totalHours * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
    currency: 'USD',
    generatedAt: new Date().toISOString(),
  };
}

export function getBillingSummary(dateRange = null) {
  const projects = timeTrackingState.projects.filter(
    (p) => p.status === 'active'
  );

  const summary = projects.map((project) => {
    const total = calculateProjectTotal(project.id, dateRange);
    const entries = timeTrackingState.timeEntries.filter((entry) => {
      if (entry.projectId !== project.id) return false;
      if (!dateRange) return true;

      const entryDate = new Date(entry.startTime);
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      return entryDate >= startDate && entryDate <= endDate;
    });

    const totalHours = entries.reduce(
      (total, entry) => total + entry.duration / (1000 * 60 * 60),
      0
    );

    return {
      projectId: project.id,
      projectName: project.name,
      client: project.client,
      totalHours: Math.round(totalHours * 100) / 100,
      totalAmount: Math.round(total * 100) / 100,
      entryCount: entries.length,
    };
  });

  const grandTotal = summary.reduce(
    (total, project) => total + project.totalAmount,
    0
  );
  const totalHours = summary.reduce(
    (total, project) => total + project.totalHours,
    0
  );

  return {
    projects: summary,
    grandTotal: Math.round(grandTotal * 100) / 100,
    totalHours: Math.round(totalHours * 100) / 100,
    currency: 'USD',
  };
}

// Import toast for notifications
import { showToast } from '../utils/toast.js';
