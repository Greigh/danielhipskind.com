function checkAuth() {
  const token = localStorage.getItem('analyticsToken');
  if (!token) {
    window.location.href = '/analytics/login.html';
    return false;
  }
  return true;
}

// Check auth on page load
document.addEventListener('DOMContentLoaded', () => {
  if (!checkAuth()) return;
});

// Add token to API requests
function getAuthHeaders() {
  const token = localStorage.getItem('analyticsToken');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export { checkAuth, getAuthHeaders };
