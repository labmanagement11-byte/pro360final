
import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import type { User } from './Dashboard';
import './Login.css';

const SESSION_KEY = 'dashboard_session_user';
interface LoginProps {
  onLogin: (user: User) => void;
  users: User[];
}

const Login: React.FC<LoginProps> = ({ onLogin, users }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
        const user = JSON.parse(saved);
        onLogin(user);
      }
    }
  }, [onLogin]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (!supabase) {
      setError('No se pudo conectar con Supabase. Verifica configuración.');
      setLoading(false);
      return;
    }

    try {
      // Login con Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData.user) {
        setError('Email o contraseña incorrectos');
        setLoading(false);
        return;
      }

      // Obtener perfil desde tabla profiles
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profileData) {
        setError('Perfil no encontrado');
        setLoading(false);
        return;
      }

      const user: User = {
        username: (profileData as any).username,
        password: '',
        role: (profileData as any).role,
        house: 'EPIC D1',
      };

      if (remember && typeof window !== 'undefined') {
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      }

      onLogin(user);
      setLoading(false);
    } catch (err) {
      setError('Error durante login');
      setLoading(false);
    }
  };

  return (
    <div className="login-container modern-login">
      <div className="login-card">
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
        <div className="login-header">
          <h2 className="login-title">Bienvenido</h2>
          <p className="login-subtitle">Ingresa tus credenciales para continuar</p>
        </div>
        <form onSubmit={handleSubmit} className="login-form-modern">
          <div className="login-input-group">
            <label htmlFor="login-email" className="login-input-label">Email</label>
            <input
              id="login-email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="login-input-group">
            <label htmlFor="login-password" className="login-input-label">Contraseña</label>
            <input
              id="login-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <label className="login-remember-label">
            <input
              type="checkbox"
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
            />
            <span>Recordar sesión</span>
          </label>
          <button type="submit" disabled={loading} className="login-submit-btn">
            {loading ? (
              <span className="login-btn-content">
                <span className="login-spinner"></span>
                <span>Ingresando...</span>
              </span>
            ) : (
              <span className="login-btn-content">
                <span>Entrar</span>
                <span className="login-arrow">→</span>
              </span>
            )}
          </button>
        </form>
        {error && <div className="login-error-msg">{error}</div>}
      </div>
    </div>
  );
};

export default Login;
