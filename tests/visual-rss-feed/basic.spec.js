const { test, expect } = require('@playwright/test');

test('basic test', async ({ page }) => {
    // Navigate to your local server
    await page.goto('/');

    // Verify that the page loads
    await expect(page).toHaveTitle(/HackerNews/);

    // Check for main elements
    await expect(page.locator('h1')).toContainText('HackerNews Articles');

    // Verify article list exists
    await expect(page.locator('#articleList')).toBeVisible();

    // Check if at least one article loads
    await expect(page.locator('.articles article')).toHaveCount(1, { minimum: true });
});