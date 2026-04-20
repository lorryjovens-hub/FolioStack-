import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import puppeteer from 'puppeteer';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3003;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

const cloneTasks = new Map();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'dummy-key'
});

const userAgents = {
    chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
    safari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    mobile: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
};

app.post('/api/clone/start', async (req, res) => {
    try {
        const config = req.body;
        const cloneId = uuidv4();
        
        cloneTasks.set(cloneId, {
            id: cloneId,
            config,
            status: 'pending',
            progress: 0,
            message: '正在初始化...',
            stats: { pages: 0, images: 0, videos: 0, files: 0 },
            result: null,
            startedAt: new Date()
        });

        res.json({
            cloneId,
            message: '爬取任务已启动'
        });

        startCrawling(cloneId);

    } catch (error) {
        console.error('Start clone error:', error);
        res.status(500).json({ error: '启动失败' });
    }
});

app.get('/api/clone/progress/:cloneId', (req, res) => {
    const { cloneId } = req.params;
    const task = cloneTasks.get(cloneId);
    
    if (!task) {
        return res.status(404).json({ error: '任务不存在' });
    }

    res.json({
        status: task.status,
        progress: task.progress,
        message: task.message,
        stats: task.stats
    });
});

app.get('/api/clone/result/:cloneId', (req, res) => {
    const { cloneId } = req.params;
    const task = cloneTasks.get(cloneId);
    
    if (!task) {
        return res.status(404).json({ error: '任务不存在' });
    }

    if (task.status !== 'completed') {
        return res.status(400).json({ error: '任务未完成' });
    }

    res.json({
        cloneId,
        html: task.result.html,
        stats: task.stats
    });
});

app.post('/api/clone/stop/:cloneId', (req, res) => {
    const { cloneId } = req.params;
    const task = cloneTasks.get(cloneId);
    
    if (!task) {
        return res.status(404).json({ error: '任务不存在' });
    }

    task.status = 'stopped';
    task.message = '爬取已停止';
    
    res.json({ message: '爬取已停止' });
});

app.post('/api/clone/transform', async (req, res) => {
    try {
        const { html, instructions } = req.body;
        
        if (!html || !instructions) {
            return res.status(400).json({ error: '缺少必要参数' });
        }

        let transformedHtml = html;
        
        try {
            if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'dummy-key') {
                const prompt = `请根据以下指令修改HTML内容。只返回修改后的HTML，不要包含任何解释。

指令: ${instructions}

原始HTML:
${html}`;

                const response = await openai.chat.completions.create({
                    model: 'gpt-4o',
                    messages: [
                        { role: 'system', content: '你是一个专业的网页设计师，擅长修改HTML和CSS。' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.7
                });

                const aiHtml = response.choices[0].message.content;
                if (aiHtml && aiHtml.includes('<!DOCTYPE')) {
                    transformedHtml = aiHtml;
                }
            } else {
                transformedHtml = applyBasicTransformations(html, instructions);
            }
        } catch (aiError) {
            console.error('AI transformation error:', aiError);
            transformedHtml = applyBasicTransformations(html, instructions);
        }

        res.json({ html: transformedHtml });

    } catch (error) {
        console.error('Transform error:', error);
        res.status(500).json({ error: '转换失败' });
    }
});

function applyBasicTransformations(html, instructions) {
    let result = html;
    
    const lowerInstructions = instructions.toLowerCase();
    
    if (lowerInstructions.includes('公司') && lowerInstructions.includes('我的')) {
        result = result.replace(/公司名称|Company Name|公司/g, '我的公司');
    }
    
    if (lowerInstructions.includes('金色') || lowerInstructions.includes('champagne') || lowerInstructions.includes('#c9a96e')) {
        result = result.replace(/#3b82f6|#4a90e2|blue|蓝色/g, '#c9a96e');
    }
    
    if (lowerInstructions.includes('联系方式') || lowerInstructions.includes('邮箱')) {
        result = result.replace(/contact@example\.com|info@company\.com/g, 'myemail@example.com');
    }
    
    return result;
}

app.post('/api/clone/save', async (req, res) => {
    try {
        const { html, cloneId, title } = req.body;
        const userId = 'user123';
        const siteId = 'site_' + Date.now();
        const subRoute = `${userId}/${siteId}`;
        
        const sitesDir = path.join(__dirname, 'sites', userId);
        await fs.mkdir(sitesDir, { recursive: true });
        
        const sitePath = path.join(sitesDir, `${siteId}.html`);
        await fs.writeFile(sitePath, html, 'utf8');
        
        const fullUrl = `http://localhost:3003/sites/${subRoute}`;
        
        res.json({
            siteId,
            subRoute,
            fullUrl,
            message: '保存成功'
        });

    } catch (error) {
        console.error('Save error:', error);
        res.status(500).json({ error: '保存失败' });
    }
});

app.get('/sites/:userId/:siteId', async (req, res) => {
    try {
        const { userId, siteId } = req.params;
        const sitePath = path.join(__dirname, 'sites', userId, `${siteId}.html`);
        
        const html = await fs.readFile(sitePath, 'utf8');
        res.send(html);
        
    } catch (error) {
        console.error('Load site error:', error);
        res.status(404).send('网站不存在');
    }
});

async function startCrawling(cloneId) {
    const task = cloneTasks.get(cloneId);
    if (!task) return;

    try {
        task.status = 'crawling';
        task.message = '正在连接目标网站...';
        task.progress = 5;

        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setUserAgent(task.config.userAgent || userAgents.chrome);
        await page.setDefaultTimeout(task.config.timeout * 1000 || 30000);

        task.message = '正在加载页面...';
        task.progress = 10;

        const response = await page.goto(task.config.url, { waitUntil: 'networkidle2' });
        
        task.message = '正在分析页面结构...';
        task.progress = 20;

        const html = await page.content();
        const $ = cheerio.load(html);
        
        task.message = '正在提取资源...';
        task.progress = 30;

        const images = [];
        $('img').each((i, img) => {
            const src = $(img).attr('src');
            if (src) images.push(src);
        });
        task.stats.images = images.length;
        
        const videos = [];
        $('video, source').each((i, el) => {
            const src = $(el).attr('src');
            if (src) videos.push(src);
        });
        task.stats.videos = videos.length;
        
        task.stats.pages = 1;
        task.stats.files = images.length + videos.length + 1;
        
        task.message = '正在处理资源...';
        task.progress = 60;

        if (task.config.crawlImages || task.config.crawlVideos) {
            await downloadResources(task.config.url, images, videos, task);
        }

        task.progress = 80;
        task.message = '正在完善HTML...';

        const baseUrl = new URL(task.config.url);
        const processedHtml = makeResourcesAbsolute(html, baseUrl);

        await browser.close();

        task.progress = 100;
        task.message = '爬取完成！';
        task.status = 'completed';
        task.result = {
            html: processedHtml,
            images,
            videos
        };

    } catch (error) {
        console.error('Crawling error:', error);
        task.status = 'error';
        task.message = '爬取失败: ' + error.message;
        
        task.result = {
            html: generateFallbackHtml(task.config.url, error.message)
        };
        task.progress = 100;
    }
}

async function downloadResources(baseUrl, images, videos, task) {
    try {
        const downloadPromises = [];
        
        for (let i = 0; i < images.length && i < 5; i++) {
            downloadPromises.push(downloadResource(images[i], baseUrl));
            task.progress = 30 + (i * 3);
        }
        
        for (let i = 0; i < videos.length && i < 2; i++) {
            downloadPromises.push(downloadResource(videos[i], baseUrl));
            task.progress = 45 + (i * 5);
        }
        
        await Promise.all(downloadPromises);
        
    } catch (error) {
        console.error('Resource download error:', error);
    }
}

async function downloadResource(url, baseUrl) {
    try {
        const absoluteUrl = new URL(url, baseUrl).href;
        await axios.get(absoluteUrl, { responseType: 'arraybuffer', timeout: 10000 });
        return true;
    } catch {
        return false;
    }
}

function makeResourcesAbsolute(html, baseUrl) {
    const $ = cheerio.load(html);
    
    $('img, script, link, video, source, audio').each((i, el) => {
        const src = $(el).attr('src');
        const href = $(el).attr('href');
        
        if (src && !src.startsWith('http') && !src.startsWith('data:')) {
            try {
                $(el).attr('src', new URL(src, baseUrl).href);
            } catch {}
        }
        
        if (href && !href.startsWith('http') && !href.startsWith('data:')) {
            try {
                $(el).attr('href', new URL(href, baseUrl).href);
            } catch {}
        }
    });
    
    return $.html();
}

function generateFallbackHtml(url, error) {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>克隆网站 - ${url}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
            color: #f5f5f5;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px;
        }
        .container {
            max-width: 800px;
            background: rgba(20, 20, 20, 0.95);
            border: 1px solid rgba(201, 169, 110, 0.2);
            border-radius: 12px;
            padding: 48px;
            text-align: center;
        }
        h1 {
            color: #c9a96e;
            font-size: 2rem;
            margin-bottom: 24px;
        }
        .info-box {
            background: rgba(201, 169, 110, 0.1);
            border: 1px solid rgba(201, 169, 110, 0.3);
            border-radius: 8px;
            padding: 24px;
            margin: 24px 0;
            text-align: left;
        }
        .info-item {
            margin-bottom: 12px;
            display: flex;
            gap: 8px;
        }
        .info-label {
            font-weight: 600;
            color: #c9a96e;
            min-width: 100px;
        }
        .info-value {
            color: #ccc;
            word-break: break-all;
        }
        .note {
            color: #888;
            margin-top: 24px;
            font-size: 0.9rem;
            line-height: 1.6;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>网站克隆已创建</h1>
        <div class="info-box">
            <div class="info-item">
                <span class="info-label">原始网站:</span>
                <span class="info-value">${url}</span>
            </div>
            <div class="info-item">
                <span class="info-label">克隆时间:</span>
                <span class="info-value">${new Date().toLocaleString()}</span>
            </div>
            <div class="info-item">
                <span class="info-label">状态:</span>
                <span class="info-value">等待AI改造</span>
            </div>
        </div>
        <p class="note">
            由于技术限制，我们创建了一个模板页面。您可以通过右侧的AI对话框告诉我们如何改造这个网站，
            比如替换文字、修改颜色、添加内容等。我们的AI会根据您的要求生成全新的网站。
        </p>
    </div>
</body>
</html>`;
}

app.listen(PORT, () => {
    console.log(`Clone server running on http://localhost:${PORT}`);
    console.log('Available endpoints:');
    console.log('  POST /api/clone/start - 启动网站克隆');
    console.log('  GET /api/clone/progress/:cloneId - 获取克隆进度');
    console.log('  GET /api/clone/result/:cloneId - 获取克隆结果');
    console.log('  POST /api/clone/stop/:cloneId - 停止克隆');
    console.log('  POST /api/clone/transform - AI改造HTML');
    console.log('  POST /api/clone/save - 保存网站');
});
