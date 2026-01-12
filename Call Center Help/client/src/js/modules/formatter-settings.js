import { showToast } from '../utils/toast.js';
import { saveData, loadData, savePatterns } from './storage.js';
import {
  attachPatternEventListeners,
  updatePatternTable,
  patterns,
  initializePatterns,
} from './patterns.js';

export function showFormatterSettings() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';

  // Get current settings
  const appSettings = window.appSettings || {};
  // const visibleSections = appSettings.visibleSections || {};

  // const isVisible = visibleSections.formatter !== false; // Default true (or whatever key is used)
  // Note: The key for Pattern Formatter in section-settings might be 'settings-pattern-formatter' or 'formatter'
  // Let's check how it's stored. section-settings.js uses 'formatter' in the toggles map for 'settings-pattern-formatter'
  // but visibleSections usually uses the ID.
  // In settings.js: 'toggle-formatter': 'formatter' -> data-section="settings-pattern-formatter"
  // The key in appSettings is likely 'showFormatter' or visibleSections['settings-pattern-formatter']?
  // Let's rely on standard 'showFormatter' or check visibleSections.
  // Based on settings.js:
  // const section = 'formatter';
  // settingKey = 'show' + section... -> 'showFormatter'
  // But there is also visibleSections logic.
  // Let's assume 'showFormatter' matches `appSettings.showFormatter`.

  const isSectionVisible = appSettings.showFormatter !== false;
  const autoCopy = loadData('autoCopyPattern', true);

  modal.innerHTML = `
      <div class="modal settings-modal" style="max-width: 700px; width: 95%;">
        <div class="modal-header">
          <h3>Pattern Formatter Settings</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
            
            <div class="tabs tab-header">
                <button class="tab-button active" data-tab="general">General</button>
                <button class="tab-button" data-tab="patterns">Patterns</button>
            </div>

            <form id="formatter-settings-form">
            
                <!-- General Tab -->
                <div id="tab-general" class="tab-content active">
                    
                    <div class="setting-item" style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid var(--border-color);">
                        <div class="setting-info" style="margin-bottom: 10px;">
                            <label style="font-weight: 600; display: block; margin-bottom: 4px;">Show Pattern Formatter Section</label>
                            <small class="text-muted" style="display: block; line-height: 1.4;">
                                Toggle the visibility of the Pattern Formatter on the main dashboard.
                            </small>
                        </div>
                        <div class="form-group checkbox-group" style="display: flex; align-items: center; gap: 12px;">
                            <label class="switch" style="cursor: pointer; margin: 0;">
                                <input type="checkbox" id="formatter-visible" class="hidden-toggle" ${isSectionVisible ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                            <label for="formatter-visible" style="margin: 0; cursor: pointer;">Show Section</label>
                        </div>
                    </div>

                    <div class="setting-item">
                        <div class="setting-info" style="margin-bottom: 10px;">
                            <label style="font-weight: 600; display: block; margin-bottom: 4px;">Auto Copy Result</label>
                             <small class="text-muted" style="display: block; line-height: 1.4;">
                                Automatically copy the formatted number to your clipboard when a valid pattern is matched.
                            </small>
                        </div>
                        <div class="form-group checkbox-group" style="display: flex; align-items: center; gap: 12px;">
                            <label class="switch" style="cursor: pointer; margin: 0;">
                                <input type="checkbox" id="formatter-auto-copy" class="hidden-toggle" ${autoCopy ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                            <label for="formatter-auto-copy" style="margin: 0; cursor: pointer;">Auto Copy</label>
                        </div>
                    </div>

                </div>

                <!-- Patterns Tab -->
                <div id="tab-patterns" class="tab-content" style="display: none;">
                    <p class="text-muted" style="margin-bottom: 15px;">Configure number formatting patterns. Use 'X' for digits to match.</p>
                    
                    <div class="pattern-management" id="pattern-management-modal">
                        <div class="input-group" style="display: grid; grid-template-columns: 1fr 1fr 2fr auto; gap: 10px; align-items: end; margin-bottom: 15px;">
                          <label>
                            <span style="display:block; font-size: 0.8em; margin-bottom: 4px;">Starting Digits</span>
                            <input
                              type="text"
                              id="startSequence"
                              class="form-control"
                              placeholder="Optional..."
                            />
                          </label>
                          <label>
                            <span style="display:block; font-size: 0.8em; margin-bottom: 4px;">Min Length</span>
                            <input
                              type="number"
                              id="minLength"
                              class="form-control"
                              placeholder="Min..."
                              min="1"
                            />
                          </label>
                          <label>
                            <span style="display:block; font-size: 0.8em; margin-bottom: 4px;">Format (X = digit)</span>
                            <input
                              type="text"
                              id="formatPattern"
                              class="form-control"
                              placeholder="Ex: @XXX-XXX-XXXX"
                            />
                          </label>
                          <button type="button" id="addPatternBtn" class="button btn-sm btn-primary" style="height: 38px;">Add</button>
                        </div>

                        <div class="table-container" style="max-height: 300px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 4px;">
                            <table class="pattern-table" style="width: 100%; border-collapse: collapse;">
                              <thead style="background: var(--bg-secondary); position: sticky; top: 0;">
                                <tr>
                                  <th class="drag-col" style="width: 30px;"></th>
                                  <th style="text-align: left; padding: 8px;">Start</th>
                                  <th style="text-align: left; padding: 8px;">Min Length</th>
                                  <th style="text-align: left; padding: 8px;">Pattern</th>
                                  <th style="text-align: right; padding: 8px;">Action</th>
                                </tr>
                              </thead>
                              <tbody id="patternList">
                                <!-- Patterns will be populated here -->
                              </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div class="modal-footer" style="margin-top: 25px; padding-top: 20px; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; align-items: center;">
                    <span class="text-muted" style="margin-right: auto; font-size: 0.9em;">Unsaved changes will be lost.</span>
                    <button type="submit" class="btn btn-primary">Save Settings</button>
                </div>

            </form>
        </div>
      </div>
    `;

  document.body.appendChild(modal);

  // Animation
  requestAnimationFrame(() => modal.classList.add('active'));

  // DOM Elements
  const form = modal.querySelector('#formatter-settings-form');
  const closeBtns = modal.querySelectorAll('.modal-close, .modal-close-btn');
  const tabs = modal.querySelectorAll('.tab-button');
  const contents = modal.querySelectorAll('.tab-content');

  // Initialize Patterns in the modal
  // We can rely on patterns.js logic, but need to attach listeners to THIS modal's elements
  // The `attachPatternEventListeners` function takes a root.
  attachPatternEventListeners(modal);

  // Also explicitly trigger table update because the DOM just appeared
  updatePatternTable();
  // updatePatternTable searches for `tbody#patternList` globally.
  // Since we are likely removing the one from index.html (or if it exists, it updates both),
  // this should work fine.

  // Tab Switching
  tabs.forEach((tab) => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      tabs.forEach((t) => t.classList.remove('active'));
      contents.forEach((c) => (c.style.display = 'none'));

      tab.classList.add('active');
      const target = modal.querySelector(`#tab-${tab.dataset.tab}`);
      if (target) target.style.display = 'block';
    });
  });

  // Snapshot initial state
  const initialVisible = isSectionVisible;
  const initialAutoCopy = autoCopy;
  const initialPatterns = JSON.parse(JSON.stringify(patterns));

  const checkDirty = () => {
    const currentVisible = modal.querySelector('#formatter-visible').checked;
    const currentAutoCopy = modal.querySelector('#formatter-auto-copy').checked;
    const currentPatternsStr = JSON.stringify(patterns);
    const initialPatternsStr = JSON.stringify(initialPatterns);

    return (
      currentVisible !== initialVisible ||
      currentAutoCopy !== initialAutoCopy ||
      currentPatternsStr !== initialPatternsStr
    );
  };

  // Close logic
  const closeModal = async () => {
    if (checkDirty()) {
      const confirmed = await window.showConfirmModal({
        title: 'Unsaved Changes',
        message: 'Unsaved changes will be lost. Are you sure you want to exit?',
        confirmLabel: 'Discard Changes',
        cancelLabel: 'Keep Editing',
        danger: true,
      });

      if (!confirmed) {
        return;
      }
      // Revert patterns if dirty
      if (JSON.stringify(patterns) !== JSON.stringify(initialPatterns)) {
        savePatterns(initialPatterns);
        initializePatterns();
      }
    }
    modal.classList.remove('active');
    setTimeout(() => modal.remove(), 300);
  };
  closeBtns.forEach((btn) => btn.addEventListener('click', closeModal));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Save logic
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const newVisible = modal.querySelector('#formatter-visible').checked;
    const newAutoCopy = modal.querySelector('#formatter-auto-copy').checked;

    // Update Settings
    window.appSettings = window.appSettings || {};
    window.appSettings.showFormatter = newVisible;
    saveData('appSettings', window.appSettings);

    // Update Auto Copy
    saveData('autoCopyPattern', newAutoCopy);

    // Update Visibility in Real-time
    const section = document.querySelector('[data-section="formatter"]');
    if (section) {
      section.style.display = newVisible ? '' : 'none';
    }

    showToast('Formatter settings saved', 'success');

    // Force close by removing manually to skip dirty check (changes are saved now anyway, but let's be safe)
    // Actually, if we saved, checkDirty might still return true because initial state is old.
    // We should just close directly.
    modal.classList.remove('active');
    setTimeout(() => modal.remove(), 300);
  });
}
