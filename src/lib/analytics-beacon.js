/**
 * POST analytics payload with sendBeacon (JSON Content-Type) or fetch fallback.
 */
export function postAnalyticsEvent(payload) {
  const body = JSON.stringify(payload);

  try {
    const blob = new Blob([body], { type: 'application/json' });
    if (navigator.sendBeacon('/api/analytics', blob)) {
      return Promise.resolve();
    }
  } catch {
    /* fall through to fetch */
  }

  return fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  }).catch(() => {});
}
