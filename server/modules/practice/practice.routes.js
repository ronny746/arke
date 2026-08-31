const express = require('express');
const router = express.Router();
const practiceController = require('./practice.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/rbac.middleware');
const { ROLES } = require('../../config/constants');

router.use(authMiddleware);
router.use(requireRole([ROLES.STUDENT]));

router.get('/filters', practiceController.getFilters);
router.get('/history', practiceController.getHistory);
router.post('/generate', practiceController.generateSession);
router.get('/:id', practiceController.getSession);
router.put('/:id/progress', practiceController.saveProgress);
router.post('/:id/submit', practiceController.submitSession);

module.exports = router;
