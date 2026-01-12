export class FloatingWindowManager {
  constructor() {
    this.floatingWindows = new Map();
    this.browserWindows = new Map();
  }

  floatSection(sectionId, forceBrowserWindow = false) {
    const section = document.getElementById(sectionId);
    if (!section) {
      return;
    }

    if (this.floatingWindows.has(sectionId)) {
      return;
    }

    if (this.browserWindows.has(sectionId)) {
      return;
    }

    // Check settings to determine if we should open in browser window
    const appSettings = window.appSettings || {};

    // If enablePopupWindows is true, always try browser window first (fallback to floating if blocked)
    // If forceBrowserWindow is true (Ctrl/Cmd+click), always try browser window
    const shouldOpenInBrowser =
      forceBrowserWindow || appSettings?.enablePopupWindows;

    if (shouldOpenInBrowser) {
      return this.openInBrowserWindow(sectionId);
    }

    // Clone the entire section to preserve exact structure and styles
    const clonedSection = section.cloneNode(true);
    // Give the clone a unique id and add floating-window modifier class
    clonedSection.id = `floating-${sectionId}`;
    clonedSection.classList.add('floating-window');

    // Remove any float button inside the clone (we'll add explicit controls)
    const existingFloatBtn = clonedSection.querySelector('.float-btn');
    if (existingFloatBtn && existingFloatBtn.parentNode)
      existingFloatBtn.parentNode.removeChild(existingFloatBtn);

    // Add floating controls into the cloned section's .section-controls area (if present)
    const controlsArea =
      clonedSection.querySelector('.section-controls') ||
      clonedSection.querySelector('.floating-controls');
    if (controlsArea) {
      // append dock/minimize/close buttons (avoid duplicating if already present)
      const addBtn = (cls, title, text) => {
        if (!controlsArea.querySelector(`.${cls}`)) {
          const b = document.createElement('button');
          b.className = cls;
          b.title = title;
          b.textContent = text;
          controlsArea.appendChild(b);
        }
      };
      addBtn('dock-btn', 'Dock', '⧈');
      addBtn('minimize-btn', 'Minimize', '−');
      addBtn('close-btn', 'Close Popup', '×');
    }

    // Update all IDs in the cloned section to avoid collisions
    clonedSection.querySelectorAll('[id]').forEach((element) => {
      const originalId = element.id;
      const newId = `floating-${sectionId}-${originalId}`;
      element.id = newId;

      // Update labels within the clone that reference this ID
      const labels = clonedSection.querySelectorAll(
        `label[for="${originalId}"]`
      );
      labels.forEach((label) => {
        label.setAttribute('for', newId);
      });

      // Also update name attributes when present
      if (element.hasAttribute('name')) {
        element.setAttribute(
          'name',
          `floating-${sectionId}-${element.getAttribute('name')}`
        );
      }
    });

    // Append the cloned section to the body as the floating window
    document.body.appendChild(clonedSection);

    // If the cloned content contains pattern formatter controls, attach their listeners
    try {
      if (
        window.patternsModule &&
        typeof window.patternsModule.attachPatternEventListeners === 'function'
      ) {
        window.patternsModule.attachPatternEventListeners(clonedSection);
      } else {
        // dynamic import; if unsupported the promise will reject and we ignore
        import('./patterns.js')
          .then((m) => {
            if (m && typeof m.attachPatternEventListeners === 'function') {
              m.attachPatternEventListeners(clonedSection);
              window.patternsModule = m;
            }
          })
          .catch(() => {});
      }
    } catch {
      // ignore any runtime errors
    }

    // Mark formatter floats so they receive targeted styles
    if (
      sectionId === 'pattern-formatter' ||
      section.dataset?.section === 'formatter'
    ) {
      clonedSection.classList.add('pattern-popup');
    }

    // Register the cloned section as the floating window and hide the original
    this.floatingWindows.set(sectionId, clonedSection);
    section.style.display = 'none';

    this.setupWindowControls(sectionId, clonedSection);
    this.makeWindowDraggable(clonedSection);
  }

  openInBrowserWindow(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) {
      return;
    }

    const sectionTitle =
      section.querySelector('.section-title')?.textContent || 'Section';
    const sectionContent =
      section.querySelector('.section-content')?.innerHTML || '';

    // Get the current theme from the main window
    const currentTheme =
      document.documentElement.getAttribute('data-theme') || 'light';

    // Update IDs in content to avoid conflicts
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = sectionContent;
    tempDiv.querySelectorAll('[id]').forEach((element) => {
      const originalId = element.id;
      const newId = `popup-${sectionId}-${originalId}`;
      element.id = newId;
      // Update any labels that reference this ID
      tempDiv
        .querySelectorAll(`label[for="${originalId}"]`)
        .forEach((label) => {
          label.setAttribute('for', newId);
        });
    });
    const updatedContent = tempDiv.innerHTML;

    // Generate HTML for the new window
    const windowHtml = `
            <!DOCTYPE html>
            <html lang="en" data-theme="${currentTheme}">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${sectionTitle} - Call Center Helper</title>
                <style>
                    /* CSS Variables - Exact match from main app */
                    :root {
                        --primary-blue: #1976d2;
                        --primary-blue-dark: #1565c0;
                        --primary-blue-light: #42a5f5;
                        --secondary-green: #2e7d32;
                        --secondary-orange: #f57c00;
                        --secondary-red: #d32f2f;
                        --white: #ffffff;
                        --gray-50: #f7f9fa;
                        --gray-100: #e0e7ef;
                        --gray-200: #c1c9d2;
                        --gray-300: #a3b1bf;
                        --gray-400: #64748b;
                        --gray-500: #475569;
                        --gray-600: #334155;
                        --gray-700: #1e293b;
                        --gray-800: #0f172a;
                        --gray-900: #020617;
                        --dark-bg: #0f172a;
                        --dark-surface: #1e293b;
                        --dark-border: #334155;
                        --dark-text: #e2e8f0;
                        --dark-text-muted: #94a3b8;
                        --success: #16a34a;
                        --warning: #d97706;
                        --error: #dc2626;
                        --info: var(--primary-blue);
                        --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
                        --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                        --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
                        --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
                        --font-family-base: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                        --font-family-mono: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
                        --font-family-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                        --bg-color: #ffffff;
                        --text-color: var(--gray-800);
                        --border-color: var(--gray-200);
                    }
                    
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    
                    html {
                        font-size: 16px;
                        scroll-behavior: smooth;
                    }
                    
                    body {
                        min-height: 100vh;
                        display: flex;
                        flex-direction: column;
                        margin: 0;
                        padding: 1.5rem;
                        font-family: var(--font-family-base);
                        background: var(--gray-50);
                        color: var(--text-color);
                        line-height: 1.6;
                    }
                    
                    .section-content {
                        background: var(--white);
                        border-radius: 0.75rem;
                        padding: 1.5rem;
                        box-shadow: var(--shadow-lg);
                        max-width: 900px;
                        margin: 0 auto;
                        border: 1px solid var(--gray-100);
                    }
                    
                    h1, h2, h3, h4, h5, h6 {
                        margin: 0 0 1rem 0;
                        font-weight: 600;
                        line-height: 1.2;
                        color: var(--gray-900);
                    }
                    
                    h1 {
                        font-size: 1.875rem;
                        color: var(--primary-blue);
                        text-align: center;
                        border-bottom: 2px solid var(--primary-blue-light);
                        padding-bottom: 0.75rem;
                        margin-bottom: 1.5rem;
                    }
                    
                    h2 { font-size: 1.5rem; }
                    h3 { font-size: 1.25rem; }
                    h4 { font-size: 1.125rem; }
                    h5 { font-size: 1rem; }
                    h6 { font-size: 0.875rem; }
                    
                    p {
                        margin: 0 0 1rem 0;
                        line-height: 1.6;
                    }
                    
                    .button, button:not(.nav-tab):not(.tab-button) {
                        background: linear-gradient(90deg, #3498db 60%, var(--primary-blue) 100%);
                        color: var(--white);
                        border: none;
                        border-radius: 0.375rem;
                        padding: 0.5rem 1.25rem;
                        font-size: 1rem;
                        font-weight: 500;
                        cursor: pointer;
                        transition: all 0.18s ease;
                        outline: none;
                        display: inline-flex;
                        align-items: center;
                        gap: 0.5rem;
                        min-height: 38px;
                    }
                    
                    .button:hover:not(:disabled), 
                    button:not(.nav-tab):not(.tab-button):hover:not(:disabled) {
                        background: linear-gradient(90deg, var(--primary-blue) 60%, var(--primary-blue-dark) 100%);
                        box-shadow: var(--shadow-md);
                    }
                    
                    .button:focus, 
                    button:not(.nav-tab):not(.tab-button):focus {
                        box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.25);
                    }
                    
                    .button:disabled, 
                    button:not(.nav-tab):not(.tab-button):disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
                        background: var(--gray-400);
                    }
                    
                    input, textarea, select {
                        background: var(--white);
                        border: 2px solid var(--gray-200);
                        border-radius: 0.375rem;
                        padding: 0.5rem 0.75rem;
                        font-size: 1rem;
                        font-family: var(--font-family-sans);
                        color: var(--gray-900);
                        transition: all 0.18s ease;
                        width: 100%;
                        box-sizing: border-box;
                    }
                    
                    input:focus, textarea:focus, select:focus {
                        outline: none;
                        border-color: var(--primary-blue);
                        box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.1);
                    }
                    
                    input:disabled, textarea:disabled, select:disabled {
                        background: var(--gray-100);
                        color: var(--gray-500);
                        cursor: not-allowed;
                        border-color: var(--gray-200);
                    }
                    
                    input::placeholder, textarea::placeholder {
                        color: var(--gray-400);
                    }
                    
                    textarea {
                        resize: vertical;
                        min-height: 100px;
                        font-family: var(--font-family-sans);
                    }
                    
                    label {
                        display: block;
                        font-weight: 500;
                        color: var(--gray-700);
                        margin-bottom: 0.25rem;
                        font-size: 1rem;
                    }
                    
                    /* Tab System */
                    .tab-container {
                        background: var(--white);
                        border-radius: 0.75rem;
                        overflow: hidden;
                        box-shadow: var(--shadow-sm);
                        margin-bottom: 1.25rem;
                    }
                    
                    .tab-header {
                        display: flex;
                        background: var(--gray-50);
                        border-bottom: 1px solid var(--gray-200);
                    }
                    
                    .tab-button {
                        flex: 1;
                        background: transparent;
                        border: none;
                        padding: 1rem 1.5rem;
                        font-weight: 500;
                        color: var(--gray-600);
                        cursor: pointer;
                        transition: all 0.18s ease;
                        border-bottom: 3px solid transparent;
                        position: relative;
                    }
                    
                    .tab-button:hover {
                        background: var(--gray-100);
                        color: var(--gray-800);
                    }
                    
                    .tab-button.active {
                        background: var(--white);
                        color: var(--primary-blue);
                        border-bottom-color: var(--primary-blue);
                        font-weight: 600;
                    }
                    
                    .tab-button:focus {
                        outline: none;
                        box-shadow: inset 0 0 0 2px rgba(25, 118, 210, 0.3);
                    }
                    
                    .tab-content {
                        display: none;
                        padding: 1.5rem;
                    }
                    
                    .tab-content.active {
                        display: block;
                    }
                    
                    /* Form Groups */
                    .input-group {
                        display: flex;
                        gap: 0.5rem;
                        align-items: end;
                        margin-bottom: 1rem;
                    }
                    
                    .input-group input, 
                    .input-group select {
                        flex: 1;
                        margin-bottom: 0;
                    }
                    
                    .input-group button {
                        margin: 0;
                    }
                    
                    .input-group label {
                        display: flex;
                        flex-direction: column;
                        font-weight: 500;
                        margin-bottom: 0.25rem;
                    }
                    
                    .form-group {
                        margin-bottom: 1rem;
                    }
                    
                    /* Notes Feed */
                    .notes-feed {
                        border-left: 3px solid var(--primary-blue);
                        padding-left: 1.5rem;
                        margin: 1.5rem 0;
                        min-height: 200px;
                        position: relative;
                        list-style: none;
                        padding: 0;
                        margin: 0;
                    }
                    
                    .notes-feed li,
                    .note-item {
                        background: var(--white);
                        border-radius: 0.375rem;
                        padding: 1rem;
                        margin-bottom: 1rem;
                        box-shadow: var(--shadow-sm);
                        border-bottom: 1px solid var(--gray-200);
                        transition: all 0.18s ease;
                        position: relative;
                    }
                    
                    .notes-feed li:hover,
                    .note-item:hover {
                        box-shadow: var(--shadow-md);
                        transform: translateY(-1px);
                    }
                    
                    .note-content {
                        margin-bottom: 0.75rem;
                        line-height: 1.6;
                        word-break: break-word;
                        color: var(--gray-800);
                        white-space: pre-wrap;
                    }
                    
                    .note-timestamp {
                        font-size: 0.75rem;
                        color: var(--gray-500);
                        margin-bottom: 0.5rem;
                        display: block;
                    }
                    
                    /* Pattern Tables */
                    .pattern-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 1rem;
                        border-radius: 0.375rem;
                        overflow: hidden;
                        box-shadow: var(--shadow-sm);
                    }
                    
                    .pattern-table th, 
                    .pattern-table td {
                        padding: 0.75rem;
                        text-align: left;
                        border-bottom: 1px solid var(--gray-200);
                    }
                    
                    .pattern-table th {
                        background: var(--gray-50);
                        font-weight: 600;
                        color: var(--gray-800);
                        text-transform: uppercase;
                        font-size: 0.75rem;
                        letter-spacing: 0.05em;
                    }
                    
                    .pattern-table tbody tr {
                        transition: background-color 0.18s ease;
                    }
                    
                    .pattern-table tbody tr:hover {
                        background: var(--gray-50);
                    }
                    
                    .pattern-table td {
                        color: var(--gray-700);
                        font-family: var(--font-family-mono);
                    }
                    
                    .pattern-result {
                        background: var(--gray-50);
                        border: 2px solid var(--gray-200);
                        border-radius: 0.375rem;
                        padding: 1rem;
                        font-family: var(--font-family-mono);
                        font-size: 1.125rem;
                        font-weight: 600;
                        text-align: center;
                        min-height: 60px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 1rem 0;
                        transition: all 0.18s ease;
                    }
                    
                    /* Dark theme support */
                    [data-theme="dark"] {
                        --bg-color: var(--dark-bg);
                        --text-color: var(--dark-text);
                        --border-color: var(--dark-border);
                    }
                    
                    [data-theme="dark"] body {
                        background: var(--dark-bg);
                        color: var(--dark-text);
                    }
                    
                    [data-theme="dark"] h1,
                    [data-theme="dark"] h2,
                    [data-theme="dark"] h3,
                    [data-theme="dark"] h4,
                    [data-theme="dark"] h5,
                    [data-theme="dark"] h6 {
                        color: var(--dark-text);
                    }
                    
                    [data-theme="dark"] .section-content {
                        background: var(--dark-surface);
                        border-color: var(--dark-border);
                        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                    }
                    
                    [data-theme="dark"] input,
                    [data-theme="dark"] textarea,
                    [data-theme="dark"] select {
                        background: var(--dark-bg);
                        border-color: var(--dark-border);
                        color: var(--dark-text);
                    }
                    
                    [data-theme="dark"] input:focus,
                    [data-theme="dark"] textarea:focus,
                    [data-theme="dark"] select:focus {
                        border-color: var(--primary-blue-light);
                        box-shadow: 0 0 0 3px rgba(66, 165, 245, 0.2);
                    }
                    
                    [data-theme="dark"] input::placeholder,
                    [data-theme="dark"] textarea::placeholder {
                        color: var(--dark-text-muted);
                    }
                    
                    [data-theme="dark"] input:disabled,
                    [data-theme="dark"] textarea:disabled,
                    [data-theme="dark"] select:disabled {
                        background: var(--dark-border);
                        color: var(--dark-text-muted);
                    }
                    
                    [data-theme="dark"] label {
                        color: var(--dark-text);
                    }
                    
                    [data-theme="dark"] .tab-container {
                        background: var(--dark-surface);
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
                    }
                    
                    [data-theme="dark"] .tab-header {
                        background: var(--dark-bg);
                        border-bottom-color: var(--dark-border);
                    }
                    
                    [data-theme="dark"] .tab-button {
                        color: var(--dark-text-muted);
                    }
                    
                    [data-theme="dark"] .tab-button:hover {
                        background: var(--dark-border);
                        color: var(--dark-text);
                    }
                    
                    [data-theme="dark"] .tab-button.active {
                        background: var(--dark-surface);
                        color: var(--primary-blue-light);
                        border-bottom-color: var(--primary-blue-light);
                    }
                    
                    [data-theme="dark"] .notes-feed li,
                    [data-theme="dark"] .note-item {
                        background: var(--dark-bg);
                        border-color: var(--dark-border);
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
                    }
                    
                    [data-theme="dark"] .note-content {
                        color: var(--dark-text);
                    }
                    
                    [data-theme="dark"] .note-timestamp {
                        color: var(--dark-text-muted);
                    }
                    
                    [data-theme="dark"] .pattern-table {
                        background: var(--dark-surface);
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
                    }
                    
                    [data-theme="dark"] .pattern-table th {
                        background: var(--dark-bg);
                        color: var(--dark-text);
                        border-color: var(--dark-border);
                    }
                    
                    [data-theme="dark"] .pattern-table td {
                        color: var(--dark-text);
                        border-color: var(--dark-border);
                    }
                    
                    [data-theme="dark"] .pattern-table tbody tr:hover {
                        background: var(--dark-bg);
                    }
                    
                    [data-theme="dark"] .pattern-result {
                        background: var(--dark-bg);
                        border-color: var(--dark-border);
                        color: var(--dark-text);
                    }
                    
                    /* Responsive Design */
                    @media (max-width: 768px) {
                        body {
                            padding: 12px;
                        }
                        
                        .section-content {
                            padding: 16px;
                        }
                        
                        h1 {
                            font-size: 1.5rem;
                        }
                        
                        .input-group {
                            flex-direction: column;
                            align-items: stretch;
                        }
                        
                        .tab-header {
                            flex-direction: column;
                        }
                    }
                </style>
            </head>
            <body>
                <h1>${sectionTitle}</h1>
                <div class="section-content">
                    ${updatedContent}
                </div>
                
                <script>
                    // Communication with parent window
                    if (window.opener) {
                        // Proxy common functions to parent
                        window.addNote = function(text, instanceId) {
                            if (window.opener.addNote) {
                                window.opener.addNote(text, instanceId);
                            }
                        };
                        
                        window.toggleStep = function(index) {
                            if (window.opener.toggleStep) {
                                window.opener.toggleStep(index);
                            }
                        };
                        
                        // Pattern formatting proxy
                        if (window.opener.patternsModule) {
                            window.patternsModule = window.opener.patternsModule;
                        }
                        
                        // Update parent when window closes
                        window.addEventListener('beforeunload', function() {
                            if (window.opener && window.opener.floatingManager) {
                                window.opener.floatingManager.closeBrowserWindow('${sectionId}');
                            }
                        });
                        
                        // Re-attach event handlers after DOM loads
                        document.addEventListener('DOMContentLoaded', function() {
                            // Attach pattern event listeners if this is a pattern formatter
                            if ('${sectionId}'.includes('pattern') && window.opener.patternsModule) {
                                try {
                                    window.opener.patternsModule.attachPatternEventListeners(document);
                                } catch (e) {
                                    console.warn('Could not attach pattern listeners:', e);
                                }
                            }
                            
                            // Handle tab switching
                            document.querySelectorAll('.tab-button').forEach(btn => {
                                btn.addEventListener('click', function() {
                                    const tabId = this.getAttribute('data-pattern-tab') || this.getAttribute('data-callflow-tab');
                                    if (tabId) {
                                        document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
                                        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                                        this.classList.add('active');
                                        const content = document.getElementById(tabId) || document.querySelector('[id$="-' + tabId + '"]');
                                        if (content) content.classList.add('active');
                                    }
                                });
                            });
                        });
                    }
                </script>
            </body>
            </html>
        `;

    // Open new window with proper features
    const appSettings = window.appSettings || {};
    const windowFeatures = [
      `width=${appSettings?.popupWidth || 600}`,
      `height=${appSettings?.popupHeight || 400}`,

      'scrollbars=yes',
      'resizable=yes',
      'location=no',
      'menubar=no',
      'toolbar=no',
      'status=no',
      'left=100',
      'top=100',
    ].join(',');

    console.log(
      '🌐 [DEBUG] Opening browser window with features:',
      windowFeatures
    );
    console.log('🌐 [DEBUG] window.open parameters:', {
      url: 'about:blank',
      name: `${sectionId}-popup-${Date.now()}`,
      features: windowFeatures,
    });

    // Try to open the window
    const newWindow = window.open(
      'about:blank',
      `${sectionId}-popup-${Date.now()}`,
      windowFeatures
    );
    console.log('🌐 [DEBUG] window.open result:', newWindow);

    if (newWindow) {
      console.log('Browser window opened successfully');

      // Write the HTML content
      newWindow.document.open();
      newWindow.document.write(windowHtml);
      newWindow.document.close();

      // Focus the new window
      newWindow.focus();

      // Store reference and hide original
      this.browserWindows.set(sectionId, newWindow);
      section.style.display = 'none';

      // Update UI to show it's popped out
      this.addPoppedOutIndicator(sectionId, 'Browser Window');

      // Monitor window closure
      const checkClosed = setInterval(() => {
        if (newWindow.closed) {
          clearInterval(checkClosed);
          this.closeBrowserWindow(sectionId);
        }
      }, 1000);

      return newWindow;
    } else {
      console.warn(
        'Failed to open browser window - popup blocked or not supported'
      );
      // Fallback to floating window if popup is blocked
      console.log('Falling back to floating window');
      return this.createFloatingWindow(sectionId);
    }
  }

  createFloatingWindow(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return null;

    // Create floating window (existing logic)
    const clonedSection = section.cloneNode(true);
    clonedSection.id = `floating-${sectionId}`;
    clonedSection.classList.add('floating-window');
    clonedSection.style.position = 'fixed';
    clonedSection.style.left = '100px';
    clonedSection.style.top = '100px';
    clonedSection.style.width = '500px';
    clonedSection.style.zIndex = '1000';
    clonedSection.style.background = '#fff';
    clonedSection.style.borderRadius = '8px';
    clonedSection.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
    clonedSection.style.border = '1px solid #ccc';

    document.body.appendChild(clonedSection);
    this.floatingWindows.set(sectionId, clonedSection);
    section.style.display = 'none';
    this.addPoppedOutIndicator(sectionId, 'Floating');
    this.setupWindowControls(sectionId, clonedSection);
    this.makeWindowDraggable(clonedSection);

    return clonedSection;
  }

  closeBrowserWindow(sectionId) {
    const browserWindow = this.browserWindows.get(sectionId);
    if (browserWindow && !browserWindow.closed) {
      browserWindow.close();
    }

    this.browserWindows.delete(sectionId);

    const section = document.getElementById(sectionId);
    if (section) {
      section.style.display = '';
      this.removePoppedOutIndicator(sectionId);
    }
  }

  dockSection(sectionId) {
    const floatingWindow = this.floatingWindows.get(sectionId);
    const browserWindow = this.browserWindows.get(sectionId);

    if (floatingWindow) {
      const section = document.getElementById(sectionId);
      if (section) {
        section.style.display = '';
        this.removePoppedOutIndicator(sectionId);
      }

      floatingWindow.remove();
      this.floatingWindows.delete(sectionId);
    }

    if (browserWindow) {
      this.closeBrowserWindow(sectionId);
    }
  }

  addPoppedOutIndicator(sectionId, text = 'Popped Out') {
    const section = document.getElementById(sectionId);
    if (!section) return;

    section.classList.add('popped-out');
    if (!section.querySelector('.popped-out-indicator')) {
      const indicator = document.createElement('span');
      indicator.className = 'popped-out-indicator';
      indicator.title = text;
      indicator.textContent = text;
      indicator.style.marginLeft = '8px';
      indicator.style.fontSize = '0.85em';
      indicator.style.color = '#1976d2';

      const header =
        section.querySelector('.section-header .title-container') ||
        section.querySelector('.section-header');
      if (header) {
        header.appendChild(indicator);
      }
    }
  }

  removePoppedOutIndicator(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return;

    section.classList.remove('popped-out');
    const indicator = section.querySelector('.popped-out-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  setupWindowControls(sectionId, window) {
    const dockBtn = window.querySelector('.dock-btn');
    const closeBtn = window.querySelector('.close-btn');
    const minimizeBtn = window.querySelector('.minimize-btn');

    if (dockBtn) {
      dockBtn.addEventListener('click', () => this.dockSection(sectionId));
    }
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.dockSection(sectionId));
    }
    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', () => {
        const fw = this.floatingWindows.get(sectionId);
        if (!fw) return;
        if (fw.classList.contains('minimized')) {
          fw.classList.remove('minimized');
          const content = fw.querySelector('.floating-content');
          if (content) content.style.display = '';
          minimizeBtn.textContent = '−';
          minimizeBtn.title = 'Minimize';
        } else {
          fw.classList.add('minimized');
          const content = fw.querySelector('.floating-content');
          if (content) content.style.display = 'none';
          minimizeBtn.textContent = '+';
          minimizeBtn.title = 'Restore';
        }
      });
    }
  }

  makeWindowDraggable(window) {
    const header =
      window.querySelector('.section-header') ||
      window.querySelector('.floating-header');
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;

    if (header) {
      header.addEventListener('mousedown', (e) => {
        isDragging = true;
        initialX = e.clientX - window.offsetLeft;
        initialY = e.clientY - window.offsetTop;
      });
    }

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;

      window.style.left = `${currentX}px`;
      window.style.top = `${currentY}px`;
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }
}

// Global floating window manager instance
let floatingManager = null;

// Initialize the manager
export function getFloatingManager() {
  if (!floatingManager) {
    floatingManager = new FloatingWindowManager();
    // Make it globally accessible for browser windows
    window.floatingManager = floatingManager;
  }
  return floatingManager;
}

// Setup floating functionality for all float buttons
export function setupAllFloating() {
  const manager = getFloatingManager();
  const floatButtons = document.querySelectorAll('.float-btn');

  floatButtons.forEach((btn) => {
    // Skip if already set up
    if (btn.hasAttribute('data-float-setup')) return;

    btn.setAttribute('data-float-setup', 'true');

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();

      // Find the parent section
      const section = this.closest('.draggable-section');
      if (!section) {
        return;
      }

      const sectionId = section.id;

      // Check if Ctrl/Cmd key is held to force browser window
      const forceBrowserWindow = e.ctrlKey || e.metaKey;

      manager.floatSection(sectionId, forceBrowserWindow);
    });
  });
}

// Update your initialization code to periodically check for new sections
export function initFloating() {
  // Initialize the floating manager
  getFloatingManager();

  setupAllFloating();

  // Periodically check for new floating buttons
  setInterval(setupAllFloating, 2000);
}

// Export the instance getter for external use
export { getFloatingManager as getManager };

// Auto-initialize when module is loaded
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFloating);
  } else {
    initFloating();
  }
}
