const express = require('express');
const router = express.Router();
const questionBankController = require('./question-bank.controller');
const examController = require('./exam.controller'); // for parseWordFile
const auth = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/rbac.middleware');
const { ROLES } = require('../../config/constants');
const multer = require('multer');
const requireDeveloperToken = require('../../middlewares/developer.middleware');
const memoryUpload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

router.use(auth);

// Restrict all Question Bank routes to Admins and Teachers
const allowedRoles = [ROLES.SUPER_ADMIN, ROLES.ADMIN_ACADOPS, ROLES.TEACHER];

router.get('/', requireRole(allowedRoles), questionBankController.getQuestionBanks);
router.post('/', requireRole(allowedRoles), questionBankController.createQuestionBank);
// Hierarchy route
router.get('/hierarchy', requireRole(allowedRoles), questionBankController.getHierarchy);

// Get questions by hierarchy (for exam creation)
router.get('/questions', requireRole(allowedRoles), questionBankController.getQuestionsByHierarchy);

router.get('/:id', requireRole(allowedRoles), questionBankController.getQuestionBankById);
router.put('/:id', requireRole(allowedRoles), questionBankController.updateQuestionBank);
router.patch('/:id/rename', requireRole(allowedRoles), questionBankController.renameQuestionBank);
router.delete('/:id', requireDeveloperToken, requireRole(allowedRoles), questionBankController.deleteQuestionBank);

// Individual Question Update/Delete
router.put('/:bankId/questions/:questionId', requireRole(allowedRoles), questionBankController.updateSingleQuestion);
router.delete('/:bankId/questions/:questionId', requireRole(allowedRoles), questionBankController.deleteSingleQuestion);

// Old word parse route (can keep for legacy or UI that just previews)
router.post('/parse-word', requireRole(allowedRoles), memoryUpload.single('file'), examController.parseWordFile);

// New DOCX upload route (actually parses and creates categories/returns DB-ready JSON)
router.post('/upload-docx', requireRole(allowedRoles), memoryUpload.single('file'), questionBankController.uploadDocx);

module.exports = router;
