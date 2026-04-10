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
const PORT = process.env.PORT || 3001;
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
app.get('/api/works', async (req, res) => {
  try {
    const works = await all('SELECT * FROM works ORDER BY created_at DESC');
    res.json(works);
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
