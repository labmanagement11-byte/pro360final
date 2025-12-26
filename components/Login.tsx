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
    const user = users.find(u => u.username === username && u.password === password);
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
    <div className="login-container">
      <div style={{display:'flex',justifyContent:'center',alignItems:'center',margin:'1.5rem 0 1.2rem 0'}}>
        <img src="/logo360pro.png" alt="Limpieza 360Pro Logo" className="logo360pro" />
      </div>
      <h2>Iniciar Sesin</h2>
      <form onSubmit={handleSubmit}>
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
        <button type="submit">Entrar</button>
      </form>
      {error && <p className="login-error-msg">{error}</p>}
    </div>
  );
};

export default Login;
