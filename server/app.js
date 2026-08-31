const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const errorMiddleware = require('./middlewares/error.middleware');
const v1Routes = require('./routes/v1');

const app = express();

// Trust reverse proxy headers (e.g., Nginx X-Forwarded-Proto for HTTPS)
app.set('trust proxy', true);

// Enable Gzip/Brotli response compression
app.use(
  compression({
    threshold: 1024, // Compress responses above 1KB
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      // Avoid double-compressing already compressed media/binary types
      const contentType = res.getHeader('Content-Type') || '';
      if (contentType.match(/(image|video|audio|zip|pdf|octet-stream)/i)) {
        return false;
      }
      return compression.filter(req, res);
    },
  })
);

// Global Middlewares
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(cors());
app.use(morgan('dev'));
 
// API Routes
app.use('/api/v1', v1Routes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is running normally.' });
});

// Error handling middleware should be the last middleware
app.use(errorMiddleware);

module.exports = app;
