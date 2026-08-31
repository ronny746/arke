const express = require('express');
const router = express.Router();
const FormsController = require('./forms.controller');
const validate = require('../../middlewares/validate.middleware');
const { createFormSchema, updateFormSchema } = require('./forms.validation');
const authMiddleware = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/rbac.middleware');
const { ROLES } = require('../../config/constants');

// Public route -> Note: This will be mounted directly on `/api/public/forms` in index.js
router.get('/public/:publicId', FormsController.getPublicForm);

// Protected routes
router.use(authMiddleware);
router.use(requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS, ROLES.ADMIN_ACADOPS]));

router.post('/', validate(createFormSchema), FormsController.createForm);
router.get('/', FormsController.getForms);
router.get('/:id', FormsController.getFormById);
router.put('/:id', validate(updateFormSchema), FormsController.updateForm);

module.exports = router;
