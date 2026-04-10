import express from 'express';

const app = express();
const PORT = 3002;

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`);
});
