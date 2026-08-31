import axiosInstance from './axiosInstance';

export const authAPI = {
  login: (credentials) => axiosInstance.post('/auth/login', credentials),
  getMe: () => axiosInstance.get('/auth/me'),
  logout: () => {
    // Basic logout logic can be handled here or in components, usually local storage clearing
    localStorage.removeItem('token');
  }
};
