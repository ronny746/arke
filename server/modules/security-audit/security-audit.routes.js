const express = require('express');
const router = express.Router();
const SecurityAuditController = require('./security-audit.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const rbacMiddleware = require('../../middlewares/rbac.middleware');
const { ROLES } = require('../../config/constants');

router.use(authMiddleware);

router.get(
  '/',
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN]),
  SecurityAuditController.getLogs
);

module.exports = router;
