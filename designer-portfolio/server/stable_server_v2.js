import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3002;
const JWT_SECRET = 'portfolio-secret-key-production';

// 数据文件路径
const USERS_FILE = join(__dirname, '../data/users.json');
const WORKS_FILE = join(__dirname, '../data/works.json');

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
    cb(null, uniqueSuffix + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB限制
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

// 数据存储 - 使用文件存储（更持久）
const STORAGE_PATH = join(__dirname, '..', 'data');
if (!fs.existsSync(STORAGE_PATH)) {
  fs.mkdirSync(STORAGE_PATH, { recursive: true });
}

// 加载数据
function loadData(filePath, defaultValue = []) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
    return defaultValue;
  } catch (err) {
    console.error(`加载数据失败 ${filePath}:`, err);
    return defaultValue;
  }
}

// 保存数据
function saveData(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error(`保存数据失败 ${filePath}:`, err);
    return false;
  }
}

// JWT认证中间件
function authenticate(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: '未授权：缺少令牌' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: '未授权：无效的令牌' });
  }
}

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    server: 'Portfolio Server v2',
    port: PORT
  });
});

// 注册API
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;
    
    // 验证输入
    if (!username || !email || !password) {
      return res.status(400).json({ error: '缺少必要字段：用户名、邮箱和密码' });
    }
    
    if (username.length< 3) {
      return res.status(400).json({ error: '用户名至少需要3个字符' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: '密码至少需要6个字符' });
    }
    
    // 加载现有用户
    const users = loadData(USERS_FILE);
    
    // 检查用户是否已存在
    const existingUser = users.find(u =>u.username === username || u.email === email);
    if (existingUser) {
      return res.status(400).json({ error: '用户名或邮箱已存在' });
    }
    
    // 创建新用户
    const uuid = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    
    const newUser = {
      id: users.length >0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
      uuid,
      username,
      email,
      password_hash: passwordHash,
      display_name: displayName || username,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    users.push(newUser);
    
    // 保存用户数据
    if (!saveData(USERS_FILE, users)) {
      return res.status(500).json({ error: '保存用户数据失败' });
    }
    
    // 生成JWT令牌
    const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '7d' });
    
    res.status(201).json({ 
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
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
});

// 登录API
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: '请提供用户名和密码' });
    }
    
    // 加载用户数据
    const users = loadData(USERS_FILE);
    
    // 支持用户名或邮箱登录
    const user = users.find(u => u.username === username || u.email === username);
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    
    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    
    // 生成JWT令牌
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
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
});

// 获取用户信息
app.get('/api/auth/me', authenticate, (req, res) => {
  try {
    const users = loadData(USERS_FILE);
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
  try {
    const works = loadData(WORKS_FILE);
    res.json(works);
    
  } catch (err) {
    console.error('获取作品错误:', err);
    res.status(500).json({ error: '获取作品失败' });
  }
});

// 导入作品链接
app.post('/api/works/import-url', authenticate, (req, res) => {
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
    const works = loadData(WORKS_FILE);
    
    // 检查重复链接
    const existingWork = works.find(w => w.url === url && w.user_id === req.user.userId);
    if (existingWork) {
      return res.status(400).json({ error: '该链接已存在，请检查是否重复导入' });
    }
    
    // 创建新作品
    const uuid = uuidv4();
    
    const newWork = {
      id: works.length > 0 ? Math.max(...works.map(w => w.id)) + 1 : 1,
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
    
    // 保存作品数据
    if (!saveData(WORKS_FILE, works)) {
      return res.status(500).json({ error: '保存作品数据失败' });
    }
    
    res.status(201).json({ message: '作品导入成功' });
    
  } catch (err) {
    console.error('导入作品错误:', err);
    res.status(500).json({ error: '导入作品失败' });
  }
});

// 上传文件作品
app.post('/api/works/upload', authenticate, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择文件' });
    }
    
    const { title, description, category, tags } = req.body;
    
    // 加载现有作品
    const works = loadData(WORKS_FILE);
    
    // 创建新作品
    const uuid = uuidv4();
    
    const fileUrl = `/uploads/${req.file.filename}`;
    let fileType = 'other';
    
    // 判断文件类型
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
      title: title || req.file.originalname,
      description: description || '',
      url: fileUrl,
      file_path: req.file.path,
      file_name: req.file.originalname,
      file_size: req.file.size,
      file_type: fileType,
      category: category || '',
      tags: tags || '',
      source: 'upload',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    works.push(newWork);
    
    // 保存作品数据
    if (!saveData(WORKS_FILE, works)) {
      return res.status(500).json({ error: '保存作品数据失败' });
    }
    
    res.status(201).json({ 
      message: '文件上传成功',
      work: newWork
    });
    
  } catch (err) {
    console.error('上传文件错误:', err);
    res.status(500).json({ error: '文件上传失败' });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`=================================`);
  console.log(`Portfolio Server v2 启动成功`);
  console.log(`服务器地址: http://localhost:${PORT}`);
  console.log(`健康检查: http://localhost:${PORT}/api/health`);
  console.log(`=================================`);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n正在关闭服务器...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n正在关闭服务器...');
  process.exit(0);
});
