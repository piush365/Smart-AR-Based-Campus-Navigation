import axios from 'axios';
import { auth } from './firebase.js';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use(async (config) => {
  if (auth.currentUser) {
    // Wait for auth to be fully initialized if it's still determining state, though auth.currentUser is usually synchronous once loaded.
    // However, getIdToken(...) is async and handles auto-refresh behind the scenes.
    const token = await auth.currentUser.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
        error.response?.status === 401 && 
        !window.location.pathname.startsWith('/login') && 
        !window.location.pathname.startsWith('/register')
    ) {
      if (auth.currentUser) {
        auth.signOut();
      }
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
