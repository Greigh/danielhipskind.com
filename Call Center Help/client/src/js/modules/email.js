// Email Integration Module
// Supports sending emails for follow-ups

import { config } from '../utils/config.js';
import * as auth from './auth.js';

export const emailState = {
  provider: localStorage.getItem('email-provider') || 'smtp',
  config: JSON.parse(localStorage.getItem('email-config') || '{}'),
  templates: JSON.parse(localStorage.getItem('email-templates') || '[]'),
};

export function initializeEmail() {
  loadEmailData();
  setupEmailEventListeners();
  renderEmailUI();
}

function loadEmailData() {
  // Load from config and localStorage
  emailState.config = {
    smtp: config.email,
    ...emailState.config,
  };
}

// function saveEmailData() {
//   localStorage.setItem('email-provider', emailState.provider);
//   localStorage.setItem('email-config', JSON.stringify(emailState.config));
//   localStorage.setItem('email-templates', JSON.stringify(emailState.templates));
// }

function setupEmailEventListeners() {
  // Event listeners
}

function renderEmailUI() {
  // Render email config and templates
}

export async function sendEmail(to, subject, body) {
  // Send email via API
  const res = await fetch('/api/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...auth.getAuthHeader() },
    body: JSON.stringify({ to, subject, body }),
  });
  return res.ok;
}

export function getTemplates() {
  return emailState.templates;
}
