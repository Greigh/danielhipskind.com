import { skills } from '@/data/content';
import Icon from './Icon';

const SkillItem = ({ skill, type }) => {
  return (
    <div className="skill-item">
      <div className="skill-info">
        {type === 'technical' && (
          <div className="skill-icon">
            <Icon
              name={skill.id || skill.name.toLowerCase()}
              category="languages"
            />
          </div>
        )}
        <span className="skill-name">{skill.name}</span>
      </div>
      <div className="skill-progress-bar">
        <div
          className="skill-progress-fill"
          style={{ width: `${skill.level}%` }}
        />
      </div>
    </div>
  );
};

const Skills = () => {
  return (
    <section id="skills">
      <h2>Skills</h2>
      <div className="skills-container">
        {/* Technical Skills Group */}
        <div className="skills-group">
          <h3>Technical Skills</h3>
          <div className="skills-list">
            {skills.technical.map((skill) => (
              <SkillItem key={skill.name} skill={skill} type="technical" />
            ))}
          </div>
        </div>

        {/* Professional Skills Group */}
        <div className="skills-group">
          <h3>Professional Skills</h3>
          <div className="skills-list">
            {skills.professional.map((skill) => (
              <SkillItem key={skill.name} skill={skill} type="professional" />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Skills;
