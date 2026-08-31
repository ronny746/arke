const express = require('express');
const router = express.Router();
const InstituteController = require('./institutes.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const rbacMiddleware = require('../../middlewares/rbac.middleware');
const validate = require('../../middlewares/validate.middleware');
const { createInstituteSchema, updateInstituteSchema } = require('./institutes.validation');
const { ROLES } = require('../../config/constants');

// Apply auth to all routes in this module
router.use(authMiddleware);

// Only Super Super Admin can create and delete institutes globally
router.post(
  '/',
  rbacMiddleware.requireRole([ROLES.SUPER_SUPER_ADMIN]),
  validate(createInstituteSchema),
  InstituteController.create
);

// Super Super Admin sees all, Admin Operations/Super Admin sees their own
router.get(
  '/',
  rbacMiddleware.requireRole([ROLES.SUPER_SUPER_ADMIN, ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS]),
  InstituteController.getAll
);

router.get(
  '/:id',
  rbacMiddleware.requireRole([ROLES.SUPER_SUPER_ADMIN, ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS]),
  InstituteController.getById
);

// Institute owner can update their own institute, Super Super can update any
router.put(
  '/:id',
  rbacMiddleware.requireRole([ROLES.SUPER_SUPER_ADMIN, ROLES.SUPER_ADMIN]),
  validate(updateInstituteSchema),
  InstituteController.update
);

router.delete(
  '/:id',
  rbacMiddleware.requireRole([ROLES.SUPER_SUPER_ADMIN]),
  InstituteController.delete
);

module.exports = router;
