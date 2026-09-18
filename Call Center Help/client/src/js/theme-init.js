// Early boot: kill legacy service workers + Cache Storage before app JS loads.
// Safe on localhost and production. Idempotent.
(function () {
  try {
    var savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  } catch {
    document.documentElement.setAttribute('data-theme', 'light');
  }

  var killLegacyCaches = function () {
    if (!('caches' in window)) return Promise.resolve();
    return caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (k) {
            return (
              k.indexOf('call-center-helper') === 0 ||
              k.indexOf('adamas-v') === 0 ||
              k.indexOf('adamas-static') === 0 ||
              k.indexOf('adamas-dynamic') === 0 ||
              k.indexOf('adamas-facet-') !== 0
            );
          })
          .map(function (k) {
            return caches.delete(k);
          })
      );
    });
  };

  var killLegacyWorkers = function () {
    if (!('serviceWorker' in navigator)) return Promise.resolve();
    return navigator.serviceWorker.getRegistrations().then(function (regs) {
      return Promise.all(
        regs.map(function (reg) {
          var scriptURL =
            (reg.active && reg.active.scriptURL) ||
            (reg.installing && reg.installing.scriptURL) ||
            (reg.waiting && reg.waiting.scriptURL) ||
            '';
          // Drop anything that isn't the current Facet worker
          if (scriptURL.indexOf('sw.facet.js') === -1) {
            return reg.unregister();
          }
          return Promise.resolve();
        })
      );
    });
  };

  Promise.all([killLegacyCaches(), killLegacyWorkers()]).catch(function () {});
})();
