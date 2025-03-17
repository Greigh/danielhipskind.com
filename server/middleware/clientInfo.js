import { debug } from '../utils/debug.js';
import { VPN_IP_RANGES } from '../config/constants.js';

export const getClientInfo = (req, res, next) => {
  try {
    const clientInfo = collectClientInfo(req);
    debug('Client info collected:', clientInfo);
    req.clientInfo = clientInfo;
    next();
  } catch (error) {
    debug('Error collecting client info:', error);
    req.clientInfo = createFallbackClientInfo();
    next();
  }
};

function collectClientInfo(req) {
  const userAgent = req.headers['user-agent'] || '';
  const acceptLanguage = req.headers['accept-language'];
  const ipAddress = getClientIP(req);
  const referrer = req.headers['referer'] || 'direct';

  return {
    ip: ipAddress,
    userAgent,
    browser: detectBrowser(userAgent),
    os: detectOS(userAgent),
    device: detectDevice(userAgent),
    language: parseLanguage(acceptLanguage),
    screenSize: getScreenSize(req),
    timestamp: new Date().toISOString(),
    vpnDetected: isVPNIP(ipAddress),
    referrer,
    geoLocation: null, // To be implemented with GeoIP service
  };
}

function getClientIP(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

function detectDevice(userAgent) {
  const isTablet = /tablet|ipad/i.test(userAgent);
  const isMobile = /mobile|android|webos|iphone|ipod|blackberry/i.test(userAgent);

  if (isTablet) return 'tablet';
  if (isMobile) return 'mobile';
  return 'desktop';
}

function parseLanguage(acceptLanguage) {
  if (!acceptLanguage) return 'unknown';

  const [primary] = acceptLanguage.split(',');
  const [language, quality] = primary.split(';');

  return {
    code: language,
    quality: quality ? parseFloat(quality.split('=')[1]) : 1.0,
  };
}

function getScreenSize(req) {
  return {
    width: req.headers['sec-ch-viewport-width'] || 'unknown',
    height: req.headers['sec-ch-viewport-height'] || 'unknown',
    dpr: req.headers['sec-ch-dpr'] || 1,
  };
}

function createFallbackClientInfo() {
  return {
    error: 'Failed to collect client info',
    timestamp: new Date().toISOString(),
    partial: true,
  };
}

// Helper function to detect browser
function detectBrowser(userAgent) {
  const browsers = {
    Chrome: /chrome|chromium|crios/i,
    Firefox: /firefox|fxios/i,
    Safari: /safari/i,
    Edge: /edg/i,
    Opera: /opr/i,
    IE: /msie|trident/i,
  };

  for (const [browser, regex] of Object.entries(browsers)) {
    if (regex.test(userAgent)) {
      const version = userAgent.match(
        /(?:chrome|chromium|firefox|safari|edg|opr|msie|rv)\/?\s*(\d+(\.\d+)?)/i
      );
      return {
        name: browser,
        version: version ? version[1] : 'unknown',
      };
    }
  }

  return { name: 'unknown', version: 'unknown' };
}

// Helper function to detect OS
function detectOS(userAgent) {
  const os = {
    Windows: /windows nt/i,
    MacOS: /macintosh|mac os x/i,
    Linux: /linux/i,
    iOS: /iphone|ipad|ipod/i,
    Android: /android/i,
  };

  for (const [name, regex] of Object.entries(os)) {
    if (regex.test(userAgent)) {
      const version = userAgent.match(/(?:windows nt|mac os x|android)\s*([0-9._]+)/i);
      return {
        name,
        version: version ? version[1] : 'unknown',
      };
    }
  }

  return { name: 'unknown', version: 'unknown' };
}

function isVPNIP(ip) {
  if (!ip || ip === 'unknown') return false;

  return VPN_IP_RANGES.some((range) => {
    const [network, bits] = range.split('/');
    return isIPInRange(ip, network, parseInt(bits));
  });
}

function isIPInRange(ip, network, bits) {
  try {
    const ipNum = ipToLong(ip);
    const networkNum = ipToLong(network);
    const mask = ~((1 << (32 - bits)) - 1);
    return (ipNum & mask) === (networkNum & mask);
  } catch {
    return false;
  }
}

function ipToLong(ip) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
}
