const express = require('express');
const router = express.Router();
const DoubtSessionsController = require('./doubt-sessions.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const rbacMiddleware = require('../../middlewares/rbac.middleware');
const validate = require('../../middlewares/validate.middleware');
const { requestSessionSchema, scheduleSessionSchema, resolveSessionSchema } = require('./doubt-sessions.validation');
const { ROLES } = require('../../config/constants');

router.use(authMiddleware);

router.post(
  '/request',
  rbacMiddleware.requireRole([ROLES.STUDENT]),
  validate(requestSessionSchema),
  DoubtSessionsController.requestSession
);

router.get(
  '/',
  DoubtSessionsController.getSessions
);

router.put(
  '/:id/schedule',
  rbacMiddleware.requireRole([ROLES.TEACHER, ROLES.ADMIN_ACADOPS, ROLES.SUPER_ADMIN]),
  validate(scheduleSessionSchema),
  DoubtSessionsController.scheduleSession
);

router.put(
  '/:id/resolve',
  validate(resolveSessionSchema),
  DoubtSessionsController.resolveSession
);

module.exports = router;
