import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]         = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('user');
        if (stored) setUser(JSON.parse(stored));
      } catch {}
      setLoading(false);
    })();
  }, []);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { access, refresh, user: u } = res.data;
    await AsyncStorage.multiSet([
      ['access_token',  access],
      ['refresh_token', refresh],
      ['user',          JSON.stringify(u)],
    ]);
    setUser(u);
    return u;
  };

  const register = async (payload) => {
    const res = await authAPI.register(payload);
    const { tokens, user: u } = res.data;
    await AsyncStorage.multiSet([
      ['access_token',  tokens.access],
      ['refresh_token', tokens.refresh],
      ['user',          JSON.stringify(u)],
    ]);
    setUser(u);
    return u;
  };

  const logout = async () => {
    try {
      const refresh = await AsyncStorage.getItem('refresh_token');
      if (refresh) await authAPI.logout({ refresh });
    } catch {}
    await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const res = await authAPI.getProfile();
      const u = res.data;
      await AsyncStorage.setItem('user', JSON.stringify(u));
      setUser(u);
      return u;
    } catch { return null; }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
