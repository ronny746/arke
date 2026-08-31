const express = require('express');
const router = express.Router();
const leadsController = require('./leads.controller');
const protect = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/rbac.middleware');
const { ROLES } = require('../../config/constants');

router.use(protect);

// Staff and Admin accessible
router.get('/pool', requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_ACADOPS, ROLES.ADMIN_OPERATIONS, ROLES.STAFF]), leadsController.getLeadPool);
router.get('/my-leads', requireRole([ROLES.STAFF]), leadsController.getMyLeads);
router.post('/:id/claim', requireRole([ROLES.STAFF]), leadsController.claimLead);

// Both Admin and Staff can update status, but controller will verify ownership if Staff
router.patch('/:id/status', requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_ACADOPS, ROLES.ADMIN_OPERATIONS, ROLES.STAFF]), leadsController.updateLeadStatus);

// Admin only endpoints
router.use(requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_ACADOPS, ROLES.ADMIN_OPERATIONS]));
router.get('/', leadsController.getAllLeads);
router.post('/', leadsController.createLead);
router.patch('/:id/assign', leadsController.assignLead);

module.exports = router;
