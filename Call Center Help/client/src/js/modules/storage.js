// LocalStorage persistence helpers with size caps for array collections

export const STORAGE_LIMITS = {
  recordings: 15,
  tasks: 200,
  qaReports: 100,
  chatMessages: 100,
  callHistory: 200,
  notes: 500,
  scripts: 100,
  certifications: 100,
  teamMembers: 50,
  callTemplates: 50,
  numberPatterns: 100,
  callFlowSteps: 200,
  'crm-contacts': 200,
  'analytics-data': 1, // single object — cap nested arrays separately if needed
  'time-tracking-data': 1,
  'feedback-data': 100,
  'knowledge-base-data': 1,
  'api-integration-data': 1,
};

// Request persistent storage to prevent browser from clearing data
export function requestPersistentStorage() {
  if ('storage' in navigator && 'persist' in navigator.storage) {
    navigator.storage
      .persist()
      .then(function (persistent) {
        if (!persistent) {
          console.log(
            'Storage persistence denied - data may be cleared by browser'
          );
        }
      })
      .catch(function (error) {
        console.warn('Error requesting persistent storage:', error);
      });
  } else {
    console.log('Persistent storage API not available');
  }
}

// Check if storage is persistent
export function isStoragePersistent() {
  if ('storage' in navigator && 'persisted' in navigator.storage) {
    return navigator.storage.persisted();
  }
  return Promise.resolve(false);
}

export function capArray(data, max) {
  if (!Array.isArray(data)) return data;
  if (typeof max !== 'number' || max < 0) return data;
  if (data.length <= max) return data;
  return data.slice(-max);
}

export function saveData(key, data) {
  try {
    const limit = STORAGE_LIMITS[key];
    const payload =
      typeof limit === 'number' && Array.isArray(data)
        ? capArray(data, limit)
        : data;
    localStorage.setItem(key, JSON.stringify(payload));
    return true;
  } catch (error) {
    console.error(`Failed to save ${key}:`, error);
    // Quota exceeded — drop oldest half of array collections and retry once
    if (
      error &&
      (error.name === 'QuotaExceededError' || error.code === 22) &&
      Array.isArray(data) &&
      data.length > 1
    ) {
      try {
        const halved = data.slice(Math.floor(data.length / 2));
        localStorage.setItem(key, JSON.stringify(halved));
        return true;
      } catch (retryErr) {
        console.error(`Retry save failed for ${key}:`, retryErr);
      }
    }
    return false;
  }
}

export function loadData(key, defaultValue = null) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch (error) {
    console.error(`Failed to load ${key}:`, error);
    return defaultValue;
  }
}

export function clearData(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Failed to clear ${key}:`, error);
    return false;
  }
}

export function clearAllData() {
  try {
    localStorage.clear();
    return true;
  } catch (error) {
    console.error('Failed to clear all data:', error);
    return false;
  }
}

// Specific save/load functions
export function savePatterns(patterns) {
  return saveData('numberPatterns', patterns);
}

export function loadPatterns() {
  return loadData('numberPatterns', []);
}

export function saveSteps(steps) {
  return saveData('callFlowSteps', steps);
}

export function loadSteps() {
  return loadData('callFlowSteps', []);
}

export function saveNotes(notes) {
  return saveData('notes', notes);
}

export function loadNotes() {
  return loadData('notes', []);
}

export function saveSettings(settings) {
  return saveData('appSettings', settings);
}

export function loadSettings() {
  return loadData('appSettings', {});
}

export function saveTimerData(timerId, data) {
  saveData(`timer_${timerId}`, data);
}

export function loadTimerData(timerId) {
  return loadData(`timer_${timerId}`, null);
}

export function saveNotesData(notesId, data) {
  saveData(`notes_${notesId}`, data);
}

export function loadNotesData(notesId) {
  return loadData(`notes_${notesId}`, []);
}

// FIX: Special handling for theme since it's a simple string
export function saveTheme(theme) {
  try {
    localStorage.setItem('theme', theme); // Save as simple string, not JSON
    return true;
  } catch (error) {
    console.error('Failed to save theme:', error);
    return false;
  }
}

export function loadTheme() {
  try {
    return localStorage.getItem('theme') || 'light'; // Get as simple string, not JSON
  } catch (error) {
    console.error('Failed to load theme:', error);
    return 'light';
  }
}
