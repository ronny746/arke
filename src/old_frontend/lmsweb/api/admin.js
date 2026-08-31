import axiosInstance from './axiosInstance';

export const adminAPI = {
  // --- AcadOps ---
  // Subjects
  createSubject: (data) => axiosInstance.post('/subjects', data),
  getSubjects: (params) => axiosInstance.get('/subjects', { params }),
  updateSubject: (id, data) => axiosInstance.put(`/subjects/${id}`, data),
  deleteSubject: (id) => axiosInstance.delete(`/subjects/${id}`),

  // Academic Classes
  createAcademicClass: (data) => axiosInstance.post('/academic-classes', data),
  getAcademicClasses: (params) => axiosInstance.get('/academic-classes', { params }),
  updateAcademicClass: (id, data) => axiosInstance.put(`/academic-classes/${id}`, data),
  deleteAcademicClass: (id) => axiosInstance.delete(`/academic-classes/${id}`),
  assignUserToClass: (classId, data) => axiosInstance.post(`/academic-classes/${classId}/assign`, data),

  // Timetable / Schedule
  createClassSchedule: (data) => axiosInstance.post('/classes-schedule', data),
  getClassSchedule: (params) => axiosInstance.get('/classes-schedule', { params }),
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
  getQuestionBanks: () => axiosInstance.get('/question-banks'),
  createQuestionBank: (data) => axiosInstance.post('/question-banks', data),
  getQuestionBankById: (id) => axiosInstance.get(`/question-banks/${id}`),
  updateQuestionBank: (id, data) => axiosInstance.put(`/question-banks/${id}`, data),
  deleteQuestionBank: (id) => axiosInstance.delete(`/question-banks/${id}`),
  parseWordFile: (formData) => axiosInstance.post('/question-banks/parse-word', formData, {
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
  importStudents: (formData) => axiosInstance.post('/users/import-students', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  downloadStudentSampleCSV: () => {
    // This is handled via window.open usually, but we can return the URL
    return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}/users/sample-csv/students`;
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
  getSubmissionSnapshots: (submissionId) => axiosInstance.get(`/exams/submissions/${submissionId}/snapshots`),
  getAdminExamAnalysis: (submissionId) => axiosInstance.get(`/exams/submissions/${submissionId}/analysis`),
};
