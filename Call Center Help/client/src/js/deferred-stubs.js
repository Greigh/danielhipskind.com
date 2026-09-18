// Deferred-call stubs to tolerate script reordering (Rocket Loader / optimizers)
window.__deferredCalls = window.__deferredCalls || [];
if (!window.showConfirmModal) {
  window.showConfirmModal = function (opts) {
    return new Promise((resolve) => {
      window.__deferredCalls.push({ type: 'confirm', opts, resolve });
    });
  };
}
if (!window.showToast) {
  window.showToast = function (message, type, duration) {
    window.__deferredCalls.push({
      type: 'toast',
      message,
      toastType: type,
      duration,
    });
  };
}
