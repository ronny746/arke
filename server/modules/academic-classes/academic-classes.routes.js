const express = require('express');
const router = express.Router();
const AcademicClassController = require('./academic-classes.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const rbacMiddleware = require('../../middlewares/rbac.middleware');
const validate = require('../../middlewares/validate.middleware');
const { createClassSchema, updateClassSchema, assignSchema, joinSchema, getClassesSchema } = require('./academic-classes.validation');
const { ROLES } = require('../../config/constants');

router.use(authMiddleware);

router.post(
  '/',
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS, ROLES.ADMIN_ACADOPS]),
  validate(createClassSchema),
  AcademicClassController.createClass
);

router.get(
  '/',
  validate(getClassesSchema),
  AcademicClassController.getClasses
);

router.get(
  '/my-classes',
  AcademicClassController.getMyClasses
);

router.post(
  '/join',
  validate(joinSchema),
  AcademicClassController.joinClass
);

router.post(
  '/:id/assign',
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS, ROLES.ADMIN_ACADOPS]),
  validate(assignSchema),
  AcademicClassController.assignToClass
);

router.get(
  '/:id',
  AcademicClassController.getClassById
);

router.put(
  '/:id',
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS, ROLES.ADMIN_ACADOPS]),
  validate(updateClassSchema),
  AcademicClassController.updateClass
);

router.delete(
  '/:id',
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS, ROLES.ADMIN_ACADOPS]),
  AcademicClassController.deleteClass
);

module.exports = router;
