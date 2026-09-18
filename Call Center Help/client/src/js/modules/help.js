// Help and Tooltips Module
// Provides contextual help and tooltips

export function initializeHelp() {
  setupTooltips();
  setupHelpSystem();
}

function setupTooltips() {
  // Add tooltips to elements with data-tooltip
  document.querySelectorAll('[data-tooltip]').forEach((el) => {
    el.addEventListener('mouseenter', showTooltip);
    el.addEventListener('mouseleave', hideTooltip);
  });
}

function showTooltip(event) {
  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip';
  tooltip.textContent = event.target.dataset.tooltip;
  document.body.appendChild(tooltip);

  const rect = event.target.getBoundingClientRect();
  tooltip.style.left = rect.left + 'px';
  tooltip.style.top = rect.top - 30 + 'px';
}

function hideTooltip() {
  const tooltip = document.querySelector('.tooltip');
  if (tooltip) tooltip.remove();
}

function setupHelpSystem() {
  // Add help button, show help modal
}
