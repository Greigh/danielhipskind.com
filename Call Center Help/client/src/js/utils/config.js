// Client-safe configuration only — never bundle server secrets into the browser.

export const config = {
  // Public / non-secret telephony hints (user may override in UI; secrets stay server-side)
  telephony: {
    provider: 'twilio',
  },

  // Push — public key only (private key must never ship to the client)
  push: {
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
  },

  // Feature Flags
  features: {
    camera: true,
    voiceCommands: true,
    telephony: true,
    email: true,
    training: true,
    auditLogging: true,
    dataEncryption: false,
    gdprCompliance: true,
  },
};

const SECRET_KEYS = new Set([
  'authToken',
  'pass',
  'password',
  'apiKey',
  'clientSecret',
  'vapidPrivateKey',
  'accountSid', // treat SID+token pair carefully; never persist token
]);

function stripSecrets(value) {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(stripSecrets);
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (SECRET_KEYS.has(k)) continue;
    if (/token|secret|password|passwd|api[_-]?key/i.test(k)) continue;
    out[k] = typeof v === 'object' && v !== null ? stripSecrets(v) : v;
  }
  return out;
}

// Load non-secret user overrides from localStorage
export function loadUserConfig() {
  try {
    const userConfig = JSON.parse(localStorage.getItem('user-config') || '{}');
    const safe = stripSecrets(userConfig);
    if (safe.telephony) {
      config.telephony = { ...config.telephony, ...safe.telephony };
    }
    if (safe.features) {
      config.features = { ...config.features, ...safe.features };
    }
    if (safe.push && safe.push.vapidPublicKey) {
      config.push.vapidPublicKey = safe.push.vapidPublicKey;
    }
  } catch (error) {
    console.warn('Error loading user configuration:', error);
  }
}

// Persist only non-secret preferences
export function saveUserConfig() {
  try {
    const userConfig = stripSecrets({
      telephony: { provider: config.telephony.provider },
      features: config.features,
      push: { vapidPublicKey: config.push.vapidPublicKey },
    });
    localStorage.setItem('user-config', JSON.stringify(userConfig));
  } catch (error) {
    console.error('Error saving user configuration:', error);
  }
}

export function initializeConfig() {
  loadUserConfig();
}
