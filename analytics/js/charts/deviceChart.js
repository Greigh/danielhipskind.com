import { baseConfig, chartColors, legendPositions } from './config.js';

export const deviceChartConfig = {
  ...baseConfig,
  type: 'doughnut',
  options: {
    ...baseConfig,
    plugins: {
      ...baseConfig.plugins,
      legend: {
        ...baseConfig.plugins.legend,
        position: legendPositions.devices,
        labels: {
          ...baseConfig.plugins.legend.labels,
          boxWidth: 12,
          boxHeight: 12,
        },
      },
      title: {
        ...baseConfig.plugins.title,
        text: 'Visitors by Device Type',
      },
    },
  },
  colors: chartColors.primary,
};
