export function initSettingsSearch() {
  const searchInput = document.getElementById('settings-search-input');
  if (!searchInput) return;

  const clearBtn = document.getElementById('settings-search-clear');

  // Add No Results placeholder if not exists
  const settingsGrid =
    document.querySelector('.settings-grid') ||
    document.querySelector('.sortable-container');
  let noResultsMsg = document.getElementById('settings-no-results');

  // Create message if missing
  if (!noResultsMsg && settingsGrid) {
    noResultsMsg = document.createElement('div');
    noResultsMsg.id = 'settings-no-results';
    noResultsMsg.className = 'settings-no-results';
    noResultsMsg.innerHTML = 'No settings found matching your search.';
    // Insert after the grid/container
    settingsGrid.parentNode.insertBefore(
      noResultsMsg,
      settingsGrid.nextSibling
    );
    noResultsMsg.style.display = 'none';
  }

  // Handle Input
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    if (clearBtn) clearBtn.style.display = query ? 'flex' : 'none';
    filterSettings(query);
  });

  // Handle Clear
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      clearBtn.style.display = 'none';
      filterSettings(''); // Reset
      searchInput.focus();
    });
  }
}

function filterSettings(query) {
  const sections = document.querySelectorAll('.settings-section');
  const noResultsMsg = document.getElementById('settings-no-results');
  let hasResults = false;

  // Helper to highlight text (SAFE VERSION)
  const highlightText = (el, q) => {
    if (!el) return;
    const text = el.getAttribute('data-original-text') || el.textContent;

    // Always store original text first
    if (!el.getAttribute('data-original-text')) {
      el.setAttribute('data-original-text', text);
    }

    // If no query, just reset and return
    if (!q) {
      el.innerHTML = text; // Restore original
      return;
    }

    try {
      // Escape regex special chars
      const regex = new RegExp(
        `(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
        'gi'
      );
      if (regex.test(text)) {
        el.innerHTML = text.replace(
          regex,
          '<span class="search-highlight">$1</span>'
        );
      } else {
        el.innerHTML = text; // No match in this specific element, ensure clean state
      }
    } catch {
      el.innerHTML = text; // Fallback
    }
  };

  // 1. First Pass: Reset everything if query is empty
  if (!query) {
    sections.forEach((section) => {
      section.style.display = '';
      const content = section.querySelector('.section-content');
      if (content) content.style.display = ''; // Restore default

      section
        .querySelectorAll('.setting-item')
        .forEach((item) => (item.style.display = ''));

      // Clear highlights safely
      section.querySelectorAll('[data-original-text]').forEach((el) => {
        el.innerHTML = el.getAttribute('data-original-text');
      });
    });
    if (noResultsMsg) noResultsMsg.style.display = 'none';
    return;
  }

  // Query is present: Filter
  sections.forEach((section) => {
    const sectionTitleEl = section.querySelector('.section-title');

    let sectionMatches = false;

    // Check section title
    const sectionTitle =
      sectionTitleEl?.getAttribute('data-original-text') ||
      sectionTitleEl?.textContent ||
      '';
    const sectionTitleLower = sectionTitle.toLowerCase();
    const sectionTitleMatches = sectionTitleLower.includes(query);

    if (sectionTitleMatches && sectionTitleEl) {
      highlightText(sectionTitleEl, query);
    } else if (sectionTitleEl) {
      highlightText(sectionTitleEl, ''); // Clear highlight if not matching title directly
    }

    // Check individual items
    const items = section.querySelectorAll('.setting-item');
    items.forEach((item) => {
      const labelEl = item.querySelector('.setting-label');
      const descEl = item.querySelector('.setting-description');

      const label =
        labelEl?.getAttribute('data-original-text') ||
        labelEl?.textContent ||
        '';
      const desc =
        descEl?.getAttribute('data-original-text') || descEl?.textContent || '';

      const labelMatches = label.toLowerCase().includes(query);
      const descMatches = desc.toLowerCase().includes(query);
      const itemMatches = labelMatches || descMatches;

      if (itemMatches || sectionTitleMatches) {
        item.style.display = ''; // Show item
        sectionMatches = true;

        if (itemMatches) {
          if (labelEl) highlightText(labelEl, query);
          if (descEl) highlightText(descEl, query);
        } else {
          if (labelEl) highlightText(labelEl, '');
          if (descEl) highlightText(descEl, '');
        }
      } else {
        item.style.display = 'none'; // Hide item
      }
    });

    // Also check for simple text content in the section if no items matched
    if (!sectionMatches) {
      const textContent = section.textContent.toLowerCase();
      if (textContent.includes(query)) {
        sectionMatches = true;
      }
    }

    // Toggle section visibility
    if (sectionMatches) {
      section.style.display = '';
      hasResults = true;
      const content = section.querySelector('.section-content');
      if (content && content.style.display === 'none') {
        content.style.display = 'block';
      }
    } else {
      section.style.display = 'none';
    }
  });

  // Handle No Results
  if (noResultsMsg) {
    noResultsMsg.style.display = hasResults ? 'none' : 'block';
  }
}
