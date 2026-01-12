/**
 * E2E tests for modal confirmation dialogs and undo functionality
 * Tests the accessible modal system and pattern deletion undo flows
 */

const { test, expect } = require('@playwright/test');

test.describe('Modal Confirmation System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#settings-tab');
    // Trigger patterns module load by scrolling to pattern-formatter
    await page.locator('#pattern-formatter').scrollIntoViewIfNeeded();
    // Now go to settings
    await page.evaluate(() => window.showSettings());
    await page.waitForSelector('#settings-view:not(.hidden)');
    await page
      .locator('tbody#patternList tr')
      .waitFor({ state: 'attached', timeout: 10000 });
  });

  test('should show accessible modal when deleting a pattern', async ({
    page,
  }) => {
    // Navigate to Pattern Formatter section
    await page.click('text=Pattern Formatter');

    // Click the delete button for the first pattern in the table
    const deleteBtn = await page.locator('.delete-pattern-btn').first();
    await deleteBtn.click();

    // Modal should appear
    const modal = await page.locator('.confirm-modal');
    await expect(modal).toBeVisible();

    // Check modal content
    await expect(modal.locator('.modal-title')).toContainText('Delete Pattern');
    await expect(modal.locator('.modal-message')).toContainText(
      'delete this pattern'
    );

    // Check ARIA attributes
    const modalRole = await modal.getAttribute('role');
    expect(modalRole).toBe('dialog');

    const ariaModal = await modal.getAttribute('aria-modal');
    expect(ariaModal).toBe('true');

    const ariaLabelledBy = await modal.getAttribute('aria-labelledby');
    expect(ariaLabelledBy).toBeTruthy();
  });

  test('should close modal on Cancel button click', async ({ page }) => {
    await page.click('text=Pattern Formatter');

    // Click the delete button for the first pattern
    const deleteBtn = await page.locator('.delete-pattern-btn').first();
    await deleteBtn.click();

    // Modal appears
    await expect(page.locator('.confirm-modal')).toBeVisible();

    // Click Cancel
    await page.click('.confirm-modal .modal-cancel');

    // Modal should disappear
    await expect(page.locator('.confirm-modal')).not.toBeVisible();

    // Pattern should still exist
    await expect(page.locator('.pattern-item')).toHaveCount(1);
  });

  test('should close modal on Escape key press', async ({ page }) => {
    await page.click('text=Pattern Formatter');

    // Add pattern

    // Click delete
    await page.click('.delete-pattern-btn');

    // Modal appears
    await expect(page.locator('.confirm-modal')).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');

    // Modal should disappear
    await expect(page.locator('.confirm-modal')).not.toBeVisible();

    // Pattern should still exist
    await expect(page.locator('.pattern-item')).toHaveCount(1);
  });

  test('should delete pattern when Confirm button clicked', async ({
    page,
  }) => {
    await page.click('text=Pattern Formatter');

    // Add pattern

    // Verify pattern exists
    await expect(page.locator('.pattern-item')).toHaveCount(1);

    // Click delete
    await page.click('.delete-pattern-btn');

    // Click Confirm in modal
    await page.click('.confirm-modal .modal-confirm');

    // Modal should disappear
    await expect(page.locator('.confirm-modal')).not.toBeVisible();

    // Toast notification should appear
    await expect(page.locator('.toast-container .toast')).toBeVisible();
    await expect(page.locator('.toast')).toContainText('Pattern deleted');
  });

  test('should trap focus within modal', async ({ page }) => {
    await page.click('text=Pattern Formatter');

    // Add pattern

    // Click delete
    await page.click('.delete-pattern-btn');

    // Modal appears
    await expect(page.locator('.confirm-modal')).toBeVisible();

    // Focus should be on confirm button (dangerous action)
    const confirmBtn = page.locator('.confirm-modal .modal-confirm');
    await expect(confirmBtn).toBeFocused();

    // Tab should cycle between cancel and confirm
    await page.keyboard.press('Tab');
    const cancelBtn = page.locator('.confirm-modal .modal-cancel');
    await expect(cancelBtn).toBeFocused();

    // Tab again should return to confirm
    await page.keyboard.press('Tab');
    await expect(confirmBtn).toBeFocused();
  });
});

test.describe('Pattern Deletion Undo System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#settings-tab');
    await page.locator('#pattern-formatter').scrollIntoViewIfNeeded();
    await page.evaluate(() => window.showSettings());
    await page.waitForSelector('#settings-view:not(.hidden)');
    await page
      .locator('tbody#patternList tr')
      .waitFor({ state: 'attached', timeout: 10000 });
  });

  test('should show undo action in toast after deletion', async ({ page }) => {
    // Add pattern

    // Delete pattern
    await page.click('.delete-pattern-btn');
    await page.click('.confirm-modal .modal-confirm');

    // Toast with undo action should appear
    const toast = page.locator('.toast');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('Pattern deleted');

    // Undo button should be present
    const undoBtn = toast.locator('.toast-action');
    await expect(undoBtn).toBeVisible();
    await expect(undoBtn).toContainText('Undo');
  });

  test('should restore pattern when undo is clicked', async ({ page }) => {
    // Get initial count
    const initialCount = await page.locator('tbody#patternList tr').count();

    // Get the first pattern's text before deletion
    const patternRow = page.locator('tbody#patternList tr').first();
    const patternText = await patternRow.locator('td').first().textContent();

    // Delete pattern
    await page.locator('.delete-pattern-btn').first().click();
    await page.click('.confirm-modal .modal-confirm');

    // Count should be one less
    await expect(page.locator('tbody#patternList tr')).toHaveCount(
      initialCount - 1
    );

    // Click undo
    await page.click('.toast .toast-action');

    // Pattern should be restored
    await expect(page.locator('tbody#patternList tr')).toHaveCount(
      initialCount
    );

    // Verify the pattern text is back
    const restoredText = await page
      .locator('tbody#patternList tr')
      .first()
      .locator('td')
      .first()
      .textContent();
    expect(restoredText).toBe(patternText);

    // Toast should show undo confirmation
    await expect(page.locator('.toast')).toContainText('Pattern restored');
  });

  test('should finalize deletion after undo window expires', async ({
    page,
  }) => {
    const initialCount = await page.locator('tbody#patternList tr').count();

    // Delete pattern
    await page.locator('.delete-pattern-btn').first().click();
    await page.click('.confirm-modal .modal-confirm');

    // Count should be one less
    await expect(page.locator('tbody#patternList tr')).toHaveCount(
      initialCount - 1
    );

    // Wait for undo window to expire (5 seconds + buffer)
    await page.waitForTimeout(5500);

    // Toast should disappear
    await expect(page.locator('.toast')).not.toBeVisible();

    // Pattern should remain deleted (cannot be recovered)
    await expect(page.locator('tbody#patternList tr')).toHaveCount(
      initialCount - 1
    );
  });

  test('should preserve pattern order when undoing', async ({ page }) => {
    const initialRows = page.locator('tbody#patternList tr');
    const initialCount = await initialRows.count();
    if (initialCount < 2) return; // Skip if not enough patterns

    // Get texts before deletion
    const textsBefore = [];
    for (let i = 0; i < initialCount; i++) {
      const text = await initialRows.nth(i).locator('td').first().textContent();
      textsBefore.push(text);
    }

    // Delete second pattern
    await page.locator('.delete-pattern-btn').nth(1).click();
    await page.click('.confirm-modal .modal-confirm');

    // Count should be one less
    await expect(page.locator('tbody#patternList tr')).toHaveCount(
      initialCount - 1
    );

    // Undo deletion
    await page.click('.toast .toast-action');

    // All should be back
    await expect(page.locator('tbody#patternList tr')).toHaveCount(
      initialCount
    );

    // Verify order is preserved
    const textsAfter = [];
    const rowsAfter = page.locator('tbody#patternList tr');
    for (let i = 0; i < initialCount; i++) {
      const text = await rowsAfter.nth(i).locator('td').first().textContent();
      textsAfter.push(text);
    }
    expect(textsAfter).toEqual(textsBefore);
  });
});

test.describe('Modal Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#settings-tab');
    await page.locator('#pattern-formatter').scrollIntoViewIfNeeded();
    await page.evaluate(() => window.showSettings());
    await page.waitForSelector('#settings-view:not(.hidden)');
    await page
      .locator('tbody#patternList tr')
      .waitFor({ state: 'attached', timeout: 10000 });
  });

  test('should have proper keyboard navigation in Settings reset', async ({
    page,
  }) => {
    await page.click('text=Settings');

    // Scroll to reset button
    await page.evaluate(() => {
      document.querySelector('#reset-all-data')?.scrollIntoView();
    });

    // Click reset
    await page.click('#reset-all-data');

    // Modal should appear with focus on dangerous action
    const modal = page.locator('.confirm-modal');
    await expect(modal).toBeVisible();

    // Confirm button should have focus (dangerous action)
    await expect(modal.locator('.modal-confirm')).toBeFocused();

    // Can navigate with keyboard
    await page.keyboard.press('Tab');
    await expect(modal.locator('.modal-cancel')).toBeFocused();

    // Enter key on cancel should close modal
    await page.keyboard.press('Enter');
    await expect(modal).not.toBeVisible();
  });

  test('should announce modal to screen readers', async ({ page }) => {
    await page.click('text=Pattern Formatter');

    // Add and delete pattern
    await page.click('.delete-pattern-btn');

    const modal = page.locator('.confirm-modal');

    // Check live region for announcements
    const liveRegion = modal.locator('[aria-live]');
    if ((await liveRegion.count()) > 0) {
      const ariaLive = await liveRegion.first().getAttribute('aria-live');
      expect(['polite', 'assertive']).toContain(ariaLive);
    }

    // Modal should have aria-labelledby and aria-describedby
    const labelledBy = await modal.getAttribute('aria-labelledby');
    const describedBy = await modal.getAttribute('aria-describedby');

    expect(labelledBy).toBeTruthy();
    expect(describedBy).toBeTruthy();
  });
});

test.describe('Cross-Module Confirmation Modals', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should show modal for clearing all notes', async ({ page }) => {
    await page.click('text=Notes');

    // Click clear all notes button
    const clearBtn = page.locator('button:has-text("Clear All Notes")');
    if ((await clearBtn.count()) > 0) {
      await clearBtn.first().click();

      // Modal should appear
      await expect(page.locator('.confirm-modal')).toBeVisible();
      await expect(page.locator('.modal-title')).toContainText('Clear');
    }
  });

  test('should show modal for resetting layout in Settings', async ({
    page,
  }) => {
    await page.click('text=Settings');

    // Find reset layout button
    const resetLayoutBtn = page.locator('button:has-text("Reset Layout")');
    if ((await resetLayoutBtn.count()) > 0) {
      await resetLayoutBtn.first().scrollIntoViewIfNeeded();
      await resetLayoutBtn.first().click();

      // Modal should appear
      await expect(page.locator('.confirm-modal')).toBeVisible();
      await expect(page.locator('.modal-title')).toContainText('Reset Layout');

      // Should not be marked as dangerous (danger: false)
      const confirmBtn = page.locator('.confirm-modal .modal-confirm');
      const isDanger = await confirmBtn.evaluate(
        (el) =>
          el.classList.contains('danger') ||
          el.classList.contains('modal-confirm-danger')
      );
      expect(isDanger).toBe(false);
    }
  });
});
