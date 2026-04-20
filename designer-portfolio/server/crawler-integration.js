import { AdvancedWebCrawler } from './advanced-crawler.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const advancedCrawlTasks = new Map();

export function setupAdvancedCrawler(app, clonedSitesDir, authenticate) {
    
    app.post('/api/clone/advanced-start', async (req, res) => {
        try {
            const { 
                url, 
                concurrency = 5, 
                depth = 2, 
                timeout = 30,
                userAgent,
                followRedirects = true,
                respectRobotsTxt = true,
                saveAssets = true,
                headless = true
            } = req.body;
            
            if (!url) {
                return res.status(400).json({ error: '缺少网站URL' });
            }

            try {
                new URL(url);
            } catch {
                return res.status(400).json({ error: '无效的URL格式' });
            }

            const cloneId = uuidv4();
            const cloneDir = join(clonedSitesDir, cloneId);
            
            const crawler = new AdvancedWebCrawler({
                concurrency,
                depth,
                timeout: timeout * 1000,
                userAgent: userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                followRedirects,
                respectRobotsTxt,
                saveAssets,
                headless
            });

            advancedCrawlTasks.set(cloneId, {
                crawler,
                status: 'starting',
                startTime: new Date(),
                cloneDir
            });

            res.json({ 
                success: true, 
                cloneId,
                message: '高级爬取任务已开始'
            });

            runAdvancedCrawl(crawler, url, cloneDir, cloneId);

        } catch (error) {
            console.error('Advanced clone start error:', error);
            res.status(500).json({ error: '启动高级爬取失败: ' + error.message });
        }
    });

    app.get('/api/clone/advanced-progress/:cloneId', async (req, res) => {
        try {
            const { cloneId } = req.params;
            const task = advancedCrawlTasks.get(cloneId);
            
            if (!task) {
                return res.status(404).json({ error: '未找到高级爬取任务' });
            }

            const progress = task.crawler.getProgress();
            
            res.json({
                status: task.status,
                progress: progress.progress,
                message: getStatusMessage(task.status, progress),
                stats: {
                    pages: progress.stats.pages,
                    images: progress.stats.images,
                    videos: progress.stats.videos,
                    css: progress.stats.css,
                    js: progress.stats.js,
                    fonts: progress.stats.fonts,
                    files: progress.stats.totalFiles
                },
                visited: progress.visited,
                queued: progress.queued
            });
        } catch (error) {
            console.error('Get advanced progress error:', error);
            res.status(500).json({ error: '获取进度失败' });
        }
    });

    app.post('/api/clone/advanced-stop/:cloneId', async (req, res) => {
        try {
            const { cloneId } = req.params;
            const task = advancedCrawlTasks.get(cloneId);
            
            if (!task) {
                return res.status(404).json({ error: '未找到高级爬取任务' });
            }

            task.crawler.stop();
            task.status = 'stopped';
            
            res.json({ success: true, message: '高级爬取已停止' });
        } catch (error) {
            console.error('Stop advanced crawl error:', error);
            res.status(500).json({ error: '停止失败' });
        }
    });

    app.get('/api/clone/advanced-result/:cloneId', async (req, res) => {
        try {
            const { cloneId } = req.params;
            const task = advancedCrawlTasks.get(cloneId);
            
            if (!task) {
                return res.status(404).json({ error: '未找到高级爬取任务' });
            }

            if (task.status !== 'completed') {
                return res.status(400).json({ error: '任务未完成' });
            }

            const results = task.crawler.getResults();
            const indexHtml = task.crawler.getIndexHtml();

            res.json({
                success: true,
                cloneId,
                html: indexHtml || '',
                results: {
                    pages: results.pages.length,
                    stats: results.stats
                },
                stats: {
                    pages: results.stats.pages,
                    images: results.stats.images,
                    videos: results.stats.videos,
                    files: results.stats.totalFiles
                }
            });
        } catch (error) {
            console.error('Get advanced result error:', error);
            res.status(500).json({ error: '获取结果失败' });
        }
    });
}

async function runAdvancedCrawl(crawler, url, cloneDir, cloneId) {
    const task = advancedCrawlTasks.get(cloneId);
    if (!task) return;

    try {
        task.status = 'crawling';
        
        const result = await crawler.start(url, cloneDir);
        
        if (crawler.stopped) {
            task.status = 'stopped';
        } else {
            task.status = 'completed';
        }
        
        task.result = result;
        
    } catch (error) {
        console.error('Advanced crawl error:', error);
        task.status = 'error';
        task.error = error.message;
    }
}

function getStatusMessage(status, progress) {
    switch (status) {
        case 'starting':
            return '正在初始化爬虫...';
        case 'crawling':
            return `正在爬取 (已访问 ${progress.visited} 页，队列 ${progress.queued} 页)`;
        case 'completed':
            return '爬取完成！';
        case 'stopped':
            return '爬取已停止';
        case 'error':
            return '爬取出错';
        default:
            return '准备中...';
    }
}

export async function transformWithGlobalAI(html, instructions, aiConfig) {
    try {
        const providerConfig = getAIProviderConfig(aiConfig.provider);
        
        const headers = { ...providerConfig.headers };
        Object.keys(headers).forEach(key => {
            headers[key] = headers[key].replace('{apiKey}', aiConfig.apiKey || '');
        });

        let endpoint = providerConfig.endpoint;
        if (aiConfig.baseUrl) {
            endpoint = aiConfig.baseUrl;
        }

        const model = aiConfig.modelId || providerConfig.model;
        const maxTokens = aiConfig.maxTokens || 10000;

        const prompt = `请根据以下指令修改HTML代码，只返回修改后的完整HTML，不要包含任何其他说明：

改造指令：
${instructions}

HTML代码：
${html}`;

        let requestBody;
        
        if (aiConfig.provider === 'anthropic') {
            requestBody = {
                model,
                max_tokens: maxTokens,
                messages: [
                    { role: 'user', content: prompt }
                ]
            };
        } else {
            requestBody = {
                model,
                messages: [
                    { role: 'system', content: '你是一个专业的网站改造助手。' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: maxTokens,
                temperature: 0.7
            };
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`AI API Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        
        let transformedHtml = html;
        
        if (aiConfig.provider === 'anthropic') {
            if (data.content && data.content[0]?.text) {
                transformedHtml = data.content[0].text;
            }
        } else {
            if (data.choices && data.choices[0]?.message?.content) {
                transformedHtml = data.choices[0].message.content;
            }
        }

        transformedHtml = transformedHtml
            .replace(/^```html\n?/, '')
            .replace(/^```\n?/, '')
            .replace(/```$/, '');

        return transformedHtml;

    } catch (error) {
        console.error('Global AI transform error:', error);
        throw error;
    }
}

function getAIProviderConfig(provider) {
    const configs = {
        openai: {
            endpoint: 'https://api.openai.com/v1/chat/completions',
            model: 'gpt-4',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer {apiKey}'
            }
        },
        anthropic: {
            endpoint: 'https://api.anthropic.com/v1/messages',
            model: 'claude-3-opus-20240229',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': '{apiKey}',
                'anthropic-version': '2023-06-01'
            }
        },
        google: {
            endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
            model: 'gemini-pro',
            headers: {
                'Content-Type': 'application/json'
            }
        },
        zhipu: {
            endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
            model: 'glm-4',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer {apiKey}'
            }
        },
        volcengine: {
            endpoint: process.env.AI_API_ENDPOINT || 'https://ark.cn-beijing.volces.com/api/coding/v1/messages',
            model: process.env.AI_MODEL || 'doubao-seed-2.0-code',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer {apiKey}'
            }
        },
        minimax: {
            endpoint: 'https://api.minimax.chat/v1/text/chatcompletion_pro',
            model: 'abab6-chat',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer {apiKey}'
            }
        },
        kimi: {
            endpoint: 'https://api.moonshot.cn/v1/chat/completions',
            model: 'moonshot-v1-8k',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer {apiKey}'
            }
        },
        aliyun: {
            endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
            model: 'qwen-max',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer {apiKey}'
            }
        }
    };
    return configs[provider] || configs.volcengine;
}

export { advancedCrawlTasks };
