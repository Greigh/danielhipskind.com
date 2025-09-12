// Enhanced analytics loader that posts events to /api/analytics
(function(){
  // Get basic page info
  function getPageInfo() {
    return {
      path: location.pathname + location.search,
      title: document.title,
      referrer: document.referrer || 'direct',
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      screen: `${screen.width}x${screen.height}`,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      session: getSessionId()
    };
  }

  // Generate or retrieve session ID
  function getSessionId() {
    let sessionId = sessionStorage.getItem('analytics_session');
    if (!sessionId) {
      sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
      sessionStorage.setItem('analytics_session', sessionId);
    }
    return sessionId;
  }

  // Enhanced send function
  function send(event, data) {
    const payload = {
      event: event,
      data: data ? { ...getPageInfo(), ...data } : getPageInfo(),
      timestamp: new Date().toISOString()
    };

    try {
      navigator.sendBeacon('/api/analytics', JSON.stringify(payload));
    } catch (e) {
      // Fallback to fetch
      fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(()=>{});
    }
  }

  // Track initial pageview
  send('pageview');

  // Track page visibility changes
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      send('page_hidden');
    } else {
      send('page_visible');
    }
  });

  // Track scroll depth
  let maxScroll = 0;
  let scrollTimer;
  window.addEventListener('scroll', function() {
    const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
    if (scrollPercent > maxScroll) {
      maxScroll = scrollPercent;
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        if (maxScroll >= 25 && maxScroll < 50) send('scroll_25');
        else if (maxScroll >= 50 && maxScroll < 75) send('scroll_50');
        else if (maxScroll >= 75 && maxScroll < 90) send('scroll_75');
        else if (maxScroll >= 90) send('scroll_complete');
      }, 1000);
    }
  });

  // Track link clicks
  document.addEventListener('click', function(e) {
    const link = e.target.closest('a');
    if (link && link.href) {
      const isExternal = link.hostname !== location.hostname;
      const linkData = {
        url: link.href,
        text: link.textContent.trim().substring(0, 100),
        type: isExternal ? 'external' : 'internal',
        section: getElementSection(link)
      };

      if (isExternal) {
        send('external_link_click', linkData);
      } else if (link.href.includes('#')) {
        send('anchor_click', linkData);
      } else {
        send('internal_link_click', linkData);
      }
    }
  });

  // Track project interactions
  document.addEventListener('click', function(e) {
    const projectCard = e.target.closest('.project-card');
    if (projectCard) {
      const projectName = projectCard.querySelector('h3')?.textContent || 'unknown';
      const button = e.target.closest('.project-link');
      if (button) {
        const action = button.textContent.includes('Demo') ? 'demo' : 'source';
        send('project_interaction', {
          project: projectName,
          action: action,
          url: button.href
        });
      }
    }
  });

  // Track theme changes
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', function() {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      send('theme_change', { from: currentTheme, to: newTheme });
    });
  }

  // Track navigation clicks
  document.addEventListener('click', function(e) {
    const navLink = e.target.closest('nav a');
    if (navLink) {
      send('navigation_click', {
        section: navLink.href.split('#')[1] || navLink.textContent.trim(),
        url: navLink.href
      });
    }
  });

  // Track "Read More" button clicks
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('read-more-btn')) {
      const isExpanded = e.target.textContent.includes('Read Less');
      send('read_more_click', {
        action: isExpanded ? 'collapse' : 'expand',
        section: 'about'
      });
    }
  });

  // Track time on page before leaving
  let startTime = Date.now();
  window.addEventListener('beforeunload', function() {
    const timeOnPage = Math.round((Date.now() - startTime) / 1000);
    send('page_unload', {
      time_on_page: timeOnPage,
      max_scroll: maxScroll
    });
  });

  // Helper function to determine which section an element is in
  function getElementSection(element) {
    const sections = ['hero', 'about', 'projects', 'skills', 'footer'];
    for (const section of sections) {
      const sectionEl = document.getElementById(section);
      if (sectionEl && sectionEl.contains(element)) {
        return section;
      }
    }
    return 'unknown';
  }

  // Expose enhanced API for other scripts
  window.__firstPartyAnalytics = {
    send,
    trackEvent: send, // alias for convenience
    getSessionId
  };
})();
