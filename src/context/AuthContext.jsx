import { createContext, useContext, useMemo, useState } from 'react';
import { api, clearSession, TOKEN_KEY, REFRESH_KEY, USER_KEY } from '../api/client';

const AuthContext = createContext(null);

// Hydrate the saved user synchronously so there's no auth flicker on load.
function readSavedUser() {
  const savedUser = localStorage.getItem(USER_KEY);
  if (!savedUser) return null;
  try {
    return JSON.parse(savedUser);
  } catch {
    clearSession();
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readSavedUser);
  const loading = false;

  const login = async (email, password) => {
    const data = await api.post('/api/auth/login', { email, password }, { auth: false });
    // Backend returns { token, accessToken, refreshToken, user }.
    const accessToken = data.accessToken || data.token;
    localStorage.setItem(TOKEN_KEY, accessToken);
    if (data.refreshToken) localStorage.setItem(REFRESH_KEY, data.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    clearSession();
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, loading, login, logout, isAuthenticated: !!user }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
