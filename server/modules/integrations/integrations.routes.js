const express = require('express');
const router = express.Router();
const IntegrationsController = require('./integrations.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const rbacMiddleware = require('../../middlewares/rbac.middleware');
const validate = require('../../middlewares/validate.middleware');
const { configureIntegrationSchema } = require('./integrations.validation');
const { ROLES } = require('../../config/constants');

router.use(authMiddleware);

router.post(
  '/',
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS]),
  validate(configureIntegrationSchema),
  IntegrationsController.configureIntegration
);

router.get(
  '/',
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS]),
  IntegrationsController.getIntegrations
);

module.exports = router;
