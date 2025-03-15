export function detectBrowser() {
  const ua = navigator.userAgent;
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  return 'Other';
}

export function detectOS() {
  const ua = navigator.userAgent;
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac OS')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('iOS')) return 'iOS';
  if (ua.includes('Android')) return 'Android';
  return 'Other';
}

export function detectDevice() {
  if (/Mobi|Android/i.test(navigator.userAgent)) return 'mobile';
  if (/Tablet|iPad/i.test(navigator.userAgent)) return 'tablet';
  return 'desktop';
}