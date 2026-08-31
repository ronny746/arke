const express = require('express');
const router = express.Router();
const FeesPaymentsController = require('./fees-payments.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const rbacMiddleware = require('../../middlewares/rbac.middleware');
const validate = require('../../middlewares/validate.middleware');
const { generateFeeSchema, processPaymentSchema } = require('./fees-payments.validation');
const { ROLES } = require('../../config/constants');

router.use(authMiddleware);

router.post(
  '/records',
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS]),
  validate(generateFeeSchema),
  FeesPaymentsController.generateFee
);

router.get(
  '/records',
  FeesPaymentsController.getFees
);

router.get(
  '/my-dues',
  rbacMiddleware.requireRole([ROLES.STUDENT]),
  FeesPaymentsController.getMyDues
);

router.get(
  '/my-children',
  rbacMiddleware.requireRole([ROLES.PARENT, ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS, ROLES.ADMIN_ACADOPS]),
  FeesPaymentsController.getChildFees
);

router.post(
  '/pay',
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS, ROLES.STUDENT, ROLES.PARENT]),
  validate(processPaymentSchema),
  FeesPaymentsController.processPayment
);

module.exports = router;
