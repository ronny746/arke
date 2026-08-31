const express = require('express');
const router = express.Router();
const UserController = require('./users.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const rbacMiddleware = require('../../middlewares/rbac.middleware');
const validate = require('../../middlewares/validate.middleware');
const { createUserSchema, updateUserSchema, linkParentStudentSchema, setupParentSchema } = require('./users.validation');
const { ROLES } = require('../../config/constants');
const uploadMemory = require('../../middlewares/uploadMemory.middleware');

// Public route for downloading sample CSV template
router.get('/sample-csv/students', UserController.downloadStudentSampleCSV);

// Apply auth to all other routes
router.use(authMiddleware);

router.post(
  '/link-parent-student',
  rbacMiddleware.requireRole([ROLES.SUPER_SUPER_ADMIN, ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS]),
  validate(linkParentStudentSchema),
  UserController.linkParentStudent
);

router.post(
  '/setup-parent',
  rbacMiddleware.requireRole([ROLES.STUDENT]),
  validate(setupParentSchema),
  UserController.setupParentProfile
);

// CSV Import routes
router.post(
  '/import-students',
  rbacMiddleware.requireRole([ROLES.SUPER_SUPER_ADMIN, ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS, ROLES.ADMIN_ACADOPS]),
  uploadMemory.single('file'),
  UserController.importStudents
);

// Admins creating users
router.post(
  '/',
  rbacMiddleware.requireRole([ROLES.SUPER_SUPER_ADMIN, ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS]),
  validate(createUserSchema),
  UserController.create
);

router.get(
  '/',
  rbacMiddleware.requireRole([ROLES.SUPER_SUPER_ADMIN, ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS, ROLES.ADMIN_ACADOPS, ROLES.TEACHER, ROLES.PARENT, ROLES.STUDENT]),
  UserController.getAll
);

router.get(
  '/roles',
  UserController.getRoles
);

router.get(
  '/me',
  UserController.getMe
);

router.get(
  '/:id',
  UserController.getById
);

router.put(
  '/:id',
  rbacMiddleware.requireRole([ROLES.SUPER_SUPER_ADMIN, ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS]),
  validate(updateUserSchema),
  UserController.update
);

router.delete(
  '/:id',
  rbacMiddleware.requireRole([ROLES.SUPER_SUPER_ADMIN, ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS]),
  UserController.delete
);

module.exports = router;
