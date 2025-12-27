"use client"
import React, { useState, useEffect } from 'react';

import Dashboard, { User } from './Dashboard';
import Login from './Login';
import { supabase } from '../utils/supabaseClient';


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
  const [users, setUsers] = useState<User[]>([]);
  const [theme, setTheme] = useState('light');

  // Editar usuario en Supabase
  const editUser = async (idx: number, user: User) => {
    if (!supabase) {
      alert('Supabase no está configurado. Contacta al administrador.');
      return;
    }
    const userToEdit = users[idx];
    if (!userToEdit || !userToEdit.id) {
      alert('No se puede editar: falta id');
      return;
    }
    const { data, error } = await supabase.from<'users', User>('users').update(user).eq('id', userToEdit.id).select();
    if (!error && data && data.length > 0) {
      setUsers(prev => prev.map((u, i) => i === idx ? data[0] : u));
    } else if (error) {
      alert('Error al editar usuario: ' + error.message);
    }
  };

  // Eliminar usuario en Supabase
  const deleteUser = async (idx: number) => {
    if (!supabase) {
      alert('Supabase no está configurado. Contacta al administrador.');
      return;
    }
    const userToDelete = users[idx];
    if (!userToDelete || !userToDelete.id) {
      alert('No se puede eliminar: falta id');
      return;
    }
    const { error } = await supabase.from<'users', User>('users').delete().eq('id', userToDelete.id);
    if (!error) {
      setUsers(prev => prev.filter((_, i) => i !== idx));
    } else {
      alert('Error al eliminar usuario: ' + error.message);
    }
  };

  // Función para agregar usuario a Supabase y refrescar lista
  const addUser = async (user: User) => {
    if (!supabase) {
      alert('Supabase no está configurado. Contacta al administrador.');
      return;
    }
    const { data, error } = await supabase.from<'users', User>('users').insert([user]).select();
    if (!error && data && data.length > 0) {
      setUsers(prev => [...prev, data[0]]);
    } else if (error) {
      alert('Error al agregar usuario: ' + error.message);
    }
  };

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


  // Cargar usuarios desde Supabase al iniciar la app y agregar empleados reales si no existen
  useEffect(() => {
    async function fetchAndSeedUsers() {
      if (!supabase) {
        console.error('Supabase no está configurado. Contacta al administrador.');
        return;
      }
      const { data, error } = await supabase.from<'users', User>('users').select('*');
      if (data) {
        setUsers(data);
        // Empleados reales a insertar si no existen
        const realEmployees = [
          { username: 'Carlina', password: 'reyes123', role: 'empleado', house: 'EPIC D1' },
          { username: 'Victor', password: 'peralta123', role: 'empleado', house: 'EPIC D1' },
          { username: 'Alejandra', password: 'vela123', role: 'manager', house: 'EPIC D1' },
        ];
        // Verificar si ya existen por username y casa
        const missing = realEmployees.filter(emp => !data.some(u => u.username === emp.username && u.house === emp.house));
        if (missing.length > 0) {
          const { data: inserted, error: insertError } = await supabase.from<'users', User>('users').insert(missing).select();
          if (!insertError && inserted) {
            setUsers(prev => [...prev, ...inserted]);
          }
        }
      }
      // Si quieres manejar errores, puedes agregar un setError aquí
    }
    fetchAndSeedUsers();
  }, []);

  // Si necesitas agregar/editar/borrar usuarios, deberías hacerlo vía Supabase, no local
  // Puedes implementar funciones aquí para interactuar con la base de datos si lo deseas
  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SESSION_KEY);
    }
    setUser(null);
  };

  return (
    <div>
      {/* Logo eliminado, restaurado a versión previa */}
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
