const express = require('express');
const config = require('../config');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { successResponse, ApiError } = require('../utils/response');
const { User } = require('../models');
const logger = require('../config/logger');

const router = express.Router();

router.get('/settings',
  authenticate,
  async (req, res, next) => {
    try {
      const user = await User.findByPk(req.user.id);

      if (!user) {
        throw ApiError.notFound('User not found');
      }

      const aiSettings = user.settings?.ai || {
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 1000,
        style: 'professional',
      };

      return successResponse(res, { aiSettings });
    } catch (error) {
      next(error);
    }
  }
);

router.patch('/settings',
  authenticate,
  async (req, res, next) => {
    try {
      const { model, temperature, maxTokens, style, apiKey } = req.body;

      const user = await User.findByPk(req.user.id);

      if (!user) {
        throw ApiError.notFound('User not found');
      }

      const aiSettings = {
        ...user.settings?.ai,
        model: model || 'gpt-4',
        temperature: temperature !== undefined ? temperature : 0.7,
        maxTokens: maxTokens || 1000,
        style: style || 'professional',
      };

      if (apiKey) {
        aiSettings.apiKey = apiKey;
      }

      user.settings = {
        ...user.settings,
        ai: aiSettings,
      };

      await user.save();

      logger.info({ message: 'AI settings updated', userId: user.id });

      return successResponse(res, { aiSettings }, 'AI settings updated successfully');
    } catch (error) {
      next(error);
    }
  }
);

router.post('/generate',
  authenticate,
  async (req, res, next) => {
    try {
      if (!config.features.enableAiFeatures) {
        throw ApiError.badRequest('AI features are not enabled');
      }

      const { prompt, type, context } = req.body;

      if (!prompt) {
        throw ApiError.badRequest('Prompt is required');
      }

      const user = await User.findByPk(req.user.id);
      const aiSettings = user.settings?.ai || {};

      if (!aiSettings.apiKey && !config.ai.apiKey) {
        throw ApiError.badRequest('AI API key not configured');
      }

      const generatedContent = {
        type: type || 'description',
        prompt,
        result: `Generated ${type || 'content'} for: ${prompt}`,
        model: aiSettings.model || 'gpt-4',
        timestamp: new Date().toISOString(),
      };

      logger.info({ message: 'AI content generated', userId: user.id, type: type || 'description' });

      return successResponse(res, { content: generatedContent }, 'Content generated successfully');
    } catch (error) {
      next(error);
    }
  }
);

router.post('/generate-description',
  authenticate,
  async (req, res, next) => {
    try {
      if (!config.features.enableAiFeatures) {
        throw ApiError.badRequest('AI features are not enabled');
      }

      const { title, tags, category } = req.body;

      if (!title) {
        throw ApiError.badRequest('Title is required');
      }

      const description = `A ${category || 'creative'} work titled "${title}"${
        tags && tags.length > 0 ? ` featuring ${tags.slice(0, 3).join(', ')}` : ''
      }. This piece showcases unique design and technical excellence.`;

      logger.info({ message: 'AI description generated', userId: req.user.id, title });

      return successResponse(res, { description }, 'Description generated successfully');
    } catch (error) {
      next(error);
    }
  }
);

router.post('/generate-tags',
  authenticate,
  async (req, res, next) => {
    try {
      if (!config.features.enableAiFeatures) {
        throw ApiError.badRequest('AI features are not enabled');
      }

      const { title, description, category } = req.body;

      const suggestedTags = [
        'featured',
        category || 'design',
        'creative',
        'portfolio',
        'showcase',
      ];

      logger.info({ message: 'AI tags generated', userId: req.user.id });

      return successResponse(res, { tags: suggestedTags }, 'Tags generated successfully');
    } catch (error) {
      next(error);
    }
  }
);

router.post('/analyze-work',
  authenticate,
  async (req, res, next) => {
    try {
      if (!config.features.enableAiFeatures) {
        throw ApiError.badRequest('AI features are not enabled');
      }

      const { title, description, url } = req.body;

      const analysis = {
        score: Math.floor(Math.random() * 30) + 70,
        strengths: [
          'Clear visual hierarchy',
          'Good use of whitespace',
          'Consistent design language',
        ],
        improvements: [
          'Add more detailed descriptions',
          'Include additional project context',
          'Consider adding more visual assets',
        ],
        recommendations: [
          'Use high-resolution images for better presentation',
          'Add technical details about the implementation',
          'Include client testimonials if available',
        ],
      };

      logger.info({ message: 'Work analyzed with AI', userId: req.user.id, title });

      return successResponse(res, { analysis }, 'Analysis completed successfully');
    } catch (error) {
      next(error);
    }
  }
);

// AI代理路由 - 支持流式传输
router.post('/proxy', async (req, res, next) => {
  try {
    const { endpoint, headers, body, stream } = req.body;
    
    console.log('AI代理请求:', {
      endpoint: endpoint ? endpoint.substring(0, 100) + '...' : 'undefined',
      stream: stream
    });
    
    if (!endpoint) {
      return res.status(400).json({ error: '缺少endpoint参数' });
    }
    
    const proxyHeaders = { ...headers };
    delete proxyHeaders['host'];
    delete proxyHeaders['content-length'];
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: proxyHeaders,
      body: JSON.stringify(body)
    });
    
    console.log('AI响应状态:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI错误响应:', errorText);
      return res.status(response.status).json({ error: errorText });
    }
    
    // 如果请求了流式传输，尝试直接转发流
    if (stream) {
      console.log('启用流式传输模式');
      
      try {
        // 检查响应是否支持流式
        if (response.body && typeof response.body.getReader === 'function') {
          try {
            // 设置流式响应头
            res.writeHead(200, {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': '*'
            });
            
            // 从响应中获取Reader
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                // 解码并转发数据
                const chunk = decoder.decode(value, { stream: true });
                res.write(chunk);
                
                // 强制刷新缓冲区
                if (res.flush) res.flush();
              }
              res.end();
            } finally {
              reader.releaseLock();
            }
          } catch (streamError) {
            console.error('流式传输错误:', streamError);
            // 重置响应状态
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: '流式传输失败' }));
          }
        } else {
          // 响应不支持流式，回退到非流式处理
          console.log('响应不支持流式，回退到非流式处理');
          try {
            const responseText = await response.text();
            res.json({ content: responseText });
          } catch (e) {
            console.error('读取响应失败:', e);
            res.status(500).json({ error: '读取响应失败' });
          }
        }
      } catch (error) {
        console.error('流式处理错误:', error);
        res.status(500).json({ error: '处理流式响应失败' });
      }
      
    } else {
      // 获取响应文本
      const responseText = await response.text();
      console.log('响应内容长度:', responseText.length);
      console.log('响应前500字符:', responseText.substring(0, 500));
      
      // 检查是否是流式响应
      if (responseText.includes('event:') && responseText.includes('data:')) {
        // 是流式响应，转发为SSE
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*'
        });
        res.write(responseText);
        res.end();
      } else {
        // 非流式响应，作为JSON返回
        try {
          const responseData = JSON.parse(responseText);
          res.json(responseData);
        } catch (e) {
          res.json({ content: responseText });
        }
      }
    }
    
  } catch (error) {
    console.error('AI代理请求错误:', error);
    res.status(500).json({ error: '代理请求失败', details: error.message });
  }
});

module.exports = router;
