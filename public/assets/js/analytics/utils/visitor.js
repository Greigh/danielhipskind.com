import { debug } from '../../utils/debug.js';
import { fetchWithTimeout } from '../utils/network.js';

class VisitorLogger {
  constructor() {
    this.logEndpoint = '/api/log';
    this.themeManager = document.documentElement.getAttribute('data-theme');
    this.systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.adBlockDetected = false;
    this.trackingPreventionEnabled = false;
    this.sessionId = this.generateSessionId();
    this.sessionStart = Date.now();
    this.interactions = [];
    this.errors = [];
    this.performanceMetrics = {};
  }

  generateSessionId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  trackPerformance() {
    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing;

      this.performanceMetrics = {
        pageLoadTime: timing.loadEventEnd - timing.navigationStart,
        domReadyTime: timing.domContentLoadedEventEnd - timing.navigationStart,
        firstPaintTime:
          performance.getEntriesByType('paint')[0]?.startTime || 0,
        resourceLoadTime: timing.loadEventEnd - timing.responseEnd,
        networkLatency: timing.responseEnd - timing.fetchStart,
      };
    }
  }

  trackUserJourney(action, data = {}) {
    this.interactions.push({
      timestamp: Date.now(),
      action,
      data,
      path: window.location.pathname,
      sessionDuration: Date.now() - this.sessionStart,
    });
  }

  captureError(error, context = {}) {
    this.errors.push({
      timestamp: Date.now(),
      message: error.message,
      stack: error.stack,
      type: error.name,
      context,
      path: window.location.pathname,
    });
  }

  async gatherVisitorData() {
    // Get approximate location using IP
    const geoResponse = await fetch('https://ipapi.co/json/');
    const geoData = await geoResponse.json();

    // Add VPN detection
    const vpnInfo = await this.detectVPN(geoData);

    // Add blocker detection
    const blockerInfo = await this.detectBlockers();

    this.visitorData = {
      // Basic Info
      timestamp: new Date().toISOString(),
      platform: this.detectPlatform(),
      userAgent: navigator.userAgent,
      language: navigator.language,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      referrer: document.referrer || 'direct',

      // Theme Info
      currentTheme: document.documentElement.getAttribute('data-theme'),
      systemTheme: this.systemThemeQuery.matches ? 'dark' : 'light',
      userPreference: localStorage.getItem('theme-preference'),
      isAutoThemeMobile: this.isAutoThemeMobile(),

      // VPN Info
      vpnDetected: vpnInfo.vpnDetected,
      vpnIndicators: vpnInfo.vpnIndicators,

      // Enhanced Location Info
      ip: geoData.ip,
      city: geoData.city,
      region: geoData.region,
      country: geoData.country_name,
      latitude: geoData.latitude,
      longitude: geoData.longitude,
      isp: geoData.org || 'Unknown',
      asn: geoData.asn || 'Unknown',

      // Blocker Info
      adBlocker: blockerInfo.adBlockDetected,
      trackingPrevention: blockerInfo.trackingPreventionEnabled,

      // Additional checks
      fingerprintingBlocked: await this.detectFingerprintingProtection(),
      privacyMode: await this.detectPrivacyMode(),

      // New data points
      sessionId: this.sessionId,
      sessionDuration: Date.now() - this.sessionStart,
      interactions: this.interactions,
      errors: this.errors,
      performance: this.performanceMetrics,
      pageInfo: {
        title: document.title,
        url: window.location.href,
        path: window.location.pathname,
      },
    };
  }

  async detectVPN(geoData) {
    try {
      const response = await fetchWithTimeout('/api/analytics/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: geoData.ip }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const vpnIndicators = {
        detected: false,
        reasons: [],
      };

      // VPN detection logic here
      debug('VPN detection completed');
      return vpnIndicators;
    } catch (error) {
      debug('VPN detection error:', error);
      return null;
    }
  }

  async checkWebRTC() {
    return new Promise((resolve) => {
      const peerConnection = new RTCPeerConnection();
      const ips = new Set();

      peerConnection.createDataChannel('');
      peerConnection
        .createOffer()
        .then((offer) => peerConnection.setLocalDescription(offer))
        .catch((err) => console.error(err));

      peerConnection.onicecandidate = (event) => {
        if (!event.candidate) {
          peerConnection.close();
          resolve({
            localIP: Array.from(ips).find(
              (ip) =>
                ip.includes('192.168') ||
                ip.includes('10.') ||
                ip.includes('172.')
            ),
            publicIP: Array.from(ips).find(
              (ip) =>
                !ip.includes('192.168') &&
                !ip.includes('10.') &&
                !ip.includes('172.')
            ),
          });
        }
        if (event.candidate?.candidate) {
          const matches = event.candidate.candidate.match(
            /([0-9]{1,3}(\.[0-9]{1,3}){3})/g
          );
          if (matches) matches.forEach((ip) => ips.add(ip));
        }
      };
    });
  }

  async checkDNSLeaks() {
    try {
      const dnsServers = [
        'https://dns.google/resolve',
        'https://cloudflare-dns.com/dns-query',
        'https://dns.quad9.net/dns-query',
      ];

      const checks = await Promise.all(
        dnsServers.map((server) =>
          fetch(`${server}?name=myip.opendns.com&type=A`, {
            headers: { Accept: 'application/dns-json' },
          })
        )
      );

      const results = await Promise.all(checks.map((r) => r.json()));
      const uniqueIPs = new Set(
        results.flatMap((r) => r.Answer?.map((a) => a.data) || [])
      );

      return {
        inconsistentDNS: uniqueIPs.size > 1,
      };
    } catch (error) {
      console.error('DNS leak check failed:', error);
      return { inconsistentDNS: false };
    }
  }

  isAutoThemeMobile() {
    const platform = this.detectPlatform();
    if (platform === 'iOS' || platform === 'Android') {
      const hour = new Date().getHours();
      const isDark = hour >= 19 || hour < 7;
      return this.systemThemeQuery.matches === isDark;
    }
    return false;
  }

  async logVisit() {
    try {
      await this.gatherVisitorData();

      const response = await fetch(this.logEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(this.visitorData),
      });

      if (!response.ok) {
        throw new Error('Failed to log visit');
      }

      if (process.env.NODE_ENV === 'development') {
        console.debug('Visit logged:', this.visitorData);
      }
    } catch (error) {
      console.error('Error logging visit:', error);
    }
  }

  detectPlatform() {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
      return 'iOS';
    } else if (ua.includes('mac os x')) {
      return 'macOS';
    } else if (ua.includes('android')) {
      return 'Android';
    } else if (ua.includes('windows')) {
      return 'Windows';
    } else if (ua.includes('linux')) {
      return 'Linux';
    }
    return 'Unknown';
  }

  async detectBlockers() {
    // Create test elements
    const testAd = document.createElement('div');
    testAd.innerHTML = '&nbsp;';
    testAd.className = 'adsbox';

    const testTracker = document.createElement('div');
    testTracker.id = 'tracking-pixel';

    document.body.appendChild(testAd);
    document.body.appendChild(testTracker);

    // Check for ad blockers
    this.adBlockDetected = !testAd.offsetHeight;

    // Check for tracking prevention
    try {
      await fetch('https://www.google-analytics.com/collect', {
        method: 'POST',
        mode: 'no-cors',
      });
      this.trackingPreventionEnabled = false;
    } catch {
      this.trackingPreventionEnabled = true;
    }

    // Clean up test elements
    document.body.removeChild(testAd);
    document.body.removeChild(testTracker);

    return {
      adBlockDetected: this.adBlockDetected,
      trackingPreventionEnabled: this.trackingPreventionEnabled,
    };
  }

  async detectFingerprintingProtection() {
    try {
      // Test canvas fingerprinting
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx.textBaseline = 'top';
      ctx.font = '14px "Arial"';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('fingerprintjs2', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('fingerprintjs2', 4, 17);

      const fingerprint = canvas.toDataURL();
      return fingerprint === 'data:,'; // Blocked if empty
    } catch {
      return true; // Error means likely blocked
    }
  }

  async detectPrivacyMode() {
    try {
      // Check for private browsing
      const fs = window.RequestFileSystem || window.webkitRequestFileSystem;
      return new Promise((resolve) => {
        if (!fs) {
          resolve(false);
          return;
        }
        fs(
          window.TEMPORARY,
          100,
          () => resolve(false),
          () => resolve(true)
        );
      });
    } catch {
      return false;
    }
  }
}

// Add event listeners for tracking
document.addEventListener('DOMContentLoaded', () => {
  const logger = new VisitorLogger();

  // Track performance after load
  window.addEventListener('load', () => {
    logger.trackPerformance();
  });

  // Track user interactions
  document.addEventListener('click', (event) => {
    const target = event.target.closest('a, button');
    if (target) {
      logger.trackUserJourney('click', {
        element: target.tagName,
        id: target.id,
        class: target.className,
        text: target.textContent?.trim(),
      });
    }
  });

  // Track errors
  window.addEventListener('error', (event) => {
    logger.captureError(event.error);
  });

  // Track navigation
  window.addEventListener('popstate', () => {
    logger.trackUserJourney('navigation', {
      from: document.referrer,
      to: window.location.href,
    });
  });
});

export default VisitorLogger;
