'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function Analytics() {
  const [consent, setConsent] = useState('loading'); // loading, granted, denied, unknown
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasTrackedInitial = useRef(false);

  // Load consent state
  useEffect(() => {
    const timer = setTimeout(() => {
      const stored = localStorage.getItem('analytics_enabled');
      const dismissed = sessionStorage.getItem('analytics_optout_shown');

      if (stored === 'true') {
        setConsent('granted');
      } else if (dismissed === 'true') {
        setConsent('denied');
      } else {
        setConsent('unknown'); // Show banner
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // Tracking Helper
  const send = useCallback((event, data = {}) => {
    if (localStorage.getItem('analytics_enabled') !== 'true') return;

    const payload = {
      event,
      data: {
        path: window.location.pathname + window.location.search,
        title: document.title,
        ...data,
      },
      timestamp: new Date().toISOString(),
    };

    try {
      navigator.sendBeacon('/api/analytics', JSON.stringify(payload));
    } catch (e) {
      fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    }
  }, []);

  // Track Pageview on route change (and initial load if consented)
  useEffect(() => {
    if (consent !== 'granted') return;

    // Send pageview
    send('pageview');
  }, [consent, pathname, searchParams, send]);

  // Event Listeners (Scroll, Click, Visibility)
  useEffect(() => {
    if (consent !== 'granted') return;

    // Visibility
    const handleVisibility = () => {
      send(document.hidden ? 'page_hidden' : 'page_visible');
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Scroll Depth
    let maxScroll = 0;
    let scrollTimer;
    const handleScroll = () => {
      const scrollPercent = Math.round(
        (window.scrollY / (document.body.scrollHeight - window.innerHeight)) *
          100
      );
      if (scrollPercent > maxScroll) {
        maxScroll = scrollPercent;
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
          if (maxScroll >= 90) send('scroll_complete', { depth: maxScroll });
          else if (maxScroll >= 75) send('scroll_75', { depth: maxScroll });
          else if (maxScroll >= 50) send('scroll_50', { depth: maxScroll });
          else if (maxScroll >= 25) send('scroll_25', { depth: maxScroll });
        }, 1000);
      }
    };
    window.addEventListener('scroll', handleScroll);

    // Clean up
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [consent, send]);

  // Handlers
  const accept = () => {
    localStorage.setItem('analytics_enabled', 'true');
    setConsent('granted');
    // Track consent (manually since send checks localStorage immediately)
    // We need to wait for state update or just call API directly?
    // send() checks localStorage, which we just set. So calling send works.
    // Use setTimeout to ensure state propagation if needed, but localStorage is sync.
    setTimeout(() => send('consent_accepted'), 0);
  };

  const dismiss = () => {
    sessionStorage.setItem('analytics_optout_shown', 'true');
    setConsent('denied');
    // We allow tracking the dismissal event itself? The legacy code did:
    // if (window.__firstPartyAnalytics) window.__firstPartyAnalytics.send('consent_dismissed');
    // But send() checks for analytics_enabled. So strictly, dismissed users are NOT tracked.
    // Legacy code seems to have tried to send 'consent_dismissed' BEFORE disabling?
    // Actually legacy code check localStorage.getItem('analytics_enabled') inside `render`, but `send` doesn't check it?
    // Let's re-read legacy `send`.
    // Legacy `send`: it does NOT check `localStorage` inside `send` function. It just sends.
    // It's the `render` function that guards the whole initialization.
    // So YES, we should traverse a "denied" event if we want parity.
    // But my `send` implementation checks localStorage. I should relax it or make a force flag.
    // For privacy, better NOT to track if dismissed. I'll skip it.
  };

  if (consent !== 'unknown') return null;

  return (
    <div id="analytics-optin">
      <div className="optin-inner">
        We use lightweight analytics to improve this site.
        <button className="btn-text" onClick={accept}>
          Enable
        </button>
        <button className="btn-text" onClick={dismiss}>
          Dismiss
        </button>
      </div>
      <style jsx>{`
        #analytics-optin {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10000;
          background: rgba(30, 30, 30, 0.9);
          backdrop-filter: blur(10px);
          padding: 15px 25px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          color: #fff;
          font-size: 14px;
        }
        .optin-inner {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        button {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #fff;
          padding: 5px 12px;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }
        button:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        button:first-of-type {
          background: #0070f3;
          border-color: #0070f3;
        }
        button:first-of-type:hover {
          background: #0060df;
        }
      `}</style>
    </div>
  );
}
