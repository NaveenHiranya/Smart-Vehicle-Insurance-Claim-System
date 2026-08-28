import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/garage` : '/api/garage';

const garageApi = axios.create({ baseURL: BASE });

garageApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('garageToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (!(config.data instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json';
  }
  return config;
});

garageApi.interceptors.response.use(
  (r) => r,
  (error) => {
    const url = error.config?.url || '';
    const isAuthRoute = url.includes('/auth/login') || url.includes('/auth/register');
    if (!isAuthRoute && (error.response?.status === 401 || error.response?.status === 403)) {
      localStorage.removeItem('garageToken');
      localStorage.removeItem('garageUser');
      window.location.href = '/garage/login';
    }
    return Promise.reject(error);
  }
);

export default garageApi;
