'use client';

import { useState } from 'react';
import { about } from '@/data/content';

const About = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section id="about">
      <div className="about-container">
        <div className="about-content glass-effect">
          <div className={`about-text ${isExpanded ? 'expanded' : ''}`}>
            <div className="initial-content">
              <p className="about-intro">{about.intro}</p>
              {about.shortDescription.map((paragraph, index) => (
                <p key={`short-${index}`}>{paragraph}</p>
              ))}
            </div>

            <div
              className={`expanded-content ${isExpanded ? 'show' : ''}`}
              style={{
                maxHeight: isExpanded ? '1000px' : '0',
                opacity: isExpanded ? 1 : 0,
                overflow: 'hidden',
                transition: 'all 0.5s ease',
              }}
            >
              {about.expandedDescription.map((paragraph, index) => (
                <p key={`expanded-${index}`}>{paragraph}</p>
              ))}
            </div>

            {!isExpanded && <div className="about-gradient"></div>}

            <button
              className="read-more-btn"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Show Less' : 'Read More'}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="24"
                height="24"
                style={{
                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s ease',
                  marginLeft: '8px',
                  display: 'inline-block',
                  verticalAlign: 'middle',
                }}
              >
                <path
                  fill="currentColor"
                  d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
