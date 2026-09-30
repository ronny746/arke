const express = require('express');
const router = express.Router();
const practiceController = require('./practice.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/rbac.middleware');
const { ROLES } = require('../../config/constants');

const { checkAccess } = require('../../middlewares/contentAccess.middleware');

router.use(authMiddleware);

const allRoles = [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.ADMIN_ACADOPS];

router.get('/filters', requireRole(allRoles), checkAccess('dpps'), practiceController.getFilters);
router.get('/history', requireRole(allRoles), checkAccess('dpps'), practiceController.getHistory);
router.get('/exam/:examId', requireRole(allRoles), checkAccess('dpps'), practiceController.getRemedialDpps);
router.post('/generate', requireRole(allRoles), checkAccess('dpps'), practiceController.generateSession);
router.post('/manual', requireRole([ROLES.TEACHER, ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.ADMIN_ACADOPS]), practiceController.createManualSession);
router.get('/:id', requireRole(allRoles), checkAccess('dpps'), practiceController.getSession);
router.put('/:id/progress', requireRole([ROLES.STUDENT]), checkAccess('dpps'), practiceController.saveProgress);
router.post('/:id/submit', requireRole([ROLES.STUDENT]), checkAccess('dpps'), practiceController.submitSession);

module.exports = router;
