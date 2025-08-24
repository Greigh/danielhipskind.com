// Simple analytics opt-in banner logic
(function(){
  function render() {
    if (localStorage.getItem('analytics_enabled') === 'true') return;
    if (sessionStorage.getItem('analytics_optout_shown') === 'true') return;
    var root = document.getElementById('analytics-optin-root');
    if (!root) return;
    var container = document.createElement('div');
    container.id = 'analytics-optin';
    container.innerHTML = '<div class="optin-inner">We use lightweight analytics to improve this site. <button id="accept-analytics">Enable</button> <button id="dismiss-analytics">Dismiss</button></div>';
    root.appendChild(container);
    document.getElementById('accept-analytics').addEventListener('click', function(){
      localStorage.setItem('analytics_enabled','true');
      // load analytics script
      var s = document.createElement('script'); s.src = '/assets/js/analytics.js'; s.defer = true; document.head.appendChild(s);
      container.remove();
    });
    document.getElementById('dismiss-analytics').addEventListener('click', function(){
      sessionStorage.setItem('analytics_optout_shown','true');
      container.remove();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render); else render();
})();
