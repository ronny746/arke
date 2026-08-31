import axiosInstance from './axiosInstance';

export const teacherAPI = {
  getDashboard: () => axiosInstance.get('/dashboard'),
  getMyDailySchedule: (params) => axiosInstance.get('/classes-schedule/my-schedule', { params }), // params: { date }
  getViewAcademicClasses: () => axiosInstance.get('/academic-classes'),
  getSubjects: () => axiosInstance.get('/subjects'),
  
  createAssignment: (data) => axiosInstance.post('/assignments', data),
  getViewAssignments: (params) => axiosInstance.get('/assignments', { params }),
  getViewSubmissions: (assignmentId) => axiosInstance.get(`/assignments/${assignmentId}/submissions`),
  gradeSubmission: (submissionId, data) => axiosInstance.put(`/assignments/submissions/${submissionId}/grade`, data),
  
  assignHomework: (data) => axiosInstance.post('/homework', data),
  getViewHomework: (params) => axiosInstance.get('/homework', { params }),
  
  markAttendance: (data) => axiosInstance.post('/attendance', data),
  
  createExam: (data) => axiosInstance.post('/tests-exams', data),
  enterMarks: (data) => axiosInstance.post('/results', data), // Submit result

  // Resources
  getResources: (params) => axiosInstance.get('/resources', { params }),
  createResource: (data) => axiosInstance.post('/resources', data),

  // Doubt Sessions
  getDoubtSessions: () => axiosInstance.get('/doubt-sessions'),
  scheduleDoubtSession: (id, data) => axiosInstance.put(`/doubt-sessions/${id}/schedule`, data),
  resolveDoubtSession: (id, data) => axiosInstance.put(`/doubt-sessions/${id}/resolve`, data),

  // Chat & Communication
  getChatRooms: () => axiosInstance.get('/chat/rooms'),
  createChatRoom: (data) => axiosInstance.post('/chat/rooms', data),
  getChatMessages: (roomId) => axiosInstance.get(`/chat/rooms/${roomId}/messages`),
  sendMessage: (roomId, data) => axiosInstance.post(`/chat/rooms/${roomId}/messages`, data),
  sendNotification: (data) => axiosInstance.post('/notifications/send', data),
  getPtmSlots: (params) => axiosInstance.get('/ptm-booking/slots', { params }),
  createPtmSlot: (data) => axiosInstance.post('/ptm-booking/slots', data),
  getPtmBookings: (params) => axiosInstance.get('/ptm-booking/bookings', { params }),

  // Live Classes
  createLiveClass: (data) => axiosInstance.post('/live-classes', data),
  getLiveClasses: (params) => axiosInstance.get('/live-classes', { params }),
  endLiveClass: (id, data) => axiosInstance.put(`/live-classes/${id}/end`, data),
};
