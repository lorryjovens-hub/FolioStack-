// 简单的测试服务器
import express from 'express';
const app = express();
const PORT = 3007;

app.get('/api/health', (req, res) => {
  console.log('健康检查请求');
  res.json({ status: 'ok' });
});

app.listen(PORT, '0.0.0.0', (err) => {
  if (err) {
    console.error('启动服务器错误:', err);
    return;
  }
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});