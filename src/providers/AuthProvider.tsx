import { useState, ReactNode, useEffect } from 'react';
import { User } from '../types/auth';
import { api } from '../api/client';
import { AuthContext } from "../context/AuthContext.tsx";

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(null);

  const isAuthenticated = !!token;

  const login = (newToken: string) => {
    setToken(newToken);
    localStorage.setItem('token', newToken);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };

  useEffect(() => {
    if (token) {
      api.get('/me')
        .then(({ data: User }) => {
          setUser(User);
        })
        .catch(err => {
          console.error('Failed to fetch user:', err);
          logout();
        });
    }
  }, [token]);

  return (
    <AuthContext.Provider value={{ token, user, setUser, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};