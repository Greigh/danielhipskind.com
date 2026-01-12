// Knowledge Base Integration Module
// Provides quick access to procedures, FAQs, and documentation

export const kbState = {
  articles: [],
  categories: [],
  bookmarks: [],
  searchIndex: null,
  lastSync: null,
};

// Default knowledge base content
const defaultArticles = [
  {
    id: 'call-handling-basics',
    title: 'Call Handling Basics',
    category: 'Procedures',
    content: `
      <h3>Greeting Customers</h3>
      <p>Always greet customers professionally: "Thank you for calling [Company]. This is [Your Name]. How may I help you today?"</p>

      <h3>Active Listening</h3>
      <ul>
        <li>Give the customer your full attention</li>
        <li>Take notes during the conversation</li>
        <li>Ask clarifying questions when needed</li>
        <li>Paraphrase to confirm understanding</li>
      </ul>

      <h3>Professional Tone</h3>
      <p>Maintain a calm, professional tone even with difficult customers. Use positive language and avoid jargon.</p>
    `,
    tags: ['basics', 'communication', 'customer-service'],
    lastModified: new Date().toISOString(),
    author: 'System',
  },
  {
    id: 'escalation-procedures',
    title: 'Escalation Procedures',
    category: 'Procedures',
    content: `
      <h3>When to Escalate</h3>
      <ul>
        <li>Customer requests supervisor/manager</li>
        <li>Issue requires specialized knowledge</li>
        <li>Customer is extremely upset or angry</li>
        <li>Technical issues beyond your scope</li>
      </ul>

      <h3>How to Escalate</h3>
      <ol>
        <li>Inform customer: "I'll connect you with a supervisor who can better assist you."</li>
        <li>Note all details in the ticket</li>
        <li>Use appropriate escalation queue</li>
        <li>Provide customer with reference number</li>
      </ol>
    `,
    tags: ['escalation', 'supervisor', 'procedures'],
    lastModified: new Date().toISOString(),
    author: 'System',
  },
  {
    id: 'password-reset',
    title: 'Password Reset Procedures',
    category: 'Technical Support',
    content: `
      <h3>Standard Password Reset</h3>
      <ol>
        <li>Verify customer identity using security questions</li>
        <li>Navigate to user management system</li>
        <li>Generate temporary password</li>
        <li>Send reset email with instructions</li>
        <li>Guide customer through password change process</li>
      </ol>

      <h3>Special Cases</h3>
      <ul>
        <li>VIP customers: Use expedited process</li>
        <li>Account locked: May require additional verification</li>
        <li>Domain admin accounts: Escalate to IT security</li>
      </ul>
    `,
    tags: ['password', 'security', 'technical'],
    lastModified: new Date().toISOString(),
    author: 'System',
  },
];

const defaultCategories = [
  { id: 'procedures', name: 'Procedures', color: '#3498db' },
  { id: 'faqs', name: 'FAQs', color: '#2ecc71' },
  { id: 'technical', name: 'Technical Support', color: '#e74c3c' },
  { id: 'policies', name: 'Policies', color: '#f39c12' },
  { id: 'training', name: 'Training', color: '#9b59b6' },
];

export function initializeKnowledgeBase(doc = document) {
  loadKBData();
  setupKBEventListeners(doc);
  renderKnowledgeBaseUI(doc);
  buildSearchIndex();
}

function loadKBData() {
  try {
    const saved = localStorage.getItem('knowledge-base-data');
    if (saved) {
      const data = JSON.parse(saved);
      kbState.articles = data.articles || [];
      kbState.categories = data.categories || defaultCategories;
      kbState.bookmarks = data.bookmarks || [];
      kbState.lastSync = data.lastSync;
    } else {
      kbState.articles = defaultArticles;
      kbState.categories = defaultCategories;
      kbState.bookmarks = [];
      saveKBData();
    }
  } catch (error) {
    console.error('Error loading knowledge base data:', error);
    kbState.articles = defaultArticles;
    kbState.categories = defaultCategories;
  }
}

function saveKBData() {
  try {
    const data = {
      articles: kbState.articles,
      categories: kbState.categories,
      bookmarks: kbState.bookmarks,
      lastSync: kbState.lastSync,
    };
    localStorage.setItem('knowledge-base-data', JSON.stringify(data));
  } catch (error) {
    console.error('Error saving knowledge base data:', error);
  }
}

function setupKBEventListeners(doc) {
  // Search functionality
  const searchInput = doc.getElementById('kb-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', handleSearch);
  }

  // Category filtering
  const categoryFilter = doc.getElementById('kb-category-filter');
  if (categoryFilter) {
    categoryFilter.addEventListener('change', handleCategoryFilter);
  }

  // Quick access during calls
  doc.addEventListener('kb:quick-search', handleQuickSearch);
}

function renderKnowledgeBaseUI(doc) {
  const container = doc.getElementById('knowledge-base-container');
  if (!container) return;

  container.innerHTML = `
    <div class="kb-section">
      <div class="kb-header">
        <h3>Knowledge Base</h3>
        <div class="kb-controls">
          <input type="text" id="kb-search-input" placeholder="Search articles..." class="kb-search">
          <select id="kb-category-filter" class="kb-filter">
            <option value="">All Categories</option>
            ${kbState.categories.map((cat) => `<option value="${cat.id}">${cat.name}</option>`).join('')}
          </select>
          <button class="btn-sm" onclick="openKBArticleModal()">Add Article</button>
        </div>
      </div>

      <div class="kb-stats">
        <div class="stat-card">
          <h4>Total Articles</h4>
          <span class="stat-value">${kbState.articles.length}</span>
        </div>
        <div class="stat-card">
          <h4>Bookmarked</h4>
          <span class="stat-value">${kbState.bookmarks.length}</span>
        </div>
        <div class="stat-card">
          <h4>Categories</h4>
          <span class="stat-value">${kbState.categories.length}</span>
        </div>
      </div>

      <div class="kb-content">
        <div class="kb-sidebar">
          <h4>Quick Access</h4>
          <div class="kb-bookmarks" id="kb-bookmarks-list"></div>
          <h4>Recent Articles</h4>
          <div class="kb-recent" id="kb-recent-list"></div>
        </div>

        <div class="kb-main">
          <div class="kb-articles" id="kb-articles-list"></div>
        </div>
      </div>
    </div>
  `;

  renderBookmarksList(doc);
  renderRecentList(doc);
  renderArticlesList(doc);
}

function renderBookmarksList(doc) {
  const container = doc.getElementById('kb-bookmarks-list');
  if (!container) return;

  if (kbState.bookmarks.length === 0) {
    container.innerHTML = '<p class="empty-state">No bookmarks yet</p>';
    return;
  }

  container.innerHTML = kbState.bookmarks
    .map((articleId) => {
      const article = kbState.articles.find((a) => a.id === articleId);
      if (!article) return '';

      return `
      <div class="kb-bookmark-item" onclick="openKBArticle('${article.id}')">
        <h5>${article.title}</h5>
        <span class="kb-category" style="background: ${getCategoryColor(article.category)}">${article.category}</span>
      </div>
    `;
    })
    .join('');
}

function renderRecentList(doc) {
  const container = doc.getElementById('kb-recent-list');
  if (!container) return;

  const recentArticles = kbState.articles
    .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
    .slice(0, 5);

  container.innerHTML = recentArticles
    .map(
      (article) => `
    <div class="kb-recent-item" onclick="openKBArticle('${article.id}')">
      <h5>${article.title}</h5>
      <span class="kb-date">${new Date(article.lastModified).toLocaleDateString()}</span>
    </div>
  `
    )
    .join('');
}

function renderArticlesList(doc, filteredArticles = null) {
  const container = doc.getElementById('kb-articles-list');
  if (!container) return;

  const articles = filteredArticles || kbState.articles;

  if (articles.length === 0) {
    container.innerHTML = '<div class="empty-state">No articles found</div>';
    return;
  }

  container.innerHTML = articles
    .map(
      (article) => `
    <div class="kb-article-card" onclick="openKBArticle('${article.id}')">
      <div class="kb-article-header">
        <h4>${article.title}</h4>
        <div class="kb-article-meta">
          <span class="kb-category" style="background: ${getCategoryColor(article.category)}">${article.category}</span>
          <span class="kb-author">${article.author}</span>
          <span class="kb-date">${new Date(article.lastModified).toLocaleDateString()}</span>
        </div>
      </div>
      <div class="kb-article-preview">
        ${getArticlePreview(article.content)}
      </div>
      <div class="kb-article-tags">
        ${article.tags.map((tag) => `<span class="kb-tag">${tag}</span>`).join('')}
      </div>
      <div class="kb-article-actions">
        <button class="btn-icon" onclick="event.stopPropagation(); toggleKBBookmark('${article.id}')" title="Bookmark">
          ${kbState.bookmarks.includes(article.id) ? '⭐' : '☆'}
        </button>
        <button class="btn-icon" onclick="event.stopPropagation(); editKBArticle('${article.id}')" title="Edit">✏️</button>
      </div>
    </div>
  `
    )
    .join('');
}

function getCategoryColor(categoryName) {
  const category = kbState.categories.find((c) => c.name === categoryName);
  return category ? category.color : '#95a5a6';
}

function getArticlePreview(content) {
  // Extract first 100 characters of text content
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = content;
  const text = tempDiv.textContent || tempDiv.innerText || '';
  return text.substring(0, 100) + (text.length > 100 ? '...' : '');
}

function buildSearchIndex() {
  // Simple search index - in production, use a proper search library
  kbState.searchIndex = kbState.articles.map((article) => ({
    id: article.id,
    searchableText:
      `${article.title} ${article.content.replace(/<[^>]*>/g, '')} ${article.tags.join(' ')}`.toLowerCase(),
  }));
}

function handleSearch(event) {
  const query = event.target.value.toLowerCase().trim();

  if (!query) {
    renderArticlesList(document);
    return;
  }

  const filteredArticles = kbState.articles.filter((article) => {
    const searchableText =
      `${article.title} ${article.content.replace(/<[^>]*>/g, '')} ${article.tags.join(' ')}`.toLowerCase();
    return searchableText.includes(query);
  });

  renderArticlesList(document, filteredArticles);
}

function handleCategoryFilter(event) {
  const categoryId = event.target.value;

  if (!categoryId) {
    renderArticlesList(document);
    return;
  }

  const category = kbState.categories.find((c) => c.id === categoryId);
  if (!category) return;

  const filteredArticles = kbState.articles.filter(
    (article) => article.category === category.name
  );
  renderArticlesList(document, filteredArticles);
}

function handleQuickSearch(event) {
  const { query } = event.detail;
  const searchInput = document.getElementById('kb-search-input');
  if (searchInput) {
    searchInput.value = query;
    searchInput.dispatchEvent(new Event('input'));
    // Switch to KB tab if not already active
    showToast(`Searching knowledge base for: ${query}`, 'info');
  }
}

export function openKBArticle(articleId, doc = document) {
  const article = kbState.articles.find((a) => a.id === articleId);
  if (!article) return;

  const modal = doc.createElement('div');
  modal.className = 'modal kb-article-modal';
  modal.innerHTML = `
    <div class="modal-content large">
      <div class="modal-header">
        <div class="kb-article-title">
          <h3>${article.title}</h3>
          <div class="kb-article-meta">
            <span class="kb-category" style="background: ${getCategoryColor(article.category)}">${article.category}</span>
            <span class="kb-author">By ${article.author}</span>
            <span class="kb-date">Updated ${new Date(article.lastModified).toLocaleDateString()}</span>
          </div>
        </div>
        <button class="modal-close" onclick="closeKBModal()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="kb-article-content">
          ${article.content}
        </div>
        <div class="kb-article-tags">
          ${article.tags.map((tag) => `<span class="kb-tag">${tag}</span>`).join('')}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="closeKBModal()">Close</button>
        <button class="button" onclick="toggleKBBookmark('${article.id}'); this.textContent = '${kbState.bookmarks.includes(article.id) ? 'Unbookmark' : 'Bookmark'}'">
          ${kbState.bookmarks.includes(article.id) ? 'Unbookmark' : 'Bookmark'}
        </button>
      </div>
    </div>
  `;

  doc.body.appendChild(modal);
}

export function toggleKBBookmark(articleId) {
  const index = kbState.bookmarks.indexOf(articleId);
  if (index > -1) {
    kbState.bookmarks.splice(index, 1);
    showToast('Article removed from bookmarks', 'info');
  } else {
    kbState.bookmarks.push(articleId);
    showToast('Article bookmarked!', 'success');
  }
  saveKBData();
  renderBookmarksList(document);
}

function openKBArticleModal(articleId = null) {
  const article = articleId
    ? kbState.articles.find((a) => a.id === articleId)
    : null;

  const modal = document.createElement('div');
  modal.className = 'modal kb-editor-modal';
  modal.innerHTML = `
    <div class="modal-content large">
      <div class="modal-header">
        <h3>${article ? 'Edit Article' : 'New Article'}</h3>
        <button class="modal-close" onclick="closeKBModal()">&times;</button>
      </div>
      <div class="modal-body">
        <form id="kb-article-form">
          <div class="form-group">
            <label for="kb-title">Title *</label>
            <input type="text" id="kb-title" required value="${article?.title || ''}">
          </div>

          <div class="form-group">
            <label for="kb-category">Category *</label>
            <select id="kb-category" required>
              <option value="">Select Category</option>
              ${kbState.categories.map((cat) => `<option value="${cat.name}" ${article?.category === cat.name ? 'selected' : ''}>${cat.name}</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label for="kb-content">Content *</label>
            <textarea id="kb-content" required rows="15">${article?.content || ''}</textarea>
          </div>

          <div class="form-group">
            <label for="kb-tags">Tags (comma-separated)</label>
            <input type="text" id="kb-tags" value="${article?.tags?.join(', ') || ''}">
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="closeKBModal()">Cancel</button>
        <button class="button" onclick="saveKBArticle('${articleId || ''}')">Save Article</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

function saveKBArticle(articleId) {
  const title = document.getElementById('kb-title').value.trim();
  const category = document.getElementById('kb-category').value;
  const content = document.getElementById('kb-content').value.trim();
  const tagsInput = document.getElementById('kb-tags').value.trim();

  if (!title || !category || !content) {
    showToast('Please fill in all required fields', 'error');
    return;
  }

  const tags = tagsInput
    ? tagsInput
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag)
    : [];

  const articleData = {
    title,
    category,
    content,
    tags,
    lastModified: new Date().toISOString(),
    author: 'User', // In production, get from user session
  };

  if (articleId) {
    // Update existing article
    const index = kbState.articles.findIndex((a) => a.id === articleId);
    if (index > -1) {
      kbState.articles[index] = { ...kbState.articles[index], ...articleData };
    }
  } else {
    // Create new article
    articleData.id = `article-${Date.now()}`;
    kbState.articles.push(articleData);
  }

  saveKBData();
  buildSearchIndex();
  renderKnowledgeBaseUI(document);
  closeKBModal();
  showToast(
    `Article ${articleId ? 'updated' : 'created'} successfully!`,
    'success'
  );
}

function closeKBModal() {
  const modal = document.querySelector('.kb-article-modal, .kb-editor-modal');
  if (modal) {
    modal.remove();
  }
}

// Global functions
window.openKBArticle = openKBArticle;
window.toggleKBBookmark = toggleKBBookmark;
window.editKBArticle = (articleId) => openKBArticleModal(articleId);
window.openKBArticleModal = openKBArticleModal;
window.saveKBArticle = saveKBArticle;
window.closeKBModal = closeKBModal;

// Quick search function for integration with other modules
export function searchKnowledgeBase(query) {
  document.dispatchEvent(
    new CustomEvent('kb:quick-search', {
      detail: { query },
    })
  );
}

// Import toast for notifications
import { showToast } from '../utils/toast.js';
