const express = require('express');
const router = express.Router();
const RecycleBinController = require('./recycle-bin.controller');
const requireAuth = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/rbac.middleware');
const { ROLES } = require('../../config/constants');

// Only Admins and Super Admins should access the Recycle Bin
router.use(requireAuth, requireRole([ROLES.SUPER_SUPER_ADMIN, ROLES.SUPER_ADMIN, ROLES.ADMIN]));

router.get('/', RecycleBinController.getDeletedItems);
router.post('/restore', RecycleBinController.restoreItem);
router.post('/permanent-delete', RecycleBinController.permanentlyDeleteItem); // using POST to pass body easily, or we can use DELETE with body

module.exports = router;
