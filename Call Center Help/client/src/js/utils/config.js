// Configuration module for environment variables and API settings

export const config = {
  // Twilio Configuration
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
  },

  // Email Configuration
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
  },

  // Telephony Configuration
  telephony: {
    provider: process.env.TELEPHONY_PROVIDER || 'twilio',
    asterisk: {
      host: process.env.ASTERISK_HOST || '',
      port: parseInt(process.env.ASTERISK_PORT) || 5038,
      user: process.env.ASTERISK_USER || '',
      pass: process.env.ASTERISK_PASS || '',
    },
    finesse: {
      host: process.env.FINESSE_HOST || '',
      port: parseInt(process.env.FINESSE_PORT) || 8443,
      agentId: process.env.FINESSE_AGENT_ID || '',
      password: process.env.FINESSE_AGENT_PASSWORD || '',
      extension: process.env.FINESSE_AGENT_EXTENSION || '',
      ssl: process.env.FINESSE_SSL === 'true',
    },
  },

  // CRM API Keys
  crm: {
    salesforce: {
      clientId: process.env.SALESFORCE_CLIENT_ID || '',
      clientSecret: process.env.SALESFORCE_CLIENT_SECRET || '',
    },
    hubspot: {
      apiKey: process.env.HUBSPOT_API_KEY || '',
    },
    zendesk: {
      apiKey: process.env.ZENDESK_API_KEY || '',
    },
    freshdesk: {
      apiKey: process.env.FRESHDESK_API_KEY || '',
    },
  },

  // Push Notifications
  push: {
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || '',
  },

  // Feature Flags
  features: {
    camera: true,
    voiceCommands: true,
    telephony: true,
    email: true,
    training: true,
    auditLogging: true,
    dataEncryption: false, // Disabled by default for compatibility
    gdprCompliance: true,
  },
};

// Load configuration from localStorage (user overrides)
export function loadUserConfig() {
  try {
    const userConfig = JSON.parse(localStorage.getItem('user-config') || '{}');

    // Merge user config with defaults
    if (userConfig.twilio) {
      config.twilio = { ...config.twilio, ...userConfig.twilio };
    }
    if (userConfig.email) {
      config.email = { ...config.email, ...userConfig.email };
    }
    if (userConfig.telephony) {
      config.telephony = { ...config.telephony, ...userConfig.telephony };
    }
    if (userConfig.features) {
      config.features = { ...config.features, ...userConfig.features };
    }
  } catch (error) {
    console.warn('Error loading user configuration:', error);
  }
}

// Save user configuration to localStorage
export function saveUserConfig() {
  try {
    const userConfig = {
      twilio: config.twilio,
      email: config.email,
      telephony: config.telephony,
      features: config.features,
    };
    localStorage.setItem('user-config', JSON.stringify(userConfig));
  } catch (error) {
    console.error('Error saving user configuration:', error);
  }
}

// Initialize configuration
export function initializeConfig() {
  loadUserConfig();
  console.log('Configuration initialized');
}
