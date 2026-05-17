import { FinesseProvider } from './providers/FinesseProvider.js';
import { Five9Provider } from './providers/Five9Provider.js';
import { SalesforceProvider } from './providers/SalesforceProvider.js';
import { ZendeskProvider } from './providers/ZendeskProvider.js';
import { HubSpotProvider } from './providers/HubSpotProvider.js';
import { DynamicsProvider } from './providers/DynamicsProvider.js';

export class CRMManager {
  constructor() {
    this.providers = new Map();
    this.currentProviderName = 'finesse';
    this.state = {
      isConnected: false,
      accessToken: null,
      currentProvider: 'finesse',
    };

    // Register default providers
    this.registerProvider(new FinesseProvider());
    this.registerProvider(new Five9Provider());
    this.registerProvider(new SalesforceProvider());
    this.registerProvider(new ZendeskProvider());
    this.registerProvider(new HubSpotProvider());
    this.registerProvider(new DynamicsProvider());

    // Load persisted state
    this.loadState();
  }

  registerProvider(provider) {
    this.providers.set(provider.name, provider);
  }

  get activeProvider() {
    return this.providers.get(this.currentProviderName);
  }

  setProvider(name) {
    if (!this.providers.has(name)) {
      console.warn(`Provider ${name} not found, falling back to finesse`);
      if (this.providers.has('finesse')) name = 'finesse';
      else return;
    }

    // If switching, assume disconnected state initially until re-connected
    if (this.currentProviderName !== name) {
      this.activeProvider?.disconnect(); // disconnect previous
      this.currentProviderName = name;
      this.state.currentProvider = name;
      this.state.isConnected = false;
      this.state.accessToken = null;
      this.persistState();
    }
  }

  async connect(config) {
    if (!this.activeProvider)
      throw new Error('No active CRM provider selected');

    const provider = this.activeProvider;
    // Validate first
    const errors = provider.validateConfig(config);
    if (errors.length > 0) {
      throw new Error(`Configuration errors: ${errors.join(', ')}`);
    }

    // Connect
    const result = await provider.connect(config);

    // Update state
    this.state.isConnected = true;
    this.state.accessToken = result.token;
    this.persistState();

    return result;
  }

  async disconnect() {
    if (this.activeProvider) {
      await this.activeProvider.disconnect();
    }
    this.state.isConnected = false;
    this.state.accessToken = null;
    this.persistState();
  }

  async lookupContact(searchTerm, searchType) {
    if (!this.activeProvider) return [];
    return this.activeProvider.lookupContact(searchTerm, searchType);
  }

  async logCall(callRecord) {
    if (!this.activeProvider)
      return { success: false, message: 'No provider connected' };
    if (!this.activeProvider.logCall) {
      console.warn(
        `Provider ${this.currentProviderName} does not support logging calls yet.`
      );
      return { success: false, message: 'Provider does not support logging' };
    }
    return this.activeProvider.logCall(callRecord);
  }

  async makeCall(number) {
    if (!this.activeProvider)
      return { success: false, message: 'No provider connected' };
    return this.activeProvider.makeCall(number);
  }

  async endCall() {
    if (!this.activeProvider) {
      return { success: false, message: 'No provider connected' };
    }
    return this.activeProvider.endCall();
  }

  // Persistence helpers
  persistState() {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem('crmProvider', this.currentProviderName);
    if (this.state.accessToken) {
      localStorage.setItem('crmAccessToken', this.state.accessToken);
    } else {
      localStorage.removeItem('crmAccessToken');
    }
  }

  loadState() {
    if (typeof localStorage === 'undefined') return;
    const savedProvider = localStorage.getItem('crmProvider');
    const savedToken = localStorage.getItem('crmAccessToken');

    if (savedProvider && this.providers.has(savedProvider)) {
      this.currentProviderName = savedProvider;
      this.state.currentProvider = savedProvider;
    }

    // We optimistically assume connected if token exists (logic similar to original module)
    // Ideally validation happens on load, but for now we follow existing pattern
    if (savedToken) {
      this.state.accessToken = savedToken;
      this.state.isConnected = true;
      // Hydrate the provider instance if needed
      if (this.activeProvider) {
        this.activeProvider.isConnected = true;
        this.activeProvider.accessToken = savedToken;
      }
    }
  }
}

// Singleton instance
export const crmManager = new CRMManager();
