const express = require('express');
const router = express.Router();
const AssignmentController = require('./assignments.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const rbacMiddleware = require('../../middlewares/rbac.middleware');
const validate = require('../../middlewares/validate.middleware');
const { createAssignmentSchema, submitAssignmentSchema, gradeAssignmentSchema } = require('./assignments.validation');
const { ROLES } = require('../../config/constants');

router.use(authMiddleware);

// Teacher creates assignment
router.post(
  '/',
  rbacMiddleware.requireRole([ROLES.TEACHER, ROLES.ADMIN_ACADOPS, ROLES.SUPER_ADMIN]),
  validate(createAssignmentSchema),
  AssignmentController.createAssignment
);

// Everyone can view assignments (Student sees their class, Teacher sees theirs, handled in service query)
router.get(
  '/',
  AssignmentController.getAssignments
);

router.get(
  '/my-submissions',
  rbacMiddleware.requireRole([ROLES.STUDENT]),
  AssignmentController.getMySubmissions
);

router.get(
  '/my-children',
  rbacMiddleware.requireRole([ROLES.PARENT, ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS, ROLES.ADMIN_ACADOPS]),
  AssignmentController.getChildAssignments
);

router.get(
  '/my-children-submissions',
  rbacMiddleware.requireRole([ROLES.PARENT, ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS, ROLES.ADMIN_ACADOPS]),
  AssignmentController.getChildSubmissions
);

// Student submits assignment
router.post(
  '/:id/submit',
  rbacMiddleware.requireRole([ROLES.STUDENT]),
  validate(submitAssignmentSchema),
  AssignmentController.submitAssignment
);

// Teacher grades submission
router.put(
  '/submissions/:submissionId/grade',
  rbacMiddleware.requireRole([ROLES.TEACHER, ROLES.ADMIN_ACADOPS, ROLES.SUPER_ADMIN]),
  validate(gradeAssignmentSchema),
  AssignmentController.gradeSubmission
);

// Teacher views submissions for an assignment
router.get(
  '/:id/submissions',
  rbacMiddleware.requireRole([ROLES.TEACHER, ROLES.ADMIN_ACADOPS, ROLES.SUPER_ADMIN]),
  AssignmentController.getSubmissionsByAssignment
);

module.exports = router;
