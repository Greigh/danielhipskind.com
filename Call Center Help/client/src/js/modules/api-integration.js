// Import toast for notifications
import { showToast } from '../utils/toast.js';

// External API Integration Module
// Provides REST/WebSocket APIs for third-party integrations

export const apiState = {
  endpoints: [],
  webhooks: [],
  apiKeys: [],
  connectedClients: new Set(),
  requestLog: [],
  rateLimits: new Map(),
  serverRunning: false,
  webSocketRunning: false,
};

// Default API endpoints
const defaultEndpoints = [
  {
    id: 'calls',
    path: '/api/calls',
    method: 'GET',
    description: 'Retrieve call logs',
    authentication: 'api-key',
    rateLimit: 100,
    enabled: true,
  },
  {
    id: 'agents',
    path: '/api/agents',
    method: 'GET',
    description: 'Get agent information',
    authentication: 'api-key',
    rateLimit: 50,
    enabled: true,
  },
  {
    id: 'feedback',
    path: '/api/feedback',
    method: 'POST',
    description: 'Submit customer feedback',
    authentication: 'api-key',
    rateLimit: 20,
    enabled: true,
  },
  {
    id: 'webhook-events',
    path: '/api/webhooks',
    method: 'POST',
    description: 'Register webhook for events',
    authentication: 'api-key',
    rateLimit: 10,
    enabled: true,
  },
];

export function initializeAPIIntegration(doc = document) {
  loadAPIData();
  setupAPIEventListeners(doc);
  renderAPIIntegrationUI(doc);
  startAPIServer();
  initializeWebSocketServer();
}

function loadAPIData() {
  try {
    const saved = localStorage.getItem('api-integration-data');
    if (saved) {
      const data = JSON.parse(saved);
      apiState.endpoints = data.endpoints || defaultEndpoints;
      apiState.webhooks = data.webhooks || [];
      apiState.apiKeys = data.apiKeys || [];
      apiState.requestLog = data.requestLog || [];
    } else {
      apiState.endpoints = defaultEndpoints;
      apiState.webhooks = [];
      apiState.apiKeys = [];
      apiState.requestLog = [];
      saveAPIData();
    }
  } catch (error) {
    console.error('Error loading API data:', error);
    apiState.endpoints = defaultEndpoints;
  }
}

function saveAPIData() {
  try {
    const data = {
      endpoints: apiState.endpoints,
      webhooks: apiState.webhooks,
      apiKeys: apiState.apiKeys,
      requestLog: apiState.requestLog.slice(-100), // Keep last 100 requests
    };
    localStorage.setItem('api-integration-data', JSON.stringify(data));
  } catch (error) {
    console.error('Error saving API data:', error);
  }
}

function setupAPIEventListeners(doc) {
  // Listen for internal events to trigger webhooks
  doc.addEventListener('call:completed', handleCallCompleted);
  doc.addEventListener('feedback:submitted', handleFeedbackSubmitted);
  doc.addEventListener('agent:status-changed', handleAgentStatusChanged);
}

function renderAPIIntegrationUI(doc) {
  const container = doc.getElementById('api-integration-container');
  if (!container) return;

  container.innerHTML = `
    <div class="api-integration-section">
      <div class="api-header">
        <h3>API Integration</h3>
        <div class="api-status">
          <span class="status-indicator ${apiState.serverRunning ? 'active' : 'inactive'}"></span>
          <span>API Server: ${apiState.serverRunning ? 'Running' : 'Stopped'}</span>
        </div>
      </div>

      <div class="api-stats">
        <div class="stat-card">
          <h4>API Keys</h4>
          <span class="stat-value">${apiState.apiKeys.length}</span>
        </div>
        <div class="stat-card">
          <h4>Webhooks</h4>
          <span class="stat-value">${apiState.webhooks.length}</span>
        </div>
        <div class="stat-card">
          <h4>Requests (24h)</h4>
          <span class="stat-value">${getRequestsLast24h()}</span>
        </div>
        <div class="stat-card">
          <h4>Connected Clients</h4>
          <span class="stat-value">${apiState.connectedClients.size}</span>
        </div>
      </div>

      <div class="api-content">
        <div class="api-endpoints">
          <h4>API Endpoints</h4>
          <div class="endpoints-list" id="api-endpoints-list"></div>
        </div>

        <div class="api-keys">
          <h4>API Keys</h4>
          <div class="api-keys-list" id="api-keys-list"></div>
          <button class="btn-sm" onclick="generateAPIKey()">Generate New Key</button>
        </div>

        <div class="webhooks">
          <h4>Webhooks</h4>
          <div class="webhooks-list" id="webhooks-list"></div>
          <button class="btn-sm" onclick="addWebhook()">Add Webhook</button>
        </div>

        <div class="api-logs">
          <h4>Recent Requests</h4>
          <div class="logs-list" id="api-logs-list"></div>
        </div>
      </div>
    </div>
  `;

  renderEndpointsList(doc);
  renderAPIKeysList(doc);
  renderWebhooksList(doc);
  renderLogsList(doc);
}

function renderEndpointsList(doc) {
  const container = doc.getElementById('api-endpoints-list');
  if (!container) return;

  container.innerHTML = apiState.endpoints
    .map(
      (endpoint) => `
    <div class="endpoint-card">
      <div class="endpoint-info">
        <div class="endpoint-method ${endpoint.method.toLowerCase()}">${endpoint.method}</div>
        <div class="endpoint-details">
          <h5>${endpoint.path}</h5>
          <p>${endpoint.description}</p>
          <div class="endpoint-meta">
            <span>Rate Limit: ${endpoint.rateLimit}/hour</span>
            <span>Auth: ${endpoint.authentication}</span>
          </div>
        </div>
      </div>
      <div class="endpoint-controls">
        <label class="toggle">
          <input type="checkbox" ${endpoint.enabled ? 'checked' : ''} onchange="toggleEndpoint('${endpoint.id}', this.checked)" autocomplete="off">
          <span class="toggle-slider"></span>
        </label>
        <button class="btn-icon" onclick="testEndpoint('${endpoint.id}')" title="Test">🔍</button>
      </div>
    </div>
  `
    )
    .join('');
}

function renderAPIKeysList(doc) {
  const container = doc.getElementById('api-keys-list');
  if (!container) return;

  if (apiState.apiKeys.length === 0) {
    container.innerHTML =
      '<div class="empty-state">No API keys generated</div>';
    return;
  }

  container.innerHTML = apiState.apiKeys
    .map(
      (key) => `
    <div class="api-key-card">
      <div class="key-info">
        <div class="key-name">${key.name}</div>
        <div class="key-value">${maskAPIKey(key.value)}</div>
        <div class="key-created">Created: ${new Date(key.createdAt).toLocaleDateString()}</div>
      </div>
      <div class="key-controls">
        <button class="btn-icon" onclick="copyAPIKey('${key.value}')" title="Copy">📋</button>
        <button class="btn-icon danger" onclick="revokeAPIKey('${key.id}')" title="Revoke">🗑️</button>
      </div>
    </div>
  `
    )
    .join('');
}

function renderWebhooksList(doc) {
  const container = doc.getElementById('webhooks-list');
  if (!container) return;

  if (apiState.webhooks.length === 0) {
    container.innerHTML =
      '<div class="empty-state">No webhooks configured</div>';
    return;
  }

  container.innerHTML = apiState.webhooks
    .map(
      (webhook) => `
    <div class="webhook-card">
      <div class="webhook-info">
        <h5>${webhook.name}</h5>
        <div class="webhook-url">${webhook.url}</div>
        <div class="webhook-events">${webhook.events.join(', ')}</div>
      </div>
      <div class="webhook-controls">
        <button class="btn-icon" onclick="testWebhook('${webhook.id}')" title="Test">🔍</button>
        <button class="btn-icon danger" onclick="deleteWebhook('${webhook.id}')" title="Delete">🗑️</button>
      </div>
    </div>
  `
    )
    .join('');
}

function renderLogsList(doc) {
  const container = doc.getElementById('api-logs-list');
  if (!container) return;

  const recentLogs = apiState.requestLog.slice(-20).reverse();

  container.innerHTML = recentLogs
    .map(
      (log) => `
    <div class="log-entry ${log.status >= 400 ? 'error' : 'success'}">
      <div class="log-method ${log.method.toLowerCase()}">${log.method}</div>
      <div class="log-path">${log.path}</div>
      <div class="log-status">${log.status}</div>
      <div class="log-time">${new Date(log.timestamp).toLocaleTimeString()}</div>
    </div>
  `
    )
    .join('');
}

function startAPIServer() {
  // Prevent multiple server starts
  if (apiState.serverRunning) {
    return;
  }

  // Start a real Express server for API endpoints
  try {
    // This would normally be a separate server process, but for demo purposes
    // we'll simulate it using Service Worker and Web APIs

    apiState.serverRunning = true;
    apiState.serverPort = 3001; // Default port

    // Set up global API handler
    window.apiServer = {
      handleRequest: (method, path, data, apiKey) => {
        return handleAPIRequest(method, path, data, apiKey);
      },
      getServerInfo: () => ({
        running: apiState.serverRunning,
        port: apiState.serverPort,
        endpoints: apiState.endpoints.length,
        keys: apiState.apiKeys.length,
      }),
    };

    // Register service worker for API handling (only in production)
    if (
      'serviceWorker' in navigator &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      navigator.serviceWorker
        .register('/adamas/sw.js')
        .then(() => {}) //console.log('API Service Worker registered'))
        .catch(() => {}); //console.log('Service Worker registration failed:', err));
    }

    //console.log(`API server started on port ${apiState.serverPort}`);
  } catch (error) {
    console.error('Failed to start API server:', error);
    apiState.serverRunning = false;
  }
}

function initializeWebSocketServer() {
  // Prevent multiple WebSocket server initializations
  if (apiState.webSocketRunning) {
    return;
  }

  // Mock WebSocket server
  // In production, this would connect to a real WebSocket server

  if (typeof WebSocket !== 'undefined') {
    // For demo purposes, we'll simulate WebSocket connections
    apiState.webSocketRunning = true;
    //console.log('WebSocket server initialized');
  }
}

function handleAPIRequest(method, path, data, apiKey) {
  // Validate API key (skip for public auth endpoints)
  const isPublic = ['login', 'register'].includes(
    apiState.endpoints.find((e) => e.path === path && e.method === method)?.id
  );

  if (!isPublic && !validateAPIKey(apiKey)) {
    logRequest(method, path, 401, apiKey);
    return { status: 401, error: 'Invalid API key' };
  }

  // Check rate limits
  if (!checkRateLimit(apiKey)) {
    logRequest(method, path, 429, apiKey);
    return { status: 429, error: 'Rate limit exceeded' };
  }

  // Route to appropriate handler
  const endpoint = apiState.endpoints.find(
    (e) => e.path === path && e.method === method && e.enabled
  );
  if (!endpoint) {
    logRequest(method, path, 404, apiKey);
    return { status: 404, error: 'Endpoint not found' };
  }

  let result;
  switch (endpoint.id) {
    case 'calls':
      result = handleCallsAPI(data);
      break;
    case 'agents':
      result = handleAgentsAPI(data);
      break;
    case 'feedback':
      result = handleFeedbackAPI(data);
      break;
    case 'webhook-events':
      result = handleWebhooksAPI(data);
      break;
    case 'login':
      result = handleLoginAPI(data);
      break;
    case 'register':
      result = handleRegisterAPI(data);
      break;
    default:
      result = { status: 404, error: 'Handler not implemented' };
  }

  logRequest(method, path, result.status || 200, apiKey);
  return result;
}

function handleCallsAPI() {
  // Get call data from local storage
  try {
    const savedCalls = localStorage.getItem('call_history');
    const calls = savedCalls ? JSON.parse(savedCalls) : [];
    // Return last 50 calls
    return { status: 200, data: calls.slice(0, 50) };
  } catch (err) {
    console.error('Error reading call history:', err);
    return { status: 500, error: 'Internal Server Error' };
  }
}

function handleAgentsAPI() {
  // Mock agent data
  const mockAgents = [
    { id: 1, name: 'Alice Johnson', status: 'available', calls: 45 },
    { id: 2, name: 'Bob Smith', status: 'busy', calls: 38 },
  ];

  return { status: 200, data: mockAgents };
}

function handleFeedbackAPI(data) {
  // Submit feedback - in real implementation, save to feedback module
  if (!data || !data.rating || !data.comments) {
    return { status: 400, error: 'Missing required fields' };
  }

  // Trigger feedback submission event
  document.dispatchEvent(
    new CustomEvent('feedback:external-submitted', {
      detail: data,
    })
  );

  return { status: 201, message: 'Feedback submitted successfully' };
}

function handleWebhooksAPI(data) {
  if (!data || !data.url || !data.events) {
    return { status: 400, error: 'Missing required fields' };
  }

  const webhook = {
    id: `webhook-${Date.now()}`,
    name: data.name || 'External Webhook',
    url: data.url,
    events: Array.isArray(data.events) ? data.events : [data.events],
    createdAt: new Date().toISOString(),
  };

  apiState.webhooks.push(webhook);
  saveAPIData();

  return { status: 201, data: webhook };
}

function handleLoginAPI(data) {
  if (!data || !data.email || !data.password) {
    return { status: 400, error: 'Email and password required' };
  }

  const users = JSON.parse(localStorage.getItem('users') || '[]');
  const user = users.find(
    (u) => u.email === data.email && u.password === data.password
  );

  if (user) {
    // Generate a mock token
    const token = `mock-jwt-token-${Date.now()}`;
    const userWithoutPassword = { ...user };
    delete userWithoutPassword.password;
    return { status: 200, data: { token, user: userWithoutPassword } };
  } else {
    // Demo backdoor for testing if no users exist or generic "admin/admin" check
    if (data.email === 'admin@example.com' && data.password === 'admin') {
      const token = `mock-admin-token-${Date.now()}`;
      return {
        status: 200,
        data: {
          token,
          user: {
            id: 0,
            email: 'admin@example.com',
            role: 'admin',
            username: 'Admin',
          },
        },
      };
    }
    return { status: 401, error: 'Invalid credentials' };
  }
}

function handleRegisterAPI(data) {
  if (!data || !data.email || !data.password || !data.username) {
    return { status: 400, error: 'Username, email and password required' };
  }

  const users = JSON.parse(localStorage.getItem('users') || '[]');
  if (users.find((u) => u.email === data.email)) {
    return { status: 409, error: 'Email already exists' };
  }

  const newUser = {
    id: Date.now(),
    username: data.username,
    email: data.email,
    password: data.password, // In a real app, hash this!
    role: data.role || 'agent',
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  localStorage.setItem('users', JSON.stringify(users));

  return { status: 201, message: 'User registered successfully' };
}

function validateAPIKey(apiKey) {
  return apiState.apiKeys.some((key) => key.value === apiKey && !key.revoked);
}

function checkRateLimit(apiKey) {
  const now = Date.now();
  const windowStart = now - 60 * 60 * 1000; // 1 hour window

  if (!apiState.rateLimits.has(apiKey)) {
    apiState.rateLimits.set(apiKey, []);
  }

  const requests = apiState.rateLimits.get(apiKey);
  const recentRequests = requests.filter((time) => time > windowStart);

  // Allow up to 100 requests per hour per key
  if (recentRequests.length >= 100) {
    return false;
  }

  recentRequests.push(now);
  apiState.rateLimits.set(apiKey, recentRequests);

  return true;
}

function logRequest(method, path, status, apiKey) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    method,
    path,
    status,
    apiKey: maskAPIKey(apiKey),
    ip: '127.0.0.1', // Mock IP
  };

  apiState.requestLog.push(logEntry);
  saveAPIData();
}

function generateAPIKey() {
  const key = {
    id: `key-${Date.now()}`,
    name: `API Key ${apiState.apiKeys.length + 1}`,
    value: generateSecureKey(),
    createdAt: new Date().toISOString(),
    revoked: false,
  };

  apiState.apiKeys.push(key);
  saveAPIData();
  renderAPIKeysList(document);
  showToast('API key generated!', 'success');
}

function generateSecureKey() {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function maskAPIKey(key) {
  if (!key || key.length < 8) return key;
  return key.substring(0, 8) + '...' + key.substring(key.length - 4);
}

function getRequestsLast24h() {
  const yesterday = Date.now() - 24 * 60 * 60 * 1000;
  return apiState.requestLog.filter(
    (log) => new Date(log.timestamp) > yesterday
  ).length;
}

function handleCallCompleted(event) {
  const { callData } = event.detail;
  triggerWebhooks('call.completed', callData);
}

function handleFeedbackSubmitted(event) {
  const { response } = event.detail;
  triggerWebhooks('feedback.submitted', response);
}

function handleAgentStatusChanged(event) {
  const { agentData } = event.detail;
  triggerWebhooks('agent.status.changed', agentData);
}

function triggerWebhooks(eventType, data) {
  const relevantWebhooks = apiState.webhooks.filter((wh) =>
    wh.events.includes(eventType)
  );

  relevantWebhooks.forEach((webhook) => {
    // Mock webhook delivery - in real implementation, make HTTP request
    //console.log(`Triggering webhook ${webhook.name} for event ${eventType}`, data);

    // Simulate webhook delivery
    setTimeout(() => {
      fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Event': eventType,
        },
        body: JSON.stringify({
          event: eventType,
          timestamp: new Date().toISOString(),
          data,
        }),
      }).catch((error) => {
        console.error('Webhook delivery failed:', error);
      });
    }, 100);
  });
}

// Global functions
window.generateAPIKey = generateAPIKey;
window.copyAPIKey = (key) => {
  navigator.clipboard.writeText(key).then(() => {
    showToast('API key copied to clipboard!', 'success');
  });
};
window.revokeAPIKey = (keyId) => {
  const key = apiState.apiKeys.find((k) => k.id === keyId);
  if (key) {
    key.revoked = true;
    saveAPIData();
    renderAPIKeysList(document);
    showToast('API key revoked!', 'success');
  }
};
window.toggleEndpoint = (endpointId, enabled) => {
  const endpoint = apiState.endpoints.find((e) => e.id === endpointId);
  if (endpoint) {
    endpoint.enabled = enabled;
    saveAPIData();
    showToast(`Endpoint ${enabled ? 'enabled' : 'disabled'}!`, 'info');
  }
};
window.testEndpoint = (endpointId) => {
  const endpoint = apiState.endpoints.find((e) => e.id === endpointId);
  if (endpoint) {
    if (window.apiServer) {
      // Find a valid key for testing or generate a temp one
      const apiKey =
        apiState.apiKeys.length > 0 ? apiState.apiKeys[0].value : 'test-key';

      // Actually call the handler
      const result = window.apiServer.handleRequest(
        endpoint.method,
        endpoint.path,
        {},
        apiKey
      );

      if (result.status === 200) {
        showToast(
          `Test successful: ${result.data ? (Array.isArray(result.data) ? result.data.length + ' items' : 'OK') : 'OK'}`,
          'success'
        );
      } else {
        showToast(`Test failed: ${result.error || result.status}`, 'error');
      }
    } else {
      showToast(`Server not running`, 'error');
    }
  }
};
window.addWebhook = () => {
  const url = prompt('Webhook URL:');
  const events = prompt(
    'Events (comma-separated):',
    'call.completed,feedback.submitted'
  );
  if (url && events) {
    const webhook = {
      id: `webhook-${Date.now()}`,
      name: 'New Webhook',
      url,
      events: events.split(',').map((e) => e.trim()),
      createdAt: new Date().toISOString(),
    };
    apiState.webhooks.push(webhook);
    saveAPIData();
    renderWebhooksList(document);
    showToast('Webhook added!', 'success');
  }
};
window.deleteWebhook = (webhookId) => {
  const index = apiState.webhooks.findIndex((wh) => wh.id === webhookId);
  if (index > -1) {
    apiState.webhooks.splice(index, 1);
    saveAPIData();
    renderWebhooksList(document);
    showToast('Webhook deleted!', 'success');
  }
};
window.testWebhook = (webhookId) => {
  const webhook = apiState.webhooks.find((wh) => wh.id === webhookId);
  if (webhook) {
    triggerWebhooks('test', { message: 'Test webhook delivery' });
    showToast('Test webhook sent!', 'info');
  }
};
