// Customer Feedback Collection Module
// Handles post-call surveys, feedback collection, and analytics

import { moduleState as crmState, logCallToCRM } from './crm.js';

export const feedbackState = {
  surveys: [],
  templates: [],
  responses: [],
  activeSurvey: null,
};

// Default survey templates
const defaultTemplates = [
  {
    id: 'post-call-basic',
    name: 'Post-Call Satisfaction',
    questions: [
      {
        id: 'satisfaction',
        type: 'rating',
        question: 'How satisfied were you with this call?',
        required: true,
        options: [
          'Very Dissatisfied',
          'Dissatisfied',
          'Neutral',
          'Satisfied',
          'Very Satisfied',
        ],
      },
      {
        id: 'resolution',
        type: 'radio',
        question: 'Was your issue resolved?',
        required: true,
        options: ['Yes, completely', 'Yes, partially', 'No, not resolved'],
      },
      {
        id: 'comments',
        type: 'textarea',
        question: 'Additional comments or feedback:',
        required: false,
      },
    ],
  },
  {
    id: 'agent-feedback',
    name: 'Agent Performance Feedback',
    questions: [
      {
        id: 'agent-rating',
        type: 'rating',
        question: "How would you rate the agent's performance?",
        required: true,
        options: ['Poor', 'Below Average', 'Average', 'Good', 'Excellent'],
      },
      {
        id: 'response-time',
        type: 'radio',
        question: 'How was the response time?',
        required: true,
        options: ['Too slow', 'Acceptable', 'Fast', 'Very fast'],
      },
      {
        id: 'knowledge',
        type: 'radio',
        question: 'How knowledgeable was the agent?',
        required: true,
        options: [
          'Not knowledgeable',
          'Somewhat knowledgeable',
          'Very knowledgeable',
          'Expert',
        ],
      },
    ],
  },
];

export function initializeFeedback(doc = document) {
  loadFeedbackData();
  setupFeedbackEventListeners(doc);
  renderFeedbackUI(doc);
}

function loadFeedbackData() {
  try {
    const saved = localStorage.getItem('feedback-data');
    if (saved) {
      const data = JSON.parse(saved);
      feedbackState.surveys = data.surveys || [];
      feedbackState.templates = data.templates || defaultTemplates;
      feedbackState.responses = data.responses || [];
    } else {
      feedbackState.templates = defaultTemplates;
      saveFeedbackData();
    }
  } catch (error) {
    console.error('Error loading feedback data:', error);
    feedbackState.templates = defaultTemplates;
  }
}

function saveFeedbackData() {
  try {
    const data = {
      surveys: feedbackState.surveys,
      templates: feedbackState.templates,
      responses: feedbackState.responses,
    };
    localStorage.setItem('feedback-data', JSON.stringify(data));
  } catch (error) {
    console.error('Error saving feedback data:', error);
  }
}

function setupFeedbackEventListeners(doc) {
  // Survey trigger events will be handled by call logging module
  doc.addEventListener('feedback:survey-triggered', handleSurveyTrigger);
  doc.addEventListener('feedback:survey-completed', handleSurveyCompletion);
}

function renderFeedbackUI(doc) {
  const container = doc.getElementById('feedback-container');
  if (!container) return;

  container.innerHTML = `
    <div class="feedback-section">
      <h3>Customer Feedback</h3>
      <div class="feedback-stats">
        <div class="stat-card">
          <h4>Total Responses</h4>
          <span class="stat-value">${feedbackState.responses.length}</span>
        </div>
        <div class="stat-card">
          <h4>Average Rating</h4>
          <span class="stat-value">${calculateAverageRating()}</span>
        </div>
        <div class="stat-card">
          <h4>Response Rate</h4>
          <span class="stat-value">${calculateResponseRate()}%</span>
        </div>
      </div>
      <div class="feedback-templates">
        <h4>Survey Templates</h4>
        <div class="template-list" id="feedback-templates-list"></div>
      </div>
      <div class="feedback-responses">
        <h4>Recent Responses</h4>
        <div class="response-list" id="feedback-responses-list"></div>
      </div>
    </div>
  `;

  renderTemplatesList(doc);
  renderResponsesList(doc);
}

function renderTemplatesList(doc) {
  const container = doc.getElementById('feedback-templates-list');
  if (!container) return;

  container.innerHTML = feedbackState.templates
    .map(
      (template) => `
    <div class="template-item">
      <div class="template-info">
        <h5>${template.name}</h5>
        <span class="template-questions">${template.questions.length} questions</span>
      </div>
      <div class="template-actions">
        <button class="btn-sm" onclick="editFeedbackTemplate('${template.id}')">Edit</button>
        <button class="btn-sm btn-secondary" onclick="duplicateFeedbackTemplate('${template.id}')">Duplicate</button>
      </div>
    </div>
  `
    )
    .join('');
}

function renderResponsesList(doc) {
  const container = doc.getElementById('feedback-responses-list');
  if (!container) return;

  const recentResponses = feedbackState.responses.slice(-10).reverse();

  container.innerHTML = recentResponses
    .map(
      (response) => `
    <div class="response-item">
      <div class="response-header">
        <span class="response-date">${new Date(response.timestamp).toLocaleString()}</span>
        <span class="response-rating">${getResponseRating(response)}</span>
      </div>
      <div class="response-summary">
        ${response.surveyName} - ${response.customerName || 'Anonymous'}
      </div>
    </div>
  `
    )
    .join('');
}

function calculateAverageRating() {
  if (feedbackState.responses.length === 0) return '0.0';

  const ratings = feedbackState.responses
    .map((r) => getNumericRating(r))
    .filter((r) => r !== null);

  if (ratings.length === 0) return '0.0';

  const average =
    ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
  return average.toFixed(1);
}

function calculateResponseRate() {
  // This would need to be calculated based on total calls vs responses
  // For now, return a placeholder
  return '0.0';
}

function getNumericRating(response) {
  // Extract numeric rating from response data
  for (const answer of response.answers) {
    if (answer.type === 'rating' && answer.value) {
      const rating = answer.options.indexOf(answer.value);
      return rating >= 0 ? rating + 1 : null;
    }
  }
  return null;
}

function getResponseRating(response) {
  const rating = getNumericRating(response);
  return rating ? `${rating}/5 ⭐` : 'N/A';
}

export function triggerFeedbackSurvey(
  callData,
  templateId = 'post-call-basic',
  doc = document
) {
  const template = feedbackState.templates.find((t) => t.id === templateId);
  if (!template) {
    console.error('Survey template not found:', templateId);
    return;
  }

  feedbackState.activeSurvey = {
    id: Date.now().toString(),
    templateId,
    template,
    callData,
    timestamp: new Date().toISOString(),
    status: 'active',
  };

  showSurveyModal(doc);
}

function showSurveyModal(doc) {
  if (!feedbackState.activeSurvey) return;

  const survey = feedbackState.activeSurvey;
  const modal = doc.createElement('div');
  modal.className = 'modal feedback-modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>${survey.template.name}</h3>
        <button class="modal-close" onclick="closeFeedbackModal()">&times;</button>
      </div>
      <div class="modal-body">
        <form id="feedback-survey-form">
          ${survey.template.questions.map((q) => renderQuestion(q)).join('')}
          <div class="form-actions">
            <button type="button" class="btn-secondary" onclick="closeFeedbackModal()">Skip</button>
            <button type="submit" class="button">Submit Feedback</button>
          </div>
        </form>
      </div>
    </div>
  `;

  doc.body.appendChild(modal);

  // Setup form submission
  const form = modal.querySelector('#feedback-survey-form');
  form.addEventListener('submit', handleSurveySubmission);

  // Focus management
  modal.querySelector('.modal-close').focus();
}

function renderQuestion(question) {
  const required = question.required ? ' required' : '';

  switch (question.type) {
    case 'rating':
      return `
        <div class="survey-question">
          <label>${question.question}${question.required ? ' *' : ''}</label>
          <div class="rating-options">
            ${question.options
              .map(
                (option) => `
              <label class="rating-option">
                <input type="radio" name="q_${question.id}" value="${option}"${required}>
                <span>${option}</span>
              </label>
            `
              )
              .join('')}
          </div>
        </div>
      `;

    case 'radio':
      return `
        <div class="survey-question">
          <label>${question.question}${question.required ? ' *' : ''}</label>
          <div class="radio-options">
            ${question.options
              .map(
                (option) => `
              <label class="radio-option">
                <input type="radio" name="q_${question.id}" value="${option}"${required}>
                <span>${option}</span>
              </label>
            `
              )
              .join('')}
          </div>
        </div>
      `;

    case 'textarea':
      return `
        <div class="survey-question">
          <label for="q_${question.id}">${question.question}${question.required ? ' *' : ''}</label>
          <textarea id="q_${question.id}" name="q_${question.id}"${required}></textarea>
        </div>
      `;

    default:
      return '';
  }
}

function handleSurveySubmission(event) {
  event.preventDefault();

  const form = event.target;
  const formData = new FormData(form);

  const answers = [];
  for (const [key, value] of formData.entries()) {
    const questionId = key.replace('q_', '');
    const question = feedbackState.activeSurvey.template.questions.find(
      (q) => q.id === questionId
    );
    if (question) {
      answers.push({
        questionId,
        question: question.question,
        type: question.type,
        value,
        options: question.options,
      });
    }
  }

  const response = {
    id: feedbackState.activeSurvey.id,
    surveyId: feedbackState.activeSurvey.templateId,
    surveyName: feedbackState.activeSurvey.template.name,
    callData: feedbackState.activeSurvey.callData,
    customerName: feedbackState.activeSurvey.callData?.customerName,
    timestamp: feedbackState.activeSurvey.timestamp,
    answers,
    submittedAt: new Date().toISOString(),
  };

  feedbackState.responses.push(response);
  saveFeedbackData();

  // Submit feedback to CRM if connected
  if (crmState.isConnected && response.callData) {
    submitFeedbackToCRM(response).catch((error) => {
      console.error('Failed to submit feedback to CRM:', error);
    });
  }

  // Dispatch completion event
  document.dispatchEvent(
    new CustomEvent('feedback:survey-completed', {
      detail: { response, survey: feedbackState.activeSurvey },
    })
  );

  closeFeedbackModal();
  showToast('Thank you for your feedback!', 'success');
}

async function submitFeedbackToCRM(response) {
  try {
    // Create a feedback call log entry
    const feedbackCallData = {
      callerName: response.customerName || 'Feedback Survey',
      callerPhone: response.callData?.callerPhone || 'feedback',
      callType: 'feedback',
      startTime: response.timestamp,
      endTime: response.submittedAt,
      duration: new Date(response.submittedAt) - new Date(response.timestamp),
      notes: `Feedback Survey: ${response.surveyName}\n\n${formatFeedbackAnswers(response.answers)}`,
      contactId: response.callData?.contactId,
      disposition: 'feedback_submitted',
    };

    const result = await logCallToCRM(feedbackCallData);
    if (result.success) {
      response.crmId = result.id;
      saveFeedbackData();
      console.log('Feedback submitted to CRM:', result.id);
    }
  } catch (error) {
    console.error('CRM feedback submission failed:', error);
  }
}

function formatFeedbackAnswers(answers) {
  return answers
    .map((answer) => {
      if (answer.type === 'rating') {
        return `${answer.question}: ${answer.value}`;
      } else if (answer.type === 'radio') {
        return `${answer.question}: ${answer.value}`;
      } else if (answer.type === 'textarea') {
        return `${answer.question}:\n${answer.value}`;
      }
      return `${answer.question}: ${answer.value}`;
    })
    .join('\n');
}

function closeFeedbackModal() {
  const modal = document.querySelector('.feedback-modal');
  if (modal) {
    modal.remove();
  }
  feedbackState.activeSurvey = null;
}

function handleSurveyTrigger(event) {
  const { callData, templateId } = event.detail;
  triggerFeedbackSurvey(callData, templateId);
}

function handleSurveyCompletion() {
  // Update UI with new response
  renderFeedbackUI(document);
}

// Global functions for template management
window.editFeedbackTemplate = function () {
  // TODO: Implement template editor
  showToast('Template editor coming soon!', 'info');
};

window.duplicateFeedbackTemplate = function (templateId) {
  const template = feedbackState.templates.find((t) => t.id === templateId);
  if (template) {
    const duplicate = {
      ...template,
      id: `${template.id}-copy-${Date.now()}`,
      name: `${template.name} (Copy)`,
    };
    feedbackState.templates.push(duplicate);
    saveFeedbackData();
    renderTemplatesList(document);
    showToast('Template duplicated!', 'success');
  }
};

window.closeFeedbackModal = closeFeedbackModal;

// Import toast for notifications
import { showToast } from '../utils/toast.js';
