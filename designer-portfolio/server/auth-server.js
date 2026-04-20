import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { initDB, run, get, all, closeDB, getType } from './db.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;
const JWT_SECRET = process.env.JWT_SECRET || 'folio-stack-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// 创建必要的目录
const uploadsDir = join(__dirname, '../uploads');
const worksDir = join(__dirname, '../works');
const dataDir = join(__dirname, '../data');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(worksDir)) fs.mkdirSync(worksDir, { recursive: true });
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// 中间件
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'Content-Type', 'Accept', 'Authorization'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  maxAge: 86400
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 请求日志
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// 认证中间件
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const user = await get('SELECT * FROM users WHERE id = $1', [decoded.id]);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: getType(),
    port: PORT
  });
});

// 注册路由
app.post('/api/auth/register', async (req, res) => {
  try {
    console.log('Register request:', req.body);
    
    const { username, email, password, displayName } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 检查用户是否已存在
    const existing = await get(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existing) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    // 创建用户
    const passwordHash = await bcrypt.hash(password, 12);
    const userUuid = uuidv4();

    await run(
      'INSERT INTO users (uuid, username, email, password_hash, display_name, role) VALUES ($1, $2, $3, $4, $5, $6)',
      [userUuid, username, email, passwordHash, displayName || username, 'user']
    );

    // 获取新创建的用户
    const user = await get('SELECT * FROM users WHERE username = $1', [username]);

    // 生成token
    const token = jwt.sign(
      { id: user.id, uuid: user.uuid, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // 创建会话
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .replace('T', ' ')
      .substring(0, 19);
    
    await run(
      'INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expiresAt]
    );

    console.log('User registered successfully:', username);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        uuid: user.uuid,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
});

// 登录路由
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('Login request:', req.body);
    
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Missing credentials' });
    }

    // 查找用户
    const user = await get(
      'SELECT * FROM users WHERE username = $1 OR email = $2',
      [username, username]
    );

    if (!user) {
      console.log('User not found:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 验证密码
    const valid = await bcrypt.compare(password, user.password_hash);
    
    if (!valid) {
      console.log('Invalid password for user:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 生成token
    const token = jwt.sign(
      { id: user.id, uuid: user.uuid, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // 创建会话
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .replace('T', ' ')
      .substring(0, 19);
    
    await run('DELETE FROM sessions WHERE user_id = $1', [user.id]);
    await run(
      'INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expiresAt]
    );

    console.log('User logged in successfully:', username);

    res.json({
      token,
      user: {
        id: user.id,
        uuid: user.uuid,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

// 登出路由
app.post('/api/auth/logout', authenticate, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader.split(' ')[1];
    
    await run('DELETE FROM sessions WHERE token = $1', [token]);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// 获取当前用户信息
app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user.id,
        uuid: req.user.uuid,
        username: req.user.username,
        email: req.user.email,
        displayName: req.user.display_name,
        role: req.user.role
      }
    });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// 静态文件服务
app.use(express.static(join(__dirname, '..')));

// 错误处理
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 启动服务器
async function startServer() {
  try {
    console.log('========================================');
    console.log('FolioStack Authentication Server');
    console.log('========================================');
    
    // 初始化数据库
    console.log('Initializing database...');
    await initDB();
    console.log(`Database initialized (${getType()})`);
    
    // 启动HTTP服务器
    app.listen(PORT, () => {
      console.log('========================================');
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
      console.log(`✅ Register: http://localhost:${PORT}/api/auth/register`);
      console.log(`✅ Login: http://localhost:${PORT}/api/auth/login`);
      console.log('========================================');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await closeDB();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await closeDB();
  process.exit(0);
});

startServer();