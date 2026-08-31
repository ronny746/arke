const express = require('express');
const router = express.Router();
const ResourcesController = require('./resources.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const rbacMiddleware = require('../../middlewares/rbac.middleware');
const validate = require('../../middlewares/validate.middleware');
const { createResourceSchema } = require('./resources.validation');
const { ROLES } = require('../../config/constants');

router.use(authMiddleware);

router.post(
  '/',
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_ACADOPS, ROLES.TEACHER]),
  validate(createResourceSchema),
  ResourcesController.createResource
);

router.get(
  '/',
  ResourcesController.getResources
);

router.delete(
  '/:id',
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_ACADOPS, ROLES.TEACHER]),
  ResourcesController.deleteResource
);

module.exports = router;
