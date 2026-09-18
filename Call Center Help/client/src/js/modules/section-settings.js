import { showToast } from '../utils/toast.js';
import { showCallLoggingSettings } from './call-templates.js';
import { showHoldTimerSettings } from './timer-settings.js';
import { showFormatterSettings } from './formatter-settings.js';

export function initializeSectionSettings() {
  document.addEventListener('click', (e) => {
    if (
      e.target.matches('.section-settings-btn') ||
      e.target.closest('.section-settings-btn')
    ) {
      const btn = e.target.closest('.section-settings-btn');
      const section = btn.closest('section');
      if (section) {
        const sectionId = section.id;
        openSectionSettings(sectionId);
      }
    }
  });
}

function openSectionSettings(sectionId) {
  if (sectionId === 'call-logging') {
    showCallLoggingSettings();
  } else if (sectionId === 'hold-timer') {
    showHoldTimerSettings();
  } else if (
    sectionId === 'settings-pattern-formatter' ||
    sectionId === 'formatter' ||
    sectionId === 'pattern-formatter'
  ) {
    showFormatterSettings();
  } else {
    showToast(`Settings for ${sectionId} coming soon!`, 'info');
  }
}
