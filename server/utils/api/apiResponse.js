/**
 * ApiResponse Class
 * Standardizes API responses across the application
 */
export default class ApiResponse {
  /**
   * Creates a success response
   * @param {*} data - The data to send back
   * @param {string} [message='Success'] - Optional success message
   * @returns {Object} Standardized success response
   * @throws {Error} If data is undefined
   */
  static success(data = null, message = 'Success') {
    return {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Creates an error response
   * @param {string} [message='Error'] - Error message
   * @param {number} [code=500] - HTTP status code
   * @returns {Object} Standardized error response
   */
  static error(message = 'Error', code = 500) {
    return {
      success: false,
      message,
      code,
      timestamp: new Date().toISOString(),
    };
  }
}
