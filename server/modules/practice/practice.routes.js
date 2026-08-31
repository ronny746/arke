const express = require('express');
const router = express.Router();
const practiceController = require('./practice.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/rbac.middleware');
const { ROLES } = require('../../config/constants');

const { checkAccess } = require('../../middlewares/contentAccess.middleware');

router.use(authMiddleware);
// router.use(requireRole([ROLES.STUDENT]));

router.get('/filters', requireRole([ROLES.STUDENT]), checkAccess('dpps'), practiceController.getFilters);
router.get('/history', requireRole([ROLES.STUDENT]), checkAccess('dpps'), practiceController.getHistory);
router.get('/exam/:examId', requireRole([ROLES.STUDENT]), checkAccess('dpps'), practiceController.getRemedialDpps);
router.post('/generate', requireRole([ROLES.STUDENT]), checkAccess('dpps'), practiceController.generateSession);
router.get('/:id', requireRole([ROLES.STUDENT, ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.TEACHER]), checkAccess('dpps'), practiceController.getSession);
router.put('/:id/progress', requireRole([ROLES.STUDENT]), checkAccess('dpps'), practiceController.saveProgress);
router.post('/:id/submit', requireRole([ROLES.STUDENT]), checkAccess('dpps'), practiceController.submitSession);

module.exports = router;
