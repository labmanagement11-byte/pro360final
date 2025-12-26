'use client';
import React, { useState, useEffect } from 'react';
import Dashboard from './Dashboard';
import Login from './Login';
import Users from './Users';

const OWNER = { username: 'galindo123@email.com', password: 'galindo123', role: 'dueno' };
const USERS_KEY = 'dashboard_users';
const SESSION_KEY = 'dashboard_session_user';
const App = () => {
  const [user, setUser] = useState(null);
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
    if (!user && typeof window !== 'undefined') {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
        setUser(JSON.parse(saved));
      }
    }
  }, [user]);

  // Persist users in localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      window.dashboardUsers = users;
    }
  }, [users]);

  // Only owner can add/edit/delete users
  const addUser = (newUser) => {
    setUsers([...users, newUser]);
  };
  const editUser = (idx, updated) => {
    setUsers(users.map((u, i) => i === idx ? { ...u, ...updated } : u));
  };
  const deleteUser = (idx) => {
    setUsers(users.filter((_, i) => i !== idx));
  };
  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SESSION_KEY);
    }
    setUser(null);
  };

  return (
    <div>
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
      {!user ? (
        <Login onLogin={setUser} users={users} />
      ) : (
        <Dashboard
          user={user}
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
