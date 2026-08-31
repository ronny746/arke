const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const errorMiddleware = require('./middlewares/error.middleware');
const v1Routes = require('./routes/v1');

const app = express();

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
