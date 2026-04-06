import { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut 
} from 'firebase/auth';
import { auth } from '../firebase.js';
import api from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  // Sync state between Firebase Auth and our custom backend (/auth/me)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        localStorage.removeItem('user');
        setLoading(false);
      } else {
        try {
          // If we log in via Google, we might not have a backend user yet.
          // Calling /auth/me on the backend checks if doc exists. If not, creates one.
          const { data } = await api.get('/auth/me');
          setUser(data);
          localStorage.setItem('user', JSON.stringify(data));
        } catch (err) {
          console.error("Failed to fetch user data", err);
          // If the backend fails, sign out purely from client
          setUser(null);
        } finally {
          setLoading(false);
        }
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
    // 1. Create Firebase user
    const cred = await createUserWithEmailAndPassword(auth, fields.email, fields.password);
    // 2. We could update displayName here if we wanted in Firebase, but we just use our backend.
    
    // 3. Inform our backend to create the user with role details (we can do this safely since we are now authed as the user)
    const { data } = await api.post('/auth/register', {
      name: fields.name,
      email: fields.email,
      role: fields.role,
      studentId: fields.studentId,
      department: fields.department
    });
    
    setUser(data.user);
    return data.user;
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
      isStudent: !user || user?.role === 'student',
      loginWithGoogle,
      loginWithEmail,
      register,
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
