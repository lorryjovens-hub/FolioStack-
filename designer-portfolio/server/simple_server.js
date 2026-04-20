import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { initDB, run, get, all } from './db.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;
const JWT_SECRET = 'portfolio-secret-key';

app.use(cors({ 
  origin: true, 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'Content-Type', 'Accept', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(join(__dirname, '..')));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// JWT认证中间件
function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: '未授权' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: '无效的令牌' });
  }
}

// 注册API
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: '缺少必要字段' });
    }

    const existingUser = await get('SELECT * FROM users WHERE username = ? OR email = ?', [username, email]);
    if (existingUser) {
      return res.status(400).json({ error: '用户名或邮箱已存在' });
    }

    const uuid = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    
    await run(
      'INSERT INTO users (uuid, username, email, password_hash, display_name) VALUES (?, ?, ?, ?, ?)',
      [uuid, username, email, passwordHash, displayName || username]
    );

    const newUser = await get('SELECT * FROM users WHERE username = ?', [username]);
    const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ 
      message: '注册成功',
      token,
      user: { 
        id: newUser.id, 
        username: newUser.username,
        displayName: newUser.display_name
      }
    });
  } catch (err) {
    console.error('注册错误:', err);
    res.status(500).json({ error: '注册失败' });
  }
});

// 登录API
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: '请提供用户名和密码' });
    }

    const user = await get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ 
      message: '登录成功', 
      token,
      user: { 
        id: user.id, 
        username: user.username,
        displayName: user.display_name
      }
    });
  } catch (err) {
    console.error('登录错误:', err);
    res.status(500).json({ error: '登录失败' });
  }
});

// 获取用户信息
app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    const user = await get('SELECT id, username, display_name as displayName, email FROM users WHERE id = ?', [req.user.userId]);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    res.json(user);
  } catch (err) {
    console.error('获取用户信息错误:', err);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

// 获取作品列表
app.get('/api/works', authenticate, async (req, res) => {
  try {
    const works = await all('SELECT * FROM works WHERE user_id = ? ORDER BY created_at DESC', [req.user.userId]);
    res.json({ data: works });
  } catch (err) {
    console.error('获取作品错误:', err);
    res.status(500).json({ error: '获取作品失败' });
  }
});

// 导入作品链接
app.post('/api/works/import-url', authenticate, async (req, res) => {
  try {
    const { url, title, description, category, tags } = req.body;
    if (!url) {
      return res.status(400).json({ error: '请提供URL' });
    }

    const uuid = uuidv4();
    
    await run(
      'INSERT INTO works (uuid, user_id, title, description, url, category, tags, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [uuid, req.user.userId, title || 'Untitled', description || '', url, category || '', tags || '', 'link']
    );

    res.json({ message: '作品导入成功' });
  } catch (err) {
    console.error('导入作品错误:', err);
    res.status(500).json({ error: '导入作品失败' });
  }
});

// 获取单个作品
app.get('/api/works/:id', authenticate, async (req, res) => {
  try {
    const work = await get('SELECT * FROM works WHERE uuid = ? AND user_id = ?', [req.params.id, req.user.userId]);
    if (!work) {
      return res.status(404).json({ error: '作品不存在' });
    }
    res.json({ data: work });
  } catch (err) {
    console.error('获取作品错误:', err);
    res.status(500).json({ error: '获取作品失败' });
  }
});

// 更新作品
app.put('/api/works/:id', authenticate, async (req, res) => {
  try {
    const { title, description, category, tags, status } = req.body;
    await run(
      'UPDATE works SET title = ?, description = ?, category = ?, tags = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE uuid = ? AND user_id = ?',
      [title, description, category, tags, status, req.params.id, req.user.userId]
    );
    res.json({ message: '作品更新成功' });
  } catch (err) {
    console.error('更新作品错误:', err);
    res.status(500).json({ error: '更新作品失败' });
  }
});

// 删除作品
app.delete('/api/works/:id', authenticate, async (req, res) => {
  try {
    await run('DELETE FROM works WHERE uuid = ? AND user_id = ?', [req.params.id, req.user.userId]);
    res.json({ message: '作品删除成功' });
  } catch (err) {
    console.error('删除作品错误:', err);
    res.status(500).json({ error: '删除作品失败' });
  }
});

// 增加作品浏览量
app.post('/api/works/:id/view', async (req, res) => {
  try {
    await run('UPDATE works SET view_count = view_count + 1 WHERE uuid = ?', [req.params.id]);
    res.json({ message: '浏览量已更新' });
  } catch (err) {
    console.error('更新浏览量错误:', err);
    res.status(500).json({ error: '更新浏览量失败' });
  }
});

// 前台分析数据跟踪
app.post('/api/analytics/track', async (req, res) => {
  try {
    const { sessionId, page, referrer, timestamp, userAgent, screenWidth, screenHeight } = req.body;
    // 这里可以将数据存入分析日志表
    console.log('Analytics track:', { sessionId, page, timestamp });
    res.json({ success: true });
  } catch (err) {
    console.error('Analytics track error:', err);
    res.status(500).json({ error: 'Tracking failed' });
  }
});

// 前台事件跟踪
app.post('/api/analytics/track-event', async (req, res) => {
  try {
    const { sessionId, eventName, eventData, timestamp } = req.body;
    console.log('Analytics event:', { sessionId, eventName, eventData, timestamp });
    res.json({ success: true });
  } catch (err) {
    console.error('Analytics event error:', err);
    res.status(500).json({ error: 'Event tracking failed' });
  }
});

// 获取分析数据
app.get('/api/analytics', authenticate, async (req, res) => {
  try {
    const works = await all('SELECT * FROM works WHERE user_id = ?', [req.user.userId]);
    
    // 生成最近7天的日期标签
    const labels = [];
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      labels.push(date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }));
      // 模拟数据 - 实际应该从访问日志表获取
      data.push(Math.floor(Math.random() * 100) + 20);
    }
    
    // 按分类统计
    const categoryStats = {};
    works.forEach(work => {
      const cat = work.category || 'other';
      categoryStats[cat] = (categoryStats[cat] || 0) + 1;
    });
    
    // 获取热门作品
    const topWorks = works
      .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
      .slice(0, 5)
      .map(w => ({
        title: w.title,
        visits: w.view_count || 0,
        likes: w.likes || 0
      }));
    
    res.json({
      visits: { labels, data },
      categories: {
        labels: Object.keys(categoryStats).map(k => k === 'design' ? '设计' : k === 'development' ? '开发' : k === 'video' ? '视频' : k === 'photography' ? '摄影' : '其他'),
        data: Object.values(categoryStats)
      },
      topWorks,
      summary: {
        totalWorks: works.length,
        totalViews: works.reduce((sum, w) => sum + (w.view_count || 0), 0),
        totalLikes: works.reduce((sum, w) => sum + (w.likes || 0), 0),
        publishedWorks: works.filter(w => w.status === 'published').length
      }
    });
  } catch (err) {
    console.error('获取分析数据错误:', err);
    res.status(500).json({ error: '获取分析数据失败' });
  }
});

async function start() {
  try {
    await initDB();
    console.log('数据库连接成功');
    app.listen(PORT, () => {
      console.log(`服务器运行在 http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('服务器启动失败:', err);
    process.exit(1);
  }
}

start();
