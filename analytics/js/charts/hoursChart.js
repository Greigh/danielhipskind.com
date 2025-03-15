import { baseConfig, chartColors } from './config.js';

export const hoursChartConfig = {
  ...baseConfig,
  type: 'bar',
  options: {
    ...baseConfig,
    scales: {
      x: {
        grid: {
          color: 'rgba(var(--border-color), 0.1)',
        },
        ticks: {
          color: 'rgb(var(--text-color))',
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(var(--border-color), 0.1)',
        },
        ticks: {
          color: 'rgb(var(--text-color))',
        },
      },
    },
    plugins: {
      ...baseConfig.plugins,
      title: {
        display: true,
        text: 'Visits by Hour',
      },
    },
  },
  colors: chartColors.primary,
};
