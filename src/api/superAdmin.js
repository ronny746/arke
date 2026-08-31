import axiosInstance from './axiosInstance';

export const superAdminAPI = {
  // Institutes
  getInstitutes: () => axiosInstance.get('/institutes'),
  getInstitute: (id) => axiosInstance.get(`/institutes/${id}`),
  createInstitute: (data) => axiosInstance.post('/institutes', data),
  updateInstitute: (id, data) => axiosInstance.put(`/institutes/${id}`, data),
  deleteInstitute: (id) => axiosInstance.delete(`/institutes/${id}`),

  // Users
  getUsers: (params) => axiosInstance.get('/users', { params }), // ?instituteId=...
  updateUser: (id, data) => axiosInstance.put(`/users/${id}`, data),
  deleteUser: (id) => axiosInstance.delete(`/users/${id}`),

  // Classes
  getClasses: (params) => axiosInstance.get('/academic-classes', { params }),
  updateClass: (id, data) => axiosInstance.put(`/academic-classes/${id}`, data),
  deleteClass: (id) => axiosInstance.delete(`/academic-classes/${id}`),

  // Subjects
  getSubjects: (params) => axiosInstance.get('/subjects', { params }),
  updateSubject: (id, data) => axiosInstance.put(`/subjects/${id}`, data),
  deleteSubject: (id) => axiosInstance.delete(`/subjects/${id}`),

  // Schedules
  getSchedules: (params) => axiosInstance.get('/classes-schedule', { params }),
  deleteSchedule: (id) => axiosInstance.delete(`/classes-schedule/${id}`),

  // System & Logs
  getSystemConfig: () => axiosInstance.get('/system-config'),
  updateSystemConfig: (data) => axiosInstance.put('/system-config', data),
  getAuditLogs: (params) => axiosInstance.get('/security-audit', { params }),
  getIntegrations: () => axiosInstance.get('/integrations'),
  configureIntegration: (data) => axiosInstance.post('/integrations', data),
  getBackups: () => axiosInstance.get('/backups'),
  requestBackup: (data) => axiosInstance.post('/backups', data),
  deleteBackup: (id) => axiosInstance.delete(`/backups/${id}`),
};
