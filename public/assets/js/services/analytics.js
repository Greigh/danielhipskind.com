import { debug } from '../utils/debug.js';

class AnalyticsClient {
  constructor() {
    this.initialized = false;
    this.endpoint = '/api/analytics';
  }

  async initialize() {
    try {
      debug('Initializing analytics client...');
      this.initialized = true;
      debug('Analytics client initialized');
    } catch (error) {
      debug('Analytics client initialization failed:', error);
      throw error;
    }
  }

  async trackEvent(eventData) {
    try {
      const response = await fetch(`${this.endpoint}/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        throw new Error('Failed to track event');
      }
    } catch (error) {
      debug('Event tracking failed:', error);
      // Don't throw - we don't want analytics to break the app
    }
  }
}

class Analytics {
  async trackProjectView(project) {
    if (!window.analyticsPreferences?.isEnabled()) return;

    window.trackEvent('project_view', {
      title: project.title,
      languages: project.languages.map((l) => l.name),
    });
  }

  async trackSkillView(skill) {
    if (!window.analyticsPreferences?.isEnabled()) return;

    window.trackEvent('skill_view', {
      name: skill.name,
      level: skill.level,
      category: skill.language ? 'technical' : 'professional',
    });
  }

  async initContentTracking() {
    if (!window.analyticsPreferences?.isEnabled()) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const section = entry.target.dataset.section;
          if (section) {
            this.trackContentView(section);
          }
        }
      });
    });

    document
      .querySelectorAll('[data-section]')
      .forEach((el) => observer.observe(el));
  }

  trackContentInteraction(section, action, details = {}) {
    if (!window.analyticsPreferences?.isEnabled()) return;

    window.trackEvent('content_interaction', {
      section,
      action,
      timestamp: new Date().toISOString(),
      ...details,
    });
  }

  trackContentView(section) {
    if (!window.analyticsPreferences?.isEnabled()) return;

    window.trackEvent('content_view', {
      section,
      timestamp: new Date().toISOString(),
    });
  }
}

export const analytics = new Analytics();
export default new AnalyticsClient();
