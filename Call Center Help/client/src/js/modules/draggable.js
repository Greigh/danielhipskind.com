// Draggable sections and floating windows module
import { appSettings } from './settings.js';

export let draggedElement = null;
export let floatingWindows = new Map();

function addPoppedOutIndicator(sectionId, text = 'Popped Out') {
  const section = document.getElementById(sectionId);
  if (!section) return;
  section.classList.add('popped-out');
  if (!section.querySelector('.popped-out-indicator')) {
    const span = document.createElement('span');
    span.className = 'popped-out-indicator';
    span.title = text;
    span.textContent = text;
    span.style.marginLeft = '8px';
    span.style.fontSize = '0.85em';
    span.style.color = '#1976d2';
    const header =
      section.querySelector('.section-header .title-container') ||
      section.querySelector('.section-header');
    if (header) header.appendChild(span);
  }
}

function removePoppedOutIndicator(sectionId) {
  const section = document.getElementById(sectionId);
  if (!section) return;
  section.classList.remove('popped-out');
  const indicator = section.querySelector('.popped-out-indicator');
  if (indicator) indicator.remove();
}

function addDockButton(sectionId) {
  const section = document.getElementById(sectionId);
  if (!section) return;
  if (section.querySelector('.dock-btn')) return;
  const btn = document.createElement('button');
  btn.className = 'dock-btn';
  btn.textContent = 'Dock';
  btn.title = 'Mark as closed / Dock back';
  btn.style.marginLeft = '8px';
  const header =
    section.querySelector('.section-header .title-container') ||
    section.querySelector('.section-header');
  if (header) header.appendChild(btn);
}

function removeDockButton(sectionId) {
  const section = document.getElementById(sectionId);
  if (!section) return;
  const btn = section.querySelector('.dock-btn');
  if (btn) btn.remove();
}

// Delegated handler for dock buttons in case of external tabs
document.addEventListener('click', (e) => {
  const btn = e.target.closest && e.target.closest('.dock-btn');
  if (!btn) return;
  const section = btn.closest('.draggable-section');
  if (!section) return;
  const sectionId = section.id;
  const stored = floatingWindows.get(sectionId);
  // Remove local markers
  floatingWindows.delete(sectionId);
  removePoppedOutIndicator(sectionId);
  removeDockButton(sectionId);
  section.style.display = '';

  // If we have a server popup id, attempt to delete it
  if (stored && stored.popupId) {
    fetch(`/popup/${stored.popupId}`, { method: 'DELETE' }).catch(() => {
      // ignore errors
    });
  }
});

// Helper to POST popup HTML to server. Tries same-origin first, then localhost:8080 as fallback.
// function postPopupHTML(html) {
//   const payload = { html };
//   return fetch('/popup', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(payload),
//   })
//     .then((res) => {
//       if (res.ok) return res.json();
//       // fallback to localhost:8080
//       return fetch('http://localhost:8080/popup', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(payload),
//       }).then((r2) =>
//         r2.ok ? r2.json() : Promise.reject(new Error('Popup POST failed'))
//       );
//     })
//     .catch(() => {
//       // Try fallback host explicitly
//       return fetch('http://localhost:8080/popup', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(payload),
//       }).then((r2) =>
//         r2.ok ? r2.json() : Promise.reject(new Error('Popup POST failed'))
//       );
//     });
// }

export function minimizeSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (!section) return;

  const btn = section.querySelector('.minimize-btn');

  // toggle minimized class and collapse content for accessibility
  section.classList.toggle('minimized');
  const content = section.querySelector('.section-content');

  if (section.classList.contains('minimized')) {
    btn.textContent = '+';
    btn.title = 'Restore';
    if (content) {
      content.style.display = 'none';
      content.setAttribute('aria-hidden', 'true');
    }
    if (btn) btn.setAttribute('aria-expanded', 'false');
  } else {
    btn.textContent = '−';
    btn.title = 'Minimize';
    if (content) {
      content.style.display = '';
      content.setAttribute('aria-hidden', 'false');
    }
    if (btn) btn.setAttribute('aria-expanded', 'true');
  }
}

export function popOutSection(sectionId, enablePopupWindows = false) {
  // Preference: explicit argument wins, otherwise consult appSettings
  const usePopup =
    typeof enablePopupWindows === 'boolean' && enablePopupWindows
      ? true
      : !!(appSettings && appSettings.preferPopupWindows);

  if (usePopup) {
    openSectionInBrowserPopup(sectionId);
  } else {
    openSectionInFloatingWindow(sectionId);
  }
}

export function closeFloatingWindow(sectionId) {
  const floatingWindow = floatingWindows.get(sectionId);
  const section = document.getElementById(sectionId);

  if (floatingWindow) {
    if (floatingWindow.close) {
      floatingWindow.close(); // Browser popup
    } else {
      floatingWindow.remove(); // Floating div
    }
    floatingWindows.delete(sectionId);
  }

  if (section) {
    // Show original section
    section.style.display = '';

    // Reset pop-out button
    const popBtn = section.querySelector('.popup-btn');
    if (popBtn) {
      popBtn.textContent = '⧉';
      popBtn.title = 'Pop Out';
      popBtn.setAttribute('aria-pressed', 'false');
    }
    removePoppedOutIndicator(sectionId);
  }
}

export function minimizeFloatingWindow(sectionId) {
  const floatingWindow = floatingWindows.get(sectionId);
  if (!floatingWindow || floatingWindow.close) return; // Skip if browser popup

  const content = floatingWindow.querySelector('.floating-content');
  const btn = floatingWindow.querySelector(
    '.floating-controls button[title="Minimize"]'
  );

  if (content && btn) {
    if (content.style.display === 'none') {
      // Restore
      content.style.display = '';
      btn.textContent = '−';
      btn.title = 'Minimize';
      floatingWindow.style.height = 'auto';
    } else {
      // Minimize
      content.style.display = 'none';
      btn.textContent = '+';
      btn.title = 'Restore';
      floatingWindow.style.height = '40px';
    }
  }
}

// Update initDragAndDrop function
export function initDragAndDrop() {
  // Initialize drag-and-drop per sortable container so each view (main, settings)
  // can have independent drag behavior.
  const containers = Array.from(
    document.querySelectorAll('.sortable-container')
  );
  if (!containers.length) return;

  containers.forEach((container) => {
    const draggableSections = Array.from(
      container.querySelectorAll('.draggable-section')
    );

    draggableSections.forEach((section) => {
      const dragHandle = section.querySelector('.drag-handle');
      if (!dragHandle) return;

      dragHandle.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return; // Left click only

        draggedElement = section;
        section.classList.add('dragging');

        const rect = section.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        // Store initial position
        const initialX = e.clientX - rect.left;
        const initialY = e.clientY - rect.top;

        function onMouseMove(e) {
          if (!draggedElement) return;

          if (appSettings.layoutMode === 'free') {
            // Free movement mode
            let newX = e.clientX - containerRect.left - initialX;
            let newY = e.clientY - containerRect.top - initialY;

            // Keep within container bounds
            newX = Math.max(
              0,
              Math.min(newX, containerRect.width - section.offsetWidth)
            );
            newY = Math.max(
              0,
              Math.min(newY, containerRect.height - section.offsetHeight)
            );

            section.style.position = 'absolute';
            section.style.left = `${newX}px`;
            section.style.top = `${newY}px`;
          } else {
            // Grid mode - find nearest grid position
            const mouseY = e.clientY - containerRect.top;
            let nextElement = null;

            // We only consider draggable children inside this container
            const children = Array.from(
              container.querySelectorAll('.draggable-section')
            );
            children.forEach((child) => {
              if (child !== draggedElement) {
                const box = child.getBoundingClientRect();
                const childCenter = box.top + box.height / 2;

                if (mouseY < childCenter) {
                  if (
                    !nextElement ||
                    nextElement.getBoundingClientRect().top > box.top
                  ) {
                    nextElement = child;
                  }
                }
              }
            });

            if (nextElement) {
              container.insertBefore(draggedElement, nextElement);
            } else {
              container.appendChild(draggedElement);
            }
          }
        }

        function onMouseUp() {
          if (draggedElement) {
            draggedElement.classList.remove('dragging');
            // Reset positioning to ensure sections stay in document flow
            draggedElement.style.position = '';
            draggedElement.style.left = '';
            draggedElement.style.top = '';
            draggedElement = null;
          }
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);

        e.preventDefault(); // Prevent text selection
      });
    });
  });
}

function makeFloatingWindowDraggable(windowElement) {
  const header = windowElement.querySelector('.floating-header');
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };

  header.addEventListener('mousedown', (e) => {
    isDragging = true;
    const rect = windowElement.getBoundingClientRect();
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;

    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', onDragEnd);
    e.preventDefault();
  });

  function onDrag(e) {
    if (!isDragging) return;

    const x = e.clientX - dragOffset.x;
    const y = e.clientY - dragOffset.y;

    windowElement.style.left = Math.max(0, x) + 'px';
    windowElement.style.top = Math.max(0, y) + 'px';
  }

  function onDragEnd() {
    isDragging = false;
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', onDragEnd);
  }
}

function openSectionInFloatingWindow(sectionId) {
  console.log('DRAGGABLE: openSectionInFloatingWindow called with:', sectionId);
  // Return a Promise that resolves when the floating content has been
  // fully wired (patterns attached). Callers may await this to avoid
  // race conditions where tests or users interact with the clone too
  // early.
  return new Promise((resolve) => {
    console.log('DRAGGABLE: Inside Promise constructor');
    const section = document.getElementById(sectionId);
    const overlay = document.getElementById('floating-overlay');

    if (floatingWindows.has(sectionId)) {
      closeFloatingWindow(sectionId);
      resolve(null);
      return;
    }

    // Hide original section
    section.style.display = 'none';

    // Create floating window
    const floatingWindow = document.createElement('div');
    floatingWindow.className = 'floating-window';
    floatingWindow.style.left = '100px';
    floatingWindow.style.top = '100px';
    floatingWindow.style.width = '500px';

    // Get the correct section title from the section-title element
    const titleElement = section.querySelector('.section-title');
    const sectionTitle = titleElement ? titleElement.textContent : 'Section';

    // Build floating window shell
    floatingWindow.innerHTML = `
            <div class="floating-header">
                <h3>${sectionTitle}</h3>
                <div class="floating-controls">
                    <button data-action="minimize" title="Minimize">−</button>
                    <button data-action="close" class="close-btn" title="Close">×</button>
                </div>
            </div>
            <div class="floating-content"></div>
        `;

    // Copy classes from the original section to the floating window so it receives card styles
    try {
      section.classList.forEach((c) => floatingWindow.classList.add(c));
    } catch {
      /* ignore */
    }

    // Create a deep clone of the original section so it preserves header and full structure
    const wrapper = section.cloneNode(true);
    wrapper.id = `floating-${sectionId}`;

    // Update all IDs in the wrapper to avoid collisions
    wrapper.querySelectorAll('[id]').forEach((element) => {
      const originalId = element.id;
      const newId = `floating-${sectionId}-${originalId}`;
      element.id = newId;

      // Update labels within the wrapper that reference this ID
      const labels = wrapper.querySelectorAll(`label[for="${originalId}"]`);
      labels.forEach((label) => label.setAttribute('for', newId));

      if (element.hasAttribute('name')) {
        element.setAttribute(
          'name',
          `floating-${sectionId}-${element.getAttribute('name')}`
        );
      }
    });

    // Append wrapper so the floating window contains a '.card' like the main page
    floatingWindow.querySelector('.floating-content').appendChild(wrapper);

    // Attach pattern listeners to the wrapper if present. Do a dynamic import
    // and attach after appending so listeners bind to live nodes. Resolve the
    // returned Promise after attach completes (or after a small timeout
    // fallback) so callers can await readiness.
    overlay.appendChild(floatingWindow);

    // Attach event listeners for controls instead of inline onclick
    const minimizeBtn = floatingWindow.querySelector(
      'button[data-action="minimize"]'
    );
    const closeBtn = floatingWindow.querySelector(
      'button[data-action="close"]'
    );
    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', () =>
        minimizeFloatingWindow(sectionId)
      );
    }
    if (closeBtn) {
      closeBtn.addEventListener('click', () => closeFloatingWindow(sectionId));
    }

    // Make floating window draggable
    makeFloatingWindowDraggable(floatingWindow);

    // Store reference
    floatingWindows.set(sectionId, floatingWindow);
    addPoppedOutIndicator(sectionId, 'Floating');

    // Update pop-out button
    const popBtn = section.querySelector('.popup-btn');
    if (popBtn) {
      popBtn.textContent = '⧈';
      popBtn.title = 'Dock';
      popBtn.setAttribute('aria-pressed', 'true');
    }
    // Add popped-out indicator
    section.classList.add('popped-out');
    if (!section.querySelector('.popped-out-indicator')) {
      const span = document.createElement('span');
      span.className = 'popped-out-indicator';
      span.title = 'Floating (in-page)';
      span.textContent = 'Floating';
      span.style.marginLeft = '8px';
      span.style.fontSize = '0.85em';
      span.style.color = '#1976d2';
      const header =
        section.querySelector('.section-header .title-container') ||
        section.querySelector('.section-header');
      if (header) header.appendChild(span);
    }

    // Attach patterns asynchronously and resolve when done
    (async () => {
      try {
        console.log('DRAGGABLE: Starting pattern attachment for', sectionId);
        const mod = window.patternsModule || (await import('./patterns.js'));
        if (mod && typeof mod.attachPatternEventListeners === 'function') {
          console.log('DRAGGABLE: Calling attachPatternEventListeners');
          mod.attachPatternEventListeners(wrapper);
          window.patternsModule = mod;
          wrapper.setAttribute('data-patterns-attached', 'true');
          console.log(
            'DRAGGABLE: Patterns attached successfully, resolving promise'
          );
          resolve(floatingWindow);
        } else {
          console.log(
            'DRAGGABLE: Patterns module not available, resolving anyway'
          );
          resolve(floatingWindow);
        }
      } catch (err) {
        console.log('DRAGGABLE: Pattern attach failed:', err);
        resolve(floatingWindow);
      }
    })();
  });
}

function openSectionInBrowserPopup(sectionId) {
  const section = document.getElementById(sectionId);

  if (floatingWindows.has(sectionId)) {
    // Close existing popup
    const existingWindow = floatingWindows.get(sectionId);
    if (existingWindow && !existingWindow.closed) {
      existingWindow.close();
    }
    floatingWindows.delete(sectionId);
    section.style.display = '';

    // Reset pop-out button
    const popBtn = section.querySelector('.popup-btn');
    if (popBtn) {
      popBtn.textContent = '⧉';
      popBtn.title = 'Pop Out';
    }
    return;
  }

  // Hide original section
  section.style.display = 'none';

  // Get the correct section title from the section-title element
  const titleElement = section.querySelector('.section-title');
  const sectionTitle = titleElement ? titleElement.textContent : 'Section';
  // Modify content before putting it in the popup to make IDs unique
  const sectionContent = section.querySelector('.section-content').innerHTML;

  // Replace form IDs with popup-specific ones
  let modifiedContent = sectionContent.replace(/id="([^"]+)"/g, (match, id) => {
    return `id="popup-${sectionId}-${id}"`;
  });

  // Fix references to those IDs (like labels)
  modifiedContent = modifiedContent.replace(/for="([^"]+)"/g, (match, id) => {
    return `for="popup-${sectionId}-${id}"`;
  });

  // Create popup window HTML
  const popupHTML = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${sectionTitle} - Call Center Helper</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    background: #f7f9fa;
                    margin: 0;
                    padding: 20px;
                    color: #222;
                }
                
                .section-content {
                    background: #fff;
                    border-radius: 8px;
                    padding: 20px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
                
                h1 {
                    color: #1976d2;
                    margin-top: 0;
                    text-align: center;
                    border-bottom: 2px solid #e3f2fd;
                    padding-bottom: 10px;
                }
                
                .button, button {
                    background: linear-gradient(90deg, #3498db 60%, #1976d2 100%);
                    color: #fff;
                    border: none;
                    border-radius: 5px;
                    padding: 9px 20px;
                    font-size: 1em;
                    font-weight: 500;
                    cursor: pointer;
                    transition: background 0.18s;
                }
                
                .button:hover, button:hover {
                    background: linear-gradient(90deg, #1976d2 60%, #3498db 100%);
                }
                
                /* Add styles for form elements */
                input, textarea, select {
                    width: 100%;
                    padding: 8px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    margin-bottom: 10px;
                    box-sizing: border-box;
                }
                
                label {
                    display: block;
                    margin-bottom: 5px;
                    font-weight: 500;
                }
            </style>
        </head>
        <body>
            <h1>${sectionTitle}</h1>
            <div class="section-content">
                ${modifiedContent}
            </div>
            
            <script>
                // Create proxy functions to communicate with parent window
                window.toggleStep = function(index) {
                    window.opener.toggleStep(index);
                };
                
                window.clearCheckmarks = function() {
                    window.opener.clearCheckmarks();
                };
                
                // Add other function proxies as needed
                
                // Fix any event handlers that were broken by ID changes
                document.addEventListener('DOMContentLoaded', function() {
                    // Re-attach event handlers for elements with modified IDs
                    const buttons = document.querySelectorAll('button[id^="popup-"]');
                    buttons.forEach(btn => {
                        if (btn.id.includes('add-note-btn')) {
                            btn.addEventListener('click', function() {
                                const textareaId = btn.id.replace('add-note-btn', 'notes-input');
                                const textarea = document.getElementById(textareaId);
                                if (textarea && textarea.value.trim()) {
                                    // Implement functionality directly or call back to parent
                                    window.opener.addNote(textarea.value.trim(), '${sectionId}');
                                    textarea.value = '';
                                }
                            });
                        }
                        
                        // Add more handlers as needed
                    });
                });
            </script>
        </body>
        </html>
    `;

  // Open popup window
  const features = [
    'width=600',
    'height=400',
    'scrollbars=yes',
    'resizable=yes',
    'location=no',
    'menubar=no',
    'toolbar=no',
    'status=no',
  ];

  // Try to open a real popup window
  let popup = null;
  try {
    popup = window.open('', `${sectionId}-popup`, features.join(','));
  } catch {
    popup = null;
  }

  if (popup) {
    // Instead of writing directly into the blank popup, prefer creating a
    // server-served URL for larger content. POST popupHTML to the server
    // and open the returned URL.
    fetch('/popup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html: popupHTML }),
    })
      .then((res) => res.json())
      .then((data) => {
        const url = data && data.url ? data.url : null;
        const popupId = data && data.id ? data.id : null;
        if (!url) {
          // Fall back to writing into popup
          popup.document.write(popupHTML);
          popup.document.close();
          floatingWindows.set(sectionId, popup);
          addPoppedOutIndicator(sectionId, 'Popup');
          const popBtn = section.querySelector('.popup-btn');
          if (popBtn) {
            popBtn.textContent = '⧈';
            popBtn.title = 'Close Popup';
          }
          return;
        }

        // Try to open the server URL in the popup window
        try {
          popup.location.href = url;
          floatingWindows.set(sectionId, popup);
          addPoppedOutIndicator(sectionId, 'Popup');

          const popBtn = section.querySelector('.popup-btn');
          if (popBtn) {
            popBtn.textContent = '⧈';
            popBtn.title = 'Close Popup';
          }

          // Monitor popup close
          const checkClosed = setInterval(() => {
            if (popup.closed) {
              clearInterval(checkClosed);
              floatingWindows.delete(sectionId);
              section.style.display = '';

              const popBtn = section.querySelector('.popup-btn');
              if (popBtn) {
                popBtn.textContent = '⧉';
                popBtn.title = 'Pop Out';
              }
            }
          }, 1000);
        } catch {
          // If for some reason we can't assign the location, fallback to anchor
          const a = document.createElement('a');
          a.href = url;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          a.remove();

          floatingWindows.set(sectionId, { externalTab: true, url, popupId });
          addPoppedOutIndicator(sectionId, 'New Tab');
          addDockButton(sectionId);
          const popBtn = section.querySelector('.popup-btn');
          if (popBtn) {
            popBtn.textContent = '⧈';
            popBtn.title = 'Opened in New Tab';
          }
        }
      })
      .catch(() => {
        // If POST fails, write into popup directly as a fallback
        popup.document.write(popupHTML);
        popup.document.close();
        floatingWindows.set(sectionId, popup);
      });
  } else {
    // Popup was blocked — try to POST HTML to server and open returned URL in new tab
    fetch('/popup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html: popupHTML }),
    })
      .then((res) => res.json())
      .then((data) => {
        const url = data && data.url ? data.url : null;
        const popupId = data && data.id ? data.id : null;
        if (!url) {
          // Last resort: open as data URI
          const dataUrl =
            'data:text/html;charset=utf-8,' + encodeURIComponent(popupHTML);
          const a = document.createElement('a');
          a.href = dataUrl;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          a.remove();

          floatingWindows.set(sectionId, { externalTab: true, popupId });
          addPoppedOutIndicator(sectionId, 'New Tab');
          addDockButton(sectionId);
          const popBtn = section.querySelector('.popup-btn');
          if (popBtn) {
            popBtn.textContent = '⧈';
            popBtn.title = 'Opened in New Tab';
          }
          return;
        }

        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        a.remove();

        floatingWindows.set(sectionId, { externalTab: true, url, popupId });
        addPoppedOutIndicator(sectionId, 'New Tab');
        addDockButton(sectionId);
        const popBtn = section.querySelector('.popup-btn');
        if (popBtn) {
          popBtn.textContent = '⧈';
          popBtn.title = 'Opened in New Tab';
        }
      })
      .catch(() => {
        // As a last resort, fall back to floating DIV
        openSectionInFloatingWindow(sectionId);
      });
  }
}

// Export these functions so they can be imported elsewhere
export { openSectionInFloatingWindow, openSectionInBrowserPopup };

// Add these utility functions to set up dragging for dynamic elements

// Set up draggable functionality for a single section
export function setupDraggable(section) {
  if (!section) return;

  const handle = section.querySelector('.drag-handle');
  if (!handle) return;

  let isDragging = false;
  let initialX, initialY, initialTop, initialLeft;

  handle.addEventListener('mousedown', function (e) {
    // Only process if left button is pressed
    if (e.button !== 0) return;

    e.preventDefault();

    // Start drag
    isDragging = true;
    initialX = e.clientX;
    initialY = e.clientY;

    // Get current position
    const rect = section.getBoundingClientRect();
    initialTop = rect.top;
    initialLeft = rect.left;

    // Add dragging class
    section.classList.add('dragging');

    // Create global event listeners
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });

  function onMouseMove(e) {
    if (!isDragging) return;

    const deltaX = e.clientX - initialX;
    const deltaY = e.clientY - initialY;

    section.style.position = 'absolute';
    section.style.top = `${initialTop + deltaY}px`;
    section.style.left = `${initialLeft + deltaX}px`;
  }

  function onMouseUp() {
    isDragging = false;
    section.classList.remove('dragging');

    // Reset positioning to ensure sections stay in document flow
    section.style.position = '';
    section.style.left = '';
    section.style.top = '';

    // Remove event listeners
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }
}

// Set up floating functionality for a single section
export function setupFloating(section) {
  if (!section) return;

  const floatBtn = section.querySelector('.float-btn');
  if (!floatBtn) return;

  // ensure accessible pressed state
  floatBtn.setAttribute('aria-pressed', 'false');
  floatBtn.addEventListener('click', function () {
    const sectionId = section.id;

    // Check if we're using the browser popup approach
    if (window.config && window.config.useBrowserPopup) {
      window.openSectionInBrowserPopup(sectionId);
      floatBtn.setAttribute('aria-pressed', 'true');
    } else {
      window.openSectionInFloatingWindow(sectionId);
      floatBtn.setAttribute('aria-pressed', 'true');
    }
  });
}

// Set up section toggle (minimize/maximize)
export function setupSectionToggle(section) {
  if (!section) return;

  const minBtn = section.querySelector('.minimize-btn');
  const content = section.querySelector('.section-content');
  if (!minBtn) return;

  // set initial accessibility state
  if (content)
    content.setAttribute(
      'aria-hidden',
      content.style.display === 'none' ? 'true' : 'false'
    );
  if (minBtn)
    minBtn.setAttribute(
      'aria-expanded',
      content && content.style.display !== 'none' ? 'true' : 'false'
    );

  minBtn.addEventListener('click', function () {
    const content = section.querySelector('.section-content');
    if (!content) return;

    if (content.style.display === 'none') {
      content.style.display = '';
      minBtn.textContent = '−';
      minBtn.title = 'Minimize';
      content.setAttribute('aria-hidden', 'false');
      minBtn.setAttribute('aria-expanded', 'true');
    } else {
      content.style.display = 'none';
      minBtn.textContent = '+';
      minBtn.title = 'Maximize';
      content.setAttribute('aria-hidden', 'true');
      minBtn.setAttribute('aria-expanded', 'false');
    }
  });
}

// Initialize draggable sections
// Expose these functions to the global window so inline handlers (and popups)
// can call them even if modules haven't attached globals yet.
if (typeof window !== 'undefined') {
  // Only assign if not already set to avoid overwriting existing implementations
  if (typeof window.closeFloatingWindow !== 'function')
    window.closeFloatingWindow = closeFloatingWindow;
  if (typeof window.minimizeFloatingWindow !== 'function')
    window.minimizeFloatingWindow = minimizeFloatingWindow;
  if (typeof window.openSectionInFloatingWindow !== 'function')
    window.openSectionInFloatingWindow = openSectionInFloatingWindow;
  if (typeof window.openSectionInBrowserPopup !== 'function')
    window.openSectionInBrowserPopup = openSectionInBrowserPopup;
}

initDragAndDrop();
