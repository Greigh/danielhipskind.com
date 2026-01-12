// AI-Powered Insights Module
import { getCallHistory } from './call-logging.js';

let autoRefreshEnabled = true;
let refreshInterval;

export function initializeAIInsights() {
  // Initialize controls
  setupControls();

  // Initial update
  updateInsights();

  // Start auto-refresh
  startAutoRefresh();
}

function setupControls() {
  const autoRefreshBtn = document.getElementById('auto-refresh-toggle');
  const exportBtn = document.getElementById('export-insights');
  const settingsBtn = document.getElementById('insights-settings');

  if (autoRefreshBtn) {
    autoRefreshBtn.addEventListener('click', toggleAutoRefresh);
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', exportInsights);
  }

  if (settingsBtn) {
    settingsBtn.addEventListener('click', showInsightsSettings);
  }
}

function toggleAutoRefresh() {
  const btn = document.getElementById('auto-refresh-toggle');
  autoRefreshEnabled = !autoRefreshEnabled;

  if (autoRefreshEnabled) {
    btn.classList.add('active');
    startAutoRefresh();
  } else {
    btn.classList.remove('active');
    stopAutoRefresh();
  }
}

function startAutoRefresh() {
  if (refreshInterval) clearInterval(refreshInterval);
  refreshInterval = setInterval(updateInsights, 30000); // 30 seconds
}

function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

function exportInsights() {
  const calls = getCallHistory();
  const insights = {
    sentiment: analyzeSentiment(calls),
    trends: predictTrends(calls),
    metrics: calculateMetrics(calls),
    suggestions: generateSuggestions(calls),
    timestamp: new Date().toISOString(),
  };

  const dataStr = JSON.stringify(insights, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `ai-insights-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function showInsightsSettings() {
  alert('AI Insights settings would open a configuration panel here.');
}

function updateInsights() {
  const calls = getCallHistory();

  // Check if required elements exist
  const sentimentEl = document.getElementById('sentiment-analysis');
  const trendsEl = document.getElementById('trend-predictions');
  const metricsEl = document.getElementById('performance-metrics');
  const suggestionsEl = document.getElementById('optimization-suggestions');

  if (!sentimentEl || !trendsEl || !metricsEl || !suggestionsEl) {
    return;
  }

  // Show loading states
  showLoadingStates();

  // Simulate processing delay for better UX
  setTimeout(() => {
    const sentiment = analyzeSentiment(calls);
    const trends = predictTrends(calls);
    const metrics = calculateMetrics(calls);
    const suggestions = generateSuggestions(calls);

    sentimentEl.innerHTML = sentiment;
    trendsEl.innerHTML = trends;
    metricsEl.innerHTML = metrics;
    suggestionsEl.innerHTML = suggestions;
  }, 1000);
}

function showLoadingStates() {
  const loadingHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Analyzing data...</p>
    </div>
  `;

  const sentimentEl = document.getElementById('sentiment-analysis');
  const trendsEl = document.getElementById('trend-predictions');
  const metricsEl = document.getElementById('performance-metrics');
  const suggestionsEl = document.getElementById('optimization-suggestions');

  if (sentimentEl) sentimentEl.innerHTML = loadingHTML;
  if (trendsEl) trendsEl.innerHTML = loadingHTML;
  if (metricsEl) metricsEl.innerHTML = loadingHTML;
  if (suggestionsEl) suggestionsEl.innerHTML = loadingHTML;
}

function analyzeSentiment(calls) {
  if (!calls || calls.length === 0) {
    return `
      <div class="error-state">
        <p>No call data available for sentiment analysis</p>
        <button class="retry-btn" onclick="updateInsights()">Retry</button>
      </div>
    `;
  }

  // Analyze based on call duration, notes, and patterns
  const totalCalls = calls.length;
  // const avgDuration =
  //   calls.reduce((sum, call) => sum + (call.duration || 0), 0) / totalCalls;

  // Mock sentiment calculation based on call data
  let positive = 0,
    neutral = 0,
    negative = 0;

  calls.forEach((call) => {
    const duration = call.duration || 0;
    const hasNotes = call.notes && call.notes.length > 0;

    if (duration > 600) {
      // Long calls might indicate complex issues
      negative += 0.4;
    } else if (duration < 120) {
      // Short calls might be efficient
      positive += 0.3;
    } else {
      neutral += 0.3;
    }

    if (hasNotes) {
      // Notes might indicate issues or resolutions
      if (
        call.notes.toLowerCase().includes('escalated') ||
        call.notes.toLowerCase().includes('complaint')
      ) {
        negative += 0.3;
      } else {
        positive += 0.2;
      }
    }
  });

  // Normalize to percentages
  const total = positive + neutral + negative;
  positive = Math.round((positive / total) * 100);
  neutral = Math.round((neutral / total) * 100);
  negative = Math.round((negative / total) * 100);

  // Determine overall sentiment
  let overallSentiment, confidence;
  if (positive > negative && positive > neutral) {
    overallSentiment = 'Positive';
    confidence = Math.min(95, 70 + Math.random() * 25);
  } else if (negative > positive) {
    overallSentiment = 'Negative';
    confidence = Math.min(90, 65 + Math.random() * 25);
  } else {
    overallSentiment = 'Neutral';
    confidence = Math.min(85, 60 + Math.random() * 25);
  }

  return `
    <div class="sentiment-result">
      <h4>Overall Sentiment: <span class="sentiment-${overallSentiment.toLowerCase()}">${overallSentiment}</span></h4>
      <p>Confidence: ${Math.round(confidence)}% | Based on ${totalCalls} calls</p>
      <div class="sentiment-breakdown">
        <div>Positive: ${positive}%</div>
        <div>Neutral: ${neutral}%</div>
        <div>Negative: ${negative}%</div>
      </div>
    </div>
  `;
}

function predictTrends(calls) {
  if (!calls || calls.length === 0) {
    return `
      <div class="error-state">
        <p>No call data available for trend analysis</p>
        <button class="retry-btn" onclick="updateInsights()">Retry</button>
      </div>
    `;
  }

  // Analyze call patterns over time
  const now = new Date();
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentCalls = calls.filter(
    (call) => new Date(call.timestamp) > lastWeek
  );

  const trends = [];

  // Volume trend
  const weeklyGrowth =
    (recentCalls.length / Math.max(calls.length * 0.2, 1) - 1) * 100;
  if (Math.abs(weeklyGrowth) > 10) {
    trends.push(
      `Call volume ${weeklyGrowth > 0 ? 'increasing' : 'decreasing'} by ${Math.abs(Math.round(weeklyGrowth))}% this week`
    );
  }

  // Duration trend
  const avgDuration =
    calls.reduce((sum, call) => sum + (call.duration || 0), 0) / calls.length;
  const recentAvgDuration =
    recentCalls.reduce((sum, call) => sum + (call.duration || 0), 0) /
    recentCalls.length;
  const durationChange =
    ((recentAvgDuration - avgDuration) / avgDuration) * 100;

  if (Math.abs(durationChange) > 5) {
    trends.push(
      `Average call duration ${durationChange > 0 ? 'increasing' : 'decreasing'} by ${Math.abs(Math.round(durationChange))}%`
    );
  }

  // Peak hours analysis
  const hourCounts = {};
  calls.forEach((call) => {
    const hour = new Date(call.timestamp).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  const peakHour = Object.keys(hourCounts).reduce((a, b) =>
    hourCounts[a] > hourCounts[b] ? a : b
  );

  trends.push(
    `Peak call volume at ${peakHour}:00-${parseInt(peakHour) + 1}:00`
  );

  // Add some predictive insights
  trends.push(
    'Customer satisfaction likely to improve with current resolution rates'
  );
  trends.push('Consider staffing adjustments for predicted busy periods');

  return `
    <div class="trend-predictions">
      <h4>Trend Analysis & Predictions</h4>
      <ul>
        ${trends.map((trend) => `<li>${trend}</li>`).join('')}
      </ul>
    </div>
  `;
}

function calculateMetrics(calls) {
  if (!calls || calls.length === 0) {
    return `
      <div class="error-state">
        <p>No call data available for metrics calculation</p>
        <button class="retry-btn" onclick="updateInsights()">Retry</button>
      </div>
    `;
  }

  const totalCalls = calls.length;
  const avgDuration =
    calls.reduce((sum, call) => sum + (call.duration || 0), 0) / totalCalls;
  // const totalDuration = calls.reduce(
  //   (sum, call) => sum + (call.duration || 0),
  //   0
  // );

  // Calculate resolution rate (mock - in real app would be based on call outcomes)
  const resolvedCalls = calls.filter(
    (call) =>
      call.notes &&
      (call.notes.toLowerCase().includes('resolved') ||
        call.notes.toLowerCase().includes('closed') ||
        call.notes.toLowerCase().includes('solved'))
  ).length;

  const resolutionRate = Math.round((resolvedCalls / totalCalls) * 100);

  // Calculate first call resolution (mock)
  const firstCallResolution = Math.max(
    0,
    resolutionRate - Math.floor(Math.random() * 20)
  );

  // Calculate customer satisfaction (mock based on sentiment analysis)
  const satisfactionScore = Math.round(65 + Math.random() * 30);

  return `
    <div class="performance-metrics">
      <div class="metric">
        <span class="metric-label">Total Calls</span>
        <span class="metric-value">${totalCalls}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Average Duration</span>
        <span class="metric-value">${Math.round(avgDuration / 60)}m ${Math.round(avgDuration % 60)}s</span>
      </div>
      <div class="metric">
        <span class="metric-label">Resolution Rate</span>
        <span class="metric-value positive">${resolutionRate}%</span>
      </div>
      <div class="metric">
        <span class="metric-label">First Call Resolution</span>
        <span class="metric-value ${firstCallResolution > 70 ? 'positive' : 'neutral'}">${firstCallResolution}%</span>
      </div>
      <div class="metric">
        <span class="metric-label">Customer Satisfaction</span>
        <span class="metric-value ${satisfactionScore > 80 ? 'positive' : satisfactionScore > 60 ? 'neutral' : 'negative'}">${satisfactionScore}%</span>
      </div>
    </div>
  `;
}

function generateSuggestions(calls) {
  if (!calls || calls.length === 0) {
    return `
      <div class="error-state">
        <p>No call data available for optimization suggestions</p>
        <button class="retry-btn" onclick="updateInsights()">Retry</button>
      </div>
    `;
  }

  const suggestions = [];
  const totalCalls = calls.length;
  const avgDuration =
    calls.reduce((sum, call) => sum + (call.duration || 0), 0) / totalCalls;

  // Duration-based suggestions
  if (avgDuration > 300) {
    // 5 minutes
    suggestions.push(
      'Consider implementing call-back systems to reduce long hold times'
    );
    suggestions.push(
      'Train agents on common issues to improve resolution speed'
    );
  }

  // Volume-based suggestions
  if (totalCalls > 50) {
    suggestions.push(
      'Consider adding more agents during peak hours to reduce wait times'
    );
  }

  // Pattern-based suggestions
  const patterns = calls.filter((call) => call.pattern).length;
  if (patterns / totalCalls > 0.3) {
    suggestions.push(
      'Leverage call patterns to create automated responses for common queries'
    );
  }

  // Add general suggestions
  suggestions.push('Implement customer feedback surveys after call resolution');
  suggestions.push(
    'Create knowledge base articles for frequently asked questions'
  );
  suggestions.push(
    'Monitor agent performance metrics for continuous improvement'
  );

  return `
    <div class="optimization-suggestions">
      <h4>AI-Generated Optimization Suggestions</h4>
      <ul>
        ${suggestions.map((suggestion) => `<li>${suggestion}</li>`).join('')}
      </ul>
      <div class="suggestion-actions">
        <button class="button" onclick="implementSuggestion()">Implement Selected</button>
        <button class="button" onclick="exportInsights()" style="margin-left: 10px;">Export Report</button>
      </div>
    </div>
  `;
}

// Mock function for implementing suggestions
window.implementSuggestion = function () {
  alert(
    'Suggestion implementation feature would integrate with your CRM/workflow system.'
  );
};

// Make functions globally available for HTML onclick handlers
window.updateInsights = updateInsights;
window.exportInsights = exportInsights;
