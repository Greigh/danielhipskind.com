// Analytics Dashboard Module
import { getCallHistory } from './call-logging.js';
import { showConfirmModal } from '../utils/modal.js';
import { showToast } from '../utils/toast.js';
// import { initializePerformanceMetrics } from './performance-metrics.js';

export function initializeAnalytics() {
  const tabs = document.querySelectorAll('.analytics-tab');
  const contents = document.querySelectorAll('.analytics-content');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      contents.forEach((c) => c.classList.remove('active'));

      tab.classList.add('active');
      document.getElementById(tab.dataset.tab + '-tab').classList.add('active');
    });
  });

  // Performance monitoring controls
  const viewMetricsBtn = document.getElementById('view-metrics-btn');
  const exportMetricsBtn = document.getElementById('export-metrics-btn');
  const resetMetricsBtn = document.getElementById('reset-metrics-btn');

  if (viewMetricsBtn) {
    viewMetricsBtn.addEventListener('click', () => {
      // Switch to performance tab to show metrics
      const performanceTab = document.querySelector('[data-tab="performance"]');
      if (performanceTab) {
        performanceTab.click();
      }
      // Show a notification
      showToast('Performance metrics displayed in the Performance tab', 'info');
    });
  }

  if (exportMetricsBtn) {
    exportMetricsBtn.addEventListener('click', () => {
      const metricsData = {
        timestamp: new Date().toISOString(),
        overview: {
          totalCalls:
            document.getElementById('total-calls')?.textContent || '0',
          avgDuration:
            document.getElementById('avg-duration')?.textContent || '00:00',
          resolutionRate:
            document.getElementById('resolution-rate')?.textContent || '0%',
        },
        performance: {
          callsHandled:
            document.getElementById('analytics-calls-handled')?.textContent ||
            '0',
          averageHandleTime:
            document.getElementById('analytics-aht')?.textContent || '00:00',
          customerSatisfaction:
            document.getElementById('analytics-csat')?.textContent || '0%',
          firstCallResolution:
            document.getElementById('analytics-fcr')?.textContent || '0%',
        },
        callHistory: getCallHistory(),
      };

      const blob = new Blob([JSON.stringify(metricsData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('Analytics data exported successfully', 'success');
    });
  }

  if (resetMetricsBtn) {
    resetMetricsBtn.addEventListener('click', async () => {
      const confirmed = await showConfirmModal({
        title: 'Reset Analytics Data',
        message:
          'Are you sure you want to reset all analytics data? This will clear call history and metrics.',
        confirmLabel: 'Reset Data',
        cancelLabel: 'Cancel',
        danger: true,
      });

      if (confirmed) {
        // Clear call history
        localStorage.removeItem('callHistory');
        // Reset displayed metrics
        const totalCallsEl = document.getElementById('total-calls');
        const avgDurationEl = document.getElementById('avg-duration');
        const resolutionRateEl = document.getElementById('resolution-rate');
        const responseTimeEl = document.getElementById('response-time');
        const satisfactionScoreEl =
          document.getElementById('satisfaction-score');

        if (totalCallsEl) totalCallsEl.textContent = '0';
        if (avgDurationEl) avgDurationEl.textContent = '00:00';
        if (resolutionRateEl) resolutionRateEl.textContent = '0%';
        if (responseTimeEl) responseTimeEl.textContent = '0ms';
        if (satisfactionScoreEl) satisfactionScoreEl.textContent = '0/5';

        // Destroy and recreate charts
        if (callsChart) {
          callsChart.destroy();
          callsChart = null;
        }
        initializeCharts();

        showToast('Analytics data has been reset', 'warning');
      }
    });
  }

  updateAnalyticsPerformanceMetrics();
}

export function updateAnalyticsPerformanceMetrics() {
  const callHistory = getCallHistory();
  const completedCalls = callHistory.filter(
    (call) => call.status === 'completed'
  );

  // Calculate metrics
  const callsHandled = completedCalls.length;
  const totalDuration = completedCalls.reduce(
    (sum, call) => sum + (call.duration || 0),
    0
  );
  const aht = callsHandled > 0 ? totalDuration / callsHandled / 1000 / 60 : 0; // in minutes

  // Mock data for other metrics (in real app, these would be tracked)
  const csat = Math.floor(Math.random() * 10) + 85; // 85-95%
  const fcr = Math.floor(Math.random() * 15) + 75; // 75-90%

  // Update analytics dashboard elements only if they exist
  const callsHandledEl = document.getElementById('analytics-calls-handled');
  const ahtEl = document.getElementById('analytics-aht');
  const csatEl = document.getElementById('analytics-csat');
  const fcrEl = document.getElementById('analytics-fcr');

  if (callsHandledEl) callsHandledEl.textContent = callsHandled;
  if (ahtEl) ahtEl.textContent = formatDurationMinutes(aht);
  if (csatEl) csatEl.textContent = csat + '%';
  if (fcrEl) fcrEl.textContent = fcr + '%';
}

function formatDurationMinutes(minutes) {
  const mins = Math.floor(minutes);
  const secs = Math.floor((minutes - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// function updateOverviewMetrics() {
//   const callHistory = getCallHistory();
//   const totalCalls = callHistory.length;
//   const completedCalls = callHistory.filter(
//     (call) => call.status === 'completed'
//   );

// Calculate average duration
// const totalDuration = completedCalls.reduce(
//   (sum, call) => sum + (call.duration || 0),
//   0
// );
// const avgDuration =
//   completedCalls.length > 0 ? totalDuration / completedCalls.length : 0;

// // Mock resolution rate (in real app, this would be tracked)
// const resolutionRate = Math.floor(Math.random() * 20) + 80; // 80-100%

// // Update elements only if they exist
// const totalCallsEl = document.getElementById('total-calls');
// const avgDurationEl = document.getElementById('avg-duration');
// const resolutionRateEl = document.getElementById('resolution-rate');

// if (totalCallsEl) totalCallsEl.textContent = totalCalls;
// if (avgDurationEl) avgDurationEl.textContent = formatDuration(avgDuration);
// if (resolutionRateEl) resolutionRateEl.textContent = resolutionRate + '%';
// }

// function formatDuration(ms) {
//   const minutes = Math.floor(ms / 1000 / 60);
//   const seconds = Math.floor((ms / 1000) % 60);
//   return `${minutes}:${seconds.toString().padStart(2, '0')}`;
// }

// For charts, use Chart.js if available
let callsChart = null; // Keep track of the chart instance

export function initializeCharts() {
  // Initialize charts when Chart.js is available
  const callsChartCanvas = document.getElementById('calls-chart');
  if (callsChartCanvas && typeof Chart !== 'undefined') {
    // Destroy existing chart if it exists (module-scoped or attached to canvas)
    try {
      if (callsChart) {
        callsChart.destroy();
        callsChart = null;
      }
    } catch (e) {
      console.warn('Error destroying existing callsChart instance:', e);
    }
    try {
      if (typeof Chart?.getChart === 'function') {
        const existing = Chart.getChart(callsChartCanvas);
        if (existing) {
          existing.destroy();
        }
      }
    } catch {
      // Chart.getChart may not be available in older versions
    }

    const ctx = callsChartCanvas.getContext('2d');
    const callHistory = getCallHistory();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toLocaleDateString();
    });

    const callCounts = last7Days.map((dateStr) => {
      return callHistory.filter((call) => {
        const callDate = new Date(call.startTime).toLocaleDateString();
        return callDate === dateStr;
      }).length;
    });

    callsChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: last7Days,
        datasets: [
          {
            label: 'Calls per Day',
            data: callCounts,
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            tension: 0.1,
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });
  }
}
