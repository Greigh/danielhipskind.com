class VisitorLogger {
  constructor() {
    this.logEndpoint = '/api/log';
    this.themeManager = document.documentElement.getAttribute('data-theme');
    this.systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.adBlockDetected = false;
    this.trackingPreventionEnabled = false;
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
    };
  }

  async detectVPN(geoData) {
    const vpnProviders = [
      'digitalocean',
      'amazon',
      'google cloud',
      'microsoft azure',
      'linode',
      'ovh',
      'cloudflare',
      'nordvpn',
      'expressvpn',
      'protonvpn',
      'private internet access',
      'mullvad',
      'ipvanish',
      'surfshark',
      'cyberghost',
      'tunnelbear',
      'windscribe',
      'hide.me',
      'hotspotshield',
      'akamai',
      'fastly',
      'vultr',
      'hetzner',
    ];

    const vpnIndicators = {
      isHosting: false,
      isProxy: false,
      suspiciousPort: false,
      mismatchedTimezone: false,
      datacenterIP: false,
      dnsLeakDetected: false,
      webRTCLeakDetected: false,
      connectionInconsistency: false,
    };

    try {
      // Check hosting providers (existing)
      vpnIndicators.isHosting = vpnProviders.some((provider) =>
        geoData.org?.toLowerCase().includes(provider)
      );

      // Check for proxy headers (enhanced)
      const proxyHeaders = [
        'via',
        'x-forwarded-for',
        'forwarded',
        'client-ip',
        'x-real-ip',
      ];

      vpnIndicators.isProxy = !!(
        geoData.proxy ||
        geoData.hosting ||
        geoData.tor ||
        geoData.vpn ||
        proxyHeaders.some((header) => request.headers[header])
      );

      // Check for timezone mismatch (enhanced)
      const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const geoTimezone = geoData.timezone;
      const timezoneOffset = new Date().getTimezoneOffset();
      const expectedOffset = this.getTimezoneOffset(
        geoData.latitude,
        geoData.longitude
      );
      vpnIndicators.mismatchedTimezone =
        browserTimezone !== geoTimezone ||
        Math.abs(timezoneOffset - expectedOffset) > 60;

      // WebRTC leak detection
      const webRTCData = await this.checkWebRTC();
      vpnIndicators.webRTCLeakDetected =
        webRTCData.localIP !== webRTCData.publicIP;

      // DNS leak detection
      const dnsData = await this.checkDNSLeaks();
      vpnIndicators.dnsLeakDetected = dnsData.inconsistentDNS;

      // Check for datacenter IP ranges
      const datacenterRanges = await fetch(
        '/assets/data/datacenter-ranges.json'
      );
      const ranges = await datacenterRanges.json();
      vpnIndicators.datacenterIP = this.isIPInRanges(geoData.ip, ranges);

      // Connection consistency check
      const connectionChecks = await Promise.all([
        fetch('https://api.ipify.org?format=json'),
        fetch('https://ifconfig.me/ip'),
        fetch('https://api64.ipify.org?format=json'),
      ]);

      const ips = await Promise.all(
        connectionChecks.map((response) => response.json())
      );
      vpnIndicators.connectionInconsistency =
        new Set(ips.map((data) => data.ip)).size > 1;
    } catch (error) {
      console.error('Error in VPN detection:', error);
    }

    // Weight-based detection
    const weights = {
      isHosting: 0.3,
      isProxy: 0.25,
      suspiciousPort: 0.1,
      mismatchedTimezone: 0.15,
      datacenterIP: 0.2,
      dnsLeakDetected: 0.4,
      webRTCLeakDetected: 0.4,
      connectionInconsistency: 0.35,
    };

    const weightedScore = Object.entries(vpnIndicators).reduce(
      (score, [key, value]) => score + (value ? weights[key] : 0),
      0
    );

    return {
      vpnDetected: weightedScore > 0.5,
      vpnIndicators,
      confidence: weightedScore,
    };
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

export default VisitorLogger;
