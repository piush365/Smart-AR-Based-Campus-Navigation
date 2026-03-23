/**
 * src/context/AuthContext.jsx
 *
 * Production auth context backed by the Express/Prisma backend.
 *
 * Supports:
 *   - Google OAuth (redirects to backend /auth/google)
 *   - Email + password (POST /auth/login, /auth/register)
 *   - JWT access + refresh tokens (stored in localStorage)
 *   - Auto-bootstrap on page reload from stored tokens
 *
 * The Google OAuth flow:
 *   1. User clicks "Sign in with Google" → navigated to /auth/google on backend.
 *   2. Backend redirects to Google consent screen.
 *   3. Google redirects to /auth/google/callback on backend.
 *   4. Backend issues JWTs and redirects to /auth/callback on frontend with
 *      tokens in the URL hash (#access=...&refresh=...).
 *   5. <OAuthCallback /> component reads the hash, stores tokens, redirects to /.
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api.js';

const AuthContext = createContext(null);

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  // On mount — verify stored token is still valid
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { setLoading(false); return; }

    api.get('/auth/me')
      .then(({ data }) => setUser(data))
      .catch(() => {
        // Token invalid even after refresh attempt — clear everything
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  // Persist user to localStorage whenever it changes
  useEffect(() => {
    if (user) localStorage.setItem('user', JSON.stringify(user));
    else localStorage.removeItem('user');
  }, [user]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const loginWithGoogle = useCallback(() => {
    // Simple redirect — backend handles the full OAuth flow
    window.location.href = `${BASE_URL}/auth/google`;
  }, []);

  const loginWithEmail = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    storeTokens(data);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (fields) => {
    const { data } = await api.post('/auth/register', fields);
    storeTokens(data);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch { /* best-effort */ }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (fields) => {
    const { data } = await api.patch('/auth/me', fields);
    setUser(data);
    return data;
  }, []);

  /**
   * Called by <OAuthCallback /> after the backend redirects back with tokens
   * in the URL hash. Stores tokens and fetches the user profile.
   */
  const handleOAuthCallback = useCallback(async (accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    const { data } = await api.get('/auth/me');
    setUser(data);
    return data;
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAuthenticated: !!user,
      isVisitor: user?.role === 'visitor',
      isStudent: !user || user?.role === 'student',
      loginWithGoogle,
      loginWithEmail,
      register,
      logout,
      updateProfile,
      handleOAuthCallback,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

function storeTokens({ accessToken, refreshToken }) {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
}
