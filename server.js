const dns = require('dns');
try { dns.setDefaultResultOrder('ipv4first'); } catch (e) {}

const envFile = process.env.DOTENV_CONFIG_PATH || (process.env.NODE_ENV === 'staging' ? '.env.staging' : '.env');
require('dotenv').config({ path: envFile });

const express = require('express');
const next = require('next');
const http = require('http');
const path = require('path');
const fs = require('fs');

const connectDB = require('./server/config/db');
const mediaService = require('./server/services/mediaService');
const setupSocketIO = require('./server/socket');

const dev = process.env.NODE_ENV !== 'production';
const PORT = parseInt(process.env.PORT || '3000', 10);
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

const lmsApp = require('./server/app');
const meetonlineRoutes = require('./server/routes/meetonline');

console.log('🚀 Starting ARKE LMS Server...');

// Connect DB
connectDB();

nextApp.prepare().then(() => {
  console.log('⚡ Next.js compiled & ready.');
  
  const app = express();
  const server = http.createServer(app);

  // Setup Socket.IO for Meetonline WebRTC
  setupSocketIO(server);

  // Health check
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date() });
  });

  // Backend LMS API (/api/v1)
  app.use(lmsApp);

  // Meetonline API (/api)
  app.use('/api', meetonlineRoutes);

  // Create recordings and uploads directories
  const recordingsDir = path.resolve(process.env.RECORDINGS_DIR || './recordings');
  if (!fs.existsSync(recordingsDir)) fs.mkdirSync(recordingsDir, { recursive: true });
  const uploadsDir = path.resolve('./uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  app.use('/api/recordings/download', express.static(recordingsDir));
  app.use('/api/uploads/download', express.static(uploadsDir));

  // Next.js frontend pages (catch-all)
  app.use((req, res) => {
    return handle(req, res);
  });

  // Start HTTP server immediately
  server.listen(PORT, '0.0.0.0', (err) => {
    if (err) {
      console.error('Server listen error:', err);
      process.exit(1);
    }
    console.log(`\n========================================`);
    console.log(`🎉 SERVER IS READY ON http://localhost:${PORT}`);
    console.log(`========================================\n`);
  });

  // Initialize Mediasoup workers in background
  mediaService.createWorkers().catch(err => {
    console.warn('⚠️ Mediasoup worker initialization notice:', err.message || err);
  });

}).catch(err => {
  console.error('❌ Next.js prepare failed:', err);
  process.exit(1);
});
