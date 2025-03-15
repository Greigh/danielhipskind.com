export const chartConfigs = {
  devices: {
    type: 'doughnut',
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Visitors by Device'
        }
      }
    }
  },
  platform: {
    type: 'pie',
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Platforms'
        }
      }
    },
    colors: ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe']
  },
  theme: {
    type: 'pie',
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Theme Usage'
        }
      }
    },
    colors: ['#1e293b', '#f8fafc']
  }
};