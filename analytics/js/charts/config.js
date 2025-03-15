import { chartColors as baseChartColors } from './chartColors.js';

// Extend base colors with additional options
export const chartColors = {
  ...baseChartColors,
  theme: ['#1e293b', '#f8fafc'],
  success: ['#22c55e', '#86efac'],
  warning: ['#eab308', '#fde047'],
  danger: ['#ef4444', '#fca5a5'],
};

export const baseConfig = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      align: 'center',
      labels: {
        padding: 20,
        usePointStyle: true,
        pointStyle: 'circle',
        color: 'rgb(var(--text-color))',
        font: {
          size: 12,
          family: 'system-ui',
        },
        generateLabels: (chart) => {
          const datasets = chart.data.datasets[0];
          return chart.data.labels.map((label, i) => ({
            text: `${label}: ${datasets.data[i]}`,
            fillStyle: datasets.backgroundColor[i],
            strokeStyle: datasets.backgroundColor[i],
            lineWidth: 0,
            hidden: false,
            index: i,
          }));
        },
      },
    },
    title: {
      display: true,
      color: 'rgb(var(--text-color))',
      font: {
        size: 16,
        weight: 'normal',
      },
      padding: {
        top: 10,
        bottom: 30,
      },
    },
    tooltip: {
      backgroundColor: 'rgb(var(--surface-color))',
      titleColor: 'rgb(var(--text-color))',
      bodyColor: 'rgb(var(--text-color))',
      borderColor: 'rgb(var(--border-color))',
      borderWidth: 1,
    },
  },
};

export const legendPositions = {
  devices: 'right',
  browser: 'bottom',
  hours: 'top',
};
