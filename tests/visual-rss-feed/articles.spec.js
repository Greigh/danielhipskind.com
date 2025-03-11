const { test, expect } = require('@playwright/test');

test.describe('Article Page Tests', () => {
    test.beforeAll(async () => {
        // Ensure server is ready
        await new Promise(resolve => setTimeout(resolve, 2000));
    });

    test.beforeEach(async ({ page }) => {
        // Add error handler
        page.on('pageerror', exception => {
            console.error(`Page error: ${exception.message}`);
        });

        // Add console logging
        page.on('console', msg => {
            console.log(`Browser console: ${msg.text()}`);
        });
    });

    test('homepage loads with articles', async ({ page }) => {
        // Add retry logic
        await test.step('Navigate to homepage', async () => {
            try {
                const response = await page.goto('http://localhost:3002', {
                    waitUntil: 'networkidle',
                    timeout: 30000
                });
                expect(response.status()).toBe(200);
            } catch (error) {
                console.error('Navigation failed:', error);
                throw error;
            }
        });

        // Check if articles are loaded
        await expect(page.locator('#articleList'), 'Article list should be visible')
            .toBeVisible({ timeout: 10000 });

        await expect(page.locator('#articleList li'), 'Should have 30 articles')
            .toHaveCount(30, { timeout: 10000 });
    });

    test('pagination works', async ({ page }) => {
        await page.goto('http://localhost:3002'); // Updated port

        // Click next page
        await page.click('#nextPage');
        await expect(page.locator('#currentPage')).toHaveText('2');
    });
});