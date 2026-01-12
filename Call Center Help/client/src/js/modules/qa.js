// Quality Assurance Tools Module
import { getCallHistory } from './call-logging.js';

export function initializeQA() {
  const callSelect = document.getElementById('call-to-review');
  const qaCheckboxes = document.querySelectorAll('.qa-checkbox');
  const qaNotes = document.getElementById('qa-notes');
  const submitQaBtn = document.getElementById('submit-qa');
  const qaReportsList = document.getElementById('qa-reports-list');

  // Check if required elements exist
  if (
    !callSelect ||
    qaCheckboxes.length === 0 ||
    !qaNotes ||
    !submitQaBtn ||
    !qaReportsList
  ) {
    return;
  }

  let qaReports = JSON.parse(localStorage.getItem('qaReports')) || [];

  function populateCallSelect() {
    const calls = getCallHistory();
    callSelect.innerHTML = '<option value="">Select call to review</option>';

    calls.forEach((call) => {
      const option = document.createElement('option');
      option.value = call.id;
      option.textContent = `${call.callerName} - ${new Date(call.startTime).toLocaleString()}`;
      callSelect.appendChild(option);
    });
  }

  function submitQA() {
    const callId = callSelect.value;
    const criteria = {};
    qaCheckboxes.forEach((cb) => {
      criteria[cb.dataset.criterion] = cb.checked;
    });
    const notes = qaNotes.value.trim();

    if (!callId) {
      alert('Please select a call to review');
      return;
    }

    const report = {
      id: Date.now(),
      callId: parseInt(callId),
      criteria,
      notes,
      reviewer: 'Current User', // In real app, get from auth
      timestamp: new Date(),
      score: calculateScore(criteria),
    };

    qaReports.push(report);
    localStorage.setItem('qaReports', JSON.stringify(qaReports));
    updateQAReports();

    // Reset form
    callSelect.value = '';
    qaCheckboxes.forEach((cb) => (cb.checked = false));
    qaNotes.value = '';

    alert('QA review submitted!');
  }

  function calculateScore(criteria) {
    const weights = {
      greeting: 20,
      empathy: 25,
      resolution: 30,
      courtesy: 25,
    };

    let totalScore = 0;
    let maxScore = 0;

    Object.keys(criteria).forEach((criterion) => {
      maxScore += weights[criterion];
      if (criteria[criterion]) {
        totalScore += weights[criterion];
      }
    });

    return Math.round((totalScore / maxScore) * 100);
  }

  function updateQAReports() {
    qaReportsList.innerHTML = '';

    qaReports
      .slice(-10)
      .reverse()
      .forEach((report) => {
        const calls = getCallHistory();
        const call = calls.find((c) => c.id === report.callId);

        const li = document.createElement('li');
        li.className = 'qa-report-item';
        li.innerHTML = `
        <div class="report-header">
          <strong>${call ? call.callerName : 'Unknown Call'}</strong>
          <span class="qa-score">Score: ${report.score}%</span>
        </div>
        <div class="report-meta">
          ${new Date(report.timestamp).toLocaleString()} by ${report.reviewer}
        </div>
        <div class="report-criteria">
          ${Object.entries(report.criteria)
            .map(
              ([key, value]) =>
                `<span class="criterion ${value ? 'passed' : 'failed'}">${key}: ${value ? '✓' : '✗'}</span>`
            )
            .join('')}
        </div>
        ${report.notes ? `<div class="report-notes">${report.notes}</div>` : ''}
      `;
        qaReportsList.appendChild(li);
      });
  }

  submitQaBtn.addEventListener('click', submitQA);

  populateCallSelect();
  updateQAReports();
}
