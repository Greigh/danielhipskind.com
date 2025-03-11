/**
 * ApiResponse Class
 * Standardizes API responses across the application
 */
class ApiResponse {
    /**
     * Creates a success response
     * @param {*} data - The data to send back
     * @param {string} [message='Success'] - Optional success message
     * @returns {Object} Standardized success response
     * @throws {Error} If data is undefined
     */
    static success(data, message = 'Success') {
        if (data === undefined) {
            throw new Error('Data parameter is required for success response');
        }
        return {
            success: true,
            message,
            data,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Creates an error response
     * @param {string} [message='An error occurred'] - Error message
     * @param {number} [status=500] - HTTP status code
     * @returns {Object} Standardized error response
     */
    static error(message = 'An error occurred', status = 500) {
        return {
            success: false,
            error: message,
            status: Number(status) || 500,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Creates a paginated response
     * @param {Array} articles - Array of articles
     * @param {number} page - Current page number
     * @param {number} limit - Items per page
     * @param {number} total - Total number of items
     * @returns {Object} Standardized paginated response
     * @throws {Error} If required parameters are missing or invalid
     */
    static paginate(articles, page, limit, total) {
        if (!Array.isArray(articles)) {
            throw new Error('Articles must be an array');
        }

        const parsedPage = Math.max(1, Number(page) || 1);
        const parsedLimit = Math.max(1, Number(limit) || 10);
        const parsedTotal = Math.max(0, Number(total) || 0);
        const totalPages = Math.ceil(parsedTotal / parsedLimit);

        return {
            success: true,
            data: {
                articles,
                pagination: {
                    currentPage: parsedPage,
                    totalPages,
                    totalArticles: parsedTotal,
                    articlesPerPage: parsedLimit,
                    hasNextPage: parsedPage < totalPages,
                    hasPreviousPage: parsedPage > 1
                }
            },
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Creates a cached response
     * @param {*} data - The cached data
     * @param {('memory'|'redis'|'disk')} [source='memory'] - Cache source identifier
     * @returns {Object} Standardized cached response
     * @throws {Error} If data is undefined or source is invalid
     */
    static cached(data, source = 'memory') {
        if (data === undefined) {
            throw new Error('Data parameter is required for cached response');
        }

        const validSources = ['memory', 'redis', 'disk'];
        if (!validSources.includes(source)) {
            throw new Error(`Invalid cache source. Must be one of: ${validSources.join(', ')}`);
        }

        return {
            success: true,
            data,
            cached: true,
            source,
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = ApiResponse;