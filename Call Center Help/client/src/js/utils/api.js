/**
 * Same-origin API helper — always sends httpOnly session cookies.
 */
export function apiFetch(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  // JSON body convenience
  if (
    options.body &&
    typeof options.body === 'object' &&
    !(options.body instanceof FormData) &&
    !(options.body instanceof Blob) &&
    !(options.body instanceof ArrayBuffer)
  ) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    options = {
      ...options,
      body: JSON.stringify(options.body),
    };
  }
  return fetch(url, {
    ...options,
    credentials: 'include',
    headers,
  });
}
