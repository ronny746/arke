import axiosInstance from './axiosInstance';

export const teacherAPI = {
  getDashboard: () => axiosInstance.get('/dashboard'),
  getMyDailySchedule: (params) => axiosInstance.get('/classes-schedule/my-schedule', { params }),
  getViewBatches: () => axiosInstance.get('/batches'),
  getSubjects: () => axiosInstance.get('/subjects'),

  // Students
  getStudents: () => axiosInstance.get('/users?role=student'),
  getStudentPerformance: (studentId) => axiosInstance.get(`/analytics-reports/student/${studentId}/performance`),
  getBatchPerformance: (batchId, params) => axiosInstance.get(`/analytics-reports/batch/${batchId}/performance`, { params }),
  getBatchTopicFlags: (batchId) => axiosInstance.get(`/performance-flags/batches/${batchId}`),
  
  createAssignment: (data) => axiosInstance.post('/assignments', data),
  getViewAssignments: (params) => axiosInstance.get('/assignments', { params }),
  getViewSubmissions: (assignmentId) => axiosInstance.get(`/assignments/${assignmentId}/submissions`),
  gradeSubmission: (submissionId, data) => axiosInstance.put(`/assignments/submissions/${submissionId}/grade`, data),
  
  assignHomework: (data) => axiosInstance.post('/homework', data),
  getViewHomework: (params) => axiosInstance.get('/homework', { params }),
  
  markAttendance: (data) => axiosInstance.post('/attendance', data),
  getAttendance: (params) => axiosInstance.get('/attendance/my-attendance', { params }),
  getLeaveRequests: (params) => axiosInstance.get('/operations/leave', { params }),
  requestLeave: (data) => axiosInstance.post('/operations/leave', data),
  
  
  // Question Banks
  getQuestionCategories: () => axiosInstance.get('/question-categories'),
  createQuestionCategory: (data) => axiosInstance.post('/question-categories', data),
  deleteQuestionCategory: (id) => axiosInstance.delete(`/question-categories/${id}`),

  getQuestionBanks: () => axiosInstance.get('/question-banks'),
  getQuestionBankHierarchy: () => axiosInstance.get('/question-banks/hierarchy'),
  getQuestionsByHierarchy: (params) => axiosInstance.get('/question-banks/questions', { params }),
  createQuestionBank: (data) => axiosInstance.post('/question-banks', data),
  getQuestionBankById: (id) => axiosInstance.get(`/question-banks/${id}`),
  updateQuestionBank: (id, data) => axiosInstance.put(`/question-banks/${id}`, data),
  deleteQuestionBank: (id) => axiosInstance.delete(`/question-banks/${id}`),
  parseWordFile: (formData) => axiosInstance.post('/question-banks/parse-word', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  uploadDocxToBank: (formData) => axiosInstance.post('/question-banks/upload-docx', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  // Exams
  getExams: () => axiosInstance.get('/exams'),
  getExamById: (id) => axiosInstance.get(`/exams/${id}`),
  updateExam: (id, data) => axiosInstance.put(`/exams/${id}`, data),
  addExamQuestions: (id, data) => axiosInstance.post(`/exams/${id}/questions`, data),
  getLiveMonitoringData: (id) => axiosInstance.get(`/exams/${id}/live-monitor`),
  getExamSubmissions: (examId) => axiosInstance.get(`/exams/${examId}/submissions`),
  getSubmissionSnapshots: (submissionId) => axiosInstance.get(`/exams/submissions/${submissionId}/snapshots`),
  getAdminExamAnalysis: (submissionId) => axiosInstance.get(`/exams/submissions/${submissionId}/analysis`),

  createExam: (data) => axiosInstance.post('/exams', data),
  enterMarks: (data) => axiosInstance.post('/results', data), // Submit result

  // Resources
  getResources: (params) => axiosInstance.get('/resources', { params }),
  createResource: (data) => axiosInstance.post('/resources', data),
  updateResource: (id, data) => axiosInstance.put(`/resources/${id}`, data),
  toggleUnlockResource: (id, data) => axiosInstance.put(`/resources/${id}/toggle-unlock`, data),
  deleteResource: (id) => axiosInstance.delete(`/resources/${id}`),

  // Doubt Sessions
  getDoubtSessions: () => axiosInstance.get('/doubt-sessions'),
  scheduleDoubtSession: (id, data) => axiosInstance.put(`/doubt-sessions/${id}/schedule`, data),
  resolveDoubtSession: (id, data) => axiosInstance.put(`/doubt-sessions/${id}/resolve`, data),

  // Chat & Communication & Announcements
  getChatRooms: () => axiosInstance.get('/chat/rooms'),
  createChatRoom: (data) => axiosInstance.post('/chat/rooms', data),
  getChatMessages: (roomId) => axiosInstance.get(`/chat/rooms/${roomId}/messages`),
  sendMessage: (roomId, data) => axiosInstance.post(`/chat/rooms/${roomId}/messages`, data),
  sendNotification: (data) => axiosInstance.post('/notifications/send', data),
  broadcastNotification: (data) => axiosInstance.post('/notifications/broadcast', data),
  getNotifications: (params) => axiosInstance.get('/notifications', { params }),
  getPtmSlots: (params) => axiosInstance.get('/ptm-booking/slots', { params }),
  createPtmSlot: (data) => axiosInstance.post('/ptm-booking/slots', data),
  getPtmBookings: (params) => axiosInstance.get('/ptm-booking/bookings', { params }),

  // Live Classes & Timetable
  createClassSchedule: (data) => axiosInstance.post('/classes-schedule', data),
  getClassSchedule: (params) => axiosInstance.get('/classes-schedule', { params }),
  getCalculatedSchedule: (params) => axiosInstance.get('/classes-schedule/calculated', { params }),
  createScheduleOverride: (data) => axiosInstance.post('/classes-schedule/override', data),
  updateClassSchedule: (id, data) => axiosInstance.put(`/classes-schedule/${id}`, data),
  deleteClassSchedule: (id) => axiosInstance.delete(`/classes-schedule/${id}`),
  createLiveClass: (data) => axiosInstance.post('/live-classes', data),
  getLiveClasses: (params) => axiosInstance.get('/live-classes', { params }),
  endLiveClass: (id, data) => axiosInstance.put(`/live-classes/${id}/end`, data),

  // Announcements & Notifications
  broadcastNotification: (data) => axiosInstance.post('/notifications/broadcast', data),
  getNotifications: (params) => axiosInstance.get('/notifications', { params }),

  // DPP & Remedial Generation
  getPracticeFilters: () => axiosInstance.get('/practice/filters'),
  generateDPP: (data) => axiosInstance.post('/practice/generate', data),
  createManualDPP: (data) => axiosInstance.post('/practice/manual', data),
  getQuestionsForTopic: (params) => axiosInstance.get('/question-banks/questions', { params }),
  getAssignedDPPs: (params) => axiosInstance.get('/practice/history', { params }),
  getDPPSession: (id) => axiosInstance.get(`/practice/${id}`),
};
