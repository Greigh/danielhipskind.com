/**
 * Base class for CRM providers.
 * All specific CRM implementations (Finesse, Five9, Salesforce, etc.) should extend this class.
 */
export class CRMProvider {
  constructor(name) {
    if (this.constructor === CRMProvider) {
      throw new Error("Abstract classes can't be instantiated.");
    }
    this.name = name;
    this.isConnected = false;
    this.accessToken = null;
  }

  /**
   * Connect to the CRM using the provided configuration.
   * @param {Object} config - The configuration object.
   * @returns {Promise<void>}
   * @throws {Error} If connection fails.
   */
  async connect() {
    throw new Error("Method 'connect()' must be implemented.");
  }

  /**
   * Disconnect from the CRM.
   * @returns {Promise<void>}
   */
  async disconnect() {
    this.isConnected = false;
    this.accessToken = null;
    return Promise.resolve();
  }

  /**
   * Validate the configuration object.
   * @param {Object} config - The configuration object to validate.
   * @returns {string[]} An array of error messages, or empty array if valid.
   */
  validateConfig() {
    throw new Error("Method 'validateConfig()' must be implemented.");
  }

  /**
   * Lookup a contact by search term.
   * @param {string} searchTerm
   * @param {string} searchType - 'phone', 'email', 'name'
   * @returns {Promise<Array>} Array of contact objects.
   */
  async lookupContact() {
    console.warn(`Contact lookup not implemented for ${this.name}`);
    return [];
  }

  /**
   * Log a call to the CRM.
   * @param {Object} callRecord - The call data to log.
   * @returns {Promise<Object>} Result with success/id.
   */
  async logCall() {
    console.warn(`Provider ${this.name} has not implemented logCall`);
    return { success: false, message: 'Not implemented' };
  }

  async makeCall() {
    console.warn(`Provider ${this.name} has not implemented makeCall`);
    return { success: false, message: 'Not implemented' };
  }

  async endCall() {
    console.warn(`Provider ${this.name} has not implemented endCall`);
    return { success: false, message: 'Not implemented' };
  }

  /**
   * Get the list of configuration fields required by this provider.
   * Useful for dynamic UI generation (future proofing).
   * @returns {Array<Object>} Array of field definitions.
   */
  getFields() {
    return [];
  }
}
