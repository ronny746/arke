const express = require('express');
const router = express.Router();
const ResultsController = require('./results.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const rbacMiddleware = require('../../middlewares/rbac.middleware');
const validate = require('../../middlewares/validate.middleware');
const { submitResultSchema } = require('./results.validation');
const { ROLES } = require('../../config/constants');

router.use(authMiddleware);

router.post(
  '/',
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_ACADOPS, ROLES.TEACHER]),
  validate(submitResultSchema),
  ResultsController.submitResult
);

router.get(
  '/',
  ResultsController.getResults
);

router.get(
  '/my-children',
  rbacMiddleware.requireRole([ROLES.PARENT, ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS, ROLES.ADMIN_ACADOPS]),
  ResultsController.getChildResults
);

module.exports = router;
