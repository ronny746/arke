const express = require('express');
const router = express.Router();
const HomeworkController = require('./homework.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const rbacMiddleware = require('../../middlewares/rbac.middleware');
const validate = require('../../middlewares/validate.middleware');
const { createHomeworkSchema } = require('./homework.validation');
const { ROLES } = require('../../config/constants');

router.use(authMiddleware);

router.post(
  '/',
  rbacMiddleware.requireRole([ROLES.TEACHER, ROLES.ADMIN_ACADOPS, ROLES.SUPER_ADMIN]),
  validate(createHomeworkSchema),
  HomeworkController.createHomework
);

router.get(
  '/',
  HomeworkController.getHomework
);

router.get(
  '/my-children',
  rbacMiddleware.requireRole([ROLES.PARENT, ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS, ROLES.ADMIN_ACADOPS]),
  HomeworkController.getChildHomework
);

router.post(
  '/:id/submit',
  rbacMiddleware.requireRole([ROLES.STUDENT]),
  HomeworkController.submitHomework
);

module.exports = router;
