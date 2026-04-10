import express from 'express';
import cors from 'cors';
import { initDB, run, get, all } from './db.js';

const app = express();
const PORT = 3001;

app.use(cors({ 
  origin: true, 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Origin', 'Content-Type', 'Accept', 'Authorization', 'X-Requested-With'],
}));
app.use(express.json());

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 注册API
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: '缺少必要字段' });
    }

    // 检查用户是否已存在
    const existingUser = await get('SELECT * FROM users WHERE username = ? OR email = ?', [username, email]);
    if (existingUser) {
      return res.status(400).json({ error: '用户名或邮箱已存在' });
    }

    // 创建用户
    const uuid = Math.random().toString(36).substring(2, 15);
    const passwordHash = password; // 简化版本，实际应该使用bcrypt
    
    const result = await run(
      'INSERT INTO users (uuid, username, email, password_hash, display_name) VALUES (?, ?, ?, ?, ?)',
      [uuid, username, email, passwordHash, displayName || username]
    );

    res.json({ message: '注册成功', userId: result.lastID });
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

    // 简化版本，实际应该验证密码哈希
    if (password !== user.password_hash) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    res.json({ message: '登录成功', user: { id: user.id, username: user.username } });
  } catch (err) {
    console.error('登录错误:', err);
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
app.post('/api/works/import-url', async (req, res) => {
  try {
    const { url, title, description } = req.body;
    if (!url) {
      return res.status(400).json({ error: '请提供URL' });
    }

    const uuid = Math.random().toString(36).substring(2, 15);
    
    const result = await run(
      'INSERT INTO works (uuid, user_id, title, description, url, source) VALUES (?, ?, ?, ?, ?, ?)',
      [uuid, 1, title || 'Untitled', description || '', url, 'link']
    );

    res.json({ message: '作品导入成功', workId: result.lastID });
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
