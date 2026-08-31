import axios from 'axios';

const publicAxios = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
});

export const publicAPI = {
  getExamDetails: (id) => publicAxios.get(`/public/exams/${id}`),
  startExam: (id, data) => publicAxios.post(`/public/exams/${id}/start`, data),
  submitExam: (id, token, data) => publicAxios.post(`/public/exams/${id}/submit`, data, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  }),
  uploadSnapshot: (id, token, formData) => publicAxios.post(`/public/exams/${id}/snapshot`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data'
    }
  })
};
