import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import axios from 'axios';
import { URL } from 'url';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

class AdvancedWebCrawler {
    constructor(options = {}) {
        this.options = {
            concurrency: options.concurrency || 5,
            depth: options.depth || 2,
            timeout: options.timeout || 30000,
            userAgent: options.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            followRedirects: options.followRedirects !== false,
            respectRobotsTxt: options.respectRobotsTxt !== false,
            saveAssets: options.saveAssets !== false,
            headless: options.headless !== false
        };
        
        this.visited = new Set();
        this.queue = [];
        this.results = new Map();
        this.stats = {
            pages: 0,
            images: 0,
            videos: 0,
            css: 0,
            js: 0,
            fonts: 0,
            totalFiles: 0
        };
        this.activeTasks = 0;
        this.browser = null;
        this.stopped = false;
    }

    async start(url, outputDir) {
        this.baseUrl = new URL(url);
        this.outputDir = outputDir;
        
        await fs.mkdir(outputDir, { recursive: true });
        
        this.browser = await puppeteer.launch({
            headless: this.options.headless ? 'new' : false,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        this.queue.push({ url, depth: 0 });
        
        await this.processQueue();
        
        await this.browser.close();
        
        return {
            success: true,
            stats: this.stats,
            pages: Array.from(this.results.keys())
        };
    }

    stop() {
        this.stopped = true;
    }

    async processQueue() {
        while (this.queue.length > 0 && !this.stopped) {
            if (this.activeTasks >= this.options.concurrency) {
                await new Promise(resolve => setTimeout(resolve, 100));
                continue;
            }

            const task = this.queue.shift();
            if (!task || this.visited.has(task.url)) continue;

            this.activeTasks++;
            this.visited.add(task.url);

            this.crawlPage(task.url, task.depth)
                .finally(() => {
                    this.activeTasks--;
                });
        }

        while (this.activeTasks > 0 && !this.stopped) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    async crawlPage(url, depth) {
        try {
            const page = await this.browser.newPage();
            await page.setUserAgent(this.options.userAgent);
            await page.setDefaultTimeout(this.options.timeout);

            const response = await page.goto(url, { 
                waitUntil: 'networkidle2',
                timeout: this.options.timeout
            });

            const html = await page.content();
            const $ = cheerio.load(html);

            const pageData = {
                url,
                depth,
                html,
                status: response.status(),
                headers: response.headers(),
                assets: {
                    images: [],
                    videos: [],
                    css: [],
                    js: [],
                    fonts: []
                },
                links: []
            };

            $('img[src]').each((i, el) => {
                const src = $(el).attr('src');
                const fullUrl = this.resolveUrl(src);
                if (fullUrl) {
                    pageData.assets.images.push(fullUrl);
                    this.stats.images++;
                }
            });

            $('video[src], source[src]').each((i, el) => {
                const src = $(el).attr('src');
                const fullUrl = this.resolveUrl(src);
                if (fullUrl) {
                    pageData.assets.videos.push(fullUrl);
                    this.stats.videos++;
                }
            });

            $('link[rel="stylesheet"][href]').each((i, el) => {
                const href = $(el).attr('href');
                const fullUrl = this.resolveUrl(href);
                if (fullUrl) {
                    pageData.assets.css.push(fullUrl);
                    this.stats.css++;
                }
            });

            $('script[src]').each((i, el) => {
                const src = $(el).attr('src');
                const fullUrl = this.resolveUrl(src);
                if (fullUrl) {
                    pageData.assets.js.push(fullUrl);
                    this.stats.js++;
                }
            });

            $('link[rel*="font"], link[href*="font"]').each((i, el) => {
                const href = $(el).attr('href');
                const fullUrl = this.resolveUrl(href);
                if (fullUrl) {
                    pageData.assets.fonts.push(fullUrl);
                    this.stats.fonts++;
                }
            });

            if (depth < this.options.depth) {
                $('a[href]').each((i, el) => {
                    const href = $(el).attr('href');
                    const fullUrl = this.resolveUrl(href);
                    if (fullUrl && this.isSameDomain(fullUrl) && !this.visited.has(fullUrl)) {
                        pageData.links.push(fullUrl);
                        this.queue.push({ url: fullUrl, depth: depth + 1 });
                    }
                });
            }

            this.results.set(url, pageData);
            this.stats.pages++;
            this.stats.totalFiles = this.stats.images + this.stats.videos + this.stats.css + this.stats.js + this.stats.fonts + this.stats.pages;

            if (this.options.saveAssets) {
                await this.savePageAndAssets(pageData);
            }

            await page.close();

            return pageData;

        } catch (error) {
            console.error(`Error crawling ${url}:`, error.message);
            return null;
        }
    }

    async savePageAndAssets(pageData) {
        try {
            const relativePath = this.getRelativePath(pageData.url);
            const pagePath = path.join(this.outputDir, relativePath);
            const pageDir = path.dirname(pagePath);

            await fs.mkdir(pageDir, { recursive: true });

            let processedHtml = pageData.html;

            const allAssets = [
                ...pageData.assets.images,
                ...pageData.assets.css,
                ...pageData.assets.js,
                ...pageData.assets.fonts
            ];

            for (const assetUrl of allAssets) {
                try {
                    const assetPath = await this.downloadAsset(assetUrl);
                    if (assetPath) {
                        const relativeAssetPath = path.relative(pageDir, assetPath);
                        processedHtml = processedHtml.replace(
                            new RegExp(assetUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
                            relativeAssetPath.replace(/\\/g, '/')
                        );
                    }
                } catch (e) {
                }
            }

            await fs.writeFile(pagePath, processedHtml, 'utf8');

        } catch (error) {
            console.error('Error saving page:', error);
        }
    }

    async downloadAsset(url) {
        try {
            const relativePath = this.getRelativePath(url);
            const assetPath = path.join(this.outputDir, relativePath);
            const assetDir = path.dirname(assetPath);

            if (await this.fileExists(assetPath)) {
                return assetPath;
            }

            await fs.mkdir(assetDir, { recursive: true });

            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: this.options.timeout,
                headers: {
                    'User-Agent': this.options.userAgent
                }
            });

            await fs.writeFile(assetPath, response.data);

            return assetPath;

        } catch (error) {
            return null;
        }
    }

    resolveUrl(href) {
        try {
            if (!href || href.startsWith('data:') || href.startsWith('javascript:')) {
                return null;
            }
            return new URL(href, this.baseUrl).href;
        } catch {
            return null;
        }
    }

    isSameDomain(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname === this.baseUrl.hostname;
        } catch {
            return false;
        }
    }

    getRelativePath(url) {
        try {
            const urlObj = new URL(url);
            let pathname = urlObj.pathname;
            
            if (pathname === '/' || pathname === '') {
                return 'index.html';
            }
            
            if (!pathname.includes('.')) {
                pathname = pathname.endsWith('/') ? pathname + 'index.html' : pathname + '/index.html';
            }
            
            return pathname.startsWith('/') ? pathname.substring(1) : pathname;
        } catch {
            return `page_${uuidv4().substring(0, 8)}.html`;
        }
    }

    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    getProgress() {
        const total = this.visited.size + this.queue.length;
        const progress = total > 0 ? Math.round((this.visited.size / total) * 100) : 0;
        
        return {
            visited: this.visited.size,
            queued: this.queue.length,
            progress,
            stats: { ...this.stats },
            status: this.stopped ? 'stopped' : 'crawling'
        };
    }

    getResults() {
        return {
            pages: Array.from(this.results.values()),
            stats: { ...this.stats }
        };
    }

    getIndexHtml() {
        const indexPage = this.results.get(this.baseUrl.href);
        return indexPage ? indexPage.html : null;
    }
}

export { AdvancedWebCrawler };
