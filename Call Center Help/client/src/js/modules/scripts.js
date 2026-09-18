import { saveData, loadData, STORAGE_LIMITS } from './storage.js';
import { escapeHtml } from '../utils/helpers.js';

export function initializeScripts() {
  const container = document.querySelector('.section-content');
  if (!container) return; // Guard clause

  // Select elements (updated for new UI)
  const scriptList = document.getElementById('script-list');
  const scriptContent = document.getElementById('script-content'); // Textarea
  const scriptPreviewPane = document.getElementById('script-preview-pane');
  const scriptEditorContainer = document.getElementById(
    'script-editor-container'
  );

  const saveScriptBtn = document.getElementById('save-script');
  const cancelScriptBtn = document.getElementById('cancel-script');
  const copyScriptBtn = document.getElementById('copy-script-btn');
  const newScriptBtn = document.getElementById('new-script-btn');
  const manageCategoriesBtn = document.getElementById('manage-categories-btn');
  const togglePreviewBtn = document.getElementById('toggle-preview-btn');
  const variableInsert = document.getElementById('variable-insert');

  const searchInput = document.getElementById('script-search');
  const editorBtns = document.querySelectorAll('.editor-btn[data-action]');
  const categoriesContainer = document.querySelector('.script-categories');

  // Check if critical elements exist
  if (!scriptList || !scriptContent || !scriptEditorContainer) {
    return;
  }

  // State
  let scripts = loadData('scripts', null) || getDefaultScripts();
  let currentCategory = 'all';
  let currentScript = null;
  let isPreviewMode = false;
  let searchTerm = '';

  function persistScripts() {
    // Cap total scripts across categories
    const max = STORAGE_LIMITS.scripts || 100;
    let total = 0;
    const capped = {};
    for (const [cat, list] of Object.entries(scripts || {})) {
      const arr = Array.isArray(list) ? list : [];
      capped[cat] = arr;
      total += arr.length;
    }
    if (total > max) {
      // Trim from largest categories first (keep newest at end)
      let overflow = total - max;
      const cats = Object.keys(capped).sort(
        (a, b) => capped[b].length - capped[a].length
      );
      for (const cat of cats) {
        if (overflow <= 0) break;
        const drop = Math.min(overflow, Math.max(0, capped[cat].length - 1));
        if (drop > 0) {
          capped[cat] = capped[cat].slice(drop);
          overflow -= drop;
        }
      }
      scripts = capped;
    }
    saveData('scripts', scripts);
  }

  // Default Scripts Data
  function getDefaultScripts() {
    return {
      sales: [
        {
          id: 1,
          title: 'New Customer Greeting',
          content:
            'Hello! Thank you for calling [Company]. This is [Your Name] from our sales team. How can I help you find the perfect solution today?',
          category: 'sales',
          favorite: false,
          usage: 0,
          lastUsed: null,
        },
        {
          id: 2,
          title: 'Product Recommendation',
          content:
            "Based on what you've told me, I recommend our [Product] package. It includes {{features}} and is priced at {{price}}. Would you like to proceed with this?",
          category: 'sales',
          favorite: false,
          usage: 0,
          lastUsed: null,
        },
      ],
      support: [
        {
          id: 3,
          title: 'Technical Issue Troubleshooting',
          content:
            "I understand you're experiencing {{issue}}. Let me guide you through some troubleshooting steps. First, can you tell me what error message you're seeing?",
          category: 'support',
          favorite: false,
          usage: 0,
          lastUsed: null,
        },
      ],
      complaints: [
        {
          id: 5,
          title: 'Complaint Acknowledgment',
          content:
            "I'm sorry to hear you're experiencing this issue. I completely understand your frustration, and I want to make this right. Let me {{action}} for you.",
          category: 'complaints',
          favorite: false,
          usage: 0,
          lastUsed: null,
        },
      ],
    };
  }

  // category UI
  function updateCategoryUI() {
    if (!categoriesContainer) return;
    categoriesContainer.innerHTML = '';

    const allBtn = document.createElement('button');
    allBtn.className = `script-category ${currentCategory === 'all' ? 'active' : ''}`;
    allBtn.dataset.category = 'all';
    allBtn.textContent = 'All';
    allBtn.onclick = () => selectCategory('all');
    categoriesContainer.appendChild(allBtn);

    Object.keys(scripts).forEach((cat) => {
      const btn = document.createElement('button');
      btn.className = `script-category ${currentCategory === cat ? 'active' : ''}`;
      btn.dataset.category = cat;
      btn.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
      btn.onclick = () => selectCategory(cat);
      categoriesContainer.appendChild(btn);
    });
  }

  function selectCategory(cat) {
    currentCategory = cat;
    updateCategoryUI();
    updateScriptList();
  }

  function updateScriptList() {
    scriptList.innerHTML = '';
    let allScripts = [];

    Object.keys(scripts).forEach((category) => {
      scripts[category].forEach((script) => {
        allScripts.push({ ...script, category });
      });
    });

    if (currentCategory !== 'all') {
      allScripts = allScripts.filter(
        (script) => script.category === currentCategory
      );
    }

    if (searchTerm) {
      allScripts = allScripts.filter(
        (script) =>
          script.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          script.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    allScripts.sort((a, b) => {
      if (a.favorite && !b.favorite) return -1;
      if (!a.favorite && b.favorite) return 1;
      return b.usage - a.usage;
    });

    allScripts.forEach((script) => {
      const scriptItem = document.createElement('div');
      scriptItem.className = 'script-item';
      scriptItem.innerHTML = `
        <div class="script-title">
          <span class="script-icon">${getCategoryIcon(script.category)}</span>
          ${escapeHtml(script.title)}
          ${script.favorite ? '⭐' : ''}
        </div>
        <div class="script-preview">${escapeHtml(script.content.substring(0, 80))}...</div>
        <div class="script-meta">
          <span class="script-category-tag">${escapeHtml(script.category)}</span>
          <span class="script-usage">Used ${Number(script.usage) || 0} times</span>
        </div>
      `;
      scriptItem.addEventListener('click', () => loadScript(script));
      scriptList.appendChild(scriptItem);
    });

    if (allScripts.length === 0) {
      scriptList.innerHTML =
        '<div class="no-scripts">No scripts found matching your criteria.</div>';
    }
  }

  function getCategoryIcon(category) {
    const icons = { sales: '💼', support: '🛠️', complaints: '😠', all: '📚' };
    return icons[category] || '📄';
  }

  // --- Editor Functions ---

  function openEditor(script = null) {
    currentScript = script;
    scriptContent.value = script ? script.content : '';
    isPreviewMode = false;
    updatePreviewState();

    scriptList.style.display = 'none';
    document.querySelector('.script-categories-container').style.display =
      'none';
    document.querySelector('.script-controls-bar').style.display = 'none';
    scriptEditorContainer.style.display = 'block';
  }

  function closeEditor() {
    currentScript = null;
    scriptContent.value = '';
    scriptEditorContainer.style.display = 'none';
    scriptList.style.display = 'grid'; // Restore grid layout
    document.querySelector('.script-categories-container').style.display =
      'flex';
    document.querySelector('.script-controls-bar').style.display = 'flex';
    updateScriptList();
  }

  function loadScript(script) {
    openEditor(script);
    script.usage++;
    script.lastUsed = new Date();
    persistScripts();
  }

  function createNewScript() {
    openEditor(null);
  }

  function saveScript() {
    const content = scriptContent.value.trim();
    if (!content) {
      alert('Script content cannot be empty.');
      return;
    }

    if (!currentScript) {
      // Create New
      const title = prompt('Enter script title:');
      if (!title) return;

      const category =
        currentCategory !== 'all'
          ? currentCategory
          : prompt('Enter category (sales/support/complaints/etc):') ||
            'support';
      const normalizedCategory = category.toLowerCase().trim();

      const newScript = {
        id: Date.now(),
        title,
        content,
        category: normalizedCategory,
        favorite: false,
        usage: 0,
        lastUsed: null,
      };

      if (!scripts[normalizedCategory]) scripts[normalizedCategory] = [];
      scripts[normalizedCategory].push(newScript);
    } else {
      // Update Existing
      currentScript.content = content;
    }

    persistScripts();
    updateCategoryUI(); // In case new category added
    closeEditor();
  }

  // --- Advanced Features ---

  function insertVariable(varName) {
    if (!varName) return;
    const placeholder = `{{${varName}}}`;
    const start = scriptContent.selectionStart;
    const end = scriptContent.selectionEnd;
    const text = scriptContent.value;
    scriptContent.value =
      text.substring(0, start) + placeholder + text.substring(end);
    scriptContent.focus();
    scriptContent.selectionStart = scriptContent.selectionEnd =
      start + placeholder.length;
    variableInsert.value = ''; // Reset select
  }

  function togglePreview() {
    isPreviewMode = !isPreviewMode;
    updatePreviewState();
  }

  function updatePreviewState() {
    if (isPreviewMode) {
      scriptContent.style.display = 'none';
      scriptPreviewPane.style.display = 'block';
      scriptPreviewPane.innerHTML = renderScript(scriptContent.value);
      togglePreviewBtn.innerHTML = '✏️ Edit';
      copyScriptBtn.style.display = 'inline-block';
    } else {
      scriptContent.style.display = 'block';
      scriptPreviewPane.style.display = 'none';
      togglePreviewBtn.innerHTML = '👁️ Preview';
      copyScriptBtn.style.display = 'none';
    }
  }

  function renderScript(content) {
    // Escape HTML to prevent XSS
    let escaped = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Markdown-like formatting (simple)
    escaped = escaped
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');

    // Variable highlighting
    escaped = escaped.replace(
      /\{\{(.*?)\}\}/g,
      '<span class="script-variable" title="Dynamic Variable">$1</span>'
    );

    return escaped;
  }

  function copyToClipboard() {
    // Copy the raw text with newlines, but without HTML tags (simulated)
    // Actually we want to copy the *text* version of the rendered script?
    // Usually agents want the text to paste into chat.
    // For now we copy the raw text but maybe processed.
    // Let's copy the preview text content (which has variables filled if we had them, right now they are just spans).

    // For this version, let's copy the text content of the preview pane, which removes HTML tags but keeps text.
    const textToCopy = scriptPreviewPane.innerText;
    navigator.clipboard.writeText(textToCopy).then(() => {
      const originalText = copyScriptBtn.innerHTML;
      copyScriptBtn.innerHTML = '✅ Copied!';
      setTimeout(() => (copyScriptBtn.innerHTML = originalText), 2000);
    });
  }

  function manageCategories() {
    const action = prompt(
      'Type "add" to add a category, or "delete" to delete a category:'
    );
    if (!action) return;

    if (action.toLowerCase() === 'add') {
      const newCat = prompt('Enter new category name:');
      if (newCat && !scripts[newCat]) {
        scripts[newCat] = [];
        persistScripts();
        updateCategoryUI();
        alert(`Category "${newCat}" added.`);
      }
    } else if (action.toLowerCase() === 'delete') {
      const catToDelete = prompt(
        'Enter category name to delete (must be empty or content will be lost):'
      );
      if (catToDelete && scripts[catToDelete]) {
        if (
          confirm(
            `Are you sure you want to delete "${catToDelete}"? This will delete all scripts inside it.`
          )
        ) {
          delete scripts[catToDelete];
          persistScripts();
          currentCategory = 'all';
          updateCategoryUI();
          updateScriptList();
        }
      }
    }
  }

  function applyFormatting(action) {
    const start = scriptContent.selectionStart;
    const end = scriptContent.selectionEnd;
    const text = scriptContent.value;
    const selected = text.substring(start, end);
    let wrapper = '';

    switch (action) {
      case 'bold':
        wrapper = '**';
        break;
      case 'italic':
        wrapper = '*';
        break;
      case 'underline':
        wrapper = '__';
        break; // Simple markdown conventions
    }

    if (wrapper) {
      scriptContent.value =
        text.substring(0, start) +
        `${wrapper}${selected}${wrapper}` +
        text.substring(end);
      scriptContent.focus();
      scriptContent.selectionEnd = end + wrapper.length * 2;
    }
  }

  // --- Event Listeners ---

  if (searchInput)
    searchInput.addEventListener('input', (e) => {
      searchTerm = e.target.value;
      updateScriptList();
    });

  if (saveScriptBtn) saveScriptBtn.addEventListener('click', saveScript);
  if (cancelScriptBtn) cancelScriptBtn.addEventListener('click', closeEditor);
  if (newScriptBtn) newScriptBtn.addEventListener('click', createNewScript);

  if (manageCategoriesBtn)
    manageCategoriesBtn.addEventListener('click', manageCategories);

  if (variableInsert)
    variableInsert.addEventListener('change', () =>
      insertVariable(variableInsert.value)
    );
  if (togglePreviewBtn)
    togglePreviewBtn.addEventListener('click', togglePreview);
  if (copyScriptBtn) copyScriptBtn.addEventListener('click', copyToClipboard);

  if (editorBtns)
    editorBtns.forEach((btn) => {
      // Only bind format buttons
      if (btn.id !== 'toggle-preview-btn') {
        btn.addEventListener('click', () =>
          applyFormatting(btn.dataset.action)
        );
      }
    });

  // Initialization
  updateCategoryUI();
  updateScriptList();
}

// Training & Practice Mode
export const trainingState = {
  currentScript: null,
  practiceMode: false,
  feedback: [],
  certifications: loadData('certifications', []).slice(
    -(STORAGE_LIMITS.certifications || 100)
  ),
};

export function startPracticeMode(scriptId) {
  const script = findScriptById(scriptId);
  if (!script) return;

  trainingState.currentScript = script;
  trainingState.practiceMode = true;
  renderPracticeUI(script);
}

function findScriptById(id) {
  const scripts = loadData('scripts', null) || getDefaultScripts();
  for (const category in scripts) {
    const found = scripts[category].find((s) => s.id == id);
    if (found) return found;
  }
  return null;
}

function getDefaultScripts() {
  return {
    sales: [],
    support: [],
    complaints: [],
  };
}

function renderPracticeUI() {
  // Render practice interface with script text, input for user response, feedback
}

export function submitPracticeResponse(response) {
  // Analyze response, provide feedback
  const feedback = analyzeResponse(response, trainingState.currentScript);
  trainingState.feedback.push(feedback);
  displayFeedback(feedback);
}

function analyzeResponse(response, script) {
  // Simple analysis: check if key phrases are included
  const keyPhrases = extractKeyPhrases(script.content);
  const score =
    keyPhrases.filter((phrase) => response.includes(phrase)).length /
    keyPhrases.length;
  return { score, suggestions: [] };
}

function extractKeyPhrases(content) {
  // Simple extraction
  return content.split('.').filter((s) => s.trim());
}

function displayFeedback() {
  // Show feedback to user
}

export function completeCertification(scriptId) {
  const cert = {
    scriptId,
    date: new Date(),
    score: trainingState.feedback.slice(-1)[0]?.score || 0,
  };
  trainingState.certifications.push(cert);
  trainingState.certifications = trainingState.certifications.slice(
    -(STORAGE_LIMITS.certifications || 100)
  );
  saveData('certifications', trainingState.certifications);
}

export function getCertifications() {
  return trainingState.certifications;
}
