import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

// Mock user database stored in localStorage
const USERS_KEY = 'campusAR_users';
const SESSION_KEY = 'campusAR_session';

const getUsers = () => {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  } catch {
    return [];
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    try {
      const session = JSON.parse(localStorage.getItem(SESSION_KEY));
      if (session) setUser(session);
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  const register = ({ name, email, password, studentId, department }) => {
    const users = getUsers();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, error: 'An account with this email already exists.' };
    }
    const newUser = {
      id: Date.now().toString(),
      name,
      email: email.toLowerCase(),
      password, // In production, NEVER store plain-text passwords
      studentId,
      department,
      avatar: name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
      joinedAt: new Date().toISOString(),
    };
    localStorage.setItem(USERS_KEY, JSON.stringify([...users, newUser]));
    const { password: _, ...safeUser } = newUser;
    setUser(safeUser);
    localStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
    return { success: true };
  };

  const login = ({ email, password }) => {
    const users = getUsers();
    const found = users.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (!found) {
      return { success: false, error: 'Invalid email or password.' };
    }
    const { password: _, ...safeUser } = found;
    setUser(safeUser);
    localStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  const updateUser = (updates) => {
    const updated = { ...user, ...updates };
    setUser(updated);
    localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
    // Also update the users store
    const users = getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...updates };
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

export default AuthContext;
