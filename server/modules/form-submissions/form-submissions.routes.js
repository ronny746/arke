const express = require('express');
const router = express.Router();
const FormSubmissionsController = require('./form-submissions.controller');
const validate = require('../../middlewares/validate.middleware');
const { submitFormSchema, updateStatusSchema } = require('./form-submissions.validation');
const authMiddleware = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/rbac.middleware');
const { ROLES } = require('../../config/constants');

// Public route for submission
router.post('/public/:publicId/submit', validate(submitFormSchema), FormSubmissionsController.submitForm);

// Protected routes
router.use(authMiddleware);
router.use(requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS, ROLES.ADMIN_ACADOPS]));

router.get('/form/:formId', FormSubmissionsController.getSubmissionsForForm);
router.put('/:id/status', validate(updateStatusSchema), FormSubmissionsController.updateStatus);

module.exports = router;
