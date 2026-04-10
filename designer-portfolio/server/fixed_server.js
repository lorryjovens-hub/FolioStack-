import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import { initDB, run, get, all, getType } from './db.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'portfolio-secret-key-change-in-production';

// QQ邮箱配置
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

// 生成JWT令牌
function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
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

    res.json({ message: '注册成功' });
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

    const token = generateToken(user.id);
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

// 发送邮箱验证码
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

    // 生成验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15分钟过期

    // 保存验证码到数据库
    await run(
      'INSERT INTO email_codes (email, code, expires_at) VALUES (?, ?, ?)',
      [email, code, expiresAt.toISOString()]
    );

    // 发送邮件
    await transporter.sendMail({
      from: '"设计师作品集" <2574566046@qq.com>',
      to: email,
      subject: '邮箱验证码',
      text: `您的验证码是: ${code}，有效期15分钟`,
      html: `<p>您的验证码是: <strong>${code}</strong></p><p>有效期15分钟</p>`
    });

    res.json({ message: '验证码已发送' });
  } catch (err) {
    console.error('发送验证码错误:', err);
    res.status(500).json({ error: '发送验证码失败' });
  }
});

// 邮箱验证码登录
app.post('/api/auth/email-login', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: '请提供邮箱和验证码' });
    }

    // 验证验证码
    const emailCode = await get('SELECT * FROM email_codes WHERE email = ? AND code = ? AND used = 0', [email, code]);
    if (!emailCode) {
      return res.status(401).json({ error: '验证码错误或已过期' });
    }

    const expiresAt = new Date(emailCode.expires_at);
    if (new Date() > expiresAt) {
      return res.status(401).json({ error: '验证码已过期' });
    }

    // 标记验证码为已使用
    await run('UPDATE email_codes SET used = 1 WHERE id = ?', [emailCode.id]);

    // 查找用户或创建新用户
    let user = await get('SELECT * FROM users WHERE email = ?', [email]);
    
    if (!user) {
      // 创建新用户
      const uuid = uuidv4();
      const username = email.split('@')[0];
      const passwordHash = await bcrypt.hash(uuidv4(), 10); // 随机密码
      
      await run(
        'INSERT INTO users (uuid, username, email, password_hash, display_name) VALUES (?, ?, ?, ?, ?)',
        [uuid, username, email, passwordHash, username]
      );
      
      user = await get('SELECT * FROM users WHERE email = ?', [email]);
    }

    const token = generateToken(user.id);
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
    console.error('邮箱登录错误:', err);
    res.status(500).json({ error: '登录失败' });
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

// 导入多个作品链接
app.post('/api/works/import-links', authenticate, async (req, res) => {
  try {
    const { links } = req.body;
    if (!links || !Array.isArray(links)) {
      return res.status(400).json({ error: '请提供链接列表' });
    }

    const results = [];
    
    for (const link of links) {
      try {
        const uuid = uuidv4();
        await run(
          'INSERT INTO works (uuid, user_id, title, description, url, source) VALUES (?, ?, ?, ?, ?, ?)',
          [uuid, req.user.userId, link.title || 'Untitled', link.description || '', link.url, 'link']
        );
        results.push({ url: link.url, success: true });
      } catch (err) {
        results.push({ url: link.url, success: false, error: err.message });
      }
    }

    res.json({ message: '批量导入完成', results });
  } catch (err) {
    console.error('批量导入错误:', err);
    res.status(500).json({ error: '批量导入失败' });
  }
});

async function start() {
  try {
    await initDB();
    console.log(`数据库连接成功 (${getType()})`);
    app.listen(PORT, () => {
      console.log(`服务器运行在 http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('服务器启动失败:', err);
    process.exit(1);
  }
}

start();
