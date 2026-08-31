const multer = require('multer');

// Memory storage configuration
// This stores files as Buffers in memory, avoiding writing them to the local disk.
const storage = multer.memoryStorage();

const uploadMemory = multer({ 
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100 MB max size for uploads
  }
});

module.exports = uploadMemory;
