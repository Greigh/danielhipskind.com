/**
 * Utility script to detect and fix duplicate form field IDs on page load
 */
export function detectAndFixDuplicateFormIds() {
  // Store all IDs we've seen to detect duplicates
  const idMap = new Map();

  // Process all forms on the page
  document.querySelectorAll('form').forEach((form, formIndex) => {
    // Process all form fields with IDs
    form.querySelectorAll('input, select, textarea').forEach((field) => {
      const id = field.id;
      if (!id) return; // Skip fields without IDs

      if (!idMap.has(id)) {
        // First time seeing this ID - record it
        idMap.set(id, { count: 1, firstField: field });
      } else {
        // Duplicate found! Fix it
        const info = idMap.get(id);
        info.count++;

        // Create a new unique ID
        const formName = form.id || form.name || `form-${formIndex}`;
        const newId = `${formName}-${id}-${info.count}`;
        console.log(`Fixed duplicate ID: '${id}' changed to '${newId}'`);

        // Update the ID
        field.id = newId;

        // Also update any label that points to this field
        const correspondingLabel = form.querySelector(`label[for="${id}"]`);
        if (correspondingLabel) {
          correspondingLabel.setAttribute('for', newId);
        }
      }
    });
  });

  return idMap;
}
