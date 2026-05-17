import { CRMProvider } from './CRMProvider.js';

export class HubSpotProvider extends CRMProvider {
  constructor() {
    super('hubspot');
  }

  validateConfig(config) {
    const errors = [];
    if (!config.hubspotApiKey?.trim()) errors.push('API Key is required');
    return errors;
  }

  async connect(config) {
    const apiKey = config.hubspotApiKey?.trim();
    const testUrl = 'https://api.hubapi.com/contacts/v1/lists/all/contacts/all';

    // Note: HubSpot API keys are deprecated in favor of Private Apps, but maintaining existing logic
    const resp = await fetch(testUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    });
    if (!resp.ok) throw new Error(`HubSpot auth failed: ${resp.status}`);

    this.isConnected = true;
    this.accessToken = apiKey;
    return { success: true, token: this.accessToken };
  }
}
