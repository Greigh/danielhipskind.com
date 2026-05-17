import { showToast } from '../utils/toast.js';
import { saveData } from './storage.js';
import { applyTimerSettings } from './timer.js';

export function showHoldTimerSettings() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';

  // Get current settings
  const appSettings = window.appSettings || {};
  const visibleSections = appSettings.visibleSections || {};

  const isVisible = visibleSections.timer !== false;
  const isCountdown = appSettings.timerCountdownMode || false;
  const duration = appSettings.timerCountdownDuration || 300;
  const warningTime = appSettings.timerWarningTime || 60;
  const allowDelete = appSettings.timerAllowHistoryDeletion || false;
  const soundAlerts = appSettings.timerSoundAlerts !== false;

  // New Settings
  const autoStart = appSettings.timerAutoStart || false;
  const multiTimer = appSettings.timerMultiEnabled || false;
  const playWarningSound = appSettings.timerPlayWarningSound || false;
  const repeatAlert = appSettings.timerRepeatAlert || false;
  const alertSound = appSettings.timerAlertSound || 'endgame';

  modal.innerHTML = `
      <div class="modal settings-modal" style="max-width: 600px; width: 95%;">
        <div class="modal-header">
          <h3>Hold Timer Settings</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
            
            <div class="tabs tab-header">
                <button class="tab-button active" data-tab="general">General</button>
                <button class="tab-button" data-tab="alerts">Alerts & Start</button>
                <button class="tab-button" data-tab="data">History & Data</button>
            </div>

            <form id="timer-settings-form">
            
                <!-- General Tab -->
                <div id="tab-general" class="tab-content active">
                    
                    <div class="setting-item" style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid var(--border-color);">
                        <div class="setting-info" style="margin-bottom: 10px;">
                            <label style="font-weight: 600; display: block; margin-bottom: 4px;">Show Hold Timer Section</label>
                            <small class="text-muted" style="display: block; line-height: 1.4;">
                                Toggle the visibility of the Hold Timer on the main dashboard.
                            </small>
                        </div>
                        <div class="form-group checkbox-group" style="display: flex; align-items: center; gap: 12px;">
                            <label class="switch" style="cursor: pointer; margin: 0;">
                                <input type="checkbox" id="timer-visible" class="hidden-toggle" ${isVisible ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                            <label for="timer-visible" style="margin: 0; cursor: pointer;">Show Section</label>
                        </div>
                    </div>

                    <div class="form-group">
                        <label style="font-weight: 600; margin-bottom: 8px; display: block;">Timer Mode</label>
                        <div class="radio-group" style="display: flex; gap: 20px; margin-top: 5px;">
                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                <input type="radio" name="timer-mode" value="stopwatch" ${!isCountdown ? 'checked' : ''}>
                                <span>Stopwatch (Count Up)</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                <input type="radio" name="timer-mode" value="countdown" ${isCountdown ? 'checked' : ''}>
                                <span>Countdown (Timer)</span>
                            </label>
                        </div>
                        <small class="text-muted" style="display: block; margin-top: 8px;">
                            Stopwatch counts up from 0. Countdown starts from a set duration.
                        </small>
                    </div>

                    <div class="setting-item" style="margin-top: 20px; padding-top: 15px; border-top: 1px solid var(--border-color);">
                        <div class="form-group checkbox-group" style="display: flex; align-items: center; gap: 12px;">
                            <label class="switch" style="cursor: pointer; margin: 0;">
                                <input type="checkbox" id="timer-auto-start" class="hidden-toggle" ${autoStart ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                            <label for="timer-auto-start" style="margin: 0; cursor: pointer;">Auto-start on Call</label>
                        </div>
                        <small class="text-muted" style="display: block; margin-top: 4px; margin-left: 58px;">
                            Automatically start timer when "Start Call" is clicked.
                        </small>
                    </div>

                    <div class="setting-item" style="margin-top: 20px;">
                        <div class="form-group checkbox-group" style="display: flex; align-items: center; gap: 12px;">
                            <label class="switch" style="cursor: pointer; margin: 0;">
                                <input type="checkbox" id="timer-multi" class="hidden-toggle" ${multiTimer ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                            <label for="timer-multi" style="margin: 0; cursor: pointer;">Enable Multiple Timers</label>
                        </div>
                        <small class="text-muted" style="display: block; margin-top: 4px; margin-left: 58px;">
                            Allow creating and managing multiple independent timers simultaneously.
                        </small>
                    </div>
                    
                    <div id="multi-timer-options" style="display: ${multiTimer ? 'block' : 'none'}; margin-top: 15px; margin-left: 58px;">
                         <div class="form-group">
                            <label for="max-timers" style="display: block; margin-bottom: 5px;">
                                Maximum Timers: <span id="max-timers-val">${appSettings.maxTimers || 3}</span>
                            </label>
                            <input type="range" id="max-timers" min="1" max="10" value="${appSettings.maxTimers || 3}" style="width: 100%;">
                        </div>
                    </div>
                </div>

                <!-- Alerts Tab -->
                <div id="tab-alerts" class="tab-content" style="display: none;">
                    
                    <div class="form-group" id="duration-group" style="display: ${isCountdown ? 'block' : 'none'}; margin-bottom: 20px;">
                        <label for="timer-duration">Countdown Start Time (seconds)</label>
                        <input type="number" id="timer-duration" class="form-control" value="${duration}" min="10">
                        <small class="text-muted">The timer will start counting down from this value.</small>
                    </div>

                    <div class="form-group" style="margin-bottom: 20px;">
                        <label for="timer-warning">Warning Threshold (seconds)</label>
                        <input type="number" id="timer-warning" class="form-control" value="${warningTime}" min="5">
                        <small class="text-muted">Timer turns red when this time is reached (countdown) or elapsed (stopwatch).</small>
                    </div>

                    <div class="setting-item" style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid var(--border-color);">
                         <div class="form-group checkbox-group" style="display: flex; align-items: center; gap: 12px;">
                            <label class="switch" style="cursor: pointer; margin: 0;">
                                <input type="checkbox" id="timer-sounds" class="hidden-toggle" ${soundAlerts ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                            <label for="timer-sounds" style="margin: 0; cursor: pointer;">Enable Sound Alerts</label>
                        </div>
                    </div>

                    <div id="sound-options" style="display: ${soundAlerts ? 'block' : 'none'};">
                        <div class="form-group" style="margin-bottom: 15px;">
                            <select id="timer-alert-sound" class="form-control">
                                <option value="endgame" ${alertSound === 'endgame' ? 'selected' : ''}>End Game</option>
                                <option value="bell" ${alertSound === 'bell' ? 'selected' : ''}>Bell</option>
                                <option value="towerbell" ${alertSound === 'towerbell' ? 'selected' : ''}>Tower Bell</option>
                                <option value="custom" ${alertSound === 'custom' ? 'selected' : ''}>Custom URL</option>
                            </select>
                            <small class="text-muted">Sound to play when timer expires.</small>
                        </div>

                         <div id="custom-sound-wrapper" class="form-group" style="margin-bottom: 15px; display: ${alertSound === 'custom' ? 'block' : 'none'};">
                            <label for="custom-sound-url">Custom Sound URL</label>
                            <input type="text" id="custom-sound-url" class="form-control" value="${appSettings.timerCustomSoundUrl || ''}" placeholder="Paste direct .mp3 URL here">
                        </div>

                        <div class="form-group checkbox-group" style="display: flex; align-items: center; gap: 12px; margin-bottom: 15px;">
                            <label class="switch" style="cursor: pointer; margin: 0;">
                                <input type="checkbox" id="timer-warning-sound" class="hidden-toggle" ${playWarningSound ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                            <label for="timer-warning-sound" style="margin: 0; cursor: pointer;">Play sound at warning time</label>
                        </div>

                        <div class="form-group checkbox-group" style="display: flex; align-items: center; gap: 12px;">
                            <label class="switch" style="cursor: pointer; margin: 0;">
                                <input type="checkbox" id="timer-repeat" class="hidden-toggle" ${repeatAlert ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                            <label for="timer-repeat" style="margin: 0; cursor: pointer;">Repeat Alert Sound</label>
                        </div>
                        <small class="text-muted" style="display: block; margin-top: 4px; margin-left: 58px;">
                             Repeat the alert sound until stopped (recommended for missed timer alerts).
                        </small>
                    </div>
                </div>

                <!-- Data Tab -->
                <div id="tab-data" class="tab-content" style="display: none;">
                    <div class="form-group checkbox-group" style="display: flex; align-items: center; gap: 12px;">
                        <label class="switch" style="cursor: pointer; margin: 0;">
                            <input type="checkbox" id="timer-delete" class="hidden-toggle" ${allowDelete ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                        <label for="timer-delete" style="margin: 0; cursor: pointer;">Allow History Deletion</label>
                    </div>
                    <p class="text-muted" style="margin-top: 10px; font-size: 0.9em;">
                        If enabled, a delete button (x) will appear next to each history entry.
                    </p>
                </div>

                <div class="modal-footer" style="margin-top: 25px; padding-top: 20px; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end;">
                    <button type="button" class="btn btn-secondary modal-close-btn" style="margin-right: 10px;">Cancel</button>
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
  const form = modal.querySelector('#timer-settings-form');
  const modeRadios = modal.querySelectorAll('input[name="timer-mode"]');
  const durationGroup = modal.querySelector('#duration-group');
  const closeBtns = modal.querySelectorAll('.modal-close, .modal-close-btn');
  const tabs = modal.querySelectorAll('.tab-button');
  const contents = modal.querySelectorAll('.tab-content');
  const soundToggle = modal.querySelector('#timer-sounds');
  const soundOptions = modal.querySelector('#sound-options');

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

  // Toggle duration input visibility based on mode
  modeRadios.forEach((radio) => {
    radio.addEventListener('change', (e) => {
      durationGroup.style.display =
        e.target.value === 'countdown' ? 'block' : 'none';
    });
  });

  // Toggle sound options visibility
  soundToggle.addEventListener('change', (e) => {
    soundOptions.style.display = e.target.checked ? 'block' : 'none';
  });

  // Toggle Custom Sound URL
  const soundSelect = modal.querySelector('#timer-alert-sound');
  soundSelect.addEventListener('change', (e) => {
    const customWrapper = modal.querySelector('#custom-sound-wrapper');
    if (customWrapper)
      customWrapper.style.display =
        e.target.value === 'custom' ? 'block' : 'none';
  });

  // Toggle Multi-timer options
  const multiToggle = modal.querySelector('#timer-multi');
  multiToggle.addEventListener('change', (e) => {
    const multiOpts = modal.querySelector('#multi-timer-options');
    if (multiOpts)
      multiOpts.style.display = e.target.checked ? 'block' : 'none';
  });

  // Update Max Timers Value Display
  const maxTimersInput = modal.querySelector('#max-timers');
  const maxTimersVal = modal.querySelector('#max-timers-val');
  if (maxTimersInput && maxTimersVal) {
    maxTimersInput.addEventListener('input', (e) => {
      maxTimersVal.textContent = e.target.value;
    });
  }

  // Close logic
  const closeModal = () => {
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

    const mode = modal.querySelector('input[name="timer-mode"]:checked').value;
    const newIsCountdown = mode === 'countdown';
    const newDuration = parseInt(
      modal.querySelector('#timer-duration').value,
      10
    );
    const newWarning = parseInt(
      modal.querySelector('#timer-warning').value,
      10
    );
    const newSounds = modal.querySelector('#timer-sounds').checked;
    const newDelete = modal.querySelector('#timer-delete').checked;
    const newVisible = modal.querySelector('#timer-visible').checked;

    const newAutoStart = modal.querySelector('#timer-auto-start').checked;
    const newMultiTimer = modal.querySelector('#timer-multi').checked;
    const newWarningSound = modal.querySelector('#timer-warning-sound').checked;
    const newRepeatAlert = modal.querySelector('#timer-repeat').checked;
    const newAlertSound = modal.querySelector('#timer-alert-sound').value;
    const newCustomUrl = modal.querySelector('#custom-sound-url')
      ? modal.querySelector('#custom-sound-url').value
      : '';
    const newMaxTimers = modal.querySelector('#max-timers')
      ? parseInt(modal.querySelector('#max-timers').value, 10)
      : 3;

    // Update settings object
    window.appSettings = window.appSettings || {};
    window.appSettings.timerCountdownMode = newIsCountdown;
    window.appSettings.timerCountdownDuration = newDuration;
    window.appSettings.timerWarningTime = newWarning;
    window.appSettings.timerSoundAlerts = newSounds;
    window.appSettings.timerAllowHistoryDeletion = newDelete;

    // New Settings Save
    window.appSettings.timerAutoStart = newAutoStart;
    window.appSettings.timerMultiEnabled = newMultiTimer; // Note: legacy appSettings property might be multipleTimers, let's set both to be safe or check main.js usage.
    window.appSettings.multipleTimers = newMultiTimer; // Legacy/Main support
    window.appSettings.maxTimers = newMaxTimers;

    window.appSettings.timerPlayWarningSound = newWarningSound;
    window.appSettings.timerRepeatAlert = newRepeatAlert;
    window.appSettings.timerAlertSound = newAlertSound;
    window.appSettings.timerCustomSoundUrl = newCustomUrl;

    // Handle Visibility
    if (!window.appSettings.visibleSections) {
      window.appSettings.visibleSections = {};
    }
    window.appSettings.visibleSections.timer = newVisible;

    // Persist
    if (window.saveSettings) {
      window.saveSettings(window.appSettings);
    } else {
      saveData('appSettings', window.appSettings);
    }

    // Apply changes directly via timer module
    applyTimerSettings({
      countdownMode: newIsCountdown,
      countdownDuration: newDuration,
      warningTime: newWarning,
      soundAlerts: newSounds,
      allowDelete: newDelete,
      // Note: other settings are read directly from appSettings in timer.js as needed
    });

    // Handle immediate visibility update
    if (!newVisible) {
      const section = document.getElementById('hold-timer');
      if (section) section.style.display = 'none';
      showToast('Hold Timer hidden. Enable it again in Settings.', 'info');
    } else {
      const section = document.getElementById('hold-timer');
      if (section) section.style.display = 'block';
    }

    showToast('Timer settings saved', 'success');
    closeModal();
  });
}
