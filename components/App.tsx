"use client"
import React, { useState, useEffect } from 'react';

import Dashboard, { User } from './Dashboard';
import Login from './Login';
import { supabase } from '../utils/supabaseClient';


const SESSION_KEY = 'dashboard_session_user';

function canSeeAllHouses(user: User | null) {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  return role === 'owner' || role === 'dueno' || user.house === 'all';
}

const App = () => {
  const [userState, setUserState] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) return JSON.parse(saved);
    }
    return null;
  });
  const setUser = (user: User | null) => setUserState(user);
  const [users, setUsers] = useState<User[]>([]);
  const [theme, setTheme] = useState('light');

  const fetchUsers = async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('profiles').select('*');
    if (data) {
      setUsers(data.map((p: any) => ({
        id: p.id,
        username: p.username,
        password: '',
        role: p.role,
        house: p.house || 'EPIC D1',
      })));
    } else if (error) {
      console.error('Error al cargar usuarios:', error);
    }
  };

  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel('profiles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload: any) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
          fetchUsers();
        }
      })
      .subscribe();
    return () => {
      if (supabase) supabase.removeChannel(channel);
    };
  }, []);

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
    const { data, error } = await (supabase as any)
      .from('profiles')
      .update({ username: user.username, role: user.role, house: user.house })
      .eq('id', userToEdit.id)
      .select();
    if (!error && data && data.length > 0) {
      setUsers(prev => prev.map((u, i) => i === idx ? data[0] : u));
    } else if (error) {
      alert('Error al editar usuario: ' + error.message);
    }
  };

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
    const { error } = await (supabase as any).from('profiles').delete().eq('id', userToDelete.id);
    if (!error) {
      setUsers(prev => prev.filter((_, i) => i !== idx));
    } else {
      alert('Error al eliminar usuario: ' + error.message);
    }
  };

  const addUser = async (user: User) => {
    if (!supabase) {
      alert('Supabase no está configurado. Contacta al administrador.');
      return;
    }
    const { data, error } = await (supabase as any)
      .from('profiles')
      .insert([{ username: user.username, role: user.role, house: user.house }])
      .select();
    if (!error && data && data.length > 0) {
      setUsers(prev => [...prev, data[0]]);
    } else if (error) {
      alert('Error al agregar usuario: ' + error.message);
    }
  };

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!userState && typeof window !== 'undefined') {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
        setUser(JSON.parse(saved));
      }
    }
  }, [userState]);

  useEffect(() => {
    fetchUsers();
    const interval = setInterval(() => {
      fetchUsers();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SESSION_KEY);
    }
    setUser(null);
  };

  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Cargando...</div>;
  }

  const visibleUsers = canSeeAllHouses(userState)
    ? users
    : users.filter(u => u.house && userState?.house && u.house === userState.house);

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
      {!userState ? (
        <Login onLogin={setUser} users={users} />
      ) : (
        <Dashboard
          user={userState}
          users={visibleUsers}
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
