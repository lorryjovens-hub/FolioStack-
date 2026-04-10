import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

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

// 简单的内存存储（仅用于测试）
const users = [];
const works = [];
let nextUserId = 1;
let nextWorkId = 1;

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

    const existingUser = users.find(u => u.username === username || u.email === email);
    if (existingUser) {
      return res.status(400).json({ error: '用户名或邮箱已存在' });
    }

    const uuid = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    
    const newUser = {
      id: nextUserId++,
      uuid,
      username,
      email,
      password_hash: passwordHash,
      display_name: displayName || username,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    users.push(newUser);
    
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

    const user = users.find(u => u.username === username);
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
app.get('/api/auth/me', authenticate, (req, res) => {
  try {
    const user = users.find(u => u.id === req.user.userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    res.json({
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      email: user.email
    });
  } catch (err) {
    console.error('获取用户信息错误:', err);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

// 获取作品列表
app.get('/api/works', (req, res) => {
  res.json(works);
});

// 导入作品链接
app.post('/api/works/import-url', authenticate, (req, res) => {
  try {
    const { url, title, description, category, tags } = req.body;
    if (!url) {
      return res.status(400).json({ error: '请提供URL' });
    }

    const uuid = uuidv4();
    
    const newWork = {
      id: nextWorkId++,
      uuid,
      user_id: req.user.userId,
      title: title || 'Untitled',
      description: description || '',
      url,
      category: category || '',
      tags: tags || '',
      source: 'link',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    works.push(newWork);

    res.json({ message: '作品导入成功' });
  } catch (err) {
    console.error('导入作品错误:', err);
    res.status(500).json({ error: '导入作品失败' });
  }
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
