import { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
} from 'firebase/auth';
import { auth } from '../firebase.js';
import api, { setPendingToken } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);
  const isRegistering = useRef(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (isRegistering.current) {
        setLoading(false);
        return;
      }

      if (!firebaseUser) {
        setUser(null);
        localStorage.removeItem('user');
        setLoading(false);
        return;
      }

      if (firebaseUser.isAnonymous) {
        const stored = (() => {
          try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
        })();
        if (stored && stored.role === 'visitor') {
          setUser(stored);
        } else {
          await signOut(auth);
          setUser(null);
          localStorage.removeItem('user');
        }
        setLoading(false);
        return;
      }

      // Regular Firebase user — get token directly from firebaseUser to avoid race condition
      try {
        const token = await firebaseUser.getIdToken();
        setPendingToken(token);
        const { data } = await api.get('/auth/me');
        setUser(data);
        localStorage.setItem('user', JSON.stringify(data));
      } catch (err) {
        console.error('Failed to fetch user data:', err?.response?.status, err?.message);
        setUser(null);
        localStorage.removeItem('user');
      } finally {
        setPendingToken(null);
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    // onAuthStateChanged handles the rest
  };

  const loginWithEmail = async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged handles the rest
  };

  const register = async (fields) => {
    isRegistering.current = true;
    try {
      const credential = await createUserWithEmailAndPassword(auth, fields.email, fields.password);
      const token = await credential.user.getIdToken();
      setPendingToken(token);
      const { data } = await api.post('/auth/register', {
        name: fields.name,
        email: fields.email,
        role: fields.role,
        studentId: fields.studentId,
        department: fields.department,
      });
      setPendingToken(null);
      setUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
      return data.user;
    } catch (err) {
      setPendingToken(null);
      try { await auth.currentUser?.delete(); } catch (_) {}
      throw err;
    } finally {
      isRegistering.current = false;
    }
  };

  const loginAsVisitor = async ({ name, phone, purpose }) => {
    isRegistering.current = true;
    try {
      const credential = await signInAnonymously(auth);
      const uid = credential.user.uid;
      const { data } = await api.post('api/auth/visitor', { uid, name, phone, purpose });
      const visitorUser = data.user || { uid, name, phone, purpose, role: 'visitor' };
      setUser(visitorUser);
      localStorage.setItem('user', JSON.stringify(visitorUser));
      return visitorUser;
    } catch (err) {
      try { await signOut(auth); } catch (_) {}
      throw err;
    } finally {
      isRegistering.current = false;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    localStorage.removeItem('user');
  };

  const updateProfile = async (fields) => {
    const { data } = await api.patch('/auth/me', fields);
    setUser(data);
    localStorage.setItem('user', JSON.stringify(data));
    return data;
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAuthenticated: !!user,
      isVisitor: user?.role === 'visitor',
      isStudent: user?.role === 'student',
      loginWithGoogle,
      loginWithEmail,
      register,
      loginAsVisitor,
      logout,
      updateProfile,
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