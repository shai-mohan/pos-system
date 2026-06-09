import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('pos_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = (name, role) => {
    const u = { name, role };
    setUser(u);
    localStorage.setItem('pos_user', JSON.stringify(u));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('pos_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isManager: user?.role === 'manager' }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
