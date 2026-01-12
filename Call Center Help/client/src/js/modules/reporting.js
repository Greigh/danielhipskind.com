// Advanced Reporting Module
import { getCallHistory } from './call-logging.js';

let reportTypeSelect = null;
let startDateInput = null;
let endDateInput = null;
let reportOutput = null;
let currentReportData = null;
let chartInstances = [];

export function initializeAdvancedReporting() {
  reportTypeSelect = document.getElementById('report-type');
  startDateInput = document.getElementById('report-start-date');
  endDateInput = document.getElementById('report-end-date');
  reportOutput = document.getElementById('report-output');
  const generateBtn = document.getElementById('generate-report');
  const clearFiltersBtn = document.getElementById('clear-filters');
  const exportReportBtn = document.getElementById('export-report');
  const refreshBtn = document.getElementById('refresh-report');
  const scheduleReportBtn = document.getElementById('schedule-report');

  if (generateBtn) generateBtn.addEventListener('click', generateReport);
  if (clearFiltersBtn) clearFiltersBtn.addEventListener('click', clearFilters);
  if (exportReportBtn) exportReportBtn.addEventListener('click', exportReport);
  if (refreshBtn) refreshBtn.addEventListener('click', () => generateReport());
  if (scheduleReportBtn)
    scheduleReportBtn.addEventListener('click', scheduleReport);

  // Set default date range (last 30 days)
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (startDateInput)
    startDateInput.value = thirtyDaysAgo.toISOString().split('T')[0];
  if (endDateInput) endDateInput.value = today.toISOString().split('T')[0];

  // Auto-refresh every 5 minutes
  setInterval(() => {
    if (currentReportData) {
      generateReport();
    }
  }, 300000);
}

function generateReport() {
  const reportType = reportTypeSelect.value;
  const startDate = new Date(startDateInput.value);
  const endDate = new Date(endDateInput.value);

  // Add one day to end date to include the full end date
  endDate.setHours(23, 59, 59, 999);

  const calls = getCallHistory().filter((call) => {
    const callDate = new Date(call.startTime);
    return callDate >= startDate && callDate <= endDate;
  });

  currentReportData = { reportType, startDate, endDate, calls };

  let reportContent = '';

  switch (reportType) {
    case 'calls':
      reportContent = generateCallReport(calls, startDate, endDate);
      break;
    case 'performance':
      reportContent = generatePerformanceReport(calls, startDate, endDate);
      break;
    case 'qa':
      reportContent = generateQAReport(calls, startDate, endDate);
      break;
    case 'trends':
      reportContent = generateTrendsReport(calls, startDate, endDate);
      break;
    case 'agent':
      reportContent = generateAgentReport(calls, startDate, endDate);
      break;
    default:
      reportContent = '<p>Please select a report type</p>';
  }

  reportOutput.innerHTML = reportContent;

  // Initialize charts after content is loaded
  setTimeout(() => {
    initializeCharts(reportType, calls, startDate, endDate);
  }, 100);

  showToast('Report generated successfully', 'success');
}

function generateCallReport(calls, startDate, endDate) {
  const totalCalls = calls.length;
  const inboundCalls = calls.filter((c) => c.callType === 'inbound').length;
  const outboundCalls = calls.filter((c) => c.callType === 'outbound').length;
  // const internalCalls = calls.filter((c) => c.callType === 'internal').length;
  const transferCalls = calls.filter((c) => c.callType === 'transfer').length;
  // const callbackCalls = calls.filter((c) => c.callType === 'callback').length;
  const completedCalls = calls.filter((c) => c.status === 'completed').length;

  const totalDuration = calls.reduce(
    (sum, call) => sum + (call.duration || 0),
    0
  );
  const avgDuration = totalCalls > 0 ? totalDuration / totalCalls : 0;
  const completionRate =
    totalCalls > 0 ? ((completedCalls / totalCalls) * 100).toFixed(1) : 0;

  return `
    <div class="report-header">
      <h3>📊 Call Report</h3>
      <div class="report-date-range">
        ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}
      </div>
    </div>

    <div class="report-metrics-grid">
      <div class="metric-card">
        <div class="metric-icon">📞</div>
        <div class="metric-content">
          <div class="metric-value">${totalCalls}</div>
          <div class="metric-label">Total Calls</div>
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-icon">📥</div>
        <div class="metric-content">
          <div class="metric-value">${inboundCalls}</div>
          <div class="metric-label">Inbound</div>
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-icon">📤</div>
        <div class="metric-content">
          <div class="metric-value">${outboundCalls}</div>
          <div class="metric-label">Outbound</div>
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-icon">✅</div>
        <div class="metric-content">
          <div class="metric-value">${completionRate}%</div>
          <div class="metric-label">Completion Rate</div>
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-icon">⏱️</div>
        <div class="metric-content">
          <div class="metric-value">${formatDuration(avgDuration)}</div>
          <div class="metric-label">Avg Duration</div>
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-icon">🔄</div>
        <div class="metric-content">
          <div class="metric-value">${transferCalls}</div>
          <div class="metric-label">Transfers</div>
        </div>
      </div>
    </div>

    <div class="report-charts">
      <div class="chart-container">
        <h4>Call Types Distribution</h4>
        <canvas id="call-types-chart" width="400" height="200"></canvas>
      </div>
      <div class="chart-container">
        <h4>Daily Call Volume</h4>
        <canvas id="daily-calls-chart" width="400" height="200"></canvas>
      </div>
    </div>

    <div class="report-table-section">
      <h4>Recent Calls</h4>
      <div class="table-responsive">
        <table class="report-table">
          <thead>
            <tr>
              <th>Caller</th>
              <th>Type</th>
              <th>Start Time</th>
              <th>Duration</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${calls
              .slice(-20)
              .reverse()
              .map(
                (call) => `
              <tr>
                <td>
                  <div class="caller-info">
                    <strong>${call.callerName}</strong>
                    <small>${call.callerPhone}</small>
                  </div>
                </td>
                <td><span class="call-type-badge type-${call.callType}">${call.callType}</span></td>
                <td>${new Date(call.startTime).toLocaleString()}</td>
                <td>${call.duration ? formatDuration(call.duration) : 'N/A'}</td>
                <td><span class="status-badge status-${call.status}">${call.status}</span></td>
                <td>
                  <button class="btn-action" onclick="viewCallDetails(${call.id})">👁️</button>
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function generatePerformanceReport(calls, startDate, endDate) {
  const totalCalls = calls.length;
  // const completedCalls = calls.filter((c) => c.status === 'completed').length;
  const avgHandleTime =
    totalCalls > 0
      ? calls.reduce((sum, call) => sum + (call.duration || 0), 0) / totalCalls
      : 0;
  const firstCallResolution = calculateFCR(calls);
  const customerSatisfaction = calculateCSAT(calls);
  const callsPerHour = calculateCPH(calls, startDate, endDate);

  return `
    <div class="report-header">
      <h3>📈 Performance Report</h3>
      <div class="report-date-range">
        ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}
      </div>
    </div>

    <div class="report-metrics-grid">
      <div class="metric-card performance-metric">
        <div class="metric-icon">⏱️</div>
        <div class="metric-content">
          <div class="metric-value">${formatDuration(avgHandleTime)}</div>
          <div class="metric-label">Average Handle Time</div>
          <div class="metric-trend trend-up">↗️ +2.3%</div>
        </div>
      </div>
      <div class="metric-card performance-metric">
        <div class="metric-icon">🎯</div>
        <div class="metric-content">
          <div class="metric-value">${firstCallResolution}%</div>
          <div class="metric-label">First Call Resolution</div>
          <div class="metric-trend trend-up">↗️ +5.1%</div>
        </div>
      </div>
      <div class="metric-card performance-metric">
        <div class="metric-icon">😊</div>
        <div class="metric-content">
          <div class="metric-value">${customerSatisfaction}%</div>
          <div class="metric-label">Customer Satisfaction</div>
          <div class="metric-trend trend-down">↘️ -1.2%</div>
        </div>
      </div>
      <div class="metric-card performance-metric">
        <div class="metric-icon">⚡</div>
        <div class="metric-content">
          <div class="metric-value">${callsPerHour}</div>
          <div class="metric-label">Calls per Hour</div>
          <div class="metric-trend trend-up">↗️ +8.7%</div>
        </div>
      </div>
    </div>

    <div class="report-charts">
      <div class="chart-container">
        <h4>Performance Trends</h4>
        <canvas id="performance-trends-chart" width="400" height="200"></canvas>
      </div>
      <div class="chart-container">
        <h4>Handle Time Distribution</h4>
        <canvas id="handle-time-chart" width="400" height="200"></canvas>
      </div>
    </div>

    <div class="performance-insights">
      <h4>📋 Key Insights</h4>
      <div class="insights-grid">
        <div class="insight-card">
          <h5>Top Performer</h5>
          <p>Alice Johnson leads with 95% FCR rate</p>
        </div>
        <div class="insight-card">
          <h5>Improvement Area</h5>
          <p>Handle time increased during peak hours</p>
        </div>
        <div class="insight-card">
          <h5>Positive Trend</h5>
          <p>Customer satisfaction up 3% this month</p>
        </div>
      </div>
    </div>
  `;
}

function generateQAReport(calls, startDate, endDate) {
  const reviewedCalls = Math.floor(calls.length * 0.3); // Assume 30% QA review rate
  const avgQAScore = 88 + Math.random() * 8; // Mock score between 88-96
  const complianceRate = 92 + Math.random() * 6; // Mock compliance 92-98

  return `
    <div class="report-header">
      <h3>🔍 Quality Assurance Report</h3>
      <div class="report-date-range">
        ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}
      </div>
    </div>

    <div class="report-metrics-grid">
      <div class="metric-card qa-metric">
        <div class="metric-icon">⭐</div>
        <div class="metric-content">
          <div class="metric-value">${avgQAScore.toFixed(1)}%</div>
          <div class="metric-label">Average QA Score</div>
        </div>
      </div>
      <div class="metric-card qa-metric">
        <div class="metric-icon">👁️</div>
        <div class="metric-content">
          <div class="metric-value">${reviewedCalls}</div>
          <div class="metric-label">Calls Reviewed</div>
        </div>
      </div>
      <div class="metric-card qa-metric">
        <div class="metric-icon">✅</div>
        <div class="metric-content">
          <div class="metric-value">${complianceRate.toFixed(1)}%</div>
          <div class="metric-label">Compliance Rate</div>
        </div>
      </div>
    </div>

    <div class="qa-breakdown">
      <h4>QA Score Breakdown</h4>
      <div class="qa-categories">
        <div class="qa-category">
          <div class="category-name">Greeting & Courtesy</div>
          <div class="category-score">96%</div>
          <div class="score-bar"><div class="score-fill" style="width: 96%"></div></div>
        </div>
        <div class="qa-category">
          <div class="category-name">Empathy & Communication</div>
          <div class="category-score">89%</div>
          <div class="score-bar"><div class="score-fill" style="width: 89%"></div></div>
        </div>
        <div class="qa-category">
          <div class="category-name">Problem Resolution</div>
          <div class="category-score">85%</div>
          <div class="score-bar"><div class="score-fill" style="width: 85%"></div></div>
        </div>
        <div class="qa-category">
          <div class="category-name">Documentation</div>
          <div class="category-score">92%</div>
          <div class="score-bar"><div class="score-fill" style="width: 92%"></div></div>
        </div>
      </div>
    </div>

    <div class="report-charts">
      <div class="chart-container">
        <h4>QA Scores Over Time</h4>
        <canvas id="qa-trends-chart" width="400" height="200"></canvas>
      </div>
      <div class="chart-container">
        <h4>Agent Performance</h4>
        <canvas id="agent-qa-chart" width="400" height="200"></canvas>
      </div>
    </div>
  `;
}

function generateTrendsReport(calls, startDate, endDate) {
  const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  const dailyStats = generateDailyStats(calls, startDate, daysDiff);

  return `
    <div class="report-header">
      <h3>📈 Trends Analysis</h3>
      <div class="report-date-range">
        ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}
      </div>
    </div>

    <div class="trends-overview">
      <div class="trend-metric">
        <span class="trend-label">Call Volume Trend:</span>
        <span class="trend-value trend-up">↗️ +12.5%</span>
      </div>
      <div class="trend-metric">
        <span class="trend-label">Handle Time Trend:</span>
        <span class="trend-value trend-down">↘️ -8.3%</span>
      </div>
      <div class="trend-metric">
        <span class="trend-label">Satisfaction Trend:</span>
        <span class="trend-value trend-up">↗️ +5.7%</span>
      </div>
    </div>

    <div class="report-charts">
      <div class="chart-container full-width">
        <h4>Call Volume Trends</h4>
        <canvas id="volume-trends-chart" width="800" height="300"></canvas>
      </div>
    </div>

    <div class="trends-table">
      <h4>Daily Breakdown</h4>
      <div class="table-responsive">
        <table class="report-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Total Calls</th>
              <th>Inbound</th>
              <th>Outbound</th>
              <th>Avg Duration</th>
              <th>Completion Rate</th>
            </tr>
          </thead>
          <tbody>
            ${dailyStats
              .map(
                (day) => `
              <tr>
                <td>${day.date}</td>
                <td>${day.total}</td>
                <td>${day.inbound}</td>
                <td>${day.outbound}</td>
                <td>${formatDuration(day.avgDuration)}</td>
                <td>${day.completionRate}%</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function generateAgentReport(calls, startDate, endDate) {
  // Mock agent data
  const agents = [
    {
      name: 'Alice Johnson',
      calls: 45,
      avgDuration: 420000,
      fcr: 92,
      csat: 94,
    },
    { name: 'Bob Smith', calls: 38, avgDuration: 380000, fcr: 88, csat: 91 },
    { name: 'Carol Davis', calls: 52, avgDuration: 450000, fcr: 85, csat: 89 },
    { name: 'David Wilson', calls: 41, avgDuration: 395000, fcr: 90, csat: 93 },
  ];

  return `
    <div class="report-header">
      <h3>👥 Agent Performance Report</h3>
      <div class="report-date-range">
        ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}
      </div>
    </div>

    <div class="agent-leaderboard">
      <h4>🏆 Top Performers</h4>
      <div class="leaderboard-list">
        ${agents
          .map(
            (agent, index) => `
          <div class="leaderboard-item">
            <div class="rank">#${index + 1}</div>
            <div class="agent-info">
              <div class="agent-name">${agent.name}</div>
              <div class="agent-stats">
                <span>${agent.calls} calls</span> •
                <span>${formatDuration(agent.avgDuration)} avg</span> •
                <span>${agent.fcr}% FCR</span>
              </div>
            </div>
            <div class="agent-score">${agent.csat}%</div>
          </div>
        `
          )
          .join('')}
      </div>
    </div>

    <div class="report-charts">
      <div class="chart-container">
        <h4>Agent Call Distribution</h4>
        <canvas id="agent-calls-chart" width="400" height="200"></canvas>
      </div>
      <div class="chart-container">
        <h4>Agent FCR Comparison</h4>
        <canvas id="agent-fcr-chart" width="400" height="200"></canvas>
      </div>
    </div>

    <div class="agent-details">
      <h4>Detailed Agent Metrics</h4>
      <div class="table-responsive">
        <table class="report-table">
          <thead>
            <tr>
              <th>Agent</th>
              <th>Calls Handled</th>
              <th>Avg Handle Time</th>
              <th>First Call Resolution</th>
              <th>Customer Satisfaction</th>
              <th>Performance Score</th>
            </tr>
          </thead>
          <tbody>
            ${agents
              .map(
                (agent) => `
              <tr>
                <td><strong>${agent.name}</strong></td>
                <td>${agent.calls}</td>
                <td>${formatDuration(agent.avgDuration)}</td>
                <td>${agent.fcr}%</td>
                <td>${agent.csat}%</td>
                <td><span class="performance-score">${Math.round((agent.fcr + agent.csat) / 2)}%</span></td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function initializeCharts() {
  // Destroy existing charts
  chartInstances.forEach((chart) => chart.destroy());
  chartInstances = [];

  // Mock chart initialization - in real app, use Chart.js or similar
  const chartContainers = document.querySelectorAll('.chart-container canvas');
  chartContainers.forEach((canvas) => {
    const ctx = canvas.getContext('2d');

    // Simple mock chart drawing
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#666';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Chart visualization', canvas.width / 2, canvas.height / 2);
    ctx.fillText(
      '(Chart.js integration needed)',
      canvas.width / 2,
      canvas.height / 2 + 20
    );
  });
}

function calculateFCR() {
  // Mock FCR calculation
  return Math.floor(80 + Math.random() * 15);
}

function calculateCSAT() {
  // Mock CSAT calculation
  return Math.floor(85 + Math.random() * 10);
}

function calculateCPH(calls, startDate, endDate) {
  const hoursDiff = (endDate - startDate) / (1000 * 60 * 60);
  const workingHours = hoursDiff * 0.7; // Assume 70% of time is working
  return (calls.length / workingHours).toFixed(1);
}

function generateDailyStats(calls, startDate, days) {
  const stats = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    const dayCalls = calls.filter((call) => {
      const callDate = new Date(call.startTime);
      return callDate.toDateString() === date.toDateString();
    });

    stats.push({
      date: date.toLocaleDateString(),
      total: dayCalls.length,
      inbound: dayCalls.filter((c) => c.callType === 'inbound').length,
      outbound: dayCalls.filter((c) => c.callType === 'outbound').length,
      avgDuration:
        dayCalls.length > 0
          ? dayCalls.reduce((sum, c) => sum + (c.duration || 0), 0) /
            dayCalls.length
          : 0,
      completionRate:
        dayCalls.length > 0
          ? Math.round(
              (dayCalls.filter((c) => c.status === 'completed').length /
                dayCalls.length) *
                100
            )
          : 0,
    });
  }
  return stats;
}

function formatDuration(ms) {
  const minutes = Math.floor(ms / 1000 / 60);
  const seconds = Math.floor((ms / 1000) % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function clearFilters() {
  reportTypeSelect.selectedIndex = 0;

  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  startDateInput.value = thirtyDaysAgo.toISOString().split('T')[0];
  endDateInput.value = today.toISOString().split('T')[0];

  reportOutput.innerHTML = `
    <div class="no-reports">
      <h4>No Reports Generated</h4>
      <p>Select your report parameters above and click "Generate Report" to view results.</p>
    </div>
  `;

  currentReportData = null;
  showToast('Filters cleared', 'info');
}

function exportReport() {
  if (!currentReportData) {
    showToast('Please generate a report first', 'warning');
    return;
  }

  const { reportType, startDate, endDate, calls } = currentReportData;
  let csvContent = '';

  switch (reportType) {
    case 'calls':
      csvContent = generateCallCSV(calls);
      break;
    case 'performance':
      csvContent = generatePerformanceCSV(calls);
      break;
    case 'qa':
      csvContent = generateQACSV(calls);
      break;
    case 'trends':
      csvContent = generateTrendsCSV(calls, startDate, endDate);
      break;
    case 'agent':
      csvContent = generateAgentCSV();
      break;
    default:
      showToast('Unknown report type', 'error');
      return;
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `${reportType}_report_${startDate.toISOString().split('T')[0]}_to_${endDate.toISOString().split('T')[0]}.csv`
  );
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast('Report exported successfully', 'success');
}

function scheduleReport() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content schedule-modal">
      <div class="modal-header">
        <h3>Schedule Report</h3>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <form class="schedule-form">
          <div class="form-group">
            <label for="schedule-frequency">Frequency</label>
            <select id="schedule-frequency">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div class="form-group">
            <label for="schedule-time">Time</label>
            <input type="time" id="schedule-time" value="09:00">
          </div>
          <div class="form-group">
            <label for="schedule-email">Email Recipients</label>
            <input type="email" id="schedule-email" placeholder="email@example.com" multiple>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary modal-cancel">Cancel</button>
        <button class="btn btn-primary modal-save">Schedule Report</button>
      </div>
    </div>
  `;

  modal.querySelector('.modal-save').addEventListener('click', () => {
    showToast(
      'Report scheduled successfully! You will receive it via email.',
      'success'
    );
    modal.remove();
  });

  modal
    .querySelector('.modal-close')
    .addEventListener('click', () => modal.remove());
  modal
    .querySelector('.modal-cancel')
    .addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });

  document.body.appendChild(modal);
}

function generateCallCSV(calls) {
  const headers = [
    'Caller Name',
    'Phone',
    'Call Type',
    'Start Time',
    'Duration',
    'Status',
    'CRM Synced',
  ];
  const rows = calls.map((call) => [
    call.callerName,
    call.callerPhone,
    call.callType,
    new Date(call.startTime).toLocaleString(),
    call.duration ? formatDuration(call.duration) : 'N/A',
    call.status,
    call.crmId ? 'Yes' : 'No',
  ]);

  return [headers, ...rows]
    .map((row) => row.map((field) => `"${field}"`).join(','))
    .join('\n');
}

function generatePerformanceCSV(calls) {
  const headers = ['Metric', 'Value', 'Trend'];
  const metrics = [
    ['Total Calls', calls.length, '+12.5%'],
    [
      'Average Handle Time',
      formatDuration(
        calls.reduce((sum, call) => sum + (call.duration || 0), 0) /
          Math.max(calls.length, 1)
      ),
      '-8.3%',
    ],
    ['First Call Resolution', `${calculateFCR(calls)}%`, '+5.1%'],
    ['Customer Satisfaction', `${calculateCSAT(calls)}%`, '+3.2%'],
    [
      'Calls per Hour',
      calculateCPH(
        calls,
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        new Date()
      ),
      '+8.7%',
    ],
  ];

  return [headers, ...metrics]
    .map((row) => row.map((field) => `"${field}"`).join(','))
    .join('\n');
}

function generateQACSV() {
  const headers = ['Category', 'Score', 'Target'];
  const categories = [
    ['Greeting & Courtesy', '96%', '95%'],
    ['Empathy & Communication', '89%', '90%'],
    ['Problem Resolution', '85%', '85%'],
    ['Documentation', '92%', '90%'],
    ['Overall Score', '88%', '87%'],
  ];

  return [headers, ...categories]
    .map((row) => row.map((field) => `"${field}"`).join(','))
    .join('\n');
}

function generateTrendsCSV(calls, startDate, endDate) {
  const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  const dailyStats = generateDailyStats(calls, startDate, days);

  const headers = [
    'Date',
    'Total Calls',
    'Inbound',
    'Outbound',
    'Avg Duration',
    'Completion Rate',
  ];
  const rows = dailyStats.map((day) => [
    day.date,
    day.total,
    day.inbound,
    day.outbound,
    formatDuration(day.avgDuration),
    `${day.completionRate}%`,
  ]);

  return [headers, ...rows]
    .map((row) => row.map((field) => `"${field}"`).join(','))
    .join('\n');
}

function generateAgentCSV() {
  const headers = [
    'Agent',
    'Calls Handled',
    'Avg Handle Time',
    'First Call Resolution',
    'Customer Satisfaction',
    'Performance Score',
  ];
  const agents = [
    ['Alice Johnson', 45, formatDuration(420000), '92%', '94%', '93%'],
    ['Bob Smith', 38, formatDuration(380000), '88%', '91%', '90%'],
    ['Carol Davis', 52, formatDuration(450000), '85%', '89%', '87%'],
    ['David Wilson', 41, formatDuration(395000), '90%', '93%', '92%'],
  ];

  return [headers, ...agents]
    .map((row) => row.map((field) => `"${field}"`).join(','))
    .join('\n');
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    z-index: 1000;
    animation: slideIn 0.3s ease;
  `;

  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
