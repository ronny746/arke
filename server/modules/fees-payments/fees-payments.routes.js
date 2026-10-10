const express = require('express');
const router = express.Router();
const FeesPaymentsController = require('./fees-payments.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const rbacMiddleware = require('../../middlewares/rbac.middleware');
const validate = require('../../middlewares/validate.middleware');
const {
  generateFeeSchema,
  processPaymentSchema,
  createCustomPlanSchema,
  recordOfflinePaymentSchema,
  sendReminderSchema
} = require('./fees-payments.validation');
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
  '/transactions',
  FeesPaymentsController.getTransactions
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

// ── Custom Fee Plans & Installments ──
router.post(
  '/custom-plan',
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS]),
  validate(createCustomPlanSchema),
  FeesPaymentsController.createOrUpdateCustomPlan
);

router.post(
  '/record-offline',
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS]),
  validate(recordOfflinePaymentSchema),
  FeesPaymentsController.recordOfflinePayment
);

router.post(
  '/send-reminder',
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS]),
  validate(sendReminderSchema),
  FeesPaymentsController.sendPaymentReminder
);

router.get(
  '/plan/:courseId',
  FeesPaymentsController.getCoursePlan
);

router.get(
  '/custom-plans',
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS]),
  FeesPaymentsController.getCustomPlans
);

router.post(
  '/reminders/check',
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS]),
  FeesPaymentsController.checkAndSendDueReminders
);

module.exports = router;

