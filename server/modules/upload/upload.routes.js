const express = require('express');
const router = express.Router();
const UploadController = require('./upload.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const upload = require('../../middlewares/upload.middleware');

router.use(authMiddleware);

// Endpoint to upload a file to S3
router.post('/', upload.single('file'), UploadController.uploadFile);

module.exports = router;
