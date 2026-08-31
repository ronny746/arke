const express = require('express');
const router = express.Router();
const InventoryController = require('./inventory.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const rbacMiddleware = require('../../middlewares/rbac.middleware');
const validate = require('../../middlewares/validate.middleware');
const { addItemSchema, issueItemSchema } = require('./inventory.validation');
const { ROLES } = require('../../config/constants');

router.use(authMiddleware);

router.post(
  '/items',
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS]),
  validate(addItemSchema),
  InventoryController.addItem
);

router.get(
  '/items',
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS]),
  InventoryController.getItems
);

router.post(
  '/issues',
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS]),
  validate(issueItemSchema),
  InventoryController.issueItem
);

router.put(
  '/issues/:id/return',
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS]),
  InventoryController.returnItem
);

module.exports = router;
