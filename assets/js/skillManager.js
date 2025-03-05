import { content } from './content.js';

class SkillManager {
  constructor() {
    this.technicalList = document.getElementById('technical-skills');
    this.professionalList = document.getElementById('professional-skills');
    this.initialized = false;
  }

  createSkillItem(skill) {
    const li = document.createElement('li');
    li.className = 'skill-item';

    const name = document.createElement('span');
    name.className = 'skill-name';
    name.textContent = skill.name;

    const progress = document.createElement('div');
    progress.className = 'skill-progress';

    const fill = document.createElement('div');
    fill.className = 'skill-progress-fill';
    fill.style.width = '0%';

    progress.appendChild(fill);
    li.appendChild(name);
    li.appendChild(progress);

    // Delay setting width to trigger animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        fill.style.width = `${skill.level}%`;
      });
    });

    return li;
  }

  renderSkills() {
    if (this.initialized) return;

    if (this.technicalList) {
      // Clear existing content
      this.technicalList.innerHTML = '';
      // Add new skills
      content.skills.technical.forEach((skill) => {
        this.technicalList.appendChild(this.createSkillItem(skill));
      });
    }

    if (this.professionalList) {
      // Clear existing content
      this.professionalList.innerHTML = '';
      // Add new skills
      content.skills.professional.forEach((skill) => {
        this.professionalList.appendChild(this.createSkillItem(skill));
      });
    }

    this.initialized = true;
  }
}

const skillManager = new SkillManager();

export const initializeSkills = () => {
  skillManager.renderSkills();
};
