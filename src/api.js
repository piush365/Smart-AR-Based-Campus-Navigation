import axios from 'axios';
import { auth } from './firebase.js';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Allow callers to inject a token directly (avoids auth.currentUser race condition)
let pendingToken = null;
export function setPendingToken(token) { pendingToken = token; }

api.interceptors.request.use(async (config) => {
  const token = pendingToken || (auth.currentUser ? await auth.currentUser.getIdToken() : null);
  if (token) config.headers.Authorization = `Bearer ${token}`;
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
      if (auth.currentUser) auth.signOut();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;