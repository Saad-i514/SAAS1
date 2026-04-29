import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// Browser's UTC offset in hours (e.g. PKT = +5, EST = -5)
const TZ_OFFSET = -new Date().getTimezoneOffset() / 60;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    // Automatically attach timezone offset to every request
    config.params = { tz_offset: TZ_OFFSET, ...config.params };
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If we receive a 401 or 403, and it's not the login endpoint itself, 
    // the token is likely invalid or expired. Force a logout.
    if ((error.response?.status === 401 || error.response?.status === 403) && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
