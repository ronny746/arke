const express = require('express');
const router = express.Router();
const CourseController = require('./courses.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const rbacMiddleware = require('../../middlewares/rbac.middleware');
const validate = require('../../middlewares/validate.middleware');
const { createCourseSchema, updateCourseSchema } = require('./courses.validation');
const { ROLES } = require('../../config/constants');
const requireDeveloperToken = require('../../middlewares/developer.middleware');

router.use(authMiddleware);

router.post(
  '/',
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS, ROLES.ADMIN_ACADOPS]),
  validate(createCourseSchema),
  CourseController.createCourse
);

router.get(
  '/',
  CourseController.getCourses
);

router.get(
  '/:id',
  CourseController.getCourseById
);

router.put(
  '/:id',
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS, ROLES.ADMIN_ACADOPS]),
  validate(updateCourseSchema),
  CourseController.updateCourse
);

router.delete(
  '/:id', requireDeveloperToken,
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS, ROLES.ADMIN_ACADOPS]),
  CourseController.deleteCourse
);

router.post(
  '/:id/enroll',
  rbacMiddleware.requireRole([ROLES.STUDENT]),
  CourseController.enrollCourse
);

module.exports = router;
