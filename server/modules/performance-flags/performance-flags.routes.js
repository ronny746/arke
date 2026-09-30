const express = require('express');
const router = express.Router();
const controller = require('./performance-flags.controller');
const auth = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/rbac.middleware');
const { ROLES } = require('../../config/constants');

router.use(auth);
router.get('/me', requireRole([ROLES.STUDENT]), controller.getMine);
router.get('/children/:childId', requireRole([ROLES.PARENT]), controller.getChild);
router.get('/batches/:batchId', requireRole([ROLES.TEACHER]), controller.getBatch);

module.exports = router;
