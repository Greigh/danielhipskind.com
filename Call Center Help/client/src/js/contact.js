/* global grecaptcha */
document
  .getElementById('contact-form')
  .addEventListener('submit', async function (e) {
    e.preventDefault();

    // Check if reCAPTCHA is completed
    const captchaToken = grecaptcha.getResponse();
    if (!captchaToken) {
      document.getElementById('contact-error').textContent =
        'Please complete the CAPTCHA verification.';
      document.getElementById('contact-error').style.display = 'block';
      return;
    }

    var name = document.getElementById('contact-name').value.trim();
    var email = document.getElementById('contact-email').value.trim();
    var message = document.getElementById('contact-message').value.trim();
    var btn = document.getElementById('contact-submit-btn');
    var successDiv = document.getElementById('contact-success');
    var errorDiv = document.getElementById('contact-error');
    successDiv.style.display = 'none';
    errorDiv.style.display = 'none';
    btn.disabled = true;
    try {
      const res = await fetch('/adamas/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message, captchaToken }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        successDiv.textContent =
          data.message || 'Thank you! Your message has been received.';
        successDiv.style.display = 'block';
        this.reset();
        // Reset CAPTCHA
        grecaptcha.reset();
      } else {
        errorDiv.textContent =
          data.error || 'There was a problem sending your message.';
        errorDiv.style.display = 'block';
      }
    } catch {
      errorDiv.textContent = 'Network error. Please try again later.';
      errorDiv.style.display = 'block';
    } finally {
      btn.disabled = false;
    }
  });
