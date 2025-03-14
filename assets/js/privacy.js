class PrivacyManager {
  constructor() {
    this.privacyKey = 'privacy_preference';
    this.elements = this.initializeElements();

    if (this.elements.banner) {
      this.init();
    }

    if (this.hasPrivacyControls()) {
      this.initializeControls();
    }
  }

  initializeElements() {
    return {
      banner: document.getElementById('privacy-banner'),
      acceptBtn: document.getElementById('accept-privacy'),
      rejectBtn: document.getElementById('reject-privacy'),
      optOutBtn: document.getElementById('opt-out-btn'),
      exportBtn: document.getElementById('export-data'),
      deleteBtn: document.getElementById('delete-data'),
    };
  }

  hasPrivacyControls() {
    return (
      this.elements.optOutBtn ||
      this.elements.exportBtn ||
      this.elements.deleteBtn
    );
  }

  init() {
    if (!this.hasPreference()) {
      this.showBanner();
    }
    this.setupListeners();
  }

  hasPreference() {
    return localStorage.getItem(this.privacyKey) !== null;
  }

  showBanner() {
    this.elements.banner?.classList.remove('hidden');
  }

  hideBanner() {
    this.elements.banner?.classList.add('hidden');
  }

  setupListeners() {
    this.elements.acceptBtn?.addEventListener('click', () => {
      localStorage.setItem(this.privacyKey, 'accepted');
      this.hideBanner();
    });

    this.elements.rejectBtn?.addEventListener('click', () => {
      localStorage.setItem(this.privacyKey, 'rejected');
      localStorage.setItem('analytics_optout', 'true');
      this.hideBanner();
    });
  }

  isTrackingAllowed() {
    return localStorage.getItem(this.privacyKey) === 'accepted';
  }

  initializeControls() {
    if (this.elements.optOutBtn) {
      // Check if already opted out
      if (localStorage.getItem('analytics_optout') === 'true') {
        this.elements.optOutBtn.textContent = 'Opted Out';
        this.elements.optOutBtn.disabled = true;
      }

      this.elements.optOutBtn.addEventListener('click', () =>
        this.handleOptOut()
      );
    }

    this.elements.exportBtn?.addEventListener('click', () =>
      this.handleExport()
    );
    this.elements.deleteBtn?.addEventListener('click', () =>
      this.handleDelete()
    );
  }

  handleOptOut() {
    try {
      localStorage.setItem('analytics_optout', 'true');
      if (this.elements.optOutBtn) {
        this.elements.optOutBtn.textContent = 'Opted Out';
        this.elements.optOutBtn.disabled = true;
      }
      this.showMessage('Successfully opted out of analytics');
    } catch (error) {
      this.showMessage('Failed to opt out', 'error');
    }
  }

  handleExport() {
    try {
      const data = {
        preferences: {
          theme: localStorage.getItem('theme-preference'),
          analytics: localStorage.getItem('analytics_optout'),
        },
        timestamp: new Date().toISOString(),
      };
      this.downloadJson(data, 'privacy-data.json');
      this.showMessage('Data exported successfully');
    } catch (error) {
      this.showMessage('Failed to export data', 'error');
    }
  }

  handleDelete() {
    if (
      confirm(
        'Are you sure you want to delete your data? This will reset all preferences.'
      )
    ) {
      try {
        localStorage.clear();
        if (this.elements.optOutBtn) {
          this.elements.optOutBtn.textContent = 'Opt Out of Analytics';
          this.elements.optOutBtn.disabled = false;
        }
        this.showMessage('Your data has been deleted');
      } catch (error) {
        this.showMessage('Failed to delete data', 'error');
      }
    }
  }

  downloadJson(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  showMessage(message) {
    alert(message); // Simple alert for now, can be enhanced with custom toast later
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PrivacyManager();
});
