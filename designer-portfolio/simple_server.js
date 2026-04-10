import { createServer } from 'http';

const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', message: 'Server is running' }));
});

server.listen(3001, () => {
  console.log('Simple server running on http://localhost:3001');
});
