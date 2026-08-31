const app = require('./app');
const env = require('./config/env');
const connectDB = require('./config/db');

// Connect to MongoDB
connectDB();

// Start Server
app.listen(env.PORT, () => {
  console.log(`Server is running on http://localhost:${env.PORT}`);
  console.log(`Environment: ${env.NODE_ENV}`);
});
