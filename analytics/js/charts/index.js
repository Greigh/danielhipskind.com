// Chart Configurations
export { deviceChartConfig } from './deviceChart.js';
export { browserChartConfig } from './browserChart.js';
export { hoursChartConfig } from './hoursChart.js';
export { themeChartConfig } from './themeChart.js';
export { visitsChartConfig } from './visitsChart.js';

// Base Configuration and Utilities
export {
  baseConfig,
  chartColors,
  legendPositions,
  createChartGradient,
} from './config.js';

// Chart Factory
export { createChart } from './chartFactory.js';

// Chart Types
export const ChartTypes = {
  DEVICE: 'device',
  BROWSER: 'browser',
  HOURS: 'hours',
  THEME: 'theme',
  VISITS: 'visits',
};

// Chart Dimensions
export const ChartDimensions = {
  SMALL: { width: 300, height: 200 },
  MEDIUM: { width: 450, height: 300 },
  LARGE: { width: 600, height: 400 },
};
