import React, { useState, useEffect } from 'react';
import type { User } from './Dashboard';
import './Login.css';

const SESSION_KEY = 'dashboard_session_user';
interface LoginProps {
  onLogin: (user: User) => void;
  users: User[];
}

const Login: React.FC<LoginProps> = ({ onLogin, users }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
        const user = JSON.parse(saved);
        onLogin(user);
      }
    }
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const user = users.find(
      u => u.username.toLowerCase() === username.trim().toLowerCase() &&
           u.password === password
    );
    if (user) {
      setError('');
      if (remember && typeof window !== 'undefined') {
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      }
      onLogin(user);
    } else {
      setError('Usuario o contraseña incorrectos');
    }
  };

  return (
    <div className="login-container modern-login">
      <div className="login-logo360pro">
        <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="30" cy="30" r="28" fill="#3182ce" stroke="#2563eb" strokeWidth="2" />
          <path d="M18 38c2-8 8-14 14-14s12 6 14 14" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <ellipse cx="30" cy="28" rx="7" ry="4" fill="#fff" fillOpacity=".7" />
          <path d="M24 24c1-2 3-4 6-4s5 2 6 4" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </svg>
        <span className="login-logo360pro-text">
          <span className="login-logo360pro-main">Limpieza</span>
          <span className="login-logo360pro-sub">360Pro</span>
        </span>
      </div>
      <h2 className="login-title">Bienvenido</h2>
      <form onSubmit={handleSubmit} className="login-form-modern">
        <input
          type="text"
          placeholder="Usuario"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <label className="login-remember-label">
          <input
            type="checkbox"
            checked={remember}
            onChange={e => setRemember(e.target.checked)}
          />
          Recordar sesión
        </label>
        <button type="submit" disabled={loading}> {loading ? 'Ingresando...' : 'Entrar'} </button>
      </form>
      {error && <p className="login-error-msg">{error}</p>}
    </div>
  );
};

export default Login;
