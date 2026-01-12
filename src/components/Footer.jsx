import { socialLinks, generateCopyright } from '@/data/content';
import Icon from './Icon';

const Footer = () => {
  return (
    <footer className="glass-effect">
      <div className="footer-content">
        <div className="footer-social">
          {socialLinks.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel={link.rel || 'noopener noreferrer'}
              aria-label={link.name}
              className="social-link"
            >
              <Icon
                name={link.icon}
                category="social"
                className="social-icon"
              />
            </a>
          ))}
        </div>

        <div className="footer-tech">
          <p>Built with ❤️ using modern web technologies</p>
        </div>

        <div className="footer-copyright">
          <p>{generateCopyright()}</p>
          <p className="license">
            All rights reserved. Read{' '}
            <a
              href="https://github.com/danielhipskind/portfolio/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
            >
              LICENSE
            </a>{' '}
            for more info.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
