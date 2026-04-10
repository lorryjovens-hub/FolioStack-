import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import multer from 'multer';
import { AsyncResource } from 'async_hooks';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3002;
const JWT_SECRET = 'portfolio-secret-key-production-v3';

// 数据文件路径
const USERS_FILE = join(__dirname, '../data/users.json');
const WORKS_FILE = join(__dirname, '../data/works.json');
const SESSIONS_FILE = join(__dirname, '../data/sessions.json');

// 上传目录
const UPLOAD_DIR = join(__dirname, '../uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// 文件上传配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = file.originalname.split('.').pop();
    cb(null, `${uniqueSuffix}.${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/mov', 'video/avi', 'video/webm',
      'application/zip', 'application/x-rar-compressed', 'application/octet-stream'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'));
    }
  }
});

// 中间件配置
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'Content-Type', 'Accept', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(join(__dirname, '..')));
app.use('/uploads', express.static(UPLOAD_DIR));

// 日志中间件
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    error: '服务器内部错误',
    message: process.env.NODE_ENV === 'development' ? err.message : '请稍后重试'
  });
});

// 数据存储路径
const STORAGE_PATH = join(__dirname, '..', 'data');
if (!fs.existsSync(STORAGE_PATH)) {
  fs.mkdirSync(STORAGE_PATH, { recursive: true });
}

// ==================== 并发控制机制 ====================

// 文件锁管理器
class FileLockManager {
  constructor() {
    this.locks = new Map();
    this.lockTimeout = 5000;
  }

  async acquireLock(filePath) {
    const lockId = `${filePath}-lock`;
    const startTime = Date.now();

    while (this.locks.has(lockId)) {
      if (Date.now() - startTime > this.lockTimeout) {
        throw new Error(`获取文件锁超时: ${filePath}`);
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    this.locks.set(lockId, Date.now());
    return lockId;
  }

  releaseLock(lockId) {
    this.locks.delete(lockId);
  }
}

const lockManager = new FileLockManager();

// ==================== 内存缓存机制 ====================

class DataCache {
  constructor(ttl = 60000) {
    this.cache = new Map();
    this.ttl = ttl;
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  invalidate(key) {
    this.cache.delete(key);
  }

  invalidateAll() {
    this.cache.clear();
  }
}

const usersCache = new DataCache(30000);
const worksCache = new DataCache(15000);

// ==================== 登录尝试限制 ====================

const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_TIMEOUT = 15 * 60 * 1000;

function checkLoginAttempts(identifier) {
  const attempts = loginAttempts.get(identifier);

  if (!attempts) return { allowed: true, remaining: MAX_LOGIN_ATTEMPTS };

  if (Date.now() - attempts.timestamp > LOGIN_TIMEOUT) {
    loginAttempts.delete(identifier);
    return { allowed: true, remaining: MAX_LOGIN_ATTEMPTS };
  }

  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    const waitTime = Math.ceil((LOGIN_TIMEOUT - (Date.now() - attempts.timestamp)) / 60000);
    return {
      allowed: false,
      remaining: 0,
      message: `登录尝试次数过多，请 ${waitTime} 分钟后再试`
    };
  }

  return { allowed: true, remaining: MAX_LOGIN_ATTEMPTS - attempts.count };
}

function recordLoginAttempt(identifier, success) {
  if (success) {
    loginAttempts.delete(identifier);
    return;
  }

  const attempts = loginAttempts.get(identifier) || { count: 0, timestamp: Date.now() };
  attempts.count += 1;
  attempts.timestamp = Date.now();
  loginAttempts.set(identifier, attempts);
}

// ==================== 会话管理 ====================

class SessionManager {
  constructor() {
    this.sessions = new Map();
  }

  create(userId, token) {
    const sessionId = uuidv4();
    this.sessions.set(token, {
      sessionId,
      userId,
      createdAt: Date.now(),
      lastActive: Date.now()
    });
    return sessionId;
  }

  validate(token) {
    const session = this.sessions.get(token);
    if (!session) return null;

    session.lastActive = Date.now();
    return session;
  }

  invalidate(token) {
    this.sessions.delete(token);
  }

  invalidateUser(userId) {
    for (const [token, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        this.sessions.delete(token);
      }
    }
  }

  getActiveSessions(userId) {
    let count = 0;
    for (const session of this.sessions.values()) {
      if (session.userId === userId) count++;
    }
    return count;
  }
}

const sessionManager = new SessionManager();

// ==================== 数据操作函数 ====================

async function loadData(filePath, defaultValue = []) {
  const lockId = await lockManager.acquireLock(filePath);
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
    return defaultValue;
  } catch (err) {
    console.error(`加载数据失败 ${filePath}:`, err);
    return defaultValue;
  } finally {
    lockManager.releaseLock(lockId);
  }
}

async function saveData(filePath, data) {
  const lockId = await lockManager.acquireLock(filePath);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error(`保存数据失败 ${filePath}:`, err);
    return false;
  } finally {
    lockManager.releaseLock(lockId);
  }
}

// ==================== JWT认证中间件 ====================

function authenticate(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: '未授权：缺少令牌' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const session = sessionManager.validate(token);

    if (!session) {
      return res.status(401).json({ error: '未授权：会话已失效' });
    }

    req.user = decoded;
    req.token = token;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: '未授权：令牌已过期' });
    }
    return res.status(401).json({ error: '未授权：无效的令牌' });
  }
}

// ==================== 验证函数 ====================

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return str.trim().replace(/[<>]/g, '');
}

async function analyzeWebsite(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
      },
      timeout: 5000
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    
    // 解析标题
    let title = '';
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      title = decodeHTMLEntities(titleMatch[1].trim());
    }

    // 解析描述
    let description = '';
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    if (descMatch) {
      description = decodeHTMLEntities(descMatch[1].trim());
    } else {
      const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
      if (ogDescMatch) {
        description = decodeHTMLEntities(ogDescMatch[1].trim());
      }
    }

    // 解析favicon
    let favicon = '';
    const parsedUrl = new URL(url);
    const faviconMatch = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i);
    if (faviconMatch) {
      favicon = faviconMatch[1];
      if (favicon.startsWith('//')) {
        favicon = parsedUrl.protocol + favicon;
      } else if (favicon.startsWith('/')) {
        favicon = `${parsedUrl.origin}${favicon}`;
      } else if (!favicon.startsWith('http')) {
        favicon = `${parsedUrl.origin}/${favicon}`;
      }
    } else {
      favicon = `${parsedUrl.origin}/favicon.ico`;
    }

    // 清理描述长度
    if (description.length > 200) {
      description = description.substring(0, 200) + '...';
    }

    return { title, description, favicon };
  } catch (err) {
    throw err;
  }
}

function decodeHTMLEntities(text) {
  const entities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' '
  };
  return text.replace(/&[^;]+;/g, match => entities[match] || match);
}

// ==================== 健康检查 ====================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    server: 'Portfolio Server v3 - Enhanced',
    port: PORT,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    activeSessions: sessionManager.sessions.size
  });
});

// ==================== 注册API ====================

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;

    // 验证必要字段
    if (!username || !email || !password) {
      return res.status(400).json({ error: '缺少必要字段：用户名、邮箱和密码' });
    }

    // 清理和验证输入
    const cleanUsername = sanitizeString(username);
    const cleanEmail = sanitizeString(email).toLowerCase();
    const cleanPassword = password;

    // 验证用户名
    if (cleanUsername.length < 3) {
      return res.status(400).json({ error: '用户名至少需要3个字符' });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      return res.status(400).json({ error: '用户名只能包含字母、数字和下划线' });
    }

    // 验证邮箱格式
    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({ error: '请提供有效的邮箱地址' });
    }

    // 验证密码强度
    if (cleanPassword.length < 6) {
      return res.status(400).json({ error: '密码至少需要6个字符' });
    }

    // 加载现有用户（带缓存）
    let users = usersCache.get('all');
    if (!users) {
      users = await loadData(USERS_FILE);
      usersCache.set('all', users);
    }

    // 并发检查：确保用户名和邮箱唯一
    const existingUsername = users.find(u => u.username.toLowerCase() === cleanUsername.toLowerCase());
    if (existingUsername) {
      return res.status(400).json({ error: '用户名已被注册' });
    }

    const existingEmail = users.find(u => u.email.toLowerCase() === cleanEmail);
    if (existingEmail) {
      return res.status(400).json({ error: '邮箱已被注册' });
    }

    // 创建新用户
    const uuid = uuidv4();
    const passwordHash = await bcrypt.hash(cleanPassword, 12);

    const newUser = {
      id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
      uuid,
      username: cleanUsername,
      email: cleanEmail,
      password_hash: passwordHash,
      display_name: sanitizeString(displayName) || cleanUsername,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_login: null,
      login_count: 0,
      status: 'active'
    };

    users.push(newUser);

    // 保存用户数据（带锁）
    const saved = await saveData(USERS_FILE, users);
    if (!saved) {
      return res.status(500).json({ error: '保存用户数据失败，请重试' });
    }

    // 使缓存失效
    usersCache.invalidate('all');

    // 生成JWT令牌
    const token = jwt.sign(
      { userId: newUser.id, uuid: newUser.uuid },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 创建会话
    sessionManager.create(newUser.id, token);

    res.status(201).json({
      message: '注册成功',
      token,
      user: {
        id: newUser.id,
        uuid: newUser.uuid,
        username: newUser.username,
        email: newUser.email,
        displayName: newUser.display_name
      }
    });

  } catch (err) {
    console.error('注册错误:', err);
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
});

// ==================== 登录API ====================

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '请提供用户名和密码' });
    }

    // 检查登录尝试限制
    const checkResult = checkLoginAttempts(username);
    if (!checkResult.allowed) {
      return res.status(429).json({ error: checkResult.message });
    }

    // 清理输入
    const cleanUsername = sanitizeString(username);
    const cleanPassword = password;

    // 加载用户数据
    let users = usersCache.get('all');
    if (!users) {
      users = await loadData(USERS_FILE);
      usersCache.set('all', users);
    }

    // 精确识别：区分用户名和邮箱
    const isEmail = isValidEmail(cleanUsername);
    let user;

    if (isEmail) {
      user = users.find(u => u.email.toLowerCase() === cleanUsername.toLowerCase());
    } else {
      user = users.find(u => u.username.toLowerCase() === cleanUsername.toLowerCase());
    }

    if (!user) {
      recordLoginAttempt(username, false);
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 检查账户状态
    if (user.status !== 'active') {
      return res.status(403).json({ error: '账户已被禁用，请联系客服' });
    }

    // 验证密码
    const isValidPassword = await bcrypt.compare(cleanPassword, user.password_hash);
    if (!isValidPassword) {
      recordLoginAttempt(username, false);
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 登录成功
    recordLoginAttempt(username, true);

    // 更新用户登录信息
    user.last_login = new Date().toISOString();
    user.login_count = (user.login_count || 0) + 1;
    await saveData(USERS_FILE, users);
    usersCache.invalidate('all');

    // 生成JWT令牌
    const token = jwt.sign(
      { userId: user.id, uuid: user.uuid },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 创建会话
    sessionManager.create(user.id, token);

    // 获取活跃会话数
    const activeSessions = sessionManager.getActiveSessions(user.id);

    res.json({
      message: '登录成功',
      token,
      user: {
        id: user.id,
        uuid: user.uuid,
        username: user.username,
        email: user.email,
        displayName: user.display_name
      },
      sessions: activeSessions
    });

  } catch (err) {
    console.error('登录错误:', err);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
});

// ==================== 登出API ====================

app.post('/api/auth/logout', authenticate, (req, res) => {
  try {
    sessionManager.invalidate(req.token);
    res.json({ message: '登出成功' });
  } catch (err) {
    console.error('登出错误:', err);
    res.status(500).json({ error: '登出失败，请稍后重试' });
  }
});

// ==================== 强制登出（所有设备） ====================

app.post('/api/auth/logout-all', authenticate, (req, res) => {
  try {
    sessionManager.invalidateUser(req.user.userId);
    res.json({ message: '已强制登出所有设备' });
  } catch (err) {
    console.error('强制登出错误:', err);
    res.status(500).json({ error: '操作失败，请稍后重试' });
  }
});

// ==================== 获取当前用户信息 ====================

app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    let users = usersCache.get('all');
    if (!users) {
      users = await loadData(USERS_FILE);
      usersCache.set('all', users);
    }

    const user = users.find(u => u.id === req.user.userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const activeSessions = sessionManager.getActiveSessions(user.id);

    res.json({
      user: {
        id: user.id,
        uuid: user.uuid,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        created_at: user.created_at,
        last_login: user.last_login,
        login_count: user.login_count
      },
      sessions: activeSessions
    });
  } catch (err) {
    console.error('获取用户信息错误:', err);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

// 更新用户信息
app.put('/api/auth/me', authenticate, async (req, res) => {
  try {
    const { username, displayName } = req.body;

    let users = usersCache.get('all');
    if (!users) {
      users = await loadData(USERS_FILE);
      usersCache.set('all', users);
    }

    const user = users.find(u => u.id === req.user.userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 更新用户名
    if (username) {
      const cleanUsername = sanitizeString(username);
      
      // 验证用户名格式
      if (cleanUsername.length< 3) {
        return res.status(400).json({ error: '用户名至少需要3个字符' });
      }
      
      if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
        return res.status(400).json({ error: '用户名只能包含字母、数字和下划线' });
      }
      
      // 检查用户名是否被其他用户使用
      const existingUser = users.find(u =>u.id !== user.id && u.username.toLowerCase() === cleanUsername.toLowerCase());
      if (existingUser) {
        return res.status(400).json({ error: '用户名已被使用' });
      }
      
      user.username = cleanUsername;
    }

    // 更新显示名称
    if (displayName !== undefined) {
      user.display_name = sanitizeString(displayName);
    }

    user.updated_at = new Date().toISOString();

    if (!await saveData(USERS_FILE, users)) {
      return res.status(500).json({ error: '更新用户信息失败' });
    }

    usersCache.invalidate('all');

    res.json({
      message: '用户信息更新成功',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name
      }
    });

  } catch (err) {
    console.error('更新用户信息错误:', err);
    res.status(500).json({ error: '更新用户信息失败' });
  }
});

// 修改密码
app.put('/api/auth/change-password', authenticate, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: '请提供旧密码和新密码' });
    }

    if (newPassword.length< 6) {
      return res.status(400).json({ error: '新密码至少需要6个字符' });
    }

    let users = usersCache.get('all');
    if (!users) {
      users = await loadData(USERS_FILE);
      usersCache.set('all', users);
    }

    const user = users.find(u =>u.id === req.user.userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 验证旧密码
    const isValidPassword = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: '旧密码错误' });
    }

    // 更新密码
    const newPasswordHash = await bcrypt.hash(newPassword, 12);
    user.password_hash = newPasswordHash;
    user.updated_at = new Date().toISOString();

    if (!await saveData(USERS_FILE, users)) {
      return res.status(500).json({ error: '密码更新失败' });
    }

    usersCache.invalidate('all');

    res.json({ message: '密码更新成功' });

  } catch (err) {
    console.error('修改密码错误:', err);
    res.status(500).json({ error: '修改密码失败' });
  }
});

// ==================== 作品管理API ====================

// 创建作品
app.post('/api/works', authenticate, async (req, res) => {
  try {
    const { title, description, category, tags, project_url, status = 'draft' } = req.body;
    
    if (!title || !category) {
      return res.status(400).json({ error: '标题和分类不能为空' });
    }

    let works = worksCache.get('all');
    if (!works) {
      works = await loadData(WORKS_FILE);
      worksCache.set('all', works);
    }

    const uuid = uuidv4();
    
    const newWork = {
      id: works.length > 0 ? Math.max(...works.map(w => w.id)) + 1 : 1,
      uuid,
      user_id: req.user.userId,
      title: sanitizeString(title),
      description: sanitizeString(description) || '',
      category: sanitizeString(category),
      tags: tags || [],
      project_url: project_url ? sanitizeString(project_url) : '',
      source: project_url ? 'link' : 'manual',
      status: sanitizeString(status),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    works.push(newWork);

    if (!await saveData(WORKS_FILE, works)) {
      return res.status(500).json({ error: '保存作品数据失败' });
    }

    worksCache.invalidate('all');

    res.status(201).json({
      message: '作品创建成功',
      work: newWork
    });

  } catch (err) {
    console.error('创建作品失败:', err);
    res.status(500).json({ error: '创建作品失败，请稍后重试' });
  }
});

// 获取用户作品
app.get('/api/works', authenticate, async (req, res) => {
  try {
    let works = worksCache.get('all');
    if (!works) {
      works = await loadData(WORKS_FILE);
      worksCache.set('all', works);
    }

    const userWorks = works.filter(w => w.user_id === req.user.userId);

    res.json(userWorks);
  } catch (err) {
    console.error('获取作品失败:', err);
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

    // 验证URL格式
    try {
      new URL(url);
    } catch (err) {
      return res.status(400).json({ error: '无效的URL格式' });
    }

    // 加载现有作品
    let works = worksCache.get('all');
    if (!works) {
      works = await loadData(WORKS_FILE);
      worksCache.set('all', works);
    }

    // 并发检查：检查重复链接（仅当前用户）
    const existingWork = works.find(
      w => w.url === url && w.user_id === req.user.userId
    );
    if (existingWork) {
      return res.status(400).json({ error: '该链接已存在，请检查是否重复导入' });
    }

    // 分析网站内容
    let analyzedData = { title: '', description: '', favicon: '' };
    try {
      analyzedData = await analyzeWebsite(url);
    } catch (err) {
      console.log('网站分析失败，使用默认值:', err.message);
    }

    // 创建新作品
    const uuid = uuidv4();

    const newWork = {
      id: works.length > 0 ? Math.max(...works.map(w => w.id)) + 1 : 1,
      uuid,
      user_id: req.user.userId,
      title: sanitizeString(title) || analyzedData.title || url,
      description: sanitizeString(description) || analyzedData.description || '',
      url,
      favicon: analyzedData.favicon || '',
      category: sanitizeString(category) || '',
      tags: tags || [],
      source: 'link',
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    works.push(newWork);

    // 保存作品数据
    const saved = await saveData(WORKS_FILE, works);
    if (!saved) {
      return res.status(500).json({ error: '保存作品数据失败' });
    }

    worksCache.invalidate('all');

    res.status(201).json({
      message: '作品导入成功',
      work: newWork
    });

  } catch (err) {
    console.error('导入作品失败:', err);
    res.status(500).json({ error: '导入作品失败，请稍后重试' });
  }
});

// 文件上传
app.post('/api/works/upload', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择文件' });
    }

    const { title, description, category, tags } = req.body;

    let works = worksCache.get('all');
    if (!works) {
      works = await loadData(WORKS_FILE);
      worksCache.set('all', works);
    }

    const uuid = uuidv4();
    const fileUrl = `/uploads/${req.file.filename}`;

    let fileType = 'other';
    if (req.file.mimetype.startsWith('image/')) {
      fileType = 'image';
    } else if (req.file.mimetype.startsWith('video/')) {
      fileType = 'video';
    } else if (req.file.mimetype.includes('zip') || req.file.mimetype.includes('rar')) {
      fileType = 'archive';
    }

    const newWork = {
      id: works.length > 0 ? Math.max(...works.map(w => w.id)) + 1 : 1,
      uuid,
      user_id: req.user.userId,
      title: sanitizeString(title) || req.file.originalname,
      description: sanitizeString(description) || '',
      url: fileUrl,
      file_path: req.file.path,
      file_name: req.file.originalname,
      file_size: req.file.size,
      file_type: fileType,
      category: sanitizeString(category) || '',
      tags: tags ? JSON.parse(tags) : [],
      source: 'upload',
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    works.push(newWork);

    if (!await saveData(WORKS_FILE, works)) {
      return res.status(500).json({ error: '保存作品数据失败' });
    }

    worksCache.invalidate('all');

    res.status(201).json({
      message: '文件上传成功',
      work: newWork
    });

  } catch (err) {
    console.error('上传文件错误:', err);
    res.status(500).json({ error: '文件上传失败' });
  }
});

// 删除作品
app.delete('/api/works/:uuid', authenticate, async (req, res) => {
  try {
    const { uuid } = req.params;

    let works = worksCache.get('all');
    if (!works) {
      works = await loadData(WORKS_FILE);
      worksCache.set('all', works);
    }

    const workIndex = works.findIndex(
      w => w.uuid === uuid && w.user_id === req.user.userId
    );

    if (workIndex === -1) {
      return res.status(404).json({ error: '作品不存在' });
    }

    works.splice(workIndex, 1);

    if (!await saveData(WORKS_FILE, works)) {
      return res.status(500).json({ error: '删除作品失败' });
    }

    worksCache.invalidate('all');

    res.json({ message: '作品删除成功' });

  } catch (err) {
    console.error('删除作品失败:', err);
    res.status(500).json({ error: '删除作品失败，请稍后重试' });
  }
});

// 更新作品
app.put('/api/works/:uuid', authenticate, async (req, res) => {
  try {
    const { uuid } = req.params;
    const { title, description, category, tags, status } = req.body;

    let works = worksCache.get('all');
    if (!works) {
      works = await loadData(WORKS_FILE);
      worksCache.set('all', works);
    }

    const workIndex = works.findIndex(
      w => w.uuid === uuid && w.user_id === req.user.userId
    );

    if (workIndex === -1) {
      return res.status(404).json({ error: '作品不存在' });
    }

    const work = works[workIndex];

    if (title) work.title = sanitizeString(title);
    if (description !== undefined) work.description = sanitizeString(description);
    if (category) work.category = sanitizeString(category);
    if (tags) work.tags = tags;
    if (status) work.status = sanitizeString(status);
    work.updated_at = new Date().toISOString();

    if (!await saveData(WORKS_FILE, works)) {
      return res.status(500).json({ error: '更新作品失败' });
    }

    worksCache.invalidate('all');

    res.json({
      message: '作品更新成功',
      work
    });

  } catch (err) {
    console.error('更新作品失败:', err);
    res.status(500).json({ error: '更新作品失败，请稍后重试' });
  }
});

// ==================== 数据分析API ====================

app.get('/api/analytics', authenticate, async (req, res) => {
  try {
    const works = await loadData(WORKS_FILE);
    const userWorks = works.filter(w => w.user_id === req.user.userId);
    
    // 生成模拟的访问数据
    const generateVisitData = () => {
      const labels = [];
      const data = [];
      const now = new Date();
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }));
        data.push(Math.floor(Math.random() * 100) + 50);
      }
      
      return { labels, data };
    };
    
    // 生成作品表现数据
    const generatePerformanceData = () => {
      const topWorks = userWorks
        .sort((a, b) => {
          const dateA = new Date(a.created_at);
          const dateB = new Date(b.created_at);
          return dateB - dateA;
        })
        .slice(0, 5);
      
      return {
        labels: topWorks.map(w => w.title.substring(0, 8) + (w.title.length > 8 ? '...' : '')),
        visits: topWorks.map(() => Math.floor(Math.random() * 500) + 100),
        likes: topWorks.map(() => Math.floor(Math.random() * 50) + 5)
      };
    };
    
    // 计算统计数据
    const totalVisits = Math.floor(Math.random() * 2000) + 1500;
    const totalLikes = Math.floor(Math.random() * 100) + 50;
    const avgTime = Math.floor(Math.random() * 30) + 30;
    const conversion = Math.floor(Math.random() * 15) + 10;
    
    res.json({
      totalVisits,
      totalLikes,
      avgTime,
      conversion,
      visitData: generateVisitData(),
      performanceData: generatePerformanceData()
    });
    
  } catch (err) {
    console.error('获取分析数据失败:', err);
    res.status(500).json({ error: '获取分析数据失败' });
  }
});

// ==================== 管理员API ====================

app.get('/api/admin/stats', async (req, res) => {
  try {
    const users = await loadData(USERS_FILE);
    const works = await loadData(WORKS_FILE);

    res.json({
      totalUsers: users.length,
      totalWorks: works.length,
      activeSessions: sessionManager.sessions.size,
      cacheStats: {
        users: usersCache.cache.size,
        works: worksCache.cache.size
      }
    });
  } catch (err) {
    console.error('获取统计信息失败:', err);
    res.status(500).json({ error: '获取统计信息失败' });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log('==================================');
  console.log('Portfolio Server v3 启动成功');
  console.log(`服务器地址: http://localhost:${PORT}`);
  console.log(`健康检查: http://localhost:${PORT}/api/health`);
  console.log('==================================');
  console.log('增强功能:');
  console.log('- 并发控制与文件锁');
  console.log('- 数据缓存机制');
  console.log('- 登录尝试限制');
  console.log('- 会话管理');
  console.log('- 输入安全过滤');
  console.log('- 账户唯一性检查');
  console.log('==================================');
});
