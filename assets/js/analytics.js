import { Chart } from 'chart.js';
import { format, startOfDay, endOfDay } from 'date-fns';

function collectVisitorData() {
  return {
    path: window.location.pathname,
    theme: document.documentElement.dataset.theme,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    browser: detectBrowser(),
    os: detectOS(),
    device: detectDevice(),
    vpnDetected: false, // Implement VPN detection if needed
    country: Intl.DateTimeFormat().resolvedOptions().timeZone,
    connectionType: navigator.connection?.effectiveType || 'unknown',
    sessionDuration: Math.floor(
      (Date.now() - window.performance.timing.navigationStart) / 1000
    ),
  };
}

function detectBrowser() {
  const ua = navigator.userAgent;
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  return 'Other';
}

function detectOS() {
  const ua = navigator.userAgent;
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac OS')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('iOS')) return 'iOS';
  if (ua.includes('Android')) return 'Android';
  return 'Other';
}

function detectDevice() {
  if (/Mobi|Android/i.test(navigator.userAgent)) return 'mobile';
  if (/Tablet|iPad/i.test(navigator.userAgent)) return 'tablet';
  return 'desktop';
}

class Analytics {
  constructor() {
    this.enabled = false;
    this.init();
  }

  init() {
    // Check for Do Not Track setting
    if (navigator.doNotTrack === '1') {
      console.log('Analytics disabled: Do Not Track is enabled');
      return;
    }

    this.enabled = true;
    this.setupEventListeners();
  }

  setupEventListeners() {
    if (!this.enabled) return;

    // Page view tracking
    document.addEventListener('DOMContentLoaded', () => {
      this.trackPageView();
    });

    // Click tracking
    document.addEventListener('click', (e) => {
      const target = e.target.closest('a, button');
      if (target) {
        this.trackEvent('click', {
          type: target.tagName.toLowerCase(),
          id: target.id || 'unnamed',
          text: target.innerText || 'no-text',
        });
      }
    });
  }

  trackPageView() {
    if (!this.enabled) return;

    const data = {
      page: window.location.pathname,
      referrer: document.referrer,
      timestamp: new Date().toISOString(),
    };

    this.sendAnalytics('pageview', data);
  }

  trackEvent(eventName, data = {}) {
    if (!this.enabled) return;

    this.sendAnalytics('event', {
      event: eventName,
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  async sendAnalytics(type, data) {
    try {
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          data,
        }),
      });

      if (!response.ok) {
        throw new Error(`Analytics error: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Analytics error:', error);
    }
  }

  async loadStats() {
    try {
      const response = await fetch('/api/analytics/stats', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('analyticsToken')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to load stats');

      const { stats } = await response.json();
      this.createCharts(stats);
      this.updateSummary(stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  createCharts(stats) {
    // Visitors by Device
    this.charts.devices = new Chart(document.getElementById('deviceChart'), {
      type: 'doughnut',
      data: {
        labels: Object.keys(stats.devices),
        datasets: [
          {
            data: Object.values(stats.devices),
            backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Visitors by Device',
          },
        },
      },
    });

    // Visitors by Browser
    this.charts.browsers = new Chart(document.getElementById('browserChart'), {
      type: 'bar',
      data: {
        labels: Object.keys(stats.browsers),
        datasets: [
          {
            label: 'Visitors',
            data: Object.values(stats.browsers),
            backgroundColor: '#36A2EB',
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Browser Usage',
          },
        },
      },
    });

    // Peak Hours
    this.charts.hours = new Chart(document.getElementById('hoursChart'), {
      type: 'line',
      data: {
        labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
        datasets: [
          {
            label: 'Visits',
            data: stats.peakHours,
            fill: false,
            borderColor: '#4BC0C0',
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Traffic by Hour',
          },
        },
      },
    });
  }

  updateSummary(stats) {
    document.getElementById('totalVisits').textContent = stats.totalVisits;
    document.getElementById('uniqueVisitors').textContent =
      stats.uniqueVisitors;
    document.getElementById('vpnUsage').textContent = `${Math.round(
      (stats.vpnUsage / stats.totalVisits) * 100
    )}%`;
  }
}

export default new Analytics();
