
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
    
    // Limpiar sesión anterior corrupta
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SESSION_KEY);
    }
    
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
        console.error('❌ [Login] Error en autenticación:', authError);
        setError('Email o contraseña incorrectos');
        setLoading(false);
        return;
      }

      console.log('✅ [Login] Autenticación exitosa, User ID:', authData.user.id);
      
      // Esperar un momento para que Supabase actualice la sesión
      await new Promise(resolve => setTimeout(resolve, 100));

      // Buscar perfil robustamente en varias fuentes (users, profiles)
      const localPart = email.split('@')[0].toLowerCase();
      const userId = authData.user.id;
      let record: any = null;

      console.log('🔍 [Login] Buscando perfil para:', { userId, email, localPart });

      // 1) PRIMERO: Buscar en profiles por ID de usuario (más confiable)
      try {
        const { data: profileById, error: profileError } = await supabase.from('profiles').select('*').eq('id', userId).single();
        if (profileError) {
          console.log('⚠️ [Login] Error buscando en profiles por ID:', profileError.message);
        }
        if (profileById) {
          record = profileById;
          console.log('✅ [Login] Perfil encontrado por ID en profiles:', record);
        }
      } catch (e: any) {
        console.log('⚠️ [Login] Excepción buscando en profiles por ID:', e.message);
      }

      // 2) Si no existe, buscar en tabla users por ID
      if (!record) {
        try {
          const { data: userById } = await supabase.from('users').select('*').eq('id', userId).single();
          if (userById) {
            record = userById;
            console.log('✅ [Login] Perfil encontrado por ID en users');
          }
        } catch (e) { /* ignored */ }
      }

      // 3) Si no existe, buscar en profiles por username
      if (!record) {
        try {
          const { data: p } = await supabase.from('profiles').select('*').ilike('username', localPart).single();
          if (p) {
            record = p;
            console.log('✅ [Login] Perfil encontrado por username en profiles');
          }
        } catch (e) { /* ignored */ }
      }

      // 4) Si no existe, buscar en tabla users por username
      if (!record) {
        try {
          const { data: u } = await supabase.from('users').select('*').ilike('username', localPart).single();
          if (u) {
            record = u;
            console.log('✅ [Login] Perfil encontrado por username en users');
          }
        } catch (e) { /* ignored */ }
      }

      if (!record) {
        console.error('❌ [Login] No se encontró perfil para:', { userId, email, localPart });
        console.error('❌ [Login] Intentó buscar en profiles y users sin éxito');
        setError('Usuario no encontrado en base de datos. Por favor contacte al administrador.');
        setLoading(false);
        return;
      }

      console.log('✅ [Login] Perfil obtenido:', { 
        username: record.username, 
        role: record.role, 
        house: record.house 
      });

      // Normalizar rol 'dueno' a 'owner' para compatibilidad con el código existente
      let userRole = record.role || (record.user_metadata && record.user_metadata.role) || 'empleado';
      if (userRole === 'dueno') {
        userRole = 'owner';
      }

      const user: User = {
        username: record.username || record.full_name || localPart,
        password: '',
        role: userRole,
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
