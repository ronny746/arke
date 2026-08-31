const express = require('express');
const router = express.Router();
const TestsExamsController = require('./tests-exams.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const rbacMiddleware = require('../../middlewares/rbac.middleware');
const validate = require('../../middlewares/validate.middleware');
const { createExamSchema } = require('./tests-exams.validation');
const { ROLES } = require('../../config/constants');

router.use(authMiddleware);

router.post(
  '/',
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_ACADOPS, ROLES.TEACHER]),
  validate(createExamSchema),
  TestsExamsController.createExam
);

router.get(
  '/',
  TestsExamsController.getExams
);

module.exports = router;
