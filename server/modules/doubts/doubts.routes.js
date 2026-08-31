const express = require('express');
const router = express.Router();
const DoubtsController = require('./doubts.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const rbacMiddleware = require('../../middlewares/rbac.middleware');
const { ROLES } = require('../../config/constants');

router.use(authMiddleware);

// Student
router.post(
  '/',
  rbacMiddleware.requireRole([ROLES.STUDENT]),
  DoubtsController.createDoubt
);

// Student & Teacher
router.get(
  '/batch/:batchId',
  rbacMiddleware.requireRole([ROLES.STUDENT, ROLES.TEACHER, ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS, ROLES.ADMIN_ACADOPS]),
  DoubtsController.getDoubtsByBatch
);

// Teacher
router.get(
  '/teacher',
  rbacMiddleware.requireRole([ROLES.TEACHER]),
  DoubtsController.getDoubtsForTeacher
);

router.put(
  '/:id/resolve',
  rbacMiddleware.requireRole([ROLES.TEACHER]),
  DoubtsController.resolveDoubt
);

// Admin
router.get(
  '/admin/stats',
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS, ROLES.ADMIN_ACADOPS]),
  DoubtsController.getAdminDoubtsStats
);

module.exports = router;
