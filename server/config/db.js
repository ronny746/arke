const dns = require('dns');
try { dns.setDefaultResultOrder('ipv4first'); } catch (e) {}

const mongoose = require('mongoose');
const env = require('./env');
const softDeletePlugin = require('./softDeletePlugin');

// Apply the soft delete plugin to all schemas globally
mongoose.plugin(softDeletePlugin);

const connectDB = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(env.MONGO_URI, { family: 4, serverSelectionTimeoutMS: 8000 });
    console.log('✅ MongoDB connected successfully!');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
  }
};

module.exports = connectDB;
