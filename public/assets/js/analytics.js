// Minimal analytics loader that posts events to /api/analytics
(function(){
  function send(event, data) {
    try {
      navigator.sendBeacon('/api/analytics', JSON.stringify({ event: event, data: data || null }));
    } catch (e) {
      // Fallback to fetch
      fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: event, data: data || null })
      }).catch(()=>{});
    }
  }

  // Example: send a pageview on load
  send('pageview', { path: location.pathname + location.search });

  // Expose a simple API for other scripts
  window.__firstPartyAnalytics = { send };
})();
