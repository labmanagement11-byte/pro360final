
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

      // Buscar perfil robustamente en varias fuentes (users, profiles)
      const localPart = email.split('@')[0].toLowerCase();
      let record: any = null;

      // 1) Buscar en tabla users por username
      try {
        const { data: u } = await supabase.from('users').select('*').ilike('username', localPart).single();
        if (u) record = u;
      } catch (e) { /* ignored */ }

      // 2) Si no existe, buscar en profiles por username
      if (!record) {
        try {
          const { data: p } = await supabase.from('profiles').select('*').ilike('username', localPart).single();
          if (p) record = p;
        } catch (e) { /* ignored */ }
      }

      // 3) Si no existe, buscar en profiles por full_name
      if (!record) {
        try {
          const { data: p2 } = await supabase.from('profiles').select('*').ilike('full_name', localPart).single();
          if (p2) record = p2;
        } catch (e) { /* ignored */ }
      }

      // 4) Si sigue sin existir, buscar por email en users o profiles (si tenemos email)
      const userEmail = authData?.user?.email;
      if (!record && userEmail) {
        try {
          const { data: u2 } = await supabase.from('users').select('*').eq('email', userEmail).single();
          if (u2) record = u2;
        } catch (e) { /* ignored */ }
      }

      if (!record && userEmail) {
        try {
          const { data: p3 } = await supabase.from('profiles').select('*').eq('email', userEmail).single();
          if (p3) record = p3;
        } catch (e) { /* ignored */ }
      }

      if (!record) {
        setError('Usuario no encontrado en base de datos');
        setLoading(false);
        return;
      }

      const user: User = {
        username: record.username || record.full_name || localPart,
        password: '',
        role: record.role || (record.user_metadata && record.user_metadata.role) || 'empleado',
        house: record.house || 'EPIC D1',
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
