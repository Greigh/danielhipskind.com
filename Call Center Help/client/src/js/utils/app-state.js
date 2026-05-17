/**
 * Global application state and communication system
 * This helps break circular dependencies by providing a central point for sharing data
 */

// Global storage for application state
const appState = {
  settings: null,
  timers: {},
  services: {},
  ui: {
    activeSection: null,
    darkMode: false,
  },
};

// Events system for pub/sub communication
const eventListeners = {};

/**
 * Set a value in the global state
 * @param {string} path - Dot notation path, e.g. "settings.theme"
 * @param {any} value - Value to store
 */
export function setState(path, value) {
  const parts = path.split('.');
  let current = appState;

  // Navigate to the proper location
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!current[part]) {
      current[part] = {};
    }
    current = current[part];
  }

  // Set the value
  const finalPart = parts[parts.length - 1];
  current[finalPart] = value;

  // Notify listeners
  triggerEvent(`state:${path}`, value);
}

/**
 * Get a value from the global state
 * @param {string} path - Dot notation path
 * @param {any} defaultValue - Default value if path doesn't exist
 */
export function getState(path, defaultValue = null) {
  const parts = path.split('.');
  let current = appState;

  // Navigate to the proper location
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (current[part] === undefined) {
      return defaultValue;
    }
    current = current[part];
  }

  return current;
}

/**
 * Register an event listener
 * @param {string} event - Event name
 * @param {Function} callback - Callback function
 */
export function on(event, callback) {
  if (!eventListeners[event]) {
    eventListeners[event] = [];
  }
  eventListeners[event].push(callback);

  // Return an unsubscribe function
  return () => {
    eventListeners[event] = eventListeners[event].filter(
      (cb) => cb !== callback
    );
  };
}

/**
 * Trigger an event
 * @param {string} event - Event name
 * @param {...any} args - Arguments to pass to the listeners
 */
export function triggerEvent(event, ...args) {
  if (eventListeners[event]) {
    eventListeners[event].forEach((callback) => {
      try {
        callback(...args);
      } catch (err) {
        console.error(`Error in ${event} listener:`, err);
      }
    });
  }
}

// Make state available globally for emergency access
window.__appState = appState;

export default {
  setState,
  getState,
  on,
  triggerEvent,
};
