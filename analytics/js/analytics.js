import Chart from 'https://cdn.skypack.dev/chart.js';
import { TokenManager } from './tokenManager.js';

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
    document.querySelector(
      '#vpnUsers .stat-number'
    ).textContent = `${vpnPercentage}%`;

    const adBlockCount = data.filter((visit) => visit.adBlocker).length;
    const adBlockPercentage = ((adBlockCount / data.length) * 100).toFixed(1);
    document.querySelector(
      '#adBlockUsers .stat-number'
    ).textContent = `${adBlockPercentage}%`;
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
    this.token = localStorage.getItem('analyticsToken');
    if (!this.token) {
      window.location.href = '/analytics/login.html';
      return;
    }
    this.init();
  }

  async init() {
    await this.loadData();
    this.updateUI();
    this.setupEventListeners();
  }

  async loadData() {
    try {
      const [logs, stats] = await Promise.all([
        fetch('/api/analytics/logs', {
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
        }).then((r) => {
          if (r.status === 401) {
            this.handleUnauthorized();
            throw new Error('Unauthorized');
          }
          return r.json();
        }),
        fetch('/api/analytics/stats', {
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
        }).then((r) => r.json()),
      ]);

      this.data = logs;
      this.stats = stats;
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  }

  handleUnauthorized() {
    localStorage.removeItem('analyticsToken');
    window.location.href = '/analytics/login.html';
  }

  logout() {
    this.tokenManager.clearToken();
    this.showLoginForm();
  }

  showLoginForm() {
    const form = document.createElement('div');
    form.className = 'login-form';
    form.innerHTML = `
      <h2>Login Required</h2>
      <input type="password" id="password" placeholder="Enter password">
      <button id="loginBtn">Login</button>
    `;

    document.querySelector('main').innerHTML = '';
    document.querySelector('main').appendChild(form);

    document.getElementById('loginBtn').onclick = () => {
      const password = document.getElementById('password').value;
      this.login(password);
    };
  }

  hideLoginForm() {
    document.querySelector('.login-form')?.remove();
  }

  updateUI() {
    this.updateStats();
    this.updateTable();
  }

  updateStats() {
    const total = this.data.length;
    const vpnUsers = this.data.filter((v) => v.vpnDetected).length;
    const adBlockUsers = this.data.filter((v) => v.adBlocker).length;
    const darkMode = this.data.filter((v) => v.currentTheme === 'dark').length;

    document.getElementById('totalVisits').textContent = total;
    document.getElementById('vpnPercentage').textContent = `${(
      (vpnUsers / total) *
      100
    ).toFixed(1)}%`;
    document.getElementById('adBlockPercentage').textContent = `${(
      (adBlockUsers / total) *
      100
    ).toFixed(1)}%`;
    document.getElementById('darkModePercentage').textContent = `${(
      (darkMode / total) *
      100
    ).toFixed(1)}%`;
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
    document.getElementById('refreshStats').onclick = () => this.init();
    document.getElementById('clearStats').onclick = () => this.clearData();
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
}

// Initialize analytics
document.addEventListener('DOMContentLoaded', () => new Analytics());

new AnalyticsDashboard();
