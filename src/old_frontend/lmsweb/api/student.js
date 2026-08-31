import axiosInstance from './axiosInstance';

export const studentAPI = {
  getDashboard: () => axiosInstance.get('/dashboard'),
  getMySchedule: (params) => axiosInstance.get('/classes-schedule', { params }), // params: { date }
  getSubjects: (params) => axiosInstance.get('/subjects', { params }),
  getAssignments: (params) => axiosInstance.get('/assignments', { params }),
  getMySubmissions: () => axiosInstance.get('/assignments/my-submissions'),
  submitAssignment: (id, data) => axiosInstance.post(`/assignments/${id}/submit`, data),
  getHomework: (params) => axiosInstance.get('/homework', { params }),
  submitHomework: (id, data) => axiosInstance.post(`/homework/${id}/submit`, data),
  getResults: (params) => axiosInstance.get('/results', { params }),
  getLiveClasses: (params) => axiosInstance.get('/live-classes', { params }),
  setupParent: (data) => axiosInstance.post('/users/setup-parent', data),
  getAttendance: (params) => axiosInstance.get('/attendance/my-attendance', { params }),
  getChatRooms: () => axiosInstance.get('/chat/rooms'),
  createChatRoom: (data) => axiosInstance.post('/chat/rooms', data),
  getChatMessages: (roomId) => axiosInstance.get(`/chat/rooms/${roomId}/messages`),
  sendMessage: (roomId, data) => axiosInstance.post(`/chat/rooms/${roomId}/messages`, data),
  getUsers: (params) => axiosInstance.get('/users', { params }),
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
};
