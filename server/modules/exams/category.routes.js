const express = require('express');
const router = express.Router();
const categoryController = require('./category.controller');
const auth = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/rbac.middleware');
const { ROLES } = require('../../config/constants');

router.use(auth);

const allowedRoles = [ROLES.SUPER_ADMIN, ROLES.ADMIN_ACADOPS, ROLES.TEACHER];

router.get('/', requireRole(allowedRoles), categoryController.getCategories);
router.post('/', requireRole(allowedRoles), categoryController.createCategory);
router.delete('/:id', requireRole(allowedRoles), categoryController.deleteCategory);

module.exports = router;
