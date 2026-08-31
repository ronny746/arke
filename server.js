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

const dev = process.env.NODE_ENV === 'development';
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

const lmsApp = require('./server/app'); // LMS backend (/api/v1)
const meetonlineRoutes = require('./server/routes/meetonline'); // Meetonline API

const PORT = process.env.PORT || 3000;

nextApp.prepare().then(() => {
  const app = express();
  const server = http.createServer(app);
  
  // Setup Socket.IO for Meetonline WebRTC
  setupSocketIO(server);

  // Mount backend routes
  app.use(lmsApp); // This handles /api/v1
  app.use('/api', meetonlineRoutes); // This handles /api/rooms, /api/auth, etc.

  // Create recordings directory if not exists
  const recordingsDir = path.resolve(process.env.RECORDINGS_DIR || './recordings');
  if (!fs.existsSync(recordingsDir)) {
    fs.mkdirSync(recordingsDir, { recursive: true });
  }

  // Create uploads directory for shared files
  const uploadsDir = path.resolve('./uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Serve recordings and uploads static directories
  app.use('/api/recordings/download', express.static(recordingsDir));
  app.use('/api/uploads/download', express.static(uploadsDir));

  // Default handler: let Next.js handle all other routes (React pages)
  app.use((req, res) => {
    return handle(req, res);
  });

  // Connect DB and Start Server
  connectDB().then(() => {
    // Also initialize Mediasoup workers
    mediaService.createWorkers().then(() => {
      server.listen(PORT, () => {
        console.log(`> Ready on http://localhost:${PORT}`);
      });
    }).catch(err => {
      console.error('Failed to create Mediasoup workers:', err);
    });
  }).catch(err => {
    console.error('Failed to connect to MongoDB:', err);
  });
});
