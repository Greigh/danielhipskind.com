import { Chart } from 'chart.js';
import {
  deviceChartConfig,
  browserChartConfig,
  hoursChartConfig,
  themeChartConfig,
  visitsChartConfig,
} from './index.js';

const configs = {
  device: deviceChartConfig,
  browser: browserChartConfig,
  hours: hoursChartConfig,
  theme: themeChartConfig,
  visits: visitsChartConfig,
};

export function createChart(type, elementId, data) {
  const config = configs[type];
  if (!config) throw new Error(`Unknown chart type: ${type}`);

  const ctx = document.getElementById(elementId);
  if (!ctx) throw new Error(`Canvas element not found: ${elementId}`);

  return new Chart(ctx, {
    ...config,
    data: {
      labels: Object.keys(data),
      datasets: [
        {
          data: Object.values(data),
          backgroundColor: config.colors,
          borderWidth: 0,
        },
      ],
    },
  });
}
