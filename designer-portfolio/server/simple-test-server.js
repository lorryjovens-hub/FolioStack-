import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3006;

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 健康检查
app.get('/api/health', (req, res) => {
  console.log('健康检查请求');
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    server: 'Simple Server',
    port: PORT
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log('=================================');
  console.log(`Simple Server 启动成功`);
  console.log(`服务器地址: http://localhost:${PORT}`);
  console.log(`健康检查: http://localhost:${PORT}/api/health`);
  console.log('=================================');
});