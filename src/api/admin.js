import axiosInstance from './axiosInstance';

export const adminAPI = {
  // Dashboard
  getDashboardData: () => axiosInstance.get('/dashboard'),
  
  // --- AcadOps ---
  // Subjects
  createSubject: (data) => axiosInstance.post('/subjects', data),
  getSubjects: (params) => axiosInstance.get('/subjects', { params }),
  updateSubject: (id, data) => axiosInstance.put(`/subjects/${id}`, data),
  deleteSubject: (id) => axiosInstance.delete(`/subjects/${id}`),

  // Recycle Bin
  getRecycleBinItems: () => axiosInstance.get('/recycle-bin'),
  restoreRecycleBinItem: (data) => axiosInstance.post('/recycle-bin/restore', data),
  permanentlyDeleteRecycleBinItem: (data) => axiosInstance.post('/recycle-bin/permanent-delete', data),

  // Batches
  createBatch: (data) => axiosInstance.post('/batches', data),
  getBatches: (params) => axiosInstance.get('/batches', { params }),
  updateBatch: (id, data) => axiosInstance.put(`/batches/${id}`, data),
  deleteBatch: (id) => axiosInstance.delete(`/batches/${id}`),
  assignUserToBatch: (batchId, data) => axiosInstance.post(`/batches/${batchId}/assign`, data),
  syncUserBatches: (data) => axiosInstance.post(`/batches/sync-student`, data),

  // Timetable / Schedule
  createClassSchedule: (data) => axiosInstance.post('/classes-schedule', data),
  getClassSchedule: (params) => axiosInstance.get('/classes-schedule', { params }),
  getCalculatedSchedule: (params) => axiosInstance.get('/classes-schedule/calculated', { params }),
  createScheduleOverride: (data) => axiosInstance.post('/classes-schedule/override', data),
  updateClassSchedule: (id, data) => axiosInstance.put(`/classes-schedule/${id}`, data),
  deleteClassSchedule: (id) => axiosInstance.delete(`/classes-schedule/${id}`),

  // Exams & Results
  createExam: (data) => axiosInstance.post('/tests-exams', data),
  getExams: (params) => axiosInstance.get('/tests-exams', { params }),
  getAllResults: (params) => axiosInstance.get('/results', { params }),

  // Attendance
  getAttendance: (params) => axiosInstance.get('/attendance/my-attendance', { params }),

  // Live Classes
  createLiveClass: (data) => axiosInstance.post('/live-classes', data),
  getLiveClasses: (params) => axiosInstance.get('/live-classes', { params }),
  endLiveClass: (id, data) => axiosInstance.put(`/live-classes/${id}/end`, data),

  // Broadcast
  getBroadcastHistory: (params) => axiosInstance.get('/broadcast', { params }),
  sendBroadcast: (data) => axiosInstance.post('/broadcast', data),

  // Forms & Leads
  getForms: () => axiosInstance.get('/forms'),
  getFormById: (id) => axiosInstance.get(`/forms/${id}`),
  createForm: (data) => axiosInstance.post('/forms', data),
  updateForm: (id, data) => axiosInstance.put(`/forms/${id}`, data),
  getFormSubmissions: (formId) => axiosInstance.get(`/form-submissions/form/${formId}`),
  updateSubmissionStatus: (id, data) => axiosInstance.put(`/form-submissions/${id}/status`, data),

  // Question Banks
  getQuestionCategories: () => axiosInstance.get('/question-categories'),
  createQuestionCategory: (data) => axiosInstance.post('/question-categories', data),
  renameQuestionCategory: (id, data) => axiosInstance.put(`/question-categories/${id}`, data),
  renameQuestionChapter: (id, data) => axiosInstance.put(`/question-categories/chapter/${id}`, data),
  renameQuestionTopic: (id, data) => axiosInstance.put(`/question-categories/topic/${id}`, data),
  deleteQuestionCategory: (id) => axiosInstance.delete(`/question-categories/${id}`),
  deleteQuestionChapter: (id) => axiosInstance.delete(`/question-categories/chapter/${id}`),
  deleteQuestionTopic: (id) => axiosInstance.delete(`/question-categories/topic/${id}`),
  togglePublishCategory: (type, id, isUnpublished) => axiosInstance.put(`/question-categories/toggle/${type}/${id}`, { isUnpublished }),

  getQuestionBanks: (params) => axiosInstance.get('/question-banks', { params }),
  getQuestionBankHierarchy: () => axiosInstance.get('/question-banks/hierarchy'),
  getQuestionsByHierarchy: (params) => axiosInstance.get('/question-banks/questions', { params }),
  createQuestionBank: (data) => axiosInstance.post('/question-banks', data),
  getQuestionBankById: (id) => axiosInstance.get(`/question-banks/${id}`),
  updateQuestionBank: (id, data) => axiosInstance.put(`/question-banks/${id}`, data),
  renameQuestionBank: (id, data) => axiosInstance.patch(`/question-banks/${id}/rename`, data),
  deleteQuestionBank: (id) => axiosInstance.delete(`/question-banks/${id}`),
  updateSingleQuestion: (bankId, questionId, data) => axiosInstance.put(`/question-banks/${bankId}/questions/${questionId}`, data),
  deleteSingleQuestion: (bankId, questionId) => axiosInstance.delete(`/question-banks/${bankId}/questions/${questionId}`),
  parseWordFile: (formData) => axiosInstance.post('/question-banks/parse-word', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  uploadDocxToBank: (formData) => axiosInstance.post('/question-banks/upload-docx', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  // Exams
  getExams: () => axiosInstance.get('/exams'),
  getExamById: (id) => axiosInstance.get(`/exams/${id}`),
  createExam: (data) => axiosInstance.post('/exams', data),
  updateExam: (id, data) => axiosInstance.put(`/exams/${id}`, data),
  addExamQuestions: (id, data) => axiosInstance.post(`/exams/${id}/questions`, data),
  getLiveMonitoringData: (id) => axiosInstance.get(`/exams/${id}/live-monitor`),

  // Resources
  getResources: (params) => axiosInstance.get('/resources', { params }),
  createResource: (data) => axiosInstance.post('/resources', data),
  updateResource: (id, data) => axiosInstance.put(`/resources/${id}`, data),
  deleteResource: (id) => axiosInstance.delete(`/resources/${id}`),

  // Assignments
  createAssignment: (data) => axiosInstance.post('/assignments', data),
  getAssignments: (params) => axiosInstance.get('/assignments', { params }),
  getSubmissionsByAssignment: (assignmentId) => axiosInstance.get(`/assignments/${assignmentId}/submissions`),
  gradeSubmission: (submissionId, data) => axiosInstance.put(`/assignments/submissions/${submissionId}/grade`, data),

  // Homework
  createHomework: (data) => axiosInstance.post('/homework', data),
  getHomework: (params) => axiosInstance.get('/homework', { params }),

  // --- Operations ---
  // Users (Teachers, Students, Parents, Staff)
  getAllRoles: () => axiosInstance.get('/users/roles'),
  createUser: (data) => axiosInstance.post('/users', data),
  getUsers: (params) => axiosInstance.get('/users', { params }),
  getUserById: (id) => axiosInstance.get(`/users/${id}`),
  updateUser: (id, data) => axiosInstance.put(`/users/${id}`, data),
  deleteUser: (id) => axiosInstance.delete(`/users/${id}`),
  linkParentStudent: (data) => axiosInstance.post('/users/link-parent-student', data),
  importStudents: (formData, config = {}) => axiosInstance.post('/users/import-students', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    ...config
  }),
  downloadStudentSampleCSV: () => {
    // This is handled via window.open usually, but we can return the URL
    return `${process.env.NEXT_PUBLIC_API_URL || '/api/v1' || 'http://localhost:3000/api'}/users/sample-csv/students`;
  },

  // Fees & Payments
  getFees: (params) => axiosInstance.get('/fees-payments/records', { params }),
  createFeeRecord: (data) => axiosInstance.post('/fees-payments/records', data),
  recordPayment: (data) => axiosInstance.post('/fees-payments/pay', data),

  // Inventory
  getInventory: (params) => axiosInstance.get('/inventory/items', { params }),
  addInventoryItem: (data) => axiosInstance.post('/inventory/items', data),
  issueItem: (data) => axiosInstance.post('/inventory/issues', data),

  // PTM
  getPtmSlots: (params) => axiosInstance.get('/ptm-booking/slots', { params }),
  getPtmBookings: (params) => axiosInstance.get('/ptm-booking/bookings', { params }),

  // Notifications
  getNotifications: (params) => axiosInstance.get('/notifications', { params }),
  sendNotification: (data) => axiosInstance.post('/notifications/send', data),
  markNotificationRead: (id) => axiosInstance.put(`/notifications/${id}/read`),

  // Reports
  getReportTasks: () => axiosInstance.get('/analytics-reports/tasks'),
  queueReportGeneration: (data) => axiosInstance.post('/analytics-reports/generate', data),

  // Institute Settings
  updateInstitute: (id, data) => axiosInstance.put(`/institutes/${id}`, data),

  // Chat
  getChatRooms: () => axiosInstance.get('/chat/rooms'),
  createChatRoom: (data) => axiosInstance.post('/chat/rooms', data),
  getChatMessages: (roomId) => axiosInstance.get(`/chat/rooms/${roomId}/messages`),
  sendMessage: (roomId, data) => axiosInstance.post(`/chat/rooms/${roomId}/messages`, data),

  // Exams Results & Snapshots
  getExamSubmissions: (examId) => axiosInstance.get(`/exams/${examId}/submissions`),
  exportExamSubmissions: (examId) => axiosInstance.get(`/exams/${examId}/submissions/export`),
  getSubmissionSnapshots: (submissionId) => axiosInstance.get(`/exams/submissions/${submissionId}/snapshots`),
  getAdminExamAnalysis: (submissionId) => axiosInstance.get(`/exams/submissions/${submissionId}/analysis`),

  // File Upload
  uploadFile: (formData) => axiosInstance.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  // Resources (Study Materials)
  getResources: (params) => axiosInstance.get('/resources', { params }),
  createResource: (data) => axiosInstance.post('/resources', data),
  deleteResource: (id) => axiosInstance.delete(`/resources/${id}`),

  // System Configuration (including NEET Countdown)
  getSystemConfig: () => axiosInstance.get('/system-config'),
  updateSystemConfig: (data) => axiosInstance.put('/system-config', data),

  // Fees & Transactions
  getTransactions: (params) => axiosInstance.get('/fees-payments/transactions', { params }),
  getFeeRecords: (params) => axiosInstance.get('/fees-payments/records', { params }),
};
