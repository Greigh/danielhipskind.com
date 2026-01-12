// Team Collaboration Module
export function initializeCollaboration() {
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-message');
  const chatMessages = document.getElementById('chat-messages');
  const teamMembersList = document.getElementById('team-members-list');
  const onlineCount = document.getElementById('online-count');
  const typingIndicator = document.getElementById('typing-indicator');

  // Check if required elements exist
  if (
    !chatInput ||
    !sendBtn ||
    !chatMessages ||
    !teamMembersList ||
    !onlineCount ||
    !typingIndicator
  ) {
    return;
  }

  let messages = JSON.parse(localStorage.getItem('chatMessages')) || [];
  let teamMembers = JSON.parse(localStorage.getItem('teamMembers')) || [
    {
      id: 1,
      name: 'Alice Johnson',
      role: 'Supervisor',
      status: 'online',
      avatar: '👩‍💼',
    },
    { id: 2, name: 'Bob Smith', role: 'Agent', status: 'online', avatar: '👨‍💻' },
    { id: 3, name: 'Carol Davis', role: 'Agent', status: 'away', avatar: '👩‍💻' },
    {
      id: 4,
      name: 'David Wilson',
      role: 'Manager',
      status: 'offline',
      avatar: '👨‍💼',
    },
  ];
  let typingUsers = new Set();
  let currentUser = { id: 0, name: 'You', avatar: '👤' };

  function updateOnlineCount() {
    const onlineMembers = teamMembers.filter(
      (member) => member.status === 'online'
    ).length;
    onlineCount.textContent = `${onlineMembers} online`;
  }

  function updateTeamMembersList() {
    teamMembersList.innerHTML = '';

    teamMembers.forEach((member) => {
      const li = document.createElement('li');
      li.className = `team-member ${member.status}`;
      li.innerHTML = `
        <div class="member-avatar">${member.avatar}</div>
        <div class="member-info">
          <div class="member-name">${member.name}</div>
          <div class="member-role">${member.role}</div>
        </div>
        <div class="member-status">
          <span class="status-dot status-${member.status}"></span>
          <span class="status-text">${member.status}</span>
        </div>
      `;

      teamMembersList.appendChild(li);
    });
  }

  function updateTypingIndicator() {
    if (typingUsers.size === 0) {
      typingIndicator.style.display = 'none';
      return;
    }

    const typingNames = Array.from(typingUsers).map((id) => {
      const member = teamMembers.find((m) => m.id === id);
      return member ? member.name : 'Someone';
    });

    typingIndicator.textContent = `${typingNames.join(', ')} ${typingNames.length === 1 ? 'is' : 'are'} typing...`;
    typingIndicator.style.display = 'block';

    // Auto-hide after 3 seconds
    setTimeout(() => {
      typingUsers.clear();
      updateTypingIndicator();
    }, 3000);
  }

  function addMessage(content, sender = currentUser, timestamp = new Date()) {
    const message = {
      id: Date.now(),
      content: content.trim(),
      sender: sender,
      timestamp: timestamp,
      type: 'message',
    };

    messages.push(message);
    localStorage.setItem('chatMessages', JSON.stringify(messages.slice(-100))); // Keep last 100 messages
    renderMessage(message);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function renderMessage(message) {
    const messageEl = document.createElement('div');
    messageEl.className = `chat-message ${message.sender.id === currentUser.id ? 'own' : 'other'}`;
    messageEl.innerHTML = `
      <div class="message-avatar">${message.sender.avatar}</div>
      <div class="message-content">
        <div class="message-header">
          <span class="message-sender">${message.sender.name}</span>
          <span class="message-time">${new Date(message.timestamp).toLocaleTimeString()}</span>
        </div>
        <div class="message-text">${message.content}</div>
      </div>
    `;

    chatMessages.appendChild(messageEl);
  }

  function sendMessage() {
    const content = chatInput.value.trim();
    if (!content) return;

    addMessage(content);
    chatInput.value = '';

    // Simulate responses from team members
    if (Math.random() > 0.7) {
      setTimeout(
        () => {
          const randomMember =
            teamMembers[Math.floor(Math.random() * teamMembers.length)];
          const responses = [
            'Thanks for the update!',
            "I'll handle that right away.",
            "Good point, let's discuss this further.",
            'Can you provide more details?',
            "I'm on it.",
            'Perfect timing!',
            'Let me check that for you.',
            'Great work on that call!',
          ];
          const randomResponse =
            responses[Math.floor(Math.random() * responses.length)];
          addMessage(randomResponse, randomMember);
        },
        1000 + Math.random() * 3000
      );
    }
  }

  function handleTyping() {
    // Simulate other users typing occasionally
    if (Math.random() > 0.95) {
      const randomMember =
        teamMembers[Math.floor(Math.random() * teamMembers.length)];
      typingUsers.add(randomMember.id);
      updateTypingIndicator();
    }
  }

  //   // function showToast(message, type = 'info') {
  //     const toast = document.createElement('div');
  //     toast.className = `toast toast-${type}`;
  //     toast.textContent = message;
  //     toast.style.cssText = `
  //       position: fixed;
  //       top: 20px;
  //       right: 20px;
  //       background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
  //       color: white;
  //       padding: 12px 16px;
  //       border-radius: 8px;
  //       z-index: 1000;
  //       animation: slideIn 0.3s ease;
  //     `;
  //
  //     document.body.appendChild(toast);
  //     setTimeout(() => {
  //       toast.style.animation = 'slideOut 0.3s ease';
  //       setTimeout(() => toast.remove(), 300);
  //     }, 3000);
  //   // }

  // Event listeners
  sendBtn.addEventListener('click', sendMessage);
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  chatInput.addEventListener('input', handleTyping);

  // Load existing messages
  messages.forEach(renderMessage);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // Initialize
  updateOnlineCount();
  updateTeamMembersList();
  updateTypingIndicator();

  // Simulate team member status changes
  setInterval(() => {
    teamMembers.forEach((member) => {
      if (Math.random() > 0.95) {
        const statuses = ['online', 'away', 'offline'];
        const newStatus = statuses[Math.floor(Math.random() * statuses.length)];
        if (member.status !== newStatus) {
          member.status = newStatus;
          updateTeamMembersList();
          updateOnlineCount();
        }
      }
    });
  }, 10000);
}
