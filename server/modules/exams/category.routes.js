const express = require('express');
const router = express.Router();
const categoryController = require('./category.controller');
const auth = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/rbac.middleware');
const { ROLES } = require('../../config/constants');
const requireDeveloperToken = require('../../middlewares/developer.middleware');

router.use(auth);

const allowedRoles = [ROLES.SUPER_ADMIN, ROLES.ADMIN_ACADOPS, ROLES.TEACHER];

router.get('/', requireRole(allowedRoles), categoryController.getCategories);
router.post('/', requireRole(allowedRoles), categoryController.createCategory);
router.put('/:id', requireRole(allowedRoles), categoryController.renameCategory);
router.put('/chapter/:id', requireRole(allowedRoles), categoryController.renameChapter);
router.put('/topic/:id', requireRole(allowedRoles), categoryController.renameTopic);
router.delete('/:id', requireDeveloperToken, requireRole(allowedRoles), categoryController.deleteCategory);
router.delete('/chapter/:id', requireDeveloperToken, requireRole(allowedRoles), categoryController.deleteChapter);
router.delete('/topic/:id', requireDeveloperToken, requireRole(allowedRoles), categoryController.deleteTopic);
router.put('/toggle/:type/:id', requireRole(allowedRoles), categoryController.togglePublish);

module.exports = router;
