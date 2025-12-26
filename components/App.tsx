'use client';
import React, { useState, useEffect } from 'react';
import Dashboard, { User } from './Dashboard';
import Login from './Login';
import Users from './Users';

const OWNER = { username: 'galindo123@email.com', password: 'galindo123', role: 'dueno', house: '' };
const USERS_KEY = 'dashboard_users';
const SESSION_KEY = 'dashboard_session_user';
const App = () => {
  const [userState, setUserState] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) return JSON.parse(saved);
    }
    return null;
  });
  // Wrapper para compatibilidad exacta de tipos
  const setUser = (user: User | null) => setUserState(user);
  const [users, setUsers] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(USERS_KEY);
      if (saved) return JSON.parse(saved);
    }
    return [OWNER];
  });
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  // Auto-login from session
  useEffect(() => {
    if (!userState && typeof window !== 'undefined') {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
        setUser(JSON.parse(saved));
      }
    }
  }, [userState]);

  // Persist users in localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      window.dashboardUsers = users;
    }
  }, [users]);

  // Only owner can add/edit/delete users
  const addUser = (newUser: { username: string; password: string; role: string; house?: string }) => {
    setUsers([...users, { ...newUser, password: newUser.password || '', house: newUser.house || '' }]);
  };
  const editUser = (idx: number, updated: { username: string; password: string; role: string; house?: string }) => {
    setUsers(users.map((u: { username: string; password: string; role: string; house?: string }, i: number) => i === idx ? { ...u, ...updated, password: updated.password || '', house: updated.house || '' } : u));
  };
  const deleteUser = (idx: number) => {
    setUsers(users.filter((user: { username: string; password: string; role: string; house?: string }, i: number) => i !== idx));
  };
  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SESSION_KEY);
    }
    setUser(null);
  };

  return (
    <div>
      <div style={{display:'flex',justifyContent:'center',alignItems:'center',margin:'2.5rem 0 1.5rem 0'}}>
        <img src="/logo360pro.png" alt="Limpieza 360Pro Logo" className="logo360pro" style={{height:'70px'}} />
      </div>
      <div className="theme-switcher">
        <button
          className={`theme-btn${theme === 'dark' ? ' dark' : ''}`}
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          aria-label={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
        >
          <span className="theme-icon" aria-hidden="true">
            {theme === 'light' ? '🌙' : '☀️'}
          </span>
          <span className="theme-label">{theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}</span>
        </button>
      </div>
      {!userState ? (
        <Login onLogin={setUser} users={users} />
      ) : (
        <Dashboard
          user={userState}
          users={users}
          addUser={addUser}
          editUser={editUser}
          deleteUser={deleteUser}
          setUser={setUser}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
};

export default App;
