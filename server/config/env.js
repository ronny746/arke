const path = require('path');
const envFileName = process.env.DOTENV_CONFIG_PATH || (process.env.NODE_ENV === 'staging' ? '.env.staging' : '.env');
require('dotenv').config({ path: path.join(__dirname, '../../', envFileName) });

module.exports = {
  PORT: process.env.PORT || 3000,
  MONGO_URI: process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/lms-platform',
  JWT_SECRET: process.env.JWT_SECRET || 'supersecretkey',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
  NODE_ENV: process.env.NODE_ENV || 'development'
};
