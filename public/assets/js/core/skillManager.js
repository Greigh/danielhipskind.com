import { debug } from '../utils/debug.js';
import iconManager from './iconManager.js';
import { trackEvent } from '../analytics/core/tracker.js';
import { analyticsPreferences } from '../analytics/utils/preferences.js';

class SkillManager {
  constructor() {
    this.initialized = false;
    this.technicalContainer = document.getElementById('technical-skills');
    this.professionalContainer = document.getElementById('professional-skills');
    this.observers = new Map(); // Store observers for cleanup
  }

  async initialize(skills) {
    try {
      debug('Initializing skills manager');
      if (!skills) {
        throw new Error('Skills data is required');
      }

      if (!this.technicalContainer || !this.professionalContainer) {
        throw new Error('Skill containers not found');
      }

      // Show loading state
      this.setLoadingState(true);

      await this.renderAllSkills(skills);
      this.initialized = true;

      // Remove loading state
      this.setLoadingState(false);

      debug('Skills manager initialized');
      return true;
    } catch (error) {
      debug('Failed to initialize skills manager:', error);
      this.handleError(error);
      return false;
    }
  }

  setLoadingState(isLoading) {
    const containers = [this.technicalContainer, this.professionalContainer];
    containers.forEach((container) => {
      if (!container) return;

      if (isLoading) {
        container.innerHTML = '<li class="loading">Loading skills...</li>';
      } else {
        const loading = container.querySelector('.loading');
        if (loading) loading.remove();
      }
    });
  }

  async renderAllSkills(skills) {
    const { technical, professional } = skills;

    const renderPromises = [];

    if (technical?.length) {
      renderPromises.push(
        this.renderSkillCategory(
          this.technicalContainer,
          technical,
          'technical'
        )
      );
    }

    if (professional?.length) {
      renderPromises.push(
        this.renderSkillCategory(
          this.professionalContainer,
          professional,
          'professional'
        )
      );
    }

    await Promise.all(renderPromises);
  }

  async renderSkillCategory(container, skills, category) {
    container.innerHTML = ''; // Clear existing skills

    skills.forEach((skill) => {
      const skillElement = this.createSkillElement(skill, category);
      container.appendChild(skillElement);
      this.observeSkillVisibility(skillElement, skill, category);
    });
  }

  createSkillElement(skill, category) {
    const li = document.createElement('li');
    li.className = 'skill-item';
    li.dataset.skill = skill.name;
    li.dataset.category = category;

    const content = document.createElement('div');
    content.className = 'skill-content';

    // Add language icon if available
    if (skill.language) {
      const icon = document.createElement('div');
      icon.className = 'skill-icon';
      icon.innerHTML = iconManager.getLanguageIcon(skill.language);
      content.appendChild(icon);
    }

    // Add skill name
    const name = document.createElement('span');
    name.className = 'skill-name';
    name.textContent = skill.name;
    content.appendChild(name);

    li.appendChild(content);

    // Add progress bar if level is provided
    if (skill.level) {
      const progress = this.createProgressBar(skill.level);
      li.appendChild(progress);
    }

    // Add animation delay based on index
    requestAnimationFrame(() => {
      li.style.animationDelay = `${Math.random() * 0.3}s`;
      li.classList.add('skill-item--visible');
    });

    return li;
  }

  createProgressBar(level) {
    const progress = document.createElement('div');
    progress.className = 'skill-progress';
    progress.setAttribute('role', 'progressbar');
    progress.setAttribute('aria-valuemin', '0');
    progress.setAttribute('aria-valuemax', '100');
    progress.setAttribute('aria-valuenow', level);

    const fill = document.createElement('div');
    fill.className = 'skill-progress-fill';
    fill.style.width = '0%';
    progress.appendChild(fill);

    // Add label for accessibility
    const label = document.createElement('span');
    label.className = 'skill-progress-label';
    label.textContent = `${level}%`;
    progress.appendChild(label);

    return progress;
  }

  observeSkillVisibility(element, skill, category) {
    if (!analyticsPreferences.isEnabled()) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            trackEvent('skill_viewed', {
              skill: skill.name,
              skillCategory: category,
              level: skill.level || 'N/A',
            });
            observer.disconnect();
            this.observers.delete(element);
          }
        });
      },
      { threshold: 0.5 }
    );

    this.observers.set(element, observer);
    observer.observe(element);
  }

  handleError(error) {
    const containers = [this.technicalContainer, this.professionalContainer];
    containers.forEach((container) => {
      if (!container) return;
      container.innerHTML = `
        <li class="error-state">
          Failed to load skills. Please try refreshing the page.
        </li>`;
    });
  }

  // Cleanup method
  destroy() {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers.clear();
    this.initialized = false;
  }
}

// Export a singleton instance
const skillManager = new SkillManager();
export default skillManager;
