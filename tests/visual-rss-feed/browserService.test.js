const browserService = require('../services/browserService');

async function testBrowserService() {
    try {
        const articles = await browserService.scrapeArticles(
            'https://news.ycombinator.com',
            '.athing',
            els => els.map(el => el.id)
        );
        console.log('Scraped article IDs:', articles);
    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await browserService.cleanup();
    }
}

testBrowserService();