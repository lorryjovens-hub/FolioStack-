import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3004;

// 中间件
app.use(cors());
app.use(express.json());

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    server: 'Test Server',
    port: PORT
  });
});

// 测试修改密码API
app.put('/api/auth/change-password', (req, res) => {
  res.json({ message: '密码修改成功' });
});

// 测试忘记密码API
app.post('/api/auth/forgot-password', (req, res) => {
  res.json({ message: '重置密码邮件已发送' });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`Test Server 启动成功`);
  console.log(`服务器地址: http://localhost:${PORT}`);
  console.log(`健康检查: http://localhost:${PORT}/api/health`);
});