const axios = require('axios');
const cheerio = require('cheerio');
const { debug } = require('../utils/debug');
const { 
    REQUEST_TIMEOUT, 
    MAX_RETRIES, 
    RETRY_DELAY,
    DEFAULT_IMAGE 
} = require('../config/constants');
const cacheService = require('./cacheService');

class ImageService {
    constructor() {
        this.axiosInstance = axios.create({
            timeout: REQUEST_TIMEOUT,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            },
            maxRedirects: 5,
            validateStatus: status => status < 500
        });
    }

    async getOpenGraphImage(url, retryCount = 0) {
        try {
            const response = await this.axiosInstance.get(url, {
                validateStatus: status => status < 500
            });

            if (response.status === 429) {
                const retryAfter = parseInt(response.headers['retry-after']) || RETRY_DELAY;
                if (retryCount < MAX_RETRIES) {
                    await new Promise(resolve => setTimeout(resolve, retryAfter));
                    return this.getOpenGraphImage(url, retryCount + 1);
                }
                return null;
            }

            const $ = cheerio.load(response.data);
            const possibleImages = [
                $('meta[property="og:image"]').attr('content'),
                $('meta[name="og:image"]').attr('content'),
                $('meta[name="twitter:image"]').attr('content'),
                $('meta[property="twitter:image"]').attr('content'),
                $('meta[property="article:image"]').attr('content'),
                $('link[rel="image_src"]').attr('href'),
                $('meta[name="thumbnail"]').attr('content')
            ].filter(Boolean);

            for (const imageUrl of possibleImages) {
                if (await this.validateImageUrl(imageUrl)) {
                    return imageUrl;
                }
            }

            return null;
        } catch (error) {
            debug(`Error fetching OpenGraph image for ${url}: ${error.message}`);
            return null;
        }
    }

    async getFirstContentImage(url) {
        try {
            const response = await this.axiosInstance.get(url);
            const $ = cheerio.load(response.data);
            
            // Look for images in article or main content areas first
            const contentSelectors = [
                'article img', 
                'main img', 
                '.content img',
                '.post-content img',
                '#content img',
                '.article-content img'
            ];

            for (const selector of contentSelectors) {
                const img = $(selector).first();
                if (img.length) {
                    const src = img.attr('src') || img.attr('data-src');
                    if (src && await this.validateImageUrl(this.resolveUrl(url, src))) {
                        return this.resolveUrl(url, src);
                    }
                }
            }

            // If no content images found, look for any image
            const allImages = $('img').map((_, img) => {
                const src = $(img).attr('src') || $(img).attr('data-src');
                const width = $(img).attr('width');
                const height = $(img).attr('height');
                
                // Skip small images and icons
                if (width && height && (width < 100 || height < 100)) {
                    return null;
                }
                
                return src ? this.resolveUrl(url, src) : null;
            }).get().filter(Boolean);

            for (const imgUrl of allImages) {
                if (await this.validateImageUrl(imgUrl)) {
                    return imgUrl;
                }
            }

            return null;
        } catch (error) {
            debug(`Error extracting content image from ${url}: ${error.message}`);
            return null;
        }
    }

    resolveUrl(base, relative) {
        try {
            return new URL(relative, base).href;
        } catch {
            return relative;
        }
    }

    async validateImageUrl(url) {
        if (!url) return false;
        try {
            const response = await this.axiosInstance.head(url);
            const contentType = response.headers['content-type'];
            return contentType && contentType.startsWith('image/');
        } catch (error) {
            debug(`Image validation failed for ${url}: ${error.message}`);
            return false;
        }
    }

    async getArticleMetadata(url) {
        try {
            const response = await this.axiosInstance.get(url);
            const $ = cheerio.load(response.data);
            
            // Try different meta tags and patterns for author
            const author = 
                $('meta[name="author"]').attr('content') ||
                $('meta[property="article:author"]').attr('content') ||
                $('meta[name="twitter:creator"]').attr('content') ||
                $('a[rel="author"]').first().text() ||
                $('.author').first().text() ||
                $('[itemprop="author"]').first().text() ||
                $('meta[property="og:article:author"]').attr('content') ||
                null;

            // Clean up author string
            const cleanAuthor = author ? author.trim().replace(/^by\s+/i, '') : null;

            // Get OpenGraph image
            const imageUrl = 
                $('meta[property="og:image"]').attr('content') ||
                $('meta[name="twitter:image"]').attr('content');

            return {
                author: cleanAuthor,
                imageUrl: this.resolveUrl(url, imageUrl)
            };
        } catch (error) {
            debug(`Failed to get article metadata for ${url}: ${error.message}`);
            return { author: null, imageUrl: null };
        }
    }

    async getImageForArticle(url) {
        try {
            const cacheKey = `article:${url}`;
            const cached = await cacheService.get(cacheKey, 'metadata');
            
            if (cached) {
                debug(`Cache hit for article metadata: ${url}`);
                return cached;
            }

            debug(`Fetching article metadata: ${url}`);
            const metadata = await this.getArticleMetadata(url);
            
            if (metadata.imageUrl && await this.validateImageUrl(metadata.imageUrl)) {
                await cacheService.set(cacheKey, metadata, 'metadata');
                return metadata;
            }

            // Fallback to other methods if needed
            let imageUrl = await this.getOpenGraphImage(url);
            if (await this.validateImageUrl(imageUrl)) {
                debug(`Found valid OpenGraph image: ${imageUrl}`);
                await cacheService.set(cacheKey, imageUrl, 'image');
                return imageUrl;
            }

            // Try article content second
            imageUrl = await this.getFirstContentImage(url);
            if (await this.validateImageUrl(imageUrl)) {
                debug(`Found valid content image: ${imageUrl}`);
                await cacheService.set(cacheKey, imageUrl, 'image');
                return imageUrl;
            }

            // Try favicon as last resort
            imageUrl = await this.getFavicon(url);
            if (imageUrl) {
                debug(`Using favicon as fallback: ${imageUrl}`);
                await cacheService.set(cacheKey, imageUrl, 'image');
                return imageUrl;
            }

            debug(`No valid image found for ${url}, using default`);
            await cacheService.set(cacheKey, DEFAULT_IMAGE, 'image');
            return DEFAULT_IMAGE;
        } catch (error) {
            debug(`Failed to get image for article: ${error.message}`);
            return { imageUrl: DEFAULT_IMAGE, author: null };
        }
    }

    async getFavicon(url) {
        try {
            const domain = new URL(url).origin;
            const response = await this.axiosInstance.get(`${domain}/favicon.ico`);
            if (response.status === 200 && response.headers['content-type'].startsWith('image/')) {
                return `${domain}/favicon.ico`;
            }
            return null;
        } catch (error) {
            debug(`Error fetching favicon for ${url}: ${error.message}`);
            return null;
        }
    }
}

module.exports = new ImageService();