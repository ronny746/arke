const express = require('express');
const router = express.Router();
const BackupsController = require('./backups.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const rbacMiddleware = require('../../middlewares/rbac.middleware');
const validate = require('../../middlewares/validate.middleware');
const { requestBackupSchema } = require('./backups.validation');
const { ROLES } = require('../../config/constants');
const requireDeveloperToken = require('../../middlewares/developer.middleware');

router.use(authMiddleware);
router.use(rbacMiddleware.requireRole([ROLES.SUPER_ADMIN]));

router.post('/', validate(requestBackupSchema), BackupsController.requestBackup);
router.get('/', BackupsController.getBackups);
router.delete('/:id', requireDeveloperToken, BackupsController.deleteBackup);

module.exports = router;
