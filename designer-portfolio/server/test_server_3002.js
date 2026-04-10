import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/test', (req, res) => {
  res.send('Test server is running!');
});

app.listen(PORT, () => {
  console.log(`测试服务器运行在 http://localhost:${PORT}`);
});
