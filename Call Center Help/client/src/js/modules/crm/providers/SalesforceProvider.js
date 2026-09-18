import { CRMProvider } from './CRMProvider.js';
import { isValidUrl } from '../../../utils/resilience.js';

export class SalesforceProvider extends CRMProvider {
  constructor() {
    super('salesforce');
  }

  validateConfig(config) {
    const errors = [];
    if (!config.salesforceUrl?.trim())
      errors.push('Salesforce URL is required');
    else if (!isValidUrl(config.salesforceUrl.trim()))
      errors.push('Invalid Salesforce URL format');
    if (!config.salesforceConsumerKey?.trim())
      errors.push('Consumer Key is required');
    if (!config.salesforceConsumerSecret?.trim())
      errors.push('Consumer Secret is required');
    if (!config.salesforceUsername?.trim()) errors.push('Username is required');
    if (!config.salesforcePassword?.trim()) errors.push('Password is required');
    return errors;
  }

  async connect(config) {
    const url = config.salesforceUrl?.trim();
    const consumerKey = config.salesforceConsumerKey?.trim();
    const consumerSecret = config.salesforceConsumerSecret?.trim();
    const username = config.salesforceUsername?.trim();
    const password = config.salesforcePassword?.trim();

    const tokenUrl = `${url}/services/oauth2/token`;
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'password',
        client_id: consumerKey,
        client_secret: consumerSecret,
        username,
        password,
      }),
    });
    if (!response.ok)
      throw new Error(`Salesforce auth failed: ${response.status}`);
    const auth = await response.json();
    if (!auth.access_token)
      throw new Error('No access token returned by Salesforce');

    this.isConnected = true;
    this.accessToken = auth.access_token;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('salesforceInstanceUrl', auth.instance_url || '');
    }
    return { success: true, token: this.accessToken };
  }
}
