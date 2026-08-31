import axiosInstance from './axiosInstance';

export const parentAPI = {
  getDashboard: () => axiosInstance.get('/dashboard'),
  getChildrenAttendance: (params) => axiosInstance.get('/attendance/my-children', { params }),
  getChildrenHomework: (params) => axiosInstance.get('/homework/my-children', { params }),
  getChildrenAssignments: (params) => axiosInstance.get('/assignments/my-children', { params }),
  getChildrenSubmissions: (params) => axiosInstance.get('/assignments/my-children-submissions', { params }),
  getChildrenExams: (params) => axiosInstance.get('/exams/parent/children-exams', { params }),
  getChildExamAnalysis: (examId, childId) => axiosInstance.get(`/exams/parent/children-exams/${examId}/analysis/${childId}`),
  getPtmSlots: (params) => axiosInstance.get('/ptm-booking/slots', { params }),
  bookPtmSlot: (slotId, data) => axiosInstance.post(`/ptm-booking/book`, { slotId, ...data }),
  getPtmBookings: (params) => axiosInstance.get('/ptm-booking/bookings', { params }),
  getFees: (params) => axiosInstance.get('/fees-payments/my-children', { params }),
  getTransactions: (params) => axiosInstance.get('/fees-payments/transactions', { params }),
  payFees: (data) => axiosInstance.post('/fees-payments/pay', data),
  getChatRooms: () => axiosInstance.get('/chat/rooms'),
  createChatRoom: (data) => axiosInstance.post('/chat/rooms', data),
  getChatMessages: (roomId) => axiosInstance.get(`/chat/rooms/${roomId}/messages`),
  sendMessage: (roomId, data) => axiosInstance.post(`/chat/rooms/${roomId}/messages`, data),
  getUsers: (params) => axiosInstance.get('/users', { params }),
  getLiveClasses: (params) => axiosInstance.get('/live-classes', { params }),
};
