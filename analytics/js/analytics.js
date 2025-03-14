import { Chart } from 'chart.js';
import { TokenManager } from './tokenManager.js';
import auth from './auth.js';

// Check authentication before loading analytics
if (!auth.isAuthenticated()) {
  window.location.href = '/analytics/login.html';
}

class AnalyticsDashboard {
  constructor() {
    this.initializeDatePickers();
    this.loadVisitorData();
  }

  async loadVisitorData() {
    try {
      const response = await fetch('/api/logs');
      const data = await response.json();
      this.updateDashboard(data);
    } catch (error) {
      console.error('Error loading visitor data:', error);
    }
  }

  updateDashboard(data) {
    this.updateStats(data);
    this.updateCharts(data);
    this.updateTable(data);
  }

  updateStats(data) {
    document.querySelector('#totalVisitors .stat-number').textContent =
      data.length;
    const uniqueIPs = new Set(data.map((visit) => visit.ip)).size;
    document.querySelector('#uniqueVisitors .stat-number').textContent =
      uniqueIPs;

    const vpnCount = data.filter((visit) => visit.vpnDetected).length;
    const vpnPercentage = ((vpnCount / data.length) * 100).toFixed(1);
    document.querySelector('#vpnUsers .stat-number').textContent =
      `${vpnPercentage}%`;

    const adBlockCount = data.filter((visit) => visit.adBlocker).length;
    const adBlockPercentage = ((adBlockCount / data.length) * 100).toFixed(1);
    document.querySelector('#adBlockUsers .stat-number').textContent =
      `${adBlockPercentage}%`;
  }

  updateCharts(data) {
    this.createPlatformChart(data);
    this.createThemeChart(data);
  }

  createPlatformChart(data) {
    const platforms = data.reduce((acc, visit) => {
      acc[visit.platform] = (acc[visit.platform] || 0) + 1;
      return acc;
    }, {});

    new Chart(document.getElementById('platformChart'), {
      type: 'pie',
      data: {
        labels: Object.keys(platforms),
        datasets: [
          {
            data: Object.values(platforms),
            backgroundColor: [
              '#3b82f6',
              '#60a5fa',
              '#93c5fd',
              '#bfdbfe',
              '#dbeafe',
            ],
          },
        ],
      },
    });
  }

  createThemeChart(data) {
    const themes = data.reduce((acc, visit) => {
      acc[visit.currentTheme] = (acc[visit.currentTheme] || 0) + 1;
      return acc;
    }, {});

    new Chart(document.getElementById('themeChart'), {
      type: 'pie',
      data: {
        labels: Object.keys(themes),
        datasets: [
          {
            data: Object.values(themes),
            backgroundColor: ['#1e293b', '#f8fafc'],
          },
        ],
      },
    });
  }

  updateTable(data) {
    const tbody = document.querySelector('#visitorLog tbody');
    tbody.innerHTML = data
      .slice(-10)
      .reverse()
      .map(
        (visit) => `
            <tr>
                <td>${new Date(visit.timestamp).toLocaleString()}</td>
                <td>${visit.platform}</td>
                <td>${visit.city}, ${visit.country}</td>
                <td>${visit.currentTheme}</td>
                <td>${visit.vpnDetected ? '✓' : '✗'}</td>
                <td>${visit.adBlocker ? '✓' : '✗'}</td>
            </tr>
        `
      )
      .join('');
  }

  initializeDatePickers() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    document.getElementById('startDate').valueAsDate = startDate;
    document.getElementById('endDate').valueAsDate = endDate;

    document.getElementById('filterDates').addEventListener('click', () => {
      this.loadVisitorData();
    });
  }
}

class Analytics {
  constructor() {
    this.tokenManager = new TokenManager();
    this.data = [];
    this.init();
  }

  async init() {
    try {
      const isAuthenticated = await this.tokenManager.isAuthenticated();
      if (!isAuthenticated) {
        window.location.href = '/analytics/login.html';
        return;
      }

      await this.loadData();
      this.updateUI();
      this.setupEventListeners();
    } catch (error) {
      console.error('Initialization failed:', error);
    }
  }

  async loadData() {
    try {
      const response = await fetch('/api/logs');
      const jsonData = await response.json();

      // Ensure data is an array
      this.data = Array.isArray(jsonData) ? jsonData : [];

      console.log('Loaded data:', this.data); // Debug log
    } catch (error) {
      console.error('Failed to load analytics data:', error);
      this.data = [];
    }
  }

  updateUI() {
    if (!Array.isArray(this.data)) {
      console.error('Invalid data format:', this.data);
      return;
    }

    this.updateStats();
    this.updateCharts();
    this.updateTable();
  }

  updateStats() {
    const startDate = document.getElementById('startDate')?.value;
    const endDate = document.getElementById('endDate')?.value;

    // Filter data by date range if dates are selected
    const filteredData =
      startDate && endDate
        ? this.data.filter((item) => {
            const date = new Date(item.timestamp);
            return date >= new Date(startDate) && date <= new Date(endDate);
          })
        : this.data;

    // Update statistics
    document.getElementById('totalVisits').textContent = filteredData.length;

    const uniqueIPs = new Set(filteredData.map((item) => item.ip)).size;
    document.getElementById('uniqueVisitors').textContent = uniqueIPs;

    const vpnCount = filteredData.filter((item) => item.vpnDetected).length;
    const vpnPercentage =
      filteredData.length > 0
        ? ((vpnCount / filteredData.length) * 100).toFixed(1)
        : '0';
    document.getElementById('vpnUsage').textContent = `${vpnPercentage}%`;
  }

  updateCharts() {
    this.createPlatformChart(this.data);
    this.createThemeChart(this.data);
  }

  createPlatformChart(data) {
    const platforms = data.reduce((acc, visit) => {
      acc[visit.platform] = (acc[visit.platform] || 0) + 1;
      return acc;
    }, {});

    new Chart(document.getElementById('platformChart'), {
      type: 'pie',
      data: {
        labels: Object.keys(platforms),
        datasets: [
          {
            data: Object.values(platforms),
            backgroundColor: [
              '#3b82f6',
              '#60a5fa',
              '#93c5fd',
              '#bfdbfe',
              '#dbeafe',
            ],
          },
        ],
      },
    });
  }

  createThemeChart(data) {
    const themes = data.reduce((acc, visit) => {
      acc[visit.currentTheme] = (acc[visit.currentTheme] || 0) + 1;
      return acc;
    }, {});

    new Chart(document.getElementById('themeChart'), {
      type: 'pie',
      data: {
        labels: Object.keys(themes),
        datasets: [
          {
            data: Object.values(themes),
            backgroundColor: ['#1e293b', '#f8fafc'],
          },
        ],
      },
    });
  }

  updateTable() {
    const tbody = document.querySelector('#visitorTable tbody');
    tbody.innerHTML = this.data
      .slice(-10)
      .reverse()
      .map(
        (visit) => `
        <tr>
            <td>${new Date(visit.timestamp).toLocaleString()}</td>
            <td>${visit.platform}</td>
            <td>${visit.city}, ${visit.country}</td>
            <td>${visit.currentTheme}</td>
            <td>${visit.vpnDetected ? '✓' : '✗'}</td>
            <td>${visit.adBlocker ? '✓' : '✗'}</td>
        </tr>
    `
      )
      .join('');
  }

  setupEventListeners() {
    document
      .getElementById('refreshStats')
      ?.addEventListener('click', () => this.init());
    document
      .getElementById('clearStats')
      ?.addEventListener('click', () => this.clearData());
    document
      .getElementById('logoutBtn')
      ?.addEventListener('click', () => this.tokenManager.logout());
  }

  async clearData() {
    if (!confirm('Are you sure you want to clear all analytics data?')) return;

    try {
      await fetch('/api/analytics/logs', { method: 'DELETE' });
      this.data = [];
      this.stats = {
        totalVisits: 0,
        vpnUsage: 0,
        adBlockUsage: 0,
        darkMode: 0,
      };
      this.updateUI();
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  }

  initializeDatePickers() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const startPicker = document.getElementById('startDate');
    const endPicker = document.getElementById('endDate');

    if (startPicker && endPicker) {
      startPicker.valueAsDate = startDate;
      endPicker.valueAsDate = endDate;

      document.getElementById('filterDates')?.addEventListener('click', () => {
        this.loadVisitorData();
      });
    }
  }
}

// Single initialization
document.addEventListener('DOMContentLoaded', () => new Analytics());
