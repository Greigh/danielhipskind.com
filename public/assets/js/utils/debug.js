// Debug configuration
const DEBUG_CONFIG = {
  // Set to false in production
  enabled: true,
  // Maximum number of logs to keep
  maxLogs: 100,
  // Ignore patterns (localhost, etc)
  ignorePatterns: [
    /^\[HMR\]/, // Hot Module Replacement logs
    /webpack/, // Webpack logs
    /node_modules/,
  ],
  // Categories to enable/disable
  categories: {
    workflow: false, // Need to fix MD lint later
    language: false, // Set to false by default
    social: false, // Still need to fix Bluesky later
    validation: true,
  },
  // Add workflow mappings
  workflowMappings: {
    'pages-build-deployment': 'gh-pages',
    'github-pages': 'gh-pages',
    'gh-pages': 'gh-pages',
    'deploy-pages': 'gh-pages',
    linting: 'lint',
    lint: 'lint',
    mdlint: 'lint',
    markdownlint: 'lint',
    eslint: 'eslint',
    aglint: 'aglint',
    testing: 'test',
    test: 'test',
  },
  // Add method to toggle categories
  toggleCategory: function (category, enabled) {
    if (this.categories.hasOwnProperty(category)) {
      this.categories[category] = enabled;
      console.log(
        `Debug category '${category}' ${enabled ? 'enabled' : 'disabled'}`
      );
      // Trigger validation if workflow category is enabled
      if (category === 'workflow' && enabled) {
        this.validateWorkflows();
      }
    }
  },
  // Add workflow validation method
  validateWorkflows: function () {
    const validationResults = {
      required: ['lint', 'eslint', 'aglint'],
      available: Object.values(this.workflowMappings),
      missing: [],
      errors: [],
      mappingValid: true,
    };

    // Check each workflow mapping
    Object.entries(this.workflowMappings).forEach(([key, value]) => {
      if (!validationResults.available.includes(value)) {
        validationResults.missing.push(key);
        validationResults.errors.push(
          `Invalid workflow mapping: ${key} -> ${value}`
        );
        validationResults.mappingValid = false;
      }
    });

    debugWorkflowValidation(validationResults);
  },
};

// Keep track of log count
let logCount = 0;

const debug = (message, data = null) => {
  if (!DEBUG_CONFIG.enabled) return;

  // Check ignore patterns
  if (
    DEBUG_CONFIG.ignorePatterns.some(
      (pattern) =>
        pattern.test(message) || (data && pattern.test(JSON.stringify(data)))
    )
  ) {
    return;
  }

  // Reset logs if we hit the limit
  if (logCount >= DEBUG_CONFIG.maxLogs) {
    console.clear();
    console.log('🧹 Logs cleared due to maximum limit');
    logCount = 0;
  }

  const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
  const debugStatus = document.getElementById('debug-status');

  // Format message with timestamp
  const formattedMessage = `[${timestamp}] ${message}`;

  // Update visual debug status
  if (debugStatus) {
    debugStatus.innerHTML = formattedMessage;
    // Add color coding for status
    if (message.includes('Error') || message.includes('failed')) {
      debugStatus.style.backgroundColor = '#dc3545';
    } else if (message.includes('success')) {
      debugStatus.style.backgroundColor = '#28a745';
    }
  }

  // Console output
  console.log(formattedMessage, data || '');
  logCount++;
};

const debugError = (message, error) => {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
  const debugStatus = document.getElementById('debug-status');

  if (debugStatus) {
    debugStatus.innerHTML = `[ERROR ${timestamp}] ${message}`;
    debugStatus.style.backgroundColor = '#dc3545';
  }

  console.error(`[Error ${timestamp}] ${message}`, error);
};

const debugWorkflow = (context, data = null) => {
  if (!DEBUG_CONFIG.enabled || !DEBUG_CONFIG.categories.workflow) return;

  const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
  const debugStatus = document.getElementById('debug-status');

  // Format context-specific message
  const formattedMessage = `[${timestamp}] [Workflow] ${context}`;

  // Update visual debug status with workflow specific styling
  if (debugStatus) {
    debugStatus.innerHTML = formattedMessage;
    debugStatus.style.backgroundColor = '#6610f2'; // Purple for workflow
    debugStatus.style.color = '#fff';
  }

  // Enhanced console output for workflows
  console.group(`🔄 Workflow Debug: ${context}`);
  if (data) {
    if (data.validation) {
      console.table(data.validation);
    }
    if (data.icons) {
      console.log('Available Icons:', data.icons);
    }
    if (data.mapping) {
      console.log('Mapping Results:', data.mapping);
    }
    console.log('Full Debug Data:', data);
  }
  console.groupEnd();
};

const debugWorkflowValidation = (validationResults) => {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);

  console.group(`🔍 Workflow Validation [${timestamp}]`);
  console.table({
    requiredIcons: validationResults.required || [],
    availableIcons: validationResults.available || [],
    missingIcons: validationResults.missing || [],
    mappingStatus: validationResults.mappingValid ? '✅ Valid' : '❌ Invalid',
  });

  if (validationResults.errors?.length > 0) {
    console.log('❌ Validation Errors:');
    validationResults.errors.forEach((error) => {
      console.error(`- ${error}`);
    });
  }

  console.groupEnd();
};

// Add documentation comment
/**
 * Debug Configuration Guide
 * ------------------------
 * For testing:
 * 1. Set DEBUG_CONFIG.enabled to true
 * 2. Enable specific categories as needed
 * 3. Adjust maxLogs if necessary
 *
 * For production:
 * 1. Set DEBUG_CONFIG.enabled to false
 * 2. Or remove debug.js import entirely
 *
 * To test with localhost:
 * 1. Remove /localhost/ from ignorePatterns
 * 2. Add specific patterns for your test environment
 */

// Expose debug controls to window for console access
if (typeof window !== 'undefined') {
  window.debugControls = {
    enableCategory: (category) => DEBUG_CONFIG.toggleCategory(category, true),
    disableCategory: (category) => DEBUG_CONFIG.toggleCategory(category, false),
    showConfig: () => console.table(DEBUG_CONFIG.categories),
    validateWorkflows: () => DEBUG_CONFIG.validateWorkflows(),
    showWorkflowMappings: () => console.table(DEBUG_CONFIG.workflowMappings),
  };
}

// Single consolidated export statement
export {
  DEBUG_CONFIG,
  debug,
  debugError,
  debugWorkflow,
  debugWorkflowValidation,
};
