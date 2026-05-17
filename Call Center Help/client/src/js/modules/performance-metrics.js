// Performance Metrics Module
import { getCallHistory } from './call-logging.js';

export function initializePerformanceMetrics() {
  updateMetrics();

  // Update metrics every 30 seconds
  setInterval(updateMetrics, 30000);
}

function updateMetrics() {
  const calls = getCallHistory();
  const completedCalls = calls.filter((call) => call.status === 'completed');

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

  // Update DOM only if elements exist (to prevent errors on pages without these elements)
  const callsHandledEl = document.getElementById('calls-handled');
  const ahtEl = document.getElementById('aht');
  const csatEl = document.getElementById('csat');
  const fcrEl = document.getElementById('fcr');

  if (callsHandledEl) callsHandledEl.textContent = callsHandled;
  if (ahtEl) ahtEl.textContent = formatDuration(aht);
  if (csatEl) csatEl.textContent = csat + '%';
  if (fcrEl) fcrEl.textContent = fcr + '%';

  // Update chart if available
  updatePerformanceChart();
}

function formatDuration(minutes) {
  const mins = Math.floor(minutes);
  const secs = Math.floor((minutes - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function updatePerformanceChart() {
  const chartCanvas = document.getElementById('performance-chart');
  if (!chartCanvas || !window.Chart) return;

  const ctx = chartCanvas.getContext('2d');

  // Mock weekly data
  const data = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Calls Handled',
        data: [45, 52, 38, 61, 55, 23, 18],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1,
      },
      {
        label: 'Avg Handle Time (min)',
        data: [8.5, 7.2, 9.1, 6.8, 8.9, 5.5, 4.2],
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.1,
      },
    ],
  };

  if (window.performanceChart) {
    window.performanceChart.data = data;
    window.performanceChart.update();
  } else {
    window.performanceChart = new Chart(ctx, {
      type: 'line',
      data: data,
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
