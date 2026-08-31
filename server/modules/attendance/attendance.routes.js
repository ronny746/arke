const express = require('express');
const router = express.Router();
const AttendanceController = require('./attendance.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const rbacMiddleware = require('../../middlewares/rbac.middleware');
const validate = require('../../middlewares/validate.middleware');
const { markAttendanceSchema, getAttendanceSchema, geoCheckinSchema } = require('./attendance.validation');
const { ROLES } = require('../../config/constants');

router.use(authMiddleware);

router.post(
  '/',
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS, ROLES.ADMIN_ACADOPS, ROLES.TEACHER]),
  validate(markAttendanceSchema),
  AttendanceController.markAttendance
);

router.post(
  '/geo-checkin',
  rbacMiddleware.requireRole([ROLES.STUDENT]),
  validate(geoCheckinSchema),
  AttendanceController.geoCheckin
);

router.get(
  '/my-attendance',
  validate(getAttendanceSchema, 'query'),
  AttendanceController.getAttendance
);

router.get(
  '/my-children',
  rbacMiddleware.requireRole([ROLES.PARENT, ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS, ROLES.ADMIN_ACADOPS]),
  AttendanceController.getChildAttendance
);

module.exports = router;
