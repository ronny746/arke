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
  '/stream',
  ResourcesController.streamPdf
);

router.get(
  '/stream/:id',
  ResourcesController.streamPdf
);

router.get(
  '/:id/stream',
  ResourcesController.streamPdf
);

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
  '/:id/assign-courses',
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_ACADOPS]),
  ResourcesController.assignCourses
);

router.put(
  '/:id/toggle-unlock',
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_ACADOPS, ROLES.TEACHER]),
  ResourcesController.toggleUnlock
);

router.put(
  '/:id',
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_ACADOPS, ROLES.TEACHER]),
  ResourcesController.updateResource
);

module.exports = router;
