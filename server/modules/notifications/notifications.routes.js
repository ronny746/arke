const express = require('express');
const router = express.Router();
const NotificationsController = require('./notifications.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const rbacMiddleware = require('../../middlewares/rbac.middleware');
const validate = require('../../middlewares/validate.middleware');
const { sendNotificationSchema } = require('./notifications.validation');
const { ROLES } = require('../../config/constants');

router.use(authMiddleware);

router.post(
  '/send',
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS, ROLES.ADMIN_ACADOPS]),
  validate(sendNotificationSchema),
  NotificationsController.sendNotification
);

router.get(
  '/',
  NotificationsController.getNotifications
);

router.put(
  '/:id/read',
  NotificationsController.markAsRead
);

module.exports = router;
