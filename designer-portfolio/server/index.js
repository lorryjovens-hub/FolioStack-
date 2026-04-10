import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import { initDB, run, get, all, closeDB, getType } from './db.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import multer from 'multer';
import sharp from 'sharp';
import AdmZip from 'adm-zip';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'portfolio-secret-key-change-in-production';

const EMAIL_CONFIG = {
  host: 'smtp.qq.com',
  port: 465,
  secure: true,
  auth: {
    user: '2574566046@qq.com',
    pass: 'mtagelcqspzcdjga'
  }
};

const transporter = nodemailer.createTransport(EMAIL_CONFIG);

app.use(cors({ 
  origin: true, 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Origin', 'Content-Type', 'Accept', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  maxAge: 86400
}));
app.use(express.json({ limit: '10mb' }));

// 添加代理支持的中间件
app.use((req, res, next) => {
  // 设置安全头
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // 支持代理环境下的IP获取
  if (req.headers['x-forwarded-for']) {
    req.ip = req.headers['x-forwarded-for'].split(',')[0].trim();
  } else if (req.headers['x-real-ip']) {
    req.ip = req.headers['x-real-ip'];
  }
  
  next();
});

// 创建必要的目录
const uploadsDir = join(__dirname, '../uploads');
const worksDir = join(__dirname, '../works');
const extractedDir = join(__dirname, '../extracted');

// 确保目录存在
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(worksDir)) fs.mkdirSync(worksDir, { recursive: true });
if (!fs.existsSync(extractedDir)) fs.mkdirSync(extractedDir, { recursive: true });

// 文件上传配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}_${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB限制
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/zip', 'application/x-zip-compressed', 'text/html', 'application/javascript', 'text/css'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('文件类型不支持，仅支持 ZIP、HTML、JS、CSS 文件'));
    }
  }
});

const imageUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB限制（用于压缩）
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('文件类型不支持，仅支持图片文件'));
    }
  }
});

// 静态文件服务
app.use('/uploads', express.static(uploadsDir));
app.use('/works', express.static(worksDir));
app.use('/extracted', express.static(extractedDir));

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const sessions = await all('SELECT * FROM sessions WHERE token = $1', [token]);
    if (sessions.length === 0) {
      return res.status(401).json({ error: 'Session expired' });
    }
    const session = sessions[0];
    if (new Date(session.expires_at) <= new Date()) {
      return res.status(401).json({ error: 'Session expired' });
    }
    req.user = { id: decoded.id, uuid: decoded.uuid, role: decoded.role };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const existing = await get('SELECT id FROM users WHERE username = $1 OR email = $2', [username, email]);
    if (existing) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const userUuid = uuidv4();

    // 插入用户到 users 表
    await run(
      'INSERT INTO users (uuid, username, email, password_hash, display_name, role) VALUES ($1, $2, $3, $4, $5, $6)',
      [userUuid, username, email, passwordHash, displayName || username, 'user']
    );

    // 获取新创建的用户
    const user = await get('SELECT * FROM users WHERE username = $1', [username]);

    const token = jwt.sign({ id: user.id, uuid: user.uuid, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
    await run('INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)', [user.id, token, expiresAt]);

    res.status(201).json({ token, user: { id: user.id, uuid: user.uuid, username, email, displayName: displayName || username } });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Missing credentials' });
    }
    const user = await get('SELECT * FROM users WHERE username = $1 OR email = $2', [username, username]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, uuid: user.uuid, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
    await run('DELETE FROM sessions WHERE user_id = $1', [user.id]);
    await run('INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)', [user.id, token, expiresAt]);

    res.json({ token, user: { id: user.id, uuid: user.uuid, username: user.username, email: user.email, displayName: user.display_name, role: user.role } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/logout', authenticate, async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader.split(' ')[1];
  await run('DELETE FROM sessions WHERE token = $1', [token]);
  res.json({ success: true });
});

app.post('/api/auth/send-sms', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: '请提供手机号' });
    }
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ error: '手机号格式不正确' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);

    await run('DELETE FROM sms_codes WHERE phone = $1', [phone]);
    await run('INSERT INTO sms_codes (phone, code, expires_at) VALUES ($1, $2, $3)', [phone, code, expiresAt]);

    const smsUrl = `https://push.spug.cc/send/abc?code=${code}&targets=${phone}`;
    console.log(`[SMS] Sending to ${phone}: ${smsUrl}`);

    try {
      const response = await fetch(smsUrl);
      const result = await response.text();
      console.log('[SMS] Response:', result);
    } catch (smsErr) {
      console.error('[SMS] Send failed:', smsErr.message);
    }

    res.json({ success: true, message: '验证码已发送' });
  } catch (err) {
    console.error('Send SMS error:', err);
    res.status(500).json({ error: '发送验证码失败' });
  }
});

app.post('/api/auth/sms-login', async (req, res) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ error: '请提供手机号和验证码' });
    }

    const smsRecord = await get('SELECT * FROM sms_codes WHERE phone = $1 AND code = $2 AND used = 0', [phone, code]);
    if (!smsRecord) {
      return res.status(401).json({ error: '验证码错误或已过期' });
    }

    if (new Date(smsRecord.expires_at) <= new Date()) {
      await run('DELETE FROM sms_codes WHERE phone = $1', [phone]);
      return res.status(401).json({ error: '验证码已过期' });
    }

    await run('UPDATE sms_codes SET used = 1 WHERE phone = $1', [phone]);

    let user = await get('SELECT * FROM users WHERE phone = $1', [phone]);

    if (!user) {
      const username = `user_${phone.slice(-8)}`;
      const tempPassword = Math.random().toString(36).substring(2);
      const passwordHash = await bcrypt.hash(tempPassword, 10);
      const userUuid = uuidv4();

      await run(
        'INSERT INTO users (uuid, username, phone, password_hash, display_name) VALUES ($1, $2, $3, $4, $5)',
        [userUuid, username, phone, passwordHash, username]
      );
      user = await get('SELECT * FROM users WHERE phone = $1', [phone]);
    }

    const token = jwt.sign({ id: user.id, uuid: user.uuid, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
    await run('DELETE FROM sessions WHERE user_id = $1', [user.id]);
    await run('INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)', [user.id, token, expiresAt]);

    res.json({
      token,
      user: {
        id: user.id,
        uuid: user.uuid,
        username: user.username,
        phone: user.phone,
        displayName: user.display_name,
        role: user.role
      }
    });
  } catch (err) {
    console.error('SMS Login error:', err);
    res.status(500).json({ error: '登录失败' });
  }
});

app.post('/api/auth/send-email-code', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: '请提供邮箱地址' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: '邮箱格式不正确' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);

    await run('DELETE FROM email_codes WHERE email = $1', [email]);
    await run('INSERT INTO email_codes (email, code, expires_at) VALUES ($1, $2, $3)', [email, code, expiresAt]);

    console.log(`[EMAIL] Verification code for ${email}: ${code}`);

    const mailOptions = {
      from: '"FolioStack" <2574566046@qq.com>',
      to: email,
      subject: '【FolioStack】您的登录验证码',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #c9a96e; font-size: 24px; margin: 0;">FolioStack</h1>
            <p style="color: #666; font-size: 14px; margin-top: 8px;">作品集管理平台</p>
          </div>
          <div style="background: #f8f8f8; border-radius: 8px; padding: 32px; text-align: center;">
            <p style="color: #333; font-size: 16px; margin: 0 0 24px;">您的登录验证码</p>
            <div style="font-size: 36px; font-weight: bold; color: #c9a96e; letter-spacing: 8px; margin-bottom: 24px;">${code}</div>
            <p style="color: #888; font-size: 12px; margin: 0;">验证码有效期 10 分钟，请勿泄露给他人</p>
          </div>
          <div style="text-align: center; margin-top: 24px;">
            <p style="color: #999; font-size: 12px;">如果你没有请求此验证码，请忽略此邮件</p>
          </div>
        </div>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`[EMAIL] Email sent successfully to ${email}`);
    } catch (emailErr) {
      console.error('[EMAIL] Failed to send email:', emailErr.message);
    }

    res.json({ success: true, message: '验证码已发送到邮箱' });
  } catch (err) {
    console.error('Send Email Code error:', err);
    res.status(500).json({ error: '发送验证码失败' });
  }
});

app.post('/api/auth/email-login', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: '请提供邮箱和验证码' });
    }

    const emailRecord = await get('SELECT * FROM email_codes WHERE email = $1 AND code = $2 AND used = 0', [email, code]);
    if (!emailRecord) {
      return res.status(401).json({ error: '验证码错误或已过期' });
    }

    if (new Date(emailRecord.expires_at) <= new Date()) {
      await run('DELETE FROM email_codes WHERE email = $1', [email]);
      return res.status(401).json({ error: '验证码已过期' });
    }

    await run('UPDATE email_codes SET used = 1 WHERE email = $1', [email]);

    let user = await get('SELECT * FROM users WHERE email = $1', [email]);

    if (!user) {
      const username = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + '_' + Date.now().toString(36);
      const tempPassword = Math.random().toString(36).substring(2);
      const passwordHash = await bcrypt.hash(tempPassword, 10);
      const userUuid = uuidv4();

      await run(
        'INSERT INTO users (uuid, username, email, password_hash, display_name) VALUES ($1, $2, $3, $4, $5)',
        [userUuid, username, email, passwordHash, username]
      );
      user = await get('SELECT * FROM users WHERE email = $1', [email]);
    }

    const token = jwt.sign({ id: user.id, uuid: user.uuid, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
    await run('DELETE FROM sessions WHERE user_id = $1', [user.id]);
    await run('INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)', [user.id, token, expiresAt]);

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
    console.error('Email Login error:', err);
    res.status(500).json({ error: '登录失败' });
  }
});

app.get('/api/auth/me', authenticate, async (req, res) => {
  const user = await get('SELECT id, uuid, username, email, display_name, avatar_url, bio, occupation, location, facebook, twitter, linkedin, github, role, created_at FROM users WHERE id = $1', [req.user.id]);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ user });
});

app.put('/api/auth/update', authenticate, async (req, res) => {
  try {
    const { username, email, bio, occupation, location, facebook, twitter, linkedin, github, avatar_url } = req.body;
    
    await run(
      `UPDATE users SET 
        username = COALESCE($1, username),
        email = COALESCE($2, email),
        bio = COALESCE($3, bio),
        occupation = COALESCE($4, occupation),
        location = COALESCE($5, location),
        facebook = COALESCE($6, facebook),
        twitter = COALESCE($7, twitter),
        linkedin = COALESCE($8, linkedin),
        github = COALESCE($9, github),
        avatar_url = COALESCE($10, avatar_url),
        updated_at = CURRENT_TIMESTAMP
        WHERE id = $11`,
      [username, email, bio, occupation, location, facebook, twitter, linkedin, github, avatar_url, req.user.id]
    );
    
    const updatedUser = await get('SELECT id, uuid, username, email, display_name, avatar_url, bio, occupation, location, facebook, twitter, linkedin, github, role, created_at FROM users WHERE id = $1', [req.user.id]);
    res.json({ user: updatedUser });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

app.get('/api/works', authenticate, async (req, res) => {
  try {
    const works = await all('SELECT * FROM works WHERE user_id = $1 ORDER BY sort_order ASC, created_at DESC', [req.user.id]);
    const parsed = works.map(w => ({ ...w, tags: w.tags ? JSON.parse(w.tags) : [], thumbnail_data: w.thumbnail_data ? JSON.parse(w.thumbnail_data) : null }));
    res.json(parsed);
  } catch (err) {
    console.error('Get works error:', err);
    res.status(500).json({ error: 'Failed to fetch works' });
  }
});

// 文件上传API（支持图片压缩）
app.post('/api/upload', authenticate, imageUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '文件未上传' });
    }
    
    let fileUrl = `/uploads/${req.file.filename}`;
    
    // 如果是图片文件，进行压缩
    if (['image/jpeg', 'image/png', 'image/webp'].includes(req.file.mimetype)) {
      const imagePath = req.file.path;
      const outputPath = imagePath.replace(/\.[^/.]+$/, '.webp');
      
      // 压缩图片到1MB以下，最大尺寸800x800
      await sharp(imagePath)
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(outputPath);
      
      // 删除原文件
      await fsPromises.unlink(imagePath);
      
      // 更新文件路径
      const compressedFilename = path.basename(outputPath);
      fileUrl = `/uploads/${compressedFilename}`;
    }
    
    res.json({ 
      success: true, 
      fileUrl, 
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: '文件上传失败' });
  }
});

// ZIP文件解析API
app.post('/api/upload/zip', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '文件未上传' });
    }
    
    if (!req.file.originalname.endsWith('.zip')) {
      return res.status(400).json({ error: '请上传ZIP文件' });
    }
    
    const workId = uuidv4();
    const extractPath = join(extractedDir, workId);
    
    // 确保提取目录存在
    if (!fs.existsSync(extractPath)) {
      fs.mkdirSync(extractPath, { recursive: true });
    }
    
    // 解压ZIP文件
    const zip = new AdmZip(req.file.path);
    zip.extractAllTo(extractPath, true);
    
    // 获取解压后的文件列表
    const files = [];
    const walkSync = (dir, prefix = '') => {
      const items = fs.readdirSync(dir);
      items.forEach(item => {
        const fullPath = join(dir, item);
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
          walkSync(fullPath, `${prefix}${item}/`);
        } else {
          files.push({
            name: item,
            path: `${prefix}${item}`,
            size: stats.size,
            type: path.extname(item).substring(1) || 'file'
          });
        }
      });
    };
    
    walkSync(extractPath);
    
    // 查找主HTML文件
    const indexFiles = files.filter(f => f.name.toLowerCase() === 'index.html');
    const previewUrl = indexFiles.length > 0 ? `/extracted/${workId}/${indexFiles[0].path}` : null;
    
    res.json({
      success: true,
      workId,
      previewUrl,
      files,
      fileCount: files.length
    });
  } catch (err) {
    console.error('ZIP extraction error:', err);
    res.status(500).json({ error: 'ZIP文件解析失败' });
  }
});

// Netlify/Vercel/GitHub链接上传API
app.post('/api/upload/url', authenticate, async (req, res) => {
  try {
    const { url, platform } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL不能为空' });
    }
    
    // 验证URL格式
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return res.status(400).json({ error: '无效的URL格式' });
    }
    
    // 验证平台
    const validPlatforms = ['netlify', 'vercel', 'github', 'custom'];
    if (!platform || !validPlatforms.includes(platform)) {
      return res.status(400).json({ error: '无效的平台类型' });
    }
    
    let previewUrl = url;
    
    // GitHub项目特殊处理
    if (platform === 'github') {
      // 检查是否为GitHub仓库链接
      if (url.includes('github.com')) {
        // 提取用户名和仓库名
        const githubMatch = url.match(/github\.com\/([^\/]+)\/([^\/?#]+)/);
        if (githubMatch) {
          const username = githubMatch[1];
          const repo = githubMatch[2];
          
          // 生成GitHub Pages预览链接（如果存在）
          previewUrl = `https://${username}.github.io/${repo}`;
        }
      }
    }
    
    res.json({
      success: true,
      url,
      platform,
      previewUrl
    });
  } catch (err) {
    console.error('URL upload error:', err);
    res.status(500).json({ error: '链接上传失败' });
  }
});

app.get('/api/public/works', async (req, res) => {
  try {
    const works = await all('SELECT uuid, title, description, url, category, tags, thumbnail_type, thumbnail_data, view_count, likes, created_at FROM works WHERE status = $1 OR status IS NULL ORDER BY created_at DESC', ['published']);
    const parsed = works.map(w => ({
      id: w.uuid,
      title: w.title,
      description: w.description,
      project_url: w.url,
      cover_url: w.thumbnail_data,
      category: w.category,
      tags: w.tags ? JSON.parse(w.tags) : [],
      thumbnailType: w.thumbnail_type,
      thumbnailData: w.thumbnail_data ? JSON.parse(w.thumbnail_data) : null,
      views: w.view_count || 0,
      likes: w.likes || 0,
      created_at: w.created_at
    }));
    res.json(parsed);
  } catch (err) {
    console.error('Get public works error:', err);
    res.status(500).json({ error: 'Failed to fetch works' });
  }
});

app.post('/api/works', authenticate, async (req, res) => {
  try {
    const { title, description, url, category, tags, thumbnailType, thumbnailData, source, sourceFile } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    const workUuid = uuidv4();
    await run(
      'INSERT INTO works (uuid, user_id, title, description, url, category, tags, thumbnail_type, thumbnail_data, source, source_file) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
      [workUuid, req.user.id, title, description || '', url || '', category || 'Other', JSON.stringify(tags || []), thumbnailType || 'gradient', thumbnailData ? JSON.stringify(thumbnailData) : null, source || 'link', sourceFile || null]
    );

    const stmt = await get('SELECT * FROM works WHERE uuid = $1', [workUuid]);
    res.status(201).json({ work: { ...stmt, tags: stmt.tags ? JSON.parse(stmt.tags) : [], thumbnail_data: stmt.thumbnail_data ? JSON.parse(stmt.thumbnail_data) : null } });
  } catch (err) {
    console.error('Create work error:', err);
    res.status(500).json({ error: 'Failed to create work' });
  }
});

app.put('/api/works/:id', authenticate, async (req, res) => {
  try {
    const work = await get('SELECT * FROM works WHERE uuid = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!work) {
      return res.status(404).json({ error: 'Work not found' });
    }
    const { title, description, url, category, tags, thumbnailType, thumbnailData, sortOrder, isFeatured } = req.body;
    await run(
      'UPDATE works SET title = $1, description = $2, url = $3, category = $4, tags = $5, thumbnail_type = $6, thumbnail_data = $7, sort_order = $8, is_featured = $9, updated_at = CURRENT_TIMESTAMP WHERE id = $10',
      [
        title || work.title, description ?? work.description, url ?? work.url, category ?? work.category,
        tags ? JSON.stringify(tags) : work.tags, thumbnailType || work.thumbnail_type,
        thumbnailData ? JSON.stringify(thumbnailData) : work.thumbnail_data,
        sortOrder ?? work.sort_order, isFeatured ?? work.is_featured, work.id
      ]
    );
    const updated = await get('SELECT * FROM works WHERE id = $1', [work.id]);
    res.json({ work: { ...updated, tags: updated.tags ? JSON.parse(updated.tags) : [], thumbnail_data: updated.thumbnail_data ? JSON.parse(updated.thumbnail_data) : null } });
  } catch (err) {
    console.error('Update work error:', err);
    res.status(500).json({ error: 'Failed to update work' });
  }
});

app.delete('/api/works/:id', authenticate, async (req, res) => {
  try {
    const work = await get('SELECT * FROM works WHERE uuid = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!work) {
      return res.status(404).json({ error: 'Work not found' });
    }
    await run('DELETE FROM works WHERE id = $1', [work.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete work error:', err);
    res.status(500).json({ error: 'Failed to delete work' });
  }
});

app.post('/api/works/batch', authenticate, async (req, res) => {
  try {
    const { works } = req.body;
    if (!Array.isArray(works)) {
      return res.status(400).json({ error: 'Works array is required' });
    }
    for (const item of works) {
      await run(
        'INSERT INTO works (uuid, user_id, title, description, url, category, tags, thumbnail_type, thumbnail_data, source, source_file) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
        [uuidv4(), req.user.id, item.title, item.description || '', item.url || '', item.category || 'Other', JSON.stringify(item.tags || []), item.thumbnailType || 'gradient', item.thumbnailData ? JSON.stringify(item.thumbnailData) : null, item.source || 'link', item.sourceFile || null]
      );
    }
    const newWorks = await all('SELECT * FROM works WHERE user_id = $1 ORDER BY id DESC LIMIT $2', [req.user.id, works.length]);
    res.status(201).json({ works: newWorks.map(w => ({ ...w, tags: w.tags ? JSON.parse(w.tags) : [], thumbnail_data: w.thumbnail_data ? JSON.parse(w.thumbnail_data) : null })) });
  } catch (err) {
    console.error('Batch create works error:', err);
    res.status(500).json({ error: 'Failed to batch create works' });
  }
});

app.patch('/api/works/reorder', authenticate, async (req, res) => {
  try {
    const { orders } = req.body;
    if (!Array.isArray(orders)) {
      return res.status(400).json({ error: 'Orders array is required' });
    }
    for (const item of orders) {
      await run('UPDATE works SET sort_order = $1 WHERE uuid = $2 AND user_id = $3', [item.sortOrder, item.id, req.user.id]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Reorder works error:', err);
    res.status(500).json({ error: 'Failed to reorder works' });
  }
});

app.post('/api/works/import-url', authenticate, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    let title = '';
    let description = '';
    let category = 'Creative / Brand';
    let tags = [];
    let source = 'link';

    try {
      // 获取代理设置
      const useProxy = req.headers['x-use-proxy'] === 'true';
      const proxyServer = req.headers['x-proxy-server'];
      
      const fetchOptions = {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FolioStack Bot)' }
      };
      
      // 如果需要使用代理
      if (useProxy && proxyServer) {
        console.log(`Using proxy server: ${proxyServer} for URL: ${url}`);
        // 在Node.js环境中，我们可以使用代理
        fetchOptions.agent = new (require('https-proxy-agent'))(proxyServer);
      }

      const response = await fetch(url, fetchOptions);
      const html = await response.text();
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      if (titleMatch) title = titleMatch[1].trim();
      const metaDesc = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i);
      if (metaDesc) description = metaDesc[1].trim();
      const keywordsMatch = html.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([\s\S]*?)["']/i);
      if (keywordsMatch) {
        tags = keywordsMatch[1].split(',').map(t => t.trim()).filter(t => t);
      }
      const combined = (url + ' ' + title + ' ' + description).toLowerCase();
      if (combined.includes('three') || combined.includes('webgl') || combined.includes('3d')) category = '3D / WebGL';
      else if (combined.includes('ai') || combined.includes('neural') || combined.includes('machine')) category = 'AI / ML';
      else if (combined.includes('git') || combined.includes('dashboard') || combined.includes('tool')) category = 'Developer Tools';
      else if (combined.includes('iot') || combined.includes('data') || combined.includes('database')) category = 'Data / IoT';
      else if (combined.includes('brand') || combined.includes('portfolio') || combined.includes('creative')) category = 'Creative / Brand';
    } catch (fetchErr) {
      console.log('Could not fetch URL metadata, using URL-based defaults');
    }

    const urlParts = url.replace(/^https?:\/\//, '').split('/');
    const domain = urlParts[0];
    const pathParts = urlParts.slice(1).filter(p => p && p !== '');
    if (!title && pathParts.length > 0) {
      title = pathParts[pathParts.length - 1].replace(/[-_]/g, ' ').replace(/\.[^.]+$/, '');
    }
    if (!title) {
      title = domain.split('.')[0];
    }

    const existing = await get('SELECT id, uuid FROM works WHERE user_id = $1 AND url = $2', [req.user.id, url]);
    if (existing) {
      await run(
        'UPDATE works SET title = $1, description = $2, category = $3, tags = $4, updated_at = CURRENT_TIMESTAMP WHERE uuid = $5 AND user_id = $6',
        [title, description, category, JSON.stringify(tags), existing.uuid, req.user.id]
      );
      return res.json({ success: true, message: 'Work updated', work: { ...existing, title, description, category, tags } });
    }

    const workUuid = uuidv4();
    await run(
      'INSERT INTO works (uuid, user_id, title, description, url, category, tags, source, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
      [workUuid, req.user.id, title, description, url, category, JSON.stringify(tags), source, 'published']
    );

    const work = await get('SELECT * FROM works WHERE uuid = $1', [workUuid]);
    res.status(201).json({ success: true, work: { ...work, tags: work.tags ? JSON.parse(work.tags) : [] } });
  } catch (err) {
    console.error('Import URL error:', err);
    res.status(500).json({ error: 'Failed to import URL: ' + err.message });
  }
});

// GitHub项目导入
app.post('/api/works/import-github', authenticate, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || !url.includes('github.com')) {
      return res.status(400).json({ error: 'Valid GitHub URL is required' });
    }

    const match = url.match(/github\.com\/([^\/]+)\/([^\/\s]+)/i);
    if (!match) {
      return res.status(400).json({ error: 'Invalid GitHub URL format' });
    }

    const [, owner, repo] = match;
    const repoName = repo.replace(/\.git$/, '');
    const apiUrl = `https://api.github.com/repos/${owner}/${repoName}`;

    let repoData;
    try {
      // 获取代理设置
      const useProxy = req.headers['x-use-proxy'] === 'true';
      const proxyServer = req.headers['x-proxy-server'];
      
      const fetchOptions = {
        headers: { 'User-Agent': 'FolioStack Portfolio Manager' }
      };
      
      // 如果需要使用代理
      if (useProxy && proxyServer) {
        console.log(`Using proxy server: ${proxyServer} for GitHub API: ${apiUrl}`);
        fetchOptions.agent = new (require('https-proxy-agent'))(proxyServer);
      }

      const response = await fetch(apiUrl, fetchOptions);
      if (!response.ok) {
        return res.status(400).json({ error: 'Could not fetch GitHub repository' });
      }
      repoData = await response.json();
    } catch (fetchErr) {
      return res.status(400).json({ error: 'Failed to connect to GitHub' });
    }

    const title = repoData.name || repoName;
    const description = repoData.description || '';
    const homepage = repoData.homepage || repoData.html_url;
    const category = 'Developer Tools';
    const tags = [];

    if (repoData.topics && Array.isArray(repoData.topics)) {
      tags.push(...repoData.topics.slice(0, 4));
    }
    if (repoData.language) {
      tags.push(repoData.language);
    }

    const existing = await get('SELECT uuid FROM works WHERE user_id = $1 AND url = $2', [req.user.id, repoData.html_url]);
    if (existing) {
      await run(
        'UPDATE works SET title = $1, description = $2, tags = $3, updated_at = CURRENT_TIMESTAMP WHERE uuid = $4 AND user_id = $5',
        [title, description, JSON.stringify(tags), existing.uuid, req.user.id]
      );
      return res.json({ success: true, message: 'Work updated', work: { ...existing, title, description, tags } });
    }

    const workUuid = uuidv4();
    await run(
      'INSERT INTO works (uuid, user_id, title, description, url, github_url, category, tags, source, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
      [workUuid, req.user.id, title, description, homepage || '', repoData.html_url, category, JSON.stringify(tags), 'github', 'published']
    );

    const work = await get('SELECT * FROM works WHERE uuid = $1', [workUuid]);
    res.status(201).json({ success: true, work: { ...work, tags: work.tags ? JSON.parse(work.tags) : [] } });
  } catch (err) {
    console.error('Import GitHub error:', err);
    res.status(500).json({ error: 'Failed to import GitHub repository: ' + err.message });
  }
});

// ZIP文件导入
app.post('/api/works/import-zip', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    if (!file.originalname.endsWith('.zip')) {
      return res.status(400).json({ error: 'Only ZIP files are supported' });
    }

    const zip = new AdmZip(file.path);
    const zipEntries = zip.getEntries();
    const htmlEntries = zipEntries.filter(e => e.entryName.endsWith('.html') || e.entryName.endsWith('.htm'));
    const extractedPath = join(extractedDir, `${req.user.uuid}_${Date.now()}`);

    if (!fs.existsSync(extractedPath)) {
      fs.mkdirSync(extractedPath, { recursive: true });
    }

    zip.extractAllTo(extractedPath, true);
    const indexFile = findIndexFile(extractedPath);
    const relativePath = indexFile ? path.relative(__dirname + '/..', indexFile) : '';

    let title = file.originalname.replace(/\.zip$/, '').replace(/[-_]/g, ' ');
    let description = '';
    let category = 'Creative / Brand';
    let tags = ['Web'];

    if (indexFile) {
      try {
        const content = fs.readFileSync(indexFile, 'utf8');
        const titleMatch = content.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        if (titleMatch) title = titleMatch[1].trim();
        const metaDesc = content.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i);
        if (metaDesc) description = metaDesc[1].trim();
        const combined = content.toLowerCase();
        if (combined.includes('three') || combined.includes('webgl')) category = '3D / WebGL';
        else if (combined.includes('react') || combined.includes('vue') || combined.includes('angular')) category = 'Developer Tools';
        else if (combined.includes('ai') || combined.includes('neural')) category = 'AI / ML';
      } catch (readErr) {
        console.log('Could not read index file');
      }
    }

    const projectUrl = `/extracted/${req.user.uuid}_${Date.now()}/`;

    const existing = await get('SELECT uuid FROM works WHERE user_id = $1 AND source_file = $2', [req.user.id, relativePath]);
    if (existing) {
      await run(
        'UPDATE works SET title = $1, description = $2, category = $3, tags = $4, updated_at = CURRENT_TIMESTAMP WHERE uuid = $5 AND user_id = $6',
        [title, description, category, JSON.stringify(tags), existing.uuid, req.user.id]
      );
      fs.rmSync(extractedPath, { recursive: true, force: true });
      return res.json({ success: true, message: 'Work updated', count: 1 });
    }

    const workUuid = uuidv4();
    await run(
      'INSERT INTO works (uuid, user_id, title, description, url, category, tags, source, source_file, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
      [workUuid, req.user.id, title, description, projectUrl, category, JSON.stringify(tags), 'file', relativePath, 'published']
    );

    fs.unlinkSync(file.path);

    res.status(201).json({ success: true, message: `Imported: ${title}`, count: 1 });
  } catch (err) {
    console.error('Import ZIP error:', err);
    res.status(500).json({ error: 'Failed to import ZIP file: ' + err.message });
  }
});

function findIndexFile(dir) {
  const possibleNames = ['index.html', 'index.htm', 'Index.html', 'main.html', 'MAIN.html', 'home.html', 'Home.html'];
  for (const name of possibleNames) {
    const filePath = join(dir, name);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }

  function searchDir(currentDir) {
    const items = fs.readdirSync(currentDir);
    for (const item of items) {
      const fullPath = join(currentDir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        const found = searchDir(fullPath);
        if (found) return found;
      } else if (possibleNames.map(n => n.toLowerCase()).includes(item.toLowerCase())) {
        return fullPath;
      }
    }
    return null;
  }

  return searchDir(dir);
}

app.get('/api/public/:username', async (req, res) => {
  try {
    const user = await get('SELECT username, display_name, avatar_url, bio FROM users WHERE username = $1', [req.params.username]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const works = await all('SELECT title, description, url, category, tags, thumbnail_type, thumbnail_data FROM works WHERE user_id = $1 ORDER BY sort_order ASC, created_at DESC', [user.id]);
    res.json({ user, works: works.map(w => ({ ...w, tags: w.tags ? JSON.parse(w.tags) : [], thumbnail_data: w.thumbnail_data ? JSON.parse(w.thumbnail_data) : null })) });
  } catch (err) {
    console.error('Get public profile error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// 分类管理API
app.get('/api/categories', authenticate, async (req, res) => {
  try {
    const categories = await all('SELECT * FROM categories ORDER BY sort_order ASC');
    res.json(categories);
  } catch (err) {
    console.error('Get categories error:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.post('/api/categories', authenticate, async (req, res) => {
  try {
    const { name, description, parentId, icon, sortOrder } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const categoryUuid = uuidv4();
    await run(
      'INSERT INTO categories (uuid, name, description, parent_id, icon, sort_order) VALUES ($1, $2, $3, $4, $5, $6)',
      [categoryUuid, name, description || '', parentId || null, icon || null, sortOrder || 0]
    );
    const category = await get('SELECT * FROM categories WHERE uuid = $1', [categoryUuid]);
    res.status(201).json({ category });
  } catch (err) {
    console.error('Create category error:', err);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

app.put('/api/categories/:id', authenticate, async (req, res) => {
  try {
    const category = await get('SELECT * FROM categories WHERE uuid = $1', [req.params.id]);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    const { name, description, parentId, icon, sortOrder } = req.body;
    await run(
      'UPDATE categories SET name = $1, description = $2, parent_id = $3, icon = $4, sort_order = $5, updated_at = CURRENT_TIMESTAMP WHERE uuid = $6',
      [name || category.name, description ?? category.description, parentId ?? category.parent_id, icon ?? category.icon, sortOrder ?? category.sort_order, req.params.id]
    );
    const updated = await get('SELECT * FROM categories WHERE uuid = $1', [req.params.id]);
    res.json({ category: updated });
  } catch (err) {
    console.error('Update category error:', err);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

app.delete('/api/categories/:id', authenticate, async (req, res) => {
  try {
    const category = await get('SELECT * FROM categories WHERE uuid = $1', [req.params.id]);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    await run('DELETE FROM categories WHERE uuid = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete category error:', err);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// 评论管理API
app.get('/api/works/:id/comments', authenticate, async (req, res) => {
  try {
    const work = await get('SELECT * FROM works WHERE uuid = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!work) {
      return res.status(404).json({ error: 'Work not found' });
    }
    const comments = await all(`
      SELECT c.*, u.username, u.display_name, u.avatar_url 
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.work_id = $1
      ORDER BY c.created_at DESC
    `, [work.id]);
    res.json({ comments });
  } catch (err) {
    console.error('Get comments error:', err);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

app.post('/api/works/:id/comments', authenticate, async (req, res) => {
  try {
    const work = await get('SELECT * FROM works WHERE uuid = $1', [req.params.id]);
    if (!work) {
      return res.status(404).json({ error: 'Work not found' });
    }
    const { content, parentId } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    const commentUuid = uuidv4();
    await run(
      'INSERT INTO comments (uuid, user_id, work_id, content, parent_id) VALUES ($1, $2, $3, $4, $5)',
      [commentUuid, req.user.id, work.id, content, parentId || null]
    );
    const comment = await get(`
      SELECT c.*, u.username, u.display_name, u.avatar_url 
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.uuid = $1
    `, [commentUuid]);
    res.status(201).json({ comment });
  } catch (err) {
    console.error('Create comment error:', err);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

app.delete('/api/comments/:id', authenticate, async (req, res) => {
  try {
    const comment = await get('SELECT * FROM comments WHERE uuid = $1', [req.params.id]);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    // 只有评论作者或作品作者可以删除评论
    const work = await get('SELECT user_id FROM works WHERE id = $1', [comment.work_id]);
    if (comment.user_id !== req.user.id && work.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    await run('DELETE FROM comments WHERE uuid = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete comment error:', err);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

app.post('/api/comments/:id/like', authenticate, async (req, res) => {
  try {
    const comment = await get('SELECT * FROM comments WHERE uuid = $1', [req.params.id]);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    await run('UPDATE comments SET likes = likes + 1 WHERE uuid = $1', [req.params.id]);
    const updated = await get('SELECT likes FROM comments WHERE uuid = $1', [req.params.id]);
    res.json({ likes: updated.likes });
  } catch (err) {
    console.error('Like comment error:', err);
    res.status(500).json({ error: 'Failed to like comment' });
  }
});

// 搜索与过滤API
app.get('/api/works/search', authenticate, async (req, res) => {
  try {
    const { query, category, tags, sortBy, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    let sql = 'SELECT * FROM works WHERE user_id = $1';
    const params = [req.user.id];
    let paramIndex = 2;
    
    if (query) {
      sql += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      params.push(`%${query}%`);
      paramIndex++;
    }
    
    if (category) {
      sql += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }
    
    if (tags) {
      const tagList = tags.split(',');
      tagList.forEach(tag => {
        sql += ` AND tags LIKE $${paramIndex}`;
        params.push(`%"${tag}"%`);
        paramIndex++;
      });
    }
    
    switch (sortBy) {
      case 'latest':
        sql += ' ORDER BY created_at DESC';
        break;
      case 'oldest':
        sql += ' ORDER BY created_at ASC';
        break;
      case 'views':
        sql += ' ORDER BY view_count DESC';
        break;
      case 'likes':
        sql += ' ORDER BY likes DESC';
        break;
      default:
        sql += ' ORDER BY sort_order ASC, created_at DESC';
    }
    
    sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const works = await all(sql, params);
    const parsed = works.map(w => ({ ...w, tags: w.tags ? JSON.parse(w.tags) : [], thumbnail_data: w.thumbnail_data ? JSON.parse(w.thumbnail_data) : null }));
    
    // 获取总数
    const countSql = sql.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as count FROM').replace(/ORDER BY.*$/, '');
    const countParams = params.slice(0, params.length - 2);
    const countResult = await get(countSql, countParams);
    
    res.json({
      works: parsed,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult.count,
        pages: Math.ceil(countResult.count / limit)
      }
    });
  } catch (err) {
    console.error('Search works error:', err);
    res.status(500).json({ error: 'Failed to search works' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(express.static(join(__dirname, '..')));

async function start() {
  try {
    await initDB();
    const dbType = getType();
    console.log(`Database connected (${dbType})`);
    app.listen(PORT, () => {
      console.log(`Portfolio server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
