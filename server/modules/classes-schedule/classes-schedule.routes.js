const express = require('express');
const router = express.Router();
const ClassesScheduleController = require('./classes-schedule.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const rbacMiddleware = require('../../middlewares/rbac.middleware');
const validate = require('../../middlewares/validate.middleware');
const { createScheduleSchema, getScheduleSchema, createOverrideSchema, getCalculatedScheduleSchema } = require('./classes-schedule.validation');
const { ROLES } = require('../../config/constants');
const requireDeveloperToken = require('../../middlewares/developer.middleware');

router.use(authMiddleware);

router.post(
  '/',
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS, ROLES.ADMIN_ACADOPS]),
  validate(createScheduleSchema),
  ClassesScheduleController.createSchedule
);

router.get(
  '/',
  validate(getScheduleSchema, 'query'),
  ClassesScheduleController.getSchedule
);

router.get(
  '/my-classes',
  validate(getScheduleSchema, 'query'),
  ClassesScheduleController.getSchedule
);

router.get(
  '/my-schedule',
  rbacMiddleware.requireRole([ROLES.TEACHER]),
  validate(getScheduleSchema, 'query'),
  ClassesScheduleController.getMySchedule
);

router.delete(
  '/:id', requireDeveloperToken,
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS, ROLES.ADMIN_ACADOPS]),
  ClassesScheduleController.deleteSchedule
);

router.post(
  '/override',
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS, ROLES.ADMIN_ACADOPS, ROLES.TEACHER]),
  validate(createOverrideSchema),
  ClassesScheduleController.createOverride
);

router.get(
  '/calculated',
  validate(getCalculatedScheduleSchema, 'query'),
  ClassesScheduleController.getCalculatedSchedule
);

module.exports = router;
