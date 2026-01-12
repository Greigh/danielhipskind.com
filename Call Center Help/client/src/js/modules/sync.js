// Sync Manager handles data synchronization between local storage and server
// Implements Strategy 2: Conflict Prompt on Login

import {
  loadNotes,
  loadPatterns,
  loadSettings,
  saveNotes,
  savePatterns,
  saveSettings,
} from './storage.js';
import { showToast } from '../utils/toast.js';

export class SyncManager {
  constructor() {
    this.apiBase = '/api/sync';
  }

  // Check if there is meaningful local data
  hasLocalData() {
    const notes = loadNotes();
    const patterns = loadPatterns();
    // We consider it "meaningful" if there are any notes or non-default patterns
    // Settings are less critical to prompt for, but could be included if desired
    return (notes && notes.length > 0) || (patterns && patterns.length > 0); // basic check
  }

  // Main entry point after successful login
  async handleLoginSync() {
    if (this.hasLocalData()) {
      // Prompt user
      const choice = await this.showSyncConflictModal();
      if (choice === 'merge') {
        await this.syncData('merge');
      } else {
        await this.syncData('server_only');
      }
    } else {
      // No local data, safe to just pull server data
      await this.syncData('server_only');
    }
  }

  // Display the modal
  showSyncConflictModal() {
    return new Promise((resolve) => {
      // Create modal elements
      const overlay = document.createElement('div');
      overlay.className = 'confirm-modal-overlay active';
      overlay.innerHTML = `
        <div class="confirm-modal">
          <h3>Sync Conflict</h3>
          <p>We found existing data (notes, patterns) on this device.</p>
          <p>Would you like to merge this with your account, or discard it and load your account data?</p>
          <div class="modal-actions">
            <button id="sync-merge-btn" class="button btn-primary">Merge Data</button>
            <button id="sync-discard-btn" class="button btn-danger">Discard Local</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      const cleanup = () => {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 300);
      };

      document.getElementById('sync-merge-btn').onclick = () => {
        cleanup();
        resolve('merge');
      };

      document.getElementById('sync-discard-btn').onclick = () => {
        cleanup();
        resolve('discard');
      };
    });
  }

  async syncData(strategy) {
    const localData = {
      notes: loadNotes(),
      patterns: loadPatterns(),
      settings: loadSettings(),
    };

    try {
      showToast('Syncing data...', 'info');

      const payload = {
        strategy: strategy, // 'merge' or 'server_only'
        data: strategy === 'merge' ? localData : null,
      };

      // In a real app, this would be a fetch call
      // const res = await fetch(this.apiBase, {
      //   method: 'POST',
      //   headers: auth.getAuthHeader(),
      //   body: JSON.stringify(payload)
      // });
      // const serverData = await res.json();

      // MOCK SERVER RESPONSE for demonstration
      const serverData = await this.mockServerSync(payload);

      // Apply server data to local storage
      if (serverData.notes) saveNotes(serverData.notes);
      if (serverData.patterns) savePatterns(serverData.patterns);
      if (serverData.settings) saveSettings(serverData.settings);

      // Notify other modules to reload data (simple reload for now)
      showToast('Sync complete!', 'success');
      // In a SPA, we might emit an event here.
      // For now, refreshing the page or calling module init methods is simplest.
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Sync failed:', error);
      showToast('Sync failed. Continuing with local data.', 'error');
    }
  }

  // Simulation of backend logic
  async mockServerSync(payload) {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('Server received sync request:', payload);

        // Simulating server data
        const serverNotes = [
          {
            id: 'srv1',
            content: 'Welcome back! (Server Note)',
            timestamp: Date.now(),
          },
        ];
        const serverPatterns = []; // Empty or defaults

        if (payload.strategy === 'merge') {
          // Merge logic: combine arrays
          const mergedNotes = [...(payload.data.notes || []), ...serverNotes];
          resolve({
            notes: mergedNotes,
            patterns: payload.data.patterns || [],
            settings: payload.data.settings || {},
          });
        } else {
          // Server only: return just server data
          resolve({
            notes: serverNotes,
            patterns: serverPatterns,
            settings: {}, // default settings
          });
        }
      }, 800);
    });
  }
}

export const syncManager = new SyncManager();
