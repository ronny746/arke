const express = require('express');
const router = express.Router();
const SubjectController = require('./subjects.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const rbacMiddleware = require('../../middlewares/rbac.middleware');
const validate = require('../../middlewares/validate.middleware');
const { createSubjectSchema, updateSubjectSchema, getSubjectsSchema } = require('./subjects.validation');
const { ROLES } = require('../../config/constants');

router.use(authMiddleware);

router.post(
  '/',
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS, ROLES.ADMIN_ACADOPS]),
  validate(createSubjectSchema),
  SubjectController.createSubject
);

router.get(
  '/',
  validate(getSubjectsSchema),
  SubjectController.getSubjects
);

router.get(
  '/:id',
  SubjectController.getSubjectById
);

router.put(
  '/:id',
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS, ROLES.ADMIN_ACADOPS]),
  validate(updateSubjectSchema),
  SubjectController.updateSubject
);

router.delete(
  '/:id',
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS, ROLES.ADMIN_ACADOPS]),
  SubjectController.deleteSubject
);

module.exports = router;
