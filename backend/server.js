/**
 * Server.js - Express Bootstrap & Route Mounting
 *
 * FILOSOFIA: Questo file contiene SOLO:
 * - Bootstrap Express
 * - Middleware globali (cors, bodyParser, error handler)
 * - Inizializzazione Socket / LiveManager
 * - Mount delle route
 * - server.listen()
 *
 * Zero logica di dominio, zero calcoli, zero query DB.
 * Se una funzione "capisce il tennis", NON PUÒ stare qui.
 *
 * @see 1.guida refactor server js.md
 * @see docs/filosofie/FILOSOFIA_FRONTEND_DATA_CONSUMPTION.md
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');

// ============================================================================
// GLOBAL ERROR HANDLERS
// ============================================================================

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
});

// ============================================================================
// LIVE MANAGER INITIALIZATION
// ============================================================================

const { initLiveManager, startScheduler } = require('./liveManager');

// ============================================================================
// EXPRESS APP SETUP
// ============================================================================

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// ============================================================================
// CORS CONFIGURATION
// ============================================================================

const getAllowedOrigins = () => {
  const origins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'https://tennis-analyzer.vercel.app',
  ];

  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL);
  }

  return origins;
};

// CORS middleware
app.use((req, res, next) => {
  const allowedOrigins = getAllowedOrigins();
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin) || (origin && origin.endsWith('.vercel.app'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// ============================================================================
// SOCKET.IO SETUP
// ============================================================================

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      const allowedOrigins = getAllowedOrigins();
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        callback(null, true);
      } else {
        callback(null, true);
        console.warn(`⚠️ CORS: Origin ${origin} not in allowed list`);
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Initialize WebSocket Live Manager
initLiveManager(io);

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(bodyParser.json({ limit: '10mb' }));

// Request logging (development)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (duration > 1000) {
        console.log(`⚠️ Slow request: ${req.method} ${req.path} - ${duration}ms`);
      }
    });
    next();
  });
}

// ============================================================================
// ROUTE MOUNTING
// ============================================================================

const routes = require('./routes');
app.use('/api', routes);

// ============================================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.message);
  console.error(err.stack);

  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

// ============================================================================
// SERVER START
// ============================================================================

server.listen(PORT, () => {
  console.info(`🚀 Scraper backend listening on port ${PORT} (HTTP + WebSocket)`);

  // Start scheduler for automatic match monitoring
  console.log('🕐 Starting match monitoring scheduler...');
  startScheduler();
});

module.exports = { app, server, io };
