import { createContext, useContext, useState } from 'react';
import api from '../api/client.js';

// React Context = a way to share state (the logged-in user) across
// components without passing it down as props through every level
// ("prop drilling"). Any component can call useAuth() to read/update it.
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Initialize from localStorage so a page refresh doesn't log you out —
  // the token/user persist in the browser even after the React app remounts.
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  async function signup(username, email, password) {
    const { data } = await api.post('/auth/signup', { username, email, password });
    persistSession(data.token, data.user);
  }

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    persistSession(data.token, data.user);
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }

  function persistSession(token, userData) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  }

  return (
    <AuthContext.Provider value={{ user, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook so components just call useAuth() instead of
// useContext(AuthContext) everywhere — slightly cleaner API.
export function useAuth() {
  return useContext(AuthContext);
}
