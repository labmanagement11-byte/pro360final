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
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
        const user = JSON.parse(saved);
        if (user.role === 'owner' || user.role === 'dueno') {
          user.role = 'owner';
          user.house = 'all';
          localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        }
        onLogin(user);
        return;
      }

      try {
        const params = new URLSearchParams(window.location.search);
        const devUser = params.get('devUser');
        if (devUser === 'jonathan' && window.location.hostname.includes('localhost')) {
          const devUserObj: User = { username: 'jonathan', password: '', role: 'owner', house: 'all' };
          localStorage.setItem(SESSION_KEY, JSON.stringify(devUserObj));
          onLogin(devUserObj);
          return;
        }
      } catch (e) { /* ignore */ }
    }
  }, [onLogin]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    if (!normalizedEmail || !normalizedPassword) {
      setError('Ingresa email y contraseña.');
      setLoading(false);
      return;
    }
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SESSION_KEY);
    }
    
    if (!supabase) {
      setError('No se pudo conectar con Supabase. Verifica configuración.');
      setLoading(false);
      return;
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      });

      if (authError || !authData.user) {
        setError('Email o contraseña incorrectos');
        setLoading(false);
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      const localPart = normalizedEmail.split('@')[0].toLowerCase();
      const userId = authData.user.id;
      let record: any = null;

      try {
        const { data: profileById, error: profileError } = await supabase.from('profiles').select('*').eq('id', userId).single();
        if (profileById) {
          record = profileById;
        }
      } catch (e: any) { /* ignore */ }

      if (!record) {
        try {
          const { data: userById } = await supabase.from('users').select('*').eq('id', userId).single();
          if (userById) record = userById;
        } catch (e) { /* ignored */ }
      }

      if (!record) {
        try {
          const { data: p } = await supabase.from('profiles').select('*').ilike('username', localPart).single();
          if (p) record = p;
        } catch (e) { /* ignored */ }
      }

      if (!record) {
        try {
          const { data: u } = await supabase.from('users').select('*').ilike('username', localPart).single();
          if (u) record = u;
        } catch (e) { /* ignored */ }
      }

      if (!record) {
        try {
          const { data: appUser } = await supabase.from('app_users').select('*').ilike('username', localPart).single();
          if (appUser) {
            const appUserData = appUser as any;
            record = { ...appUserData, house: appUserData.house_name };
          }
        } catch (e) { /* ignored */ }
      }

      if (!record) {
        setError('Usuario no encontrado en base de datos. Por favor contacte al administrador.');
        setLoading(false);
        return;
      }

      let userRole = record.role || record.rol || (record.user_metadata && record.user_metadata.role) || 'empleado';
      if (userRole === 'dueno') {
        userRole = 'owner';
      }

      let userHouse = record.house || record.house_name || record.property_id || 'EPIC D1';
      if (userRole === 'owner') {
        userHouse = 'all';
      }

      const user: User = {
        username: record.username || record.full_name || localPart,
        password: '',
        role: userRole,
        house: userHouse,
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      }

      onLogin(user);
      setLoading(false);
    } catch (err: any) {
      setError(err?.message || 'Error durante login. Verifica tu conexión.');
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
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="email"
              spellCheck={false}
              inputMode="email"
              required
            />
          </div>
          <div className="login-input-group">
            <label htmlFor="login-password" className="login-input-label">Contraseña</label>
            <div className="login-password-wrap">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="current-password"
                spellCheck={false}
                required
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
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
