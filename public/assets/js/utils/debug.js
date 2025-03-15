export const debug = (message, data = null) => {
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
};

export const debugError = (message, error) => {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
  const debugStatus = document.getElementById('debug-status');

  if (debugStatus) {
    debugStatus.innerHTML = `[ERROR ${timestamp}] ${message}`;
    debugStatus.style.backgroundColor = '#dc3545';
  }

  console.error(`[Error ${timestamp}] ${message}`, error);
};
