import { CRMProvider } from './CRMProvider.js';

export class ZendeskProvider extends CRMProvider {
  constructor() {
    super('zendesk');
  }

  validateConfig(config) {
    const errors = [];
    if (!config.zendeskSubdomain?.trim()) errors.push('Subdomain is required');
    if (!config.zendeskApiToken?.trim()) errors.push('API Token is required');
    if (!config.zendeskEmail?.trim()) errors.push('Email is required');
    return errors;
  }

  async connect(config) {
    const subdomain = config.zendeskSubdomain?.trim();
    const apiToken = config.zendeskApiToken?.trim();
    const email = config.zendeskEmail?.trim();

    const testUrl = `https://${subdomain}.zendesk.com/api/v2/users/me.json`;
    const resp = await fetch(testUrl, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${btoa(`${email}/token:${apiToken}`)}`,
        Accept: 'application/json',
      },
    });
    if (!resp.ok) throw new Error(`Zendesk auth failed: ${resp.status}`);
    await resp.json();

    this.isConnected = true;
    this.accessToken = `zendesk_${subdomain}_${email}`;
    return { success: true, token: this.accessToken };
  }
}
