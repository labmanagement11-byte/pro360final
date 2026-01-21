
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
  const [remember, setRemember] = useState(true);
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

      // Obtener perfil desde tabla users (no profiles que está vacía)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('username', email.split('@')[0].toLowerCase())
        .single();

      if (userError || !userData) {
        setError('Usuario no encontrado en base de datos');
        setLoading(false);
        return;
      }

      const user: User = {
        username: (userData as any).username,
        password: '',
        role: (userData as any).role,
        house: (userData as any).house || 'EPIC D1',
      };

      console.log('✅ [Login] Usuario cargado desde tabla users:', user);

      if (typeof window !== 'undefined') {
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
          <img 
            src="/limpieza360pro-logo.png" 
            alt="Limpieza 360Pro" 
            className="login-logo-image"
            style={{ width: '170px', height: 'auto', objectFit: 'contain' }}
          />
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
