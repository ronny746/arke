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

const { checkAccess } = require('../../middlewares/contentAccess.middleware');
const requireDeveloperToken = require('../../middlewares/developer.middleware');

router.get(
  '/',
  checkAccess('studyMaterials'),
  ResourcesController.getResources
);

router.delete(
  '/:id', requireDeveloperToken,
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_ACADOPS, ROLES.TEACHER]),
  ResourcesController.deleteResource
);

router.put(
  '/:id',
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_ACADOPS, ROLES.TEACHER]),
  ResourcesController.updateResource
);

module.exports = router;
