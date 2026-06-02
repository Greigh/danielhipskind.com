// LocalStorage persistence functions

// Request persistent storage to prevent browser from clearing data.
// The browser persistence APIs are deprecated here, so this is now a no-op.
export function requestPersistentStorage() {
  return Promise.resolve(false);
}

// Check if storage is persistent
export function isStoragePersistent() {
  return Promise.resolve(false);
}

export function saveData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error(`Failed to save ${key}:`, error);
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
