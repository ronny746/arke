const express = require('express');
const router = express.Router();
const AnalyticsReportsController = require('./analytics-reports.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const rbacMiddleware = require('../../middlewares/rbac.middleware');
const { ROLES } = require('../../config/constants');

router.use(authMiddleware);

router.get(
  '/dashboard-stats',
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS, ROLES.ADMIN_ACADOPS, ROLES.TEACHER]),
  AnalyticsReportsController.getDashboardStats
);

router.post(
  '/generate',
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS, ROLES.ADMIN_ACADOPS]),
  AnalyticsReportsController.queueReportGeneration
);

router.get(
  '/tasks',
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS, ROLES.ADMIN_ACADOPS]),
  AnalyticsReportsController.getReportTasks
);

router.get(
  '/student/:studentId/performance',
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_ACADOPS, ROLES.TEACHER, ROLES.STUDENT]),
  AnalyticsReportsController.getStudentPerformance
);

module.exports = router;
