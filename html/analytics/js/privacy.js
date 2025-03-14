export class PrivacyManager {
  constructor() {
    this.optOutKey = 'analytics_optout';
  }

  isTrackingAllowed() {
    // Check Do Not Track setting
    if (navigator.doNotTrack === '1') {
      return false;
    }

    // Check local opt-out
    if (localStorage.getItem(this.optOutKey) === 'true') {
      return false;
    }

    return true;
  }

  anonymizeIP(ip) {
    return ip.split('.').slice(0, 3).concat(['0']).join('.');
  }

  getAnonymizedData() {
    return {
      screen: {
        width: window.screen.width,
        height: window.screen.height,
      },
      language: navigator.language,
      theme: document.documentElement.getAttribute('data-theme'),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }
}
