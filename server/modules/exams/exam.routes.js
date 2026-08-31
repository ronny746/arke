const express = require('express');
const router = express.Router();
const ExamController = require('./exam.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/rbac.middleware');
const { ROLES } = require('../../config/constants');
const upload = require('../../middlewares/upload.middleware');
const uploadMemory = require('../../middlewares/uploadMemory.middleware');
const { checkAccess } = require('../../middlewares/contentAccess.middleware');

router.use(authMiddleware);

// --- Admin/Teacher Routes ---

// Create Exam
router.post(
  '/',
  requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_ACADOPS, ROLES.TEACHER]),
  ExamController.createExam
);

// Get All Exams (with filters)
router.get(
  '/',
  requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_ACADOPS, ROLES.TEACHER]),
  ExamController.getExams
);

// Update Exam
router.put(
  '/:id',
  requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_ACADOPS, ROLES.TEACHER]),
  ExamController.updateExam
);

// Parse Word Document for Questions
// using 'memory' storage for the multer upload so we can pass the buffer to mammoth
const multer = require('multer');
const memoryUpload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

router.post(
  '/parse-word',
  requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_ACADOPS, ROLES.TEACHER]),
  memoryUpload.single('file'),
  ExamController.parseWordFile
);

// Add Questions to Exam
router.post(
  '/:id/questions',
  requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_ACADOPS, ROLES.TEACHER]),
  ExamController.addQuestions
);

// Get Exam Details (Admin)
router.get(
  '/:id',
  requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_ACADOPS, ROLES.TEACHER]),
  ExamController.getExamDetails
);

// Live Proctoring/Monitoring (Admin)
router.get(
  '/:id/live-monitor',
  requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_ACADOPS, ROLES.TEACHER]),
  ExamController.getLiveMonitoringData
);

// Get All Submissions for an Exam (Admin)
router.get(
  '/:id/submissions',
  requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_ACADOPS, ROLES.TEACHER]),
  ExamController.getExamSubmissions
);

// Export Exam Submissions to CSV (Admin)
router.get(
  '/:id/submissions/export',
  requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_ACADOPS, ROLES.TEACHER]),
  ExamController.exportExamSubmissions
);

// Get Snapshots for a Submission (Admin)
router.get(
  '/submissions/:submissionId/snapshots',
  requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_ACADOPS, ROLES.TEACHER]),
  ExamController.getSubmissionSnapshots
);


// --- Student Routes ---
router.get(
  '/student/my-exams',
  requireRole([ROLES.STUDENT]),
  checkAccess('testSeries'),
  ExamController.getStudentExams
);

router.get(
  '/:id/analysis',
  requireRole([ROLES.STUDENT]),
  checkAccess('testSeries'),
  ExamController.getExamAnalysis
);

router.post(
  '/:id/start',
  requireRole([ROLES.STUDENT]),
  checkAccess('testSeries'),
  ExamController.startExam
);

router.post(
  '/:id/save-answer',
  requireRole([ROLES.STUDENT]),
  checkAccess('testSeries'),
  ExamController.saveAnswer
);

// Needs to handle multipart/form-data for image buffer/file
router.post(
  '/:id/snapshot',
  requireRole([ROLES.STUDENT]),
  checkAccess('testSeries'),
  uploadMemory.single('snapshot'),
  ExamController.uploadSnapshot
);

router.post(
  '/:id/submit',
  requireRole([ROLES.STUDENT]),
  checkAccess('testSeries'),
  ExamController.submitExam
);

// --- Parent Routes ---
router.get(
  '/parent/children-exams',
  requireRole([ROLES.PARENT]),
  ExamController.getParentChildrenExams
);

router.get(
  '/parent/children-exams/:id/analysis/:childId',
  requireRole([ROLES.PARENT]),
  ExamController.getParentExamAnalysis
);

// Get submission analysis for Admin
router.get(
  '/submissions/:submissionId/analysis',
  requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_ACADOPS, ROLES.TEACHER]),
  ExamController.getAdminExamAnalysis
);

module.exports = router;
