const express = require('express');
const router = express.Router();
const publicExamController = require('./public-exam.controller');
const uploadMemory = require('../../middlewares/uploadMemory.middleware');

// Public routes (no standard JWT auth required, uses its own session tokens)
router.get('/:id', publicExamController.getPublicExamDetails);
router.post('/:id/start', publicExamController.startPublicExam);
router.post('/:id/submit', publicExamController.submitPublicExam);
router.post('/:id/snapshot', uploadMemory.single('snapshot'), publicExamController.uploadSnapshot);

module.exports = router;
