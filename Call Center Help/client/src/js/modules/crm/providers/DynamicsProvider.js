import { CRMProvider } from './CRMProvider.js';
import { isValidUrl } from '../../../utils/resilience.js';

export class DynamicsProvider extends CRMProvider {
  constructor() {
    super('dynamics');
  }

  validateConfig(config) {
    const errors = [];
    if (!config.dynamicsUrl?.trim()) errors.push('Dynamics URL is required');
    else if (!isValidUrl(config.dynamicsUrl.trim()))
      errors.push('Invalid Dynamics URL format');
    if (!config.dynamicsClientId?.trim()) errors.push('Client ID is required');
    if (!config.dynamicsClientSecret?.trim())
      errors.push('Client Secret is required');
    if (!config.dynamicsTenantId?.trim()) errors.push('Tenant ID is required');
    return errors;
  }

  async connect(config) {
    const url = config.dynamicsUrl?.trim();
    const clientId = config.dynamicsClientId?.trim();
    const clientSecret = config.dynamicsClientSecret?.trim();
    const tenantId = config.dynamicsTenantId?.trim();

    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const resp = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: `${url}/.default`,
      }),
    });
    if (!resp.ok) throw new Error(`Dynamics auth failed: ${resp.status}`);
    const auth = await resp.json();
    if (!auth.access_token)
      throw new Error('No access token returned by Dynamics 365');

    this.isConnected = true;
    this.accessToken = auth.access_token;
    return { success: true, token: this.accessToken };
  }
}
