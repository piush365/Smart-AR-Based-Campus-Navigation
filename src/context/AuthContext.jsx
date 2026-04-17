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
import api from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);
  const isRegistering = useRef(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        localStorage.removeItem('user');
        setLoading(false);
        return;
      }

      // Skip /auth/me during registration or anonymous visitor sign-in
      if (isRegistering.current) {
        setLoading(false);
        return;
      }

      // Anonymous users are visitors — user state already set by loginAsVisitor
      if (firebaseUser.isAnonymous) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.get('/auth/me');
        setUser(data);
        localStorage.setItem('user', JSON.stringify(data));
      } catch (err) {
        console.error('Failed to fetch user data', err);
        setUser(null);
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const loginWithEmail = async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (fields) => {
    isRegistering.current = true;
    try {
      await createUserWithEmailAndPassword(auth, fields.email, fields.password);
      const { data } = await api.post('/auth/register', {
        name: fields.name,
        email: fields.email,
        role: fields.role,
        studentId: fields.studentId,
        department: fields.department,
      });
      setUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
      return data.user;
    } catch (err) {
      throw err;
    } finally {
      isRegistering.current = false;
    }
  };

  // Anonymous sign-in for visitors — stores details in Firestore via backend
  const loginAsVisitor = async ({ name, phone, purpose }) => {
    isRegistering.current = true;
    try {
      const credential = await signInAnonymously(auth);
      const uid = credential.user.uid;

      const { data } = await api.post('/auth/visitor', {
        uid,
        name,
        phone,
        purpose,
      });

      const visitorUser = data.user || {
        uid,
        name,
        phone,
        purpose,
        role: 'visitor',
      };

      setUser(visitorUser);
      localStorage.setItem('user', JSON.stringify(visitorUser));
      return visitorUser;
    } catch (err) {
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