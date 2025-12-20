// Minimal test server
require('dotenv').config();
const express = require('express');
const app = express();

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const server = app.listen(3001, '0.0.0.0', () => {
  console.log('✅ Test server running on http://localhost:3001');
});

server.on('error', (e) => {
  console.error('❌ Server error:', e.message);
});

// Keep alive
setInterval(() => {
  console.log('💓 Server alive at', new Date().toISOString());
}, 10000);
