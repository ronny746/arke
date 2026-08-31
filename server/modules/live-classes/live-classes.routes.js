const express = require('express');
const router = express.Router();
const LiveClassesController = require('./live-classes.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const rbacMiddleware = require('../../middlewares/rbac.middleware');
const validate = require('../../middlewares/validate.middleware');
const { startLiveClassSchema, endLiveClassSchema } = require('./live-classes.validation');
const { ROLES } = require('../../config/constants');

router.use(authMiddleware);

router.post(
  '/',
  rbacMiddleware.requireRole([ROLES.TEACHER, ROLES.ADMIN_ACADOPS, ROLES.SUPER_ADMIN]),
  validate(startLiveClassSchema),
  LiveClassesController.startLiveClass
);

router.get(
  '/',
  LiveClassesController.getActiveClasses
);

router.put(
  '/:id/end',
  rbacMiddleware.requireRole([ROLES.TEACHER, ROLES.ADMIN_ACADOPS, ROLES.SUPER_ADMIN]),
  validate(endLiveClassSchema),
  LiveClassesController.endLiveClass
);

module.exports = router;
