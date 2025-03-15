import { Chart } from 'chart.js';
import { chartColors } from './config.js';

export class AnalyticsCharts {
  constructor() {
    this.charts = new Map();
  }

  createPerformanceChart(elementId, data) {
    const ctx = document.getElementById(elementId);
    if (!ctx) return;

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map((d) => new Date(d.timestamp).toLocaleTimeString()),
        datasets: [
          {
            label: 'Page Load Time',
            data: data.map((d) => d.performance.pageLoadTime),
            borderColor: chartColors.primary[0],
            fill: false,
          },
          {
            label: 'DOM Ready Time',
            data: data.map((d) => d.performance.domReadyTime),
            borderColor: chartColors.primary[1],
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Performance Metrics',
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Time (ms)',
            },
          },
        },
      },
    });

    this.charts.set(elementId, chart);
  }

  createSessionChart(elementId, data) {
    const ctx = document.getElementById(elementId);
    if (!ctx) return;

    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: Object.keys(data.visitDurations),
        datasets: [
          {
            label: 'Session Duration Distribution',
            data: Object.values(data.visitDurations),
            backgroundColor: chartColors.primary,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Session Durations',
          },
        },
      },
    });

    this.charts.set(elementId, chart);
  }

  createRealtimeChart(elementId) {
    const ctx = document.getElementById(elementId);
    if (!ctx) return;

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Active Users',
            data: [],
            borderColor: chartColors.primary[0],
            fill: true,
            backgroundColor: `${chartColors.primary[0]}33`,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Realtime Users',
          },
        },
        scales: {
          x: {
            type: 'time',
            time: {
              unit: 'minute',
            },
          },
          y: {
            beginAtZero: true,
            suggestedMax: 10,
          },
        },
      },
    });

    this.charts.set(elementId, chart);
    this.startRealtimeUpdates(chart);
  }

  startRealtimeUpdates(chart) {
    setInterval(async () => {
      try {
        const response = await fetch('/api/analytics/realtime');
        const data = await response.json();

        chart.data.labels.push(new Date());
        chart.data.datasets[0].data.push(data.activeUsers);

        // Keep last 30 minutes of data
        if (chart.data.labels.length > 30) {
          chart.data.labels.shift();
          chart.data.datasets[0].data.shift();
        }

        chart.update();
      } catch (error) {
        console.error('Failed to update realtime chart:', error);
      }
    }, 60000); // Update every minute
  }

  destroy() {
    this.charts.forEach((chart) => chart.destroy());
    this.charts.clear();
  }
}
