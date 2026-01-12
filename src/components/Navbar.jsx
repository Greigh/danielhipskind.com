'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import Icon from './Icon';

const Navbar = () => {
  const [mounted, setMounted] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header>
      <nav>
        <div className="nav-container glass-effect">
          <div className="nav-content">
            <ul>
              <li className="nav-button">
                <a href="#about">About</a>
              </li>
              <li className="nav-button">
                <a href="#projects">Projects</a>
              </li>
              <li className="nav-button">
                <a href="#skills">Skills</a>
              </li>
            </ul>
            <button
              id="theme-toggle"
              aria-label="Toggle theme"
              onClick={toggleTheme}
            >
              {mounted ? (
                <Icon
                  name={resolvedTheme === 'dark' ? 'sun' : 'moon'}
                  category="theme"
                />
              ) : (
                <div style={{ width: 24, height: 24 }} />
              )}
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
