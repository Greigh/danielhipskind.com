const { chromium } = require('playwright');
const { debug } = require('../utils/debug');
const { ARTICLE_LIMIT, REQUEST_TIMEOUT } = require('../config/constants');
const { formatTime } = require('../utils/formatters');

class BrowserService {
    constructor() {
        this.browser = null;
    }

    async getBrowser() {
        if (!this.browser) {
            debug('Launching new browser instance');
            this.browser = await chromium.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu'
                ]
            });
            debug('Browser instance launched successfully');
        }
        return this.browser;
    }

    async fetchTopArticles(page = 1, limit = ARTICLE_LIMIT) {
        const browser = await this.getBrowser();
        const context = await browser.newContext();
        const browserPage = await context.newPage();
        const allArticles = [];

        try {
            await browserPage.goto(`https://news.ycombinator.com/?p=${page}`, 
                { waitUntil: 'networkidle', timeout: REQUEST_TIMEOUT }
            );
            
            const articles = await browserPage.$$eval('.athing', 
                (elements, startRank) => elements.map((el, index) => {
                    const rank = startRank + index;
                    const titleEl = el.querySelector('.titleline > a');
                    const subtext = el.nextElementSibling;
                    const scoreEl = subtext?.querySelector('.score');
                    const timeEl = subtext?.querySelector('.age');
                    const authorEl = subtext?.querySelector('.hnuser');
                    const siteEl = el.querySelector('.sitestr');
                    
                    return {
                        rank,
                        id: el.id,
                        title: titleEl?.textContent || 'No title',
                        link: titleEl?.href || '#',
                        score: scoreEl?.textContent || 'No score',
                        time: timeEl?.getAttribute('title') || 'No time',
                        author: authorEl?.textContent || (siteEl?.textContent || 'Unknown'),
                        isWebsite: !authorEl && siteEl
                    };
                }), (page - 1) * 30 + 1
            );

            allArticles.push(...articles);
            return articles.map(article => ({
                ...article,
                formattedTime: formatTime(article.time)
            }));
        } finally {
            await context.close();
        }
    }

    async fetchArticles(url, limit = ARTICLE_LIMIT) {
        const browser = await this.getBrowser();
        const context = await browser.newContext();
        const page = await context.newPage();
        const allArticles = [];

        try {
            let currentPage = 1;
            while (allArticles.length < limit) {
                const pageUrl = `${url}?p=${currentPage}`;
                await page.goto(pageUrl, { 
                    waitUntil: 'networkidle', 
                    timeout: REQUEST_TIMEOUT 
                });

                const pageArticles = await page.$$eval('.athing', 
                    elements => elements.map(el => {
                        const titleEl = el.querySelector('.titleline > a');
                        const subtext = el.nextElementSibling;
                        return {
                            id: el.id,
                            title: titleEl?.textContent || 'No title',
                            link: titleEl?.href || '#',
                            score: subtext?.querySelector('.score')?.textContent || 'No score',
                            time: subtext?.querySelector('.age')?.getAttribute('title') || 'No time',
                            hnAuthor: subtext?.querySelector('.hnuser')?.textContent || null,
                            isWebsite: !subtext?.querySelector('.hnuser') && el.querySelector('.sitestr'),
                            siteName: el.querySelector('.sitestr')?.textContent || null
                        };
                    })
                );

                allArticles.push(...pageArticles);
                if (pageArticles.length === 0) break;
                currentPage++;
            }

            return allArticles.slice(0, limit);
        } finally {
            await context.close();
        }
    }

    async scrapeArticles(url, type = 'newest') {
        debug(`Scraping ${type} articles from ${url}`);
        const browser = await this.getBrowser();
        const context = await browser.newContext();
        const page = await context.newPage();

        try {
            await page.goto(url, { 
                waitUntil: 'networkidle',
                timeout: REQUEST_TIMEOUT 
            });
            
            const articles = await page.$$eval('.athing', elements => 
                elements.map(el => {
                    const titleEl = el.querySelector('.titleline > a');
                    const subtext = el.nextElementSibling;
                    const scoreEl = subtext?.querySelector('.score');
                    const authorEl = subtext?.querySelector('.hnuser');
                    const timeEl = subtext?.querySelector('.age');
                    const siteEl = el.querySelector('.sitestr');

                    return {
                        id: el.id,
                        title: titleEl?.textContent || 'No title',
                        link: titleEl?.href || '#',
                        time: timeEl?.getAttribute('title') || 'No time',
                        author: authorEl?.textContent || 'Unknown',
                        score: scoreEl?.textContent || '0 points',
                        isWebsite: !authorEl && siteEl,
                        siteName: siteEl?.textContent || null
                    };
                })
            );

            debug(`Found ${articles.length} articles`);
            
            const processedArticles = articles
                .slice(0, ARTICLE_LIMIT)
                .map(article => ({
                    ...article,
                    formattedTime: formatTime(article.time),
                    score: parseInt(article.score) || 0
                }))
                .filter(article => article.title && article.link !== '#');

            debug(`Processed ${processedArticles.length} valid articles`);
            return processedArticles;
        } catch (error) {
            debug(`Error scraping articles: ${error.message}`);
            return [];
        } finally {
            await context.close();
        }
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            debug('Browser closed and cleaned up');
        }
    }
}

module.exports = new BrowserService();