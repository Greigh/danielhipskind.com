import { baseConfig, chartColors, legendPositions } from './config.js';

export const browserChartConfig = {
  ...baseConfig,
  type: 'pie',
  options: {
    ...baseConfig,
    plugins: {
      ...baseConfig.plugins,
      legend: {
        ...baseConfig.plugins.legend,
        position: legendPositions.browser,
      },
      title: {
        ...baseConfig.plugins.title,
        text: 'Browser Distribution',
      },
    },
  },
  colors: chartColors.primary,
};
