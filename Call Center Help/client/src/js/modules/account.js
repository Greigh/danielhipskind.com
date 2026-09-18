import { auth } from './auth.js';
import { showToast } from '../utils/toast.js';

export function initAccountSettings() {
  const accountSection = document.getElementById('account-settings-section');
  if (!accountSection) return;

  // Only show if logged in
  if (auth.isLoggedIn()) {
    accountSection.style.display = 'block';

    // Populate Profile Fields
    const user = auth.getUser();
    if (user) {
      const usernameInput = document.getElementById('account-username');
      const emailInput = document.getElementById('account-email');
      if (usernameInput) usernameInput.value = user.username || '';
      if (emailInput) emailInput.value = user.email || '';
    }

    // Handle Profile Update
    const profileForm = document.getElementById('update-profile-form');
    if (profileForm) {
      profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('account-username').value;
        const email = document.getElementById('account-email').value;
        const btn = profileForm.querySelector('button[type="submit"]');

        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Updating...';

        try {
          await auth.updateProfile(username, email);
          showToast('Profile updated successfully', 'success');
        } catch (err) {
          showToast(err.message, 'error');
        } finally {
          btn.disabled = false;
          btn.textContent = originalText;
        }
      });
    }

    // Handle Password Update
    const passwordForm = document.getElementById('change-password-form');
    if (passwordForm) {
      passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPassword =
          document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const btn = passwordForm.querySelector('button[type="submit"]');

        if (!currentPassword || !newPassword) {
          showToast('Please fill in all fields', 'error');
          return;
        }

        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Updating...';

        try {
          await auth.updatePassword(currentPassword, newPassword);
          showToast('Password updated successfully', 'success');
          document.getElementById('current-password').value = '';
          document.getElementById('new-password').value = '';
        } catch (err) {
          showToast(err.message, 'error');
        } finally {
          btn.disabled = false;
          btn.textContent = originalText;
        }
      });
    }
  } else {
    // Hide if not logged in (double check)
    accountSection.style.display = 'none';
  }
}
