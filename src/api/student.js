import axiosInstance from './axiosInstance';

export const studentAPI = {
  getDashboard: () => axiosInstance.get('/dashboard'),
  getMySchedule: (params) => axiosInstance.get('/classes-schedule', { params }), // params: { date }
  getCalculatedSchedule: (params) => axiosInstance.get('/classes-schedule/calculated', { params }),
  getSubjects: (params) => axiosInstance.get('/subjects', { params }),
  getAssignments: (params) => axiosInstance.get('/assignments', { params }),
  getMySubmissions: () => axiosInstance.get('/assignments/my-submissions'),
  submitAssignment: (id, data) => axiosInstance.post(`/assignments/${id}/submit`, data),
  getHomework: (params) => axiosInstance.get('/homework', { params }),
  submitHomework: (id, data) => axiosInstance.post(`/homework/${id}/submit`, data),
  getResults: (params) => axiosInstance.get('/results', { params }),
  getMyPerformance: () => axiosInstance.get('/analytics-reports/student/me/performance'),
  getTransactions: (params) => axiosInstance.get('/fees-payments/transactions', { params }),
  getMyBatches: () => axiosInstance.get('/batches/my-batches'),
  getLiveClasses: (params) => axiosInstance.get('/live-classes', { params }),
  setupParent: (data) => axiosInstance.post('/users/setup-parent', data),
  getAttendance: (params) => axiosInstance.get('/attendance/my-attendance', { params }),
  getChatRooms: () => axiosInstance.get('/chat/rooms'),
  createChatRoom: (data) => axiosInstance.post('/chat/rooms', data),
  getChatMessages: (roomId) => axiosInstance.get(`/chat/rooms/${roomId}/messages`),
  sendMessage: (roomId, data) => axiosInstance.post(`/chat/rooms/${roomId}/messages`, data),
  getUsers: (params) => axiosInstance.get('/users', { params }),
  updateMe: (data) => axiosInstance.put('/users/me', data),
  getResources: (params) => axiosInstance.get('/resources', { params }),
  
  // Exams
  getExams: () => axiosInstance.get('/exams/student/my-exams'),
  getExamAnalysis: (id) => axiosInstance.get(`/exams/${id}/analysis`),
  startExam: (id) => axiosInstance.post(`/exams/${id}/start`),
  saveAnswer: (id, data) => axiosInstance.post(`/exams/${id}/save-answer`, data),
  submitExam: (id, data) => axiosInstance.post(`/exams/${id}/submit`, data),
  uploadSnapshot: (id, formData) => axiosInstance.post(`/exams/${id}/snapshot`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  
  // Practice & DPP
  getPracticeFilters: () => axiosInstance.get('/student/practice/filters'),
  getPracticeHistory: (params) => axiosInstance.get('/student/practice/history', { params }), // params: { sessionType: 'DPP' | 'PRACTICE' }
  getRemedialDpps: (examId) => axiosInstance.get(`/student/practice/exam/${examId}`),
  generatePracticeSession: (data) => axiosInstance.post('/student/practice/generate', data),
  getPracticeSession: (id) => axiosInstance.get(`/student/practice/${id}`),
  savePracticeProgress: (id, data) => axiosInstance.put(`/student/practice/${id}/progress`, data),
  submitPracticeSession: (id, data) => axiosInstance.post(`/student/practice/${id}/submit`, data),
};
