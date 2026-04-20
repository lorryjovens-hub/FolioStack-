import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { initTurso, initDatabase, run, get, all, close } from './turso-db.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import multer from 'multer';
import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync } from 'fs';
import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';
import nodemailer from 'nodemailer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3003;
const JWT_SECRET = process.env.JWT_SECRET || 'portfolio-secret-key-2024';

// 确保上传目录存在
const uploadsDir = join(__dirname, '..', 'uploads');
const mediaDir = join(__dirname, '..', 'uploads', 'media');
if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
if (!existsSync(mediaDir)) mkdirSync(mediaDir, { recursive: true });

// Multer配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, mediaDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|mov|avi|pdf/;
    const extname = allowedTypes.test(file.mimetype);
    if (extname) {
      return cb(null, true);
    }
    cb(new Error('不支持的文件类型'));
  }
});

// 中间件
app.use(cors({ 
  origin: true, 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Origin', 'Content-Type', 'Accept', 'Authorization'],
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(uploadsDir));

// 前台作品集路由 - 必须在静态文件之前
app.get('/portfolio/:username', (req, res) => {
  res.sendFile(join(__dirname, '..', 'portfolio.html'));
});

app.get('/portfolio/:username/work/:workId', (req, res) => {
  res.sendFile(join(__dirname, '..', 'work-detail.html'));
});

// 静态文件
app.use(express.static(join(__dirname, '..')));

// JWT认证中间件
function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: '未授权，请先登录' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: '无效的令牌，请重新登录' });
  }
}

// 可选认证中间件
function optionalAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      // 忽略无效令牌
    }
  }
  next();
}

// ==================== 健康检查 ====================
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// ==================== 认证相关API ====================

// 注册
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, displayName, phone } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: '缺少必要字段：用户名、邮箱、密码' });
    }

    // 检查用户名或邮箱是否已存在
    const existingUser = await get(
      'SELECT * FROM users WHERE username = ? OR email = ?', 
      [username, email]
    );
    
    if (existingUser) {
      return res.status(400).json({ error: '用户名或邮箱已存在' });
    }

    const uuid = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    
    await run(
      `INSERT INTO users (uuid, username, email, phone, password_hash, display_name) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [uuid, username, email, phone || null, passwordHash, displayName || username]
    );

    const newUser = await get('SELECT * FROM users WHERE username = ?', [username]);
    const token = jwt.sign({ userId: newUser.id, username: newUser.username }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ 
      success: true,
      message: '注册成功',
      token,
      user: { 
        id: newUser.id, 
        uuid: newUser.uuid,
        username: newUser.username,
        email: newUser.email,
        displayName: newUser.display_name,
        avatarUrl: newUser.avatar_url
      }
    });
  } catch (err) {
    console.error('[API] 注册错误:', err);
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
});

// 登录
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password, email } = req.body;
    const loginField = email || username;
    
    if (!loginField || !password) {
      return res.status(400).json({ error: '请提供用户名/邮箱和密码' });
    }

    const user = await get(
      'SELECT * FROM users WHERE username = ? OR email = ?', 
      [loginField, loginField]
    );
    
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ 
      success: true,
      message: '登录成功', 
      token,
      user: { 
        id: user.id, 
        uuid: user.uuid,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        role: user.role
      }
    });
  } catch (err) {
    console.error('[API] 登录错误:', err);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
});

// 获取当前用户信息
app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    const user = await get(
      `SELECT id, uuid, username, email, phone, display_name, avatar_url, 
              bio, occupation, location, facebook, twitter, linkedin, github, website,
              role, is_verified, created_at 
       FROM users WHERE id = ?`, 
      [req.user.userId]
    );
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    res.json({
      success: true,
      user: {
        id: user.id,
        uuid: user.uuid,
        username: user.username,
        email: user.email,
        phone: user.phone,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        occupation: user.occupation,
        location: user.location,
        social: {
          facebook: user.facebook,
          twitter: user.twitter,
          linkedin: user.linkedin,
          github: user.github,
          website: user.website
        },
        role: user.role,
        isVerified: user.is_verified === 1,
        createdAt: user.created_at
      }
    });
  } catch (err) {
    console.error('[API] 获取用户信息错误:', err);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

// 更新用户信息
app.put('/api/auth/profile', authenticate, async (req, res) => {
  try {
    const { displayName, bio, occupation, location, avatarUrl, social } = req.body;
    
    await run(
      `UPDATE users SET 
        display_name = ?, bio = ?, occupation = ?, location = ?, avatar_url = ?,
        facebook = ?, twitter = ?, linkedin = ?, github = ?, website = ?,
        updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [
        displayName, bio, occupation, location, avatarUrl,
        social?.facebook, social?.twitter, social?.linkedin, social?.github, social?.website,
        req.user.userId
      ]
    );
    
    res.json({ success: true, message: '个人信息更新成功' });
  } catch (err) {
    console.error('[API] 更新用户信息错误:', err);
    res.status(500).json({ error: '更新个人信息失败' });
  }
});

// 修改密码
app.put('/api/auth/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const user = await get('SELECT password_hash FROM users WHERE id = ?', [req.user.userId]);
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    
    if (!isValid) {
      return res.status(400).json({ error: '当前密码错误' });
    }
    
    const newHash = await bcrypt.hash(newPassword, 10);
    await run('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.user.userId]);
    
    res.json({ success: true, message: '密码修改成功' });
  } catch (err) {
    console.error('[API] 修改密码错误:', err);
    res.status(500).json({ error: '修改密码失败' });
  }
});

// 发送邮箱验证码
app.post('/api/auth/send-email-code', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: '请提供有效的邮箱地址' });
    }
    
    // 生成6位验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10分钟过期
    
    // 保存验证码
    await run(
      'INSERT INTO verification_codes (type, target, code, expires_at) VALUES (?, ?, ?, ?)',
      ['email', email, code, expiresAt.toISOString()]
    );
    
    // TODO: 实际发送邮件（需要配置SMTP）
    console.log(`[Email Code] ${email}: ${code}`);
    
    res.json({ success: true, message: '验证码已发送', code }); // 开发环境返回code
  } catch (err) {
    console.error('[API] 发送验证码错误:', err);
    res.status(500).json({ error: '发送验证码失败' });
  }
});

// 邮箱验证码登录
app.post('/api/auth/email-login', async (req, res) => {
  try {
    const { email, code } = req.body;
    
    // 验证验证码
    const record = await get(
      `SELECT * FROM verification_codes 
       WHERE type = 'email' AND target = ? AND code = ? AND used = 0 
       AND expires_at > CURRENT_TIMESTAMP 
       ORDER BY created_at DESC LIMIT 1`,
      [email, code]
    );
    
    if (!record) {
      return res.status(400).json({ error: '验证码无效或已过期' });
    }
    
    // 标记验证码已使用
    await run('UPDATE verification_codes SET used = 1 WHERE id = ?', [record.id]);
    
    // 查找或创建用户
    let user = await get('SELECT * FROM users WHERE email = ?', [email]);
    
    if (!user) {
      // 创建新用户
      const uuid = uuidv4();
      const username = email.split('@')[0] + '_' + Date.now().toString(36);
      await run(
        'INSERT INTO users (uuid, username, email, password_hash, display_name) VALUES (?, ?, ?, ?, ?)',
        [uuid, username, email, await bcrypt.hash(uuidv4(), 10), username]
      );
      user = await get('SELECT * FROM users WHERE email = ?', [email]);
    }
    
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({
      success: true,
      message: '登录成功',
      token,
      user: {
        id: user.id,
        uuid: user.uuid,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        avatarUrl: user.avatar_url
      }
    });
  } catch (err) {
    console.error('[API] 邮箱登录错误:', err);
    res.status(500).json({ error: '登录失败' });
  }
});

// ==================== 作品管理API ====================

// 获取作品列表
app.get('/api/works', authenticate, async (req, res) => {
  try {
    const { status, category, search, limit = 100, offset = 0 } = req.query;
    
    let sql = 'SELECT * FROM works WHERE user_id = ?';
    const params = [req.user.userId];
    
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    
    if (search) {
      sql += ' AND (title LIKE ? OR description LIKE ? OR tags LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    sql += ' ORDER BY sort_order ASC, created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const works = await all(sql, params);
    
    // 获取总数
    let countSql = 'SELECT COUNT(*) as total FROM works WHERE user_id = ?';
    const countParams = [req.user.userId];
    
    if (status) {
      countSql += ' AND status = ?';
      countParams.push(status);
    }
    if (category) {
      countSql += ' AND category = ?';
      countParams.push(category);
    }
    if (search) {
      countSql += ' AND (title LIKE ? OR description LIKE ? OR tags LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    const countResult = await get(countSql, countParams);
    
    res.json({ 
      success: true,
      data: works,
      pagination: {
        total: countResult.total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (err) {
    console.error('[API] 获取作品列表错误:', err);
    res.status(500).json({ error: '获取作品列表失败' });
  }
});

// 获取单个作品
app.get('/api/works/:id', authenticate, async (req, res) => {
  try {
    const work = await get(
      'SELECT * FROM works WHERE uuid = ? AND user_id = ?', 
      [req.params.id, req.user.userId]
    );
    
    if (!work) {
      return res.status(404).json({ error: '作品不存在' });
    }
    
    res.json({ success: true, data: work });
  } catch (err) {
    console.error('[API] 获取作品错误:', err);
    res.status(500).json({ error: '获取作品失败' });
  }
});

// 创建作品
app.post('/api/works', authenticate, async (req, res) => {
  try {
    const { 
      title, description, content, url, category, tags, 
      coverUrl, source, sourceFile, fileType, fileSize, status 
    } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: '作品标题不能为空' });
    }
    
    const uuid = uuidv4();
    const publishedAt = status === 'published' ? new Date().toISOString() : null;
    
    await run(
      `INSERT INTO works (
        uuid, user_id, title, description, content, url, category, tags,
        cover_url, source, source_file, file_type, file_size, status, published_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuid, req.user.userId, title, description || '', content || '', 
        url || '', category || '', tags || '', coverUrl || '',
        source || 'manual', sourceFile || null, fileType || null, 
        fileSize || null, status || 'draft', publishedAt
      ]
    );
    
    const newWork = await get('SELECT * FROM works WHERE uuid = ?', [uuid]);
    
    res.json({ success: true, message: '作品创建成功', data: newWork });
  } catch (err) {
    console.error('[API] 创建作品错误:', err);
    res.status(500).json({ error: '创建作品失败' });
  }
});

// 更新作品
app.put('/api/works/:id', authenticate, async (req, res) => {
  try {
    const { 
      title, description, content, url, category, tags,
      coverUrl, status, sortOrder, isFeatured 
    } = req.body;
    
    const existingWork = await get(
      'SELECT * FROM works WHERE uuid = ? AND user_id = ?', 
      [req.params.id, req.user.userId]
    );
    
    if (!existingWork) {
      return res.status(404).json({ error: '作品不存在' });
    }
    
    const publishedAt = status === 'published' && existingWork.status !== 'published' 
      ? new Date().toISOString() 
      : existingWork.published_at;
    
    await run(
      `UPDATE works SET 
        title = ?, description = ?, content = ?, url = ?, 
        category = ?, tags = ?, cover_url = ?, status = ?,
        sort_order = ?, is_featured = ?, published_at = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE uuid = ? AND user_id = ?`,
      [
        title || existingWork.title,
        description !== undefined ? description : existingWork.description,
        content !== undefined ? content : existingWork.content,
        url !== undefined ? url : existingWork.url,
        category !== undefined ? category : existingWork.category,
        tags !== undefined ? tags : existingWork.tags,
        coverUrl !== undefined ? coverUrl : existingWork.cover_url,
        status || existingWork.status,
        sortOrder !== undefined ? sortOrder : existingWork.sort_order,
        isFeatured !== undefined ? (isFeatured ? 1 : 0) : existingWork.is_featured,
        publishedAt,
        req.params.id,
        req.user.userId
      ]
    );
    
    const updatedWork = await get('SELECT * FROM works WHERE uuid = ?', [req.params.id]);
    
    res.json({ success: true, message: '作品更新成功', data: updatedWork });
  } catch (err) {
    console.error('[API] 更新作品错误:', err);
    res.status(500).json({ error: '更新作品失败' });
  }
});

// 删除作品
app.delete('/api/works/:id', authenticate, async (req, res) => {
  try {
    const result = await run(
      'DELETE FROM works WHERE uuid = ? AND user_id = ?', 
      [req.params.id, req.user.userId]
    );
    
    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: '作品不存在' });
    }
    
    res.json({ success: true, message: '作品删除成功' });
  } catch (err) {
    console.error('[API] 删除作品错误:', err);
    res.status(500).json({ error: '删除作品失败' });
  }
});

// 导入作品链接
app.post('/api/works/import-url', authenticate, async (req, res) => {
  try {
    const { url, title, description, category, tags, coverUrl } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: '请提供URL' });
    }
    
    const uuid = uuidv4();
    
    await run(
      `INSERT INTO works (
        uuid, user_id, title, description, url, category, tags, 
        cover_url, source, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuid, req.user.userId, 
        title || '未命名作品', 
        description || '', 
        url, 
        category || '', 
        tags || '',
        coverUrl || '',
        'link',
        'draft'
      ]
    );
    
    const newWork = await get('SELECT * FROM works WHERE uuid = ?', [uuid]);
    
    res.json({ success: true, message: '作品导入成功', data: newWork });
  } catch (err) {
    console.error('[API] 导入作品错误:', err);
    res.status(500).json({ error: '导入作品失败' });
  }
});

// 导入GitHub项目
app.post('/api/works/import-github', authenticate, async (req, res) => {
  try {
    const { repoUrl } = req.body;
    
    if (!repoUrl || !repoUrl.includes('github.com')) {
      return res.status(400).json({ error: '请提供有效的GitHub仓库链接' });
    }
    
    // 解析GitHub仓库信息
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      return res.status(400).json({ error: '无法解析GitHub仓库链接' });
    }
    
    const [, owner, repo] = match;
    const repoName = repo.replace('.git', '');
    
    // 尝试获取GitHub项目信息
    let description = '';
    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repoName}`);
      if (response.ok) {
        const data = await response.json();
        description = data.description || '';
      }
    } catch (e) {
      console.log('GitHub API fetch failed, using default');
    }
    
    const uuid = uuidv4();
    
    await run(
      `INSERT INTO works (
        uuid, user_id, title, description, url, category, 
        source, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuid, req.user.userId, 
        repoName,
        description,
        repoUrl,
        'development',
        'github',
        'draft'
      ]
    );
    
    const newWork = await get('SELECT * FROM works WHERE uuid = ?', [uuid]);
    
    res.json({ success: true, message: 'GitHub项目导入成功', data: newWork });
  } catch (err) {
    console.error('[API] 导入GitHub项目错误:', err);
    res.status(500).json({ error: '导入GitHub项目失败' });
  }
});

// 批量发布作品
app.post('/api/works/batch/publish', authenticate, async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: '请提供要发布的作品ID' });
    }
    
    const publishedAt = new Date().toISOString();
    
    for (const id of ids) {
      await run(
        `UPDATE works SET status = 'published', published_at = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE uuid = ? AND user_id = ?`,
        [publishedAt, id, req.user.userId]
      );
    }
    
    res.json({ success: true, message: `成功发布 ${ids.length} 个作品` });
  } catch (err) {
    console.error('[API] 批量发布错误:', err);
    res.status(500).json({ error: '批量发布失败' });
  }
});

// 取消发布
app.patch('/api/works/:id/unpublish', authenticate, async (req, res) => {
  try {
    await run(
      `UPDATE works SET status = 'draft', updated_at = CURRENT_TIMESTAMP 
       WHERE uuid = ? AND user_id = ?`,
      [req.params.id, req.user.userId]
    );
    
    res.json({ success: true, message: '作品已取消发布' });
  } catch (err) {
    console.error('[API] 取消发布错误:', err);
    res.status(500).json({ error: '取消发布失败' });
  }
});

// 设置精选作品
app.patch('/api/works/:id/feature', authenticate, async (req, res) => {
  try {
    const work = await get(
      'SELECT is_featured FROM works WHERE uuid = ? AND user_id = ?',
      [req.params.id, req.user.userId]
    );
    
    if (!work) {
      return res.status(404).json({ error: '作品不存在' });
    }
    
    const newFeatured = work.is_featured === 1 ? 0 : 1;
    
    await run(
      'UPDATE works SET is_featured = ?, updated_at = CURRENT_TIMESTAMP WHERE uuid = ?',
      [newFeatured, req.params.id]
    );
    
    res.json({ 
      success: true, 
      message: newFeatured ? '已设为精选作品' : '已取消精选',
      isFeatured: newFeatured === 1
    });
  } catch (err) {
    console.error('[API] 设置精选错误:', err);
    res.status(500).json({ error: '设置精选失败' });
  }
});

// ==================== 前台作品集API（公开访问）====================

// 获取用户公开作品集
app.get('/api/portfolio/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    const user = await get(
      `SELECT id, uuid, username, display_name, avatar_url, bio, occupation, location,
              facebook, twitter, linkedin, github, website
       FROM users WHERE username = ?`,
      [username]
    );
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    // 获取已发布的作品
    const works = await all(
      `SELECT uuid, title, description, url, category, tags, cover_url,
              thumbnail_type, thumbnail_data, view_count, likes, created_at
       FROM works 
       WHERE user_id = ? AND status = 'published'
       ORDER BY is_featured DESC, sort_order ASC, created_at DESC`,
      [user.id]
    );
    
    res.json({
      success: true,
      user: {
        username: user.username,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        occupation: user.occupation,
        location: user.location,
        social: {
          facebook: user.facebook,
          twitter: user.twitter,
          linkedin: user.linkedin,
          github: user.github,
          website: user.website
        }
      },
      works
    });
  } catch (err) {
    console.error('[API] 获取作品集错误:', err);
    res.status(500).json({ error: '获取作品集失败' });
  }
});

// 获取单个作品详情（公开）
app.get('/api/portfolio/:username/work/:workId', async (req, res) => {
  try {
    const { username, workId } = req.params;
    
    const user = await get('SELECT id FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    const work = await get(
      `SELECT uuid, title, description, content, url, category, tags, cover_url,
              source, view_count, likes, created_at, updated_at
       FROM works 
       WHERE uuid = ? AND user_id = ? AND status = 'published'`,
      [workId, user.id]
    );
    
    if (!work) {
      return res.status(404).json({ error: '作品不存在或未发布' });
    }
    
    // 增加浏览量
    await run('UPDATE works SET view_count = view_count + 1 WHERE uuid = ?', [workId]);
    
    res.json({ success: true, data: work });
  } catch (err) {
    console.error('[API] 获取作品详情错误:', err);
    res.status(500).json({ error: '获取作品详情失败' });
  }
});

// ==================== 媒体文件API ====================

// 上传文件
app.post('/api/media/upload', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' });
    }
    
    const uuid = uuidv4();
    const fileUrl = `/uploads/media/${req.file.filename}`;
    
    await run(
      `INSERT INTO media (uuid, user_id, filename, original_name, mime_type, 
                          file_size, file_path, url) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuid, req.user.userId, req.file.filename, req.file.originalname,
        req.file.mimetype, req.file.size, req.file.path, fileUrl
      ]
    );
    
    const media = await get('SELECT * FROM media WHERE uuid = ?', [uuid]);
    
    res.json({
      success: true,
      message: '文件上传成功',
      data: {
        uuid: media.uuid,
        url: media.url,
        originalName: media.original_name,
        mimeType: media.mime_type,
        size: media.file_size
      }
    });
  } catch (err) {
    console.error('[API] 上传文件错误:', err);
    res.status(500).json({ error: '文件上传失败' });
  }
});

// 获取用户的媒体文件列表
app.get('/api/media/list', authenticate, async (req, res) => {
  try {
    const media = await all(
      `SELECT uuid, filename, original_name, mime_type, file_size, url, created_at 
       FROM media WHERE user_id = ? ORDER BY created_at DESC`,
      [req.user.userId]
    );
    
    res.json({ success: true, data: media });
  } catch (err) {
    console.error('[API] 获取媒体列表错误:', err);
    res.status(500).json({ error: '获取媒体列表失败' });
  }
});

// 删除媒体文件
app.delete('/api/media/:uuid', authenticate, async (req, res) => {
  try {
    const media = await get(
      'SELECT * FROM media WHERE uuid = ? AND user_id = ?',
      [req.params.uuid, req.user.userId]
    );
    
    if (!media) {
      return res.status(404).json({ error: '媒体文件不存在' });
    }
    
    // 删除物理文件
    try {
      unlinkSync(media.file_path);
    } catch (e) {
      console.log('文件已不存在或删除失败');
    }
    
    await run('DELETE FROM media WHERE uuid = ?', [req.params.uuid]);
    
    res.json({ success: true, message: '媒体文件已删除' });
  } catch (err) {
    console.error('[API] 删除媒体错误:', err);
    res.status(500).json({ error: '删除媒体文件失败' });
  }
});

// ==================== 分析统计API ====================

// 记录访问数据
app.post('/api/analytics/track', async (req, res) => {
  try {
    const { 
      sessionId, page, referrer, userAgent, 
      screenWidth, screenHeight, workId 
    } = req.body;
    
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    await run(
      `INSERT INTO analytics (
        session_id, work_id, event_type, page_url, referrer, 
        user_agent, ip_address, screen_width, screen_height
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sessionId, workId || null, 'page_view', page, referrer || '',
        userAgent || '', ipAddress, screenWidth || 0, screenHeight || 0
      ]
    );
    
    res.json({ success: true });
  } catch (err) {
    console.error('[API] 跟踪访问错误:', err);
    res.json({ success: false }); // 跟踪失败不返回错误
  }
});

// 记录事件
app.post('/api/analytics/track-event', async (req, res) => {
  try {
    const { sessionId, eventName, eventData, workId } = req.body;
    
    await run(
      `INSERT INTO analytics (session_id, work_id, event_type, event_data) 
       VALUES (?, ?, ?, ?)`,
      [sessionId, workId || null, eventName, JSON.stringify(eventData || {})]
    );
    
    res.json({ success: true });
  } catch (err) {
    console.error('[API] 跟踪事件错误:', err);
    res.json({ success: false });
  }
});

// 获取分析数据（需要认证）
app.get('/api/analytics', authenticate, async (req, res) => {
  try {
    const { range = '7d' } = req.query;
    const days = parseInt(range) || 7;
    
    // 获取用户的作品
    const works = await all('SELECT * FROM works WHERE user_id = ?', [req.user.userId]);
    
    // 生成最近N天的日期标签和数据
    const labels = [];
    const data = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      labels.push(date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }));
      
      // 查询当天的访问数
      const visitResult = await get(
        `SELECT COUNT(*) as count FROM analytics 
         WHERE event_type = 'page_view' 
         AND DATE(created_at) = ? 
         AND work_id IN (SELECT id FROM works WHERE user_id = ?)`,
        [dateStr, req.user.userId]
      );
      
      data.push(visitResult?.count || 0);
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
        uuid: w.uuid,
        title: w.title,
        visits: w.view_count || 0,
        likes: w.likes || 0
      }));
    
    // 获取总访问数
    const totalVisitsResult = await get(
      `SELECT COUNT(*) as count FROM analytics 
       WHERE event_type = 'page_view' 
       AND work_id IN (SELECT id FROM works WHERE user_id = ?)`,
      [req.user.userId]
    );
    
    res.json({
      success: true,
      visits: { labels, data },
      categories: {
        labels: Object.keys(categoryStats).map(k => {
          const map = { design: '设计', development: '开发', video: '视频', photography: '摄影', writing: '写作' };
          return map[k] || '其他';
        }),
        data: Object.values(categoryStats)
      },
      topWorks,
      summary: {
        totalWorks: works.length,
        totalViews: works.reduce((sum, w) => sum + (w.view_count || 0), 0),
        totalLikes: works.reduce((sum, w) => sum + (w.likes || 0), 0),
        publishedWorks: works.filter(w => w.status === 'published').length,
        totalVisits: totalVisitsResult?.count || 0
      }
    });
  } catch (err) {
    console.error('[API] 获取分析数据错误:', err);
    res.status(500).json({ error: '获取分析数据失败' });
  }
});

// ==================== AI生成API ====================

// AI代理请求
app.post('/api/ai/proxy', authenticate, async (req, res) => {
  try {
    const { provider, endpoint, apiKey, model, messages, temperature, stream } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({ error: '请提供API Key' });
    }
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };
    
    // 根据提供商添加特定header
    if (provider === 'volcano') {
      headers['X-Api-Key'] = apiKey;
    }
    
    const body = {
      model: model || 'gpt-3.5-turbo',
      messages,
      temperature: temperature || 0.7,
      stream: stream || false
    };
    
    // 记录生成请求
    const generationUuid = uuidv4();
    await run(
      `INSERT INTO ai_generations (uuid, user_id, prompt, style, status) 
       VALUES (?, ?, ?, ?, ?)`,
      [generationUuid, req.user.userId, messages[0]?.content || '', model, 'processing']
    );
    
    // 发送请求到AI服务
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      await run(
        `UPDATE ai_generations SET status = 'failed', result = ? WHERE uuid = ?`,
        [errorText, generationUuid]
      );
      return res.status(response.status).json({ error: 'AI服务请求失败', details: errorText });
    }
    
    // 处理流式响应
    if (stream && response.headers.get('content-type')?.includes('text/event-stream')) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      const reader = response.body.getReader();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
      } catch (e) {
        console.error('Stream error:', e);
        res.end();
      }
    } else {
      const data = await response.json();
      
      // 更新生成记录
      await run(
        `UPDATE ai_generations SET status = 'completed', result = ?, completed_at = CURRENT_TIMESTAMP 
         WHERE uuid = ?`,
        [JSON.stringify(data), generationUuid]
      );
      
      res.json(data);
    }
  } catch (err) {
    console.error('[API] AI代理错误:', err);
    res.status(500).json({ error: 'AI请求失败: ' + err.message });
  }
});

// 获取AI生成历史
app.get('/api/ai/generations', authenticate, async (req, res) => {
  try {
    const generations = await all(
      `SELECT uuid, prompt, style, status, tokens_used, cost, created_at, completed_at 
       FROM ai_generations WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
      [req.user.userId]
    );
    
    res.json({ success: true, data: generations });
  } catch (err) {
    console.error('[API] 获取AI生成历史错误:', err);
    res.status(500).json({ error: '获取生成历史失败' });
  }
});

// ==================== 分类API ====================

// 获取分类列表
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await all(
      'SELECT uuid, name, description, icon, parent_id, sort_order FROM categories ORDER BY sort_order ASC'
    );
    
    res.json({ success: true, data: categories });
  } catch (err) {
    console.error('[API] 获取分类错误:', err);
    res.status(500).json({ error: '获取分类失败' });
  }
});

// ==================== 评论API ====================

// 获取作品评论
app.get('/api/works/:id/comments', async (req, res) => {
  try {
    const work = await get('SELECT id FROM works WHERE uuid = ?', [req.params.id]);
    if (!work) {
      return res.status(404).json({ error: '作品不存在' });
    }
    
    const comments = await all(
      `SELECT c.uuid, c.content, c.visitor_name, c.created_at, c.likes,
              u.username, u.display_name, u.avatar_url
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.work_id = ? AND c.status = 'approved' AND c.parent_id IS NULL
       ORDER BY c.created_at DESC`,
      [work.id]
    );
    
    res.json({ success: true, data: comments });
  } catch (err) {
    console.error('[API] 获取评论错误:', err);
    res.status(500).json({ error: '获取评论失败' });
  }
});

// 添加评论
app.post('/api/works/:id/comments', optionalAuth, async (req, res) => {
  try {
    const { content, visitorName, visitorEmail, parentId } = req.body;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: '评论内容不能为空' });
    }
    
    const work = await get('SELECT id, user_id FROM works WHERE uuid = ?', [req.params.id]);
    if (!work) {
      return res.status(404).json({ error: '作品不存在' });
    }
    
    const uuid = uuidv4();
    
    await run(
      `INSERT INTO comments (uuid, user_id, work_id, visitor_name, visitor_email, content, parent_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        uuid,
        req.user?.userId || null,
        work.id,
        req.user?.username || visitorName || '匿名用户',
        visitorEmail || null,
        content.trim(),
        parentId || null
      ]
    );
    
    res.json({ success: true, message: '评论已提交，等待审核' });
  } catch (err) {
    console.error('[API] 添加评论错误:', err);
    res.status(500).json({ error: '添加评论失败' });
  }
});

// ==================== 错误处理 ====================

// 404处理
app.use((req, res) => {
  res.status(404).json({ error: 'API端点不存在' });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('[API] 服务器错误:', err);
  res.status(500).json({ error: '服务器内部错误', message: err.message });
});

// ==================== 启动服务器 ====================

async function start() {
  try {
    // 初始化Turso数据库
    await initTurso();
    await initDatabase();
    console.log('[Server] 数据库初始化完成');
    
    // 启动服务器
    app.listen(PORT, () => {
      console.log(`[Server] API服务器运行在 http://localhost:${PORT}`);
      console.log(`[Server] API文档: http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    console.error('[Server] 启动失败:', err);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('\n[Server] 正在关闭...');
  await close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[Server] 正在关闭...');
  await close();
  process.exit(0);
});

start();
