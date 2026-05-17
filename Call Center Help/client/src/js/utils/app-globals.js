// This file provides a centralized place to store global objects and functions
// which helps prevent circular dependencies

// App globals object
const AppGlobals = {
  // Timer state
  holdTimer: null,

  // App settings
  appSettings: null,

  // Core functions that need to be globally accessible
  saveSettings: null,
  toggleTimerMode: null,
  openSectionInBrowserPopup: null,
  openSectionInFloatingWindow: null,

  // Initialize globals (call this from main.js)
  init(settings) {
    this.appSettings = settings;

    // Attach to window for easy access
    window.AppGlobals = this;
  },
};

export default AppGlobals;
