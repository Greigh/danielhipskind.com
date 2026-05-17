// Multi-Channel Support Module
import { crmManager } from './crm/CRMManager.js';
import { showToast } from '../utils/toast.js';

export function initializeMultiChannel() {
  // ... existing initialization code ...
  initializePhoneChannel();
  initializeChatChannel();
  initializeEmailChannel();
  initializeSocialChannel();
  initializeSMSChannel();
}

function initializePhoneChannel() {
  const phoneChannel = document.getElementById('phone-channel');
  if (!phoneChannel) {
    console.warn('Phone channel element not found');
    return;
  }

  // Render UI (kept same)
  phoneChannel.innerHTML = `
    <div class="phone-interface">
      <div class="active-call">
        <h4>Active Call</h4>
        <div id="active-call-info">No active call</div>
      </div>
      <div class="call-controls">
        <button class="button" id="answer-call">Answer</button>
        <button class="button" id="hold-call">Hold</button>
        <button class="button" id="transfer-call">Transfer</button>
        <button class="button btn-danger" id="end-call">End Call</button>
      </div>
      <div class="recent-calls">
        <h4>Recent Calls</h4>
        <ul id="multichannel-call-list"></ul>
      </div>
    </div>
  `;

  // Bind controls to crmManager
  const answerBtn = document.getElementById('answer-call');
  const holdBtn = document.getElementById('hold-call');
  const transferBtn = document.getElementById('transfer-call');
  const endBtn = document.getElementById('end-call');
  const activeCallInfo = document.getElementById('active-call-info');

  if (answerBtn) {
    answerBtn.addEventListener('click', async () => {
      // In a real scenario, this would pick up an incoming call.
      // For now, we simulate "answering" by ensuring we are connected
      try {
        if (!crmManager.state.isConnected) {
          showToast('Connecting to CRM...', 'info');
          await crmManager.connect();
        }
        activeCallInfo.textContent = 'Call answered - Connected';
        showToast('Call answered', 'success');
      } catch (err) {
        showToast(`Failed to answer: ${err.message}`, 'error');
      }
    });
  }

  if (holdBtn) {
    holdBtn.addEventListener('click', () => {
      activeCallInfo.textContent = 'Call on hold';
      showToast('Call placed on hold', 'info');
    });
  }

  if (transferBtn) {
    transferBtn.addEventListener('click', () => {
      const extension = prompt('Enter extension to transfer to:');
      if (extension) {
        activeCallInfo.textContent = `Call transferred to extension ${extension}`;
        showToast(`Transferred to ${extension}`, 'success');
      }
    });
  }

  if (endBtn) {
    endBtn.addEventListener('click', async () => {
      try {
        await crmManager.endCall();
        activeCallInfo.textContent = 'Call ended';
        showToast('Call ended', 'info');
      } catch (err) {
        showToast(`Failed to end call: ${err.message}`, 'error');
      }
    });
  }
}

function initializeChatChannel() {
  const chatChannel = document.getElementById('chat-channel');
  if (!chatChannel) {
    console.warn('Chat channel element not found');
    return;
  }
  chatChannel.innerHTML = `
    <div class="chat-interface">
      <div class="chat-queue">
        <h4>Waiting Chats</h4>
        <ul id="chat-queue"></ul>
      </div>
      <div class="active-chat">
        <h4>Active Chat</h4>
        <div id="chat-messages" class="chat-messages"></div>
        <div class="chat-input-area">
          <input type="text" id="chat-reply" placeholder="Type your reply..." />
          <button class="button" id="send-reply">Send</button>
        </div>
      </div>
      <div class="chat-templates">
        <h4>Quick Replies</h4>
        <div class="template-buttons">
          <button class="button btn-sm" onclick="sendTemplate('greeting')">Greeting</button>
          <button class="button btn-sm" onclick="sendTemplate('closing')">Closing</button>
          <button class="button btn-sm" onclick="sendTemplate('transfer')">Transfer</button>
        </div>
      </div>
    </div>
  `;

  // Mock chat queue
  const chatQueue = document.getElementById('chat-queue');
  if (chatQueue) {
    chatQueue.innerHTML = `
    <li class="chat-item">Customer A - Waiting 2 min</li>
    <li class="chat-item">Customer B - Waiting 5 min</li>
  `;
  }

  const sendReplyBtn = document.getElementById('send-reply');
  const chatReplyInput = document.getElementById('chat-reply');
  if (sendReplyBtn && chatReplyInput) {
    sendReplyBtn.addEventListener('click', () => {
      const reply = chatReplyInput.value;
      if (reply && reply.trim()) {
        addChatMessage('Agent', reply);
        chatReplyInput.value = '';
      }
    });
  }
}

function initializeEmailChannel() {
  const emailChannel = document.getElementById('email-channel');
  if (!emailChannel) {
    console.warn('Email channel element not found');
    return;
  }
  emailChannel.innerHTML = `
    <div class="email-interface">
      <div class="email-inbox">
        <h4>Email Inbox</h4>
        <ul id="email-list">
          <li class="email-item">
            <div class="email-subject">Order Inquiry</div>
            <div class="email-from">customer@example.com</div>
            <div class="email-time">2 hours ago</div>
          </li>
          <li class="email-item">
            <div class="email-subject">Technical Support</div>
            <div class="email-from">user@company.com</div>
            <div class="email-time">4 hours ago</div>
          </li>
        </ul>
      </div>
      <div class="email-composer">
        <h4>Compose Email</h4>
        <input type="email" id="email-to" placeholder="To:" />
        <input type="text" id="email-subject" placeholder="Subject:" />
        <textarea id="email-body" placeholder="Email content..."></textarea>
        <button class="button" id="send-email">Send Email</button>
      </div>
    </div>
  `;

  const sendEmailBtn = document.getElementById('send-email');
  if (sendEmailBtn) {
    sendEmailBtn.addEventListener('click', () => {
      alert('Email sent! (Demo)');
    });
  }
}

function initializeSocialChannel() {
  const socialChannel = document.getElementById('social-channel');
  if (!socialChannel) {
    console.warn('Social channel element not found');
    return;
  }
  socialChannel.innerHTML = `
    <div class="social-interface">
      <div class="social-feeds">
        <h4>Social Media Feeds</h4>
        <div class="social-tabs">
          <button class="social-tab active" data-platform="twitter">Twitter</button>
          <button class="social-tab" data-platform="facebook">Facebook</button>
          <button class="social-tab" data-platform="instagram">Instagram</button>
        </div>
        <div id="social-posts" class="social-posts">
          <div class="social-post">
            <div class="post-author">@customer123</div>
            <div class="post-content">Having issues with my order #12345</div>
            <div class="post-time">1 hour ago</div>
            <button class="button btn-sm" onclick="respondToPost()">Respond</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function initializeSMSChannel() {
  const smsChannel = document.getElementById('sms-channel');
  if (!smsChannel) {
    return;
  }
  smsChannel.innerHTML = `
    <div class="sms-interface">
      <div class="sms-composer">
        <h4>Send SMS</h4>
        <div class="form-group">
          <label for="sms-to">To:</label>
          <input type="tel" id="sms-to" placeholder="+1234567890" />
        </div>
        <div class="form-group">
          <label for="sms-message">Message:</label>
          <textarea id="sms-message" placeholder="Type your SMS message..." maxlength="160"></textarea>
          <div class="char-count"><span id="char-count">0</span>/160</div>
        </div>
        <button class="button" id="send-sms">Send SMS</button>
      </div>
      <div class="sms-history">
        <h4>SMS History</h4>
        <div id="sms-history-list" class="sms-list">
          <div class="sms-item">
            <div class="sms-meta">
              <span class="sms-number">+1234567890</span>
              <span class="sms-time">2 hours ago</span>
            </div>
            <div class="sms-content">Thank you for your inquiry. We'll get back to you soon.</div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Add event listeners
  const sendSmsBtn = document.getElementById('send-sms');
  const smsMessage = document.getElementById('sms-message');
  const charCount = document.getElementById('char-count');

  // Character counter
  if (smsMessage && charCount) {
    smsMessage.addEventListener('input', () => {
      charCount.textContent = smsMessage.value.length;
    });
  }

  // Send SMS
  if (sendSmsBtn) {
    sendSmsBtn.addEventListener('click', async () => {
      const toEl = document.getElementById('sms-to');
      const to = toEl ? toEl.value.trim() : '';
      const message = smsMessage ? smsMessage.value.trim() : '';

      if (!to || !message) {
        alert('Please enter both phone number and message');
        return;
      }

      if (!to.match(/^\+\d{10,15}$/)) {
        alert(
          'Please enter a valid phone number in international format (e.g., +1234567890)'
        );
        return;
      }

      sendSmsBtn.disabled = true;
      sendSmsBtn.textContent = 'Sending...';

      try {
        const response = await fetch('/api/sms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
          },
          body: JSON.stringify({ to, message }),
        });

        if (response.ok) {
          alert('SMS sent successfully!');
          if (smsMessage) smsMessage.value = '';
          if (charCount) charCount.textContent = '0';
          addSMSHistory(to, message, 'sent');
        } else {
          const error = await response.json();
          alert(`Failed to send SMS: ${error.error}`);
        }
      } catch (error) {
        console.error('SMS send error:', error);
        alert('Failed to send SMS. Please try again.');
      } finally {
        sendSmsBtn.disabled = false;
        sendSmsBtn.textContent = 'Send SMS';
      }
    });
  }
}

function addSMSHistory(number, message, type) {
  const historyList = document.getElementById('sms-history-list');
  if (!historyList) return;
  const smsItem = document.createElement('div');
  smsItem.className = `sms-item ${type}`;

  const now = new Date();
  const timeString = now.toLocaleTimeString();

  smsItem.innerHTML = `
    <div class="sms-meta">
      <span class="sms-number">${number}</span>
      <span class="sms-time">${timeString}</span>
    </div>
    <div class="sms-content">${message}</div>
  `;

  historyList.insertBefore(smsItem, historyList.firstChild);
}

function addChatMessage(sender, message) {
  const chatMessages = document.getElementById('chat-messages');
  if (!chatMessages) return;
  const messageDiv = document.createElement('div');
  messageDiv.className = 'chat-message';
  messageDiv.innerHTML = `<strong>${sender}:</strong> ${message}`;
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Template functions
window.sendTemplate = function (type) {
  const templates = {
    greeting: 'Hello! Thank you for contacting us. How can I help you today?',
    closing:
      'Thank you for your patience. Is there anything else I can help you with?',
    transfer: "I'm transferring you to a specialist who can better assist you.",
  };

  if (templates[type]) {
    addChatMessage('Agent', templates[type]);
  }
};

window.respondToPost = function () {
  alert('Social media response functionality would be implemented here.');
};
