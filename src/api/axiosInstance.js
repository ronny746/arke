import axios from 'axios';

// Base URL .env file se aayega
const baseURL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

const axiosInstance = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: API call hone se pehle token attach karne ke liye
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    const impersonateId = sessionStorage.getItem('impersonateId');
    if (impersonateId) {
      config.headers['x-institute-id'] = impersonateId;
    }
    
    // Inject Developer Token if available
    try {
      const devState = localStorage.getItem('lms-developer-mode');
      if (devState) {
        const parsed = JSON.parse(devState);
        if (parsed?.state?.developerToken && parsed?.state?.isDeveloperMode) {
          config.headers['x-developer-token'] = parsed.state.developerToken;
        }
      }
    } catch (e) {
      console.error("Failed to parse developer state", e);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: API se response aane ke baad handle karne ke liye (e.g. 401 token expire)
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Agar 401 Unauthorized aata hai, toh user ko logout karne ka logic yahan daal sakte hain
    if (error.response && error.response.status === 401) {
      console.error('Token expired or unauthorized. Please login again.');
      // localStorage.removeItem('token');
      // window.location.href = '/login'; // Redirect to login
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
