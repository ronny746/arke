const express = require('express');
const router = express.Router();
const BatchController = require('./batches.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const rbacMiddleware = require('../../middlewares/rbac.middleware');
const validate = require('../../middlewares/validate.middleware');
const { createBatchSchema, updateBatchSchema, assignSchema, joinSchema, getBatchesSchema, bulkAssignClassSchema } = require('./batches.validation');
const { ROLES } = require('../../config/constants');
const requireDeveloperToken = require('../../middlewares/developer.middleware');

router.use(authMiddleware);

router.post(
  '/',
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS, ROLES.ADMIN_ACADOPS]),
  validate(createBatchSchema),
  BatchController.createBatch
);

router.get(
  '/',
  validate(getBatchesSchema),
  BatchController.getBatches
);

router.get(
  '/my-batches',
  BatchController.getMyBatches
);

router.post(
  '/join',
  validate(joinSchema),
  BatchController.joinBatch
);

router.post(
  '/:id/assign',
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS, ROLES.ADMIN_ACADOPS]),
  validate(assignSchema),
  BatchController.assignToBatch
);

router.post(
  '/:id/bulk-assign-class',
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS, ROLES.ADMIN_ACADOPS]),
  validate(bulkAssignClassSchema),
  BatchController.bulkAssignClass
);

router.post(
  '/sync-student',
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS, ROLES.ADMIN_ACADOPS]),
  BatchController.syncStudentBatches
);

router.get(
  '/:id',
  BatchController.getBatchById
);

router.put(
  '/:id',
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS, ROLES.ADMIN_ACADOPS]),
  validate(updateBatchSchema),
  BatchController.updateBatch
);

router.delete(
  '/:id', requireDeveloperToken,
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS, ROLES.ADMIN_ACADOPS]),
  BatchController.deleteBatch
);

module.exports = router;
