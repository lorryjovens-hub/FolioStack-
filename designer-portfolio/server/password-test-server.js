import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3005;
const JWT_SECRET = 'portfolio-secret-key-production';

// 数据文件路径
const USERS_FILE = join(__dirname, '../data/users.json');

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 工具函数
function loadData(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('加载数据错误:', err);
    return [];
  }
}

function saveData(filePath, data) {
  try {
    const dir = dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error('保存数据错误:', err);
    return false;
  }
}

// 认证中间件
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
    console.error('认证错误:', err);
    return res.status(401).json({ error: '未授权：令牌无效' });
  }
}

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    server: 'Password Test Server',
    port: PORT
  });
});

// 登录
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: '请提供用户名和密码' });
    }
    
    const users = loadData(USERS_FILE);
    const user = users.find(u => u.username === username || u.email === username);
    
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
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

// 修改密码
app.put('/api/auth/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: '请填写所有密码字段' });
    }
    
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: '两次输入的新密码不一致' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: '新密码长度不能少于6位' });
    }
    
    const users = loadData(USERS_FILE);
    const user = users.find(u => u.id === req.user.userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    // 验证当前密码
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: '当前密码错误' });
    }
    
    // 生成新密码哈希
    const newPasswordHash = bcrypt.hashSync(newPassword, 10);
    user.password_hash = newPasswordHash;
    user.updated_at = new Date().toISOString();
    
    if (!saveData(USERS_FILE, users)) {
      return res.status(500).json({ error: '保存密码失败' });
    }
    
    res.json({ message: '密码修改成功' });
  } catch (err) {
    console.error('修改密码错误:', err);
    res.status(500).json({ error: '修改密码失败' });
  }
});

// 忘记密码 - 发送重置邮件
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: '请提供邮箱地址' });
    }
    
    const users = loadData(USERS_FILE);
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(404).json({ error: '该邮箱未注册' });
    }
    
    // 生成重置令牌
    const resetToken = uuidv4();
    const resetExpiry = new Date();
    resetExpiry.setHours(resetExpiry.getHours() + 1); // 1小时过期
    
    user.reset_token = resetToken;
    user.reset_expiry = resetExpiry.toISOString();
    
    if (!saveData(USERS_FILE, users)) {
      return res.status(500).json({ error: '生成重置令牌失败' });
    }
    
    // 这里应该发送邮件，暂时返回令牌
    res.json({ 
      message: '重置密码邮件已发送',
      resetToken, // 仅用于测试
      resetUrl: `http://localhost:3005/reset-password.html?token=${resetToken}`
    });
  } catch (err) {
    console.error('忘记密码错误:', err);
    res.status(500).json({ error: '发送重置邮件失败' });
  }
});

// 重置密码
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;
    
    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: '请填写所有字段' });
    }
    
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: '两次输入的新密码不一致' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: '新密码长度不能少于6位' });
    }
    
    const users = loadData(USERS_FILE);
    const user = users.find(u => u.reset_token === token);
    
    if (!user) {
      return res.status(400).json({ error: '无效的重置令牌' });
    }
    
    // 检查令牌是否过期
    const now = new Date();
    const resetExpiry = new Date(user.reset_expiry);
    if (now > resetExpiry) {
      return res.status(400).json({ error: '重置令牌已过期' });
    }
    
    // 生成新密码哈希
    const newPasswordHash = bcrypt.hashSync(newPassword, 10);
    user.password_hash = newPasswordHash;
    user.reset_token = null;
    user.reset_expiry = null;
    user.updated_at = new Date().toISOString();
    
    if (!saveData(USERS_FILE, users)) {
      return res.status(500).json({ error: '保存密码失败' });
    }
    
    res.json({ message: '密码重置成功' });
  } catch (err) {
    console.error('重置密码错误:', err);
    res.status(500).json({ error: '重置密码失败' });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log('=================================');
  console.log(`Password Test Server 启动成功`);
  console.log(`服务器地址: http://localhost:${PORT}`);
  console.log(`健康检查: http://localhost:${PORT}/api/health`);
  console.log('=================================');
});