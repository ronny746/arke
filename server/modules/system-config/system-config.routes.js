const express = require('express');
const router = express.Router();
const SystemConfigController = require('./system-config.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const rbacMiddleware = require('../../middlewares/rbac.middleware');
const validate = require('../../middlewares/validate.middleware');
const { updateConfigSchema } = require('./system-config.validation');
const { ROLES } = require('../../config/constants');

router.use(authMiddleware);

router.put(
  '/',
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS]),
  validate(updateConfigSchema),
  SystemConfigController.updateConfig
);

router.get(
  '/',
  SystemConfigController.getConfig
);

module.exports = router;
