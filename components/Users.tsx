import React, { useState, useEffect } from 'react';
import './Users.css';
import type { User } from './Dashboard';
import * as realtimeService from '../utils/supabaseRealtimeService';
import { supabase } from '../utils/supabaseClient';

interface UsersProps {
  user: User;
  users: User[];
  houses?: { id: string; houseName: string }[];
  addUser?: (user: User) => void;
  editUser?: (idx: number, user: User) => void;
  deleteUser?: (idx: number) => void;
  selectedHouse?: string;
}

function isOwnerUser(user?: { role?: string } | null) {
  const role = String(user?.role || '').toLowerCase();
  return role === 'owner' || role === 'dueno';
}

const Users: React.FC<UsersProps> = ({ user, users: propUsers, houses: propHouses, addUser, editUser, deleteUser, selectedHouse }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('empleado');
  const [house, setHouse] = useState('');
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ username: '', email: '', password: '', role: 'empleado', house: '' });
  const [users, setUsers] = useState<User[]>([]);
  const [houses, setHouses] = useState<{ id?: string; houseName?: string; name?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [canViewPasswords, setCanViewPasswords] = useState(false);
  const [revealedPwdId, setRevealedPwdId] = useState<string | null>(null);
  const owner = isOwnerUser(user);
  const isManager = String(user?.role || '').toLowerCase() === 'manager';
  const canManageUsers = owner || isManager;
  const managerHouse = String(user?.house || '').trim();

  const callAdminUsersApi = async (method: 'GET' | 'POST' | 'PATCH' | 'DELETE', payload: Record<string, any>) => {
    if (!supabase) {
      throw new Error('Supabase client no disponible');
    }

    const action =
      method === 'GET' ? 'list' :
      method === 'POST' ? 'create' :
      method === 'PATCH' ? 'update' :
      'delete';

    const { data: fnData, error: fnError } = await supabase.functions.invoke('admin-users', {
      body: { action, ...payload },
    });

    if (!fnError && fnData && !(fnData as { error?: string }).error) {
      return fnData;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) {
      throw new Error((fnData as { error?: string })?.error || fnError?.message || 'No hay sesión activa para gestionar usuarios');
    }

    const response = await fetch('/api/admin/users', {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-dashboard-user-role': String(user?.role || ''),
        'x-dashboard-user-name': String(user?.username || '')
      },
      ...(method !== 'GET' ? { body: JSON.stringify(payload) } : {})
    });

    const json = await response.json();
    if (!response.ok) {
      throw new Error(json?.error || (fnData as { error?: string })?.error || 'Error en API de usuarios');
    }
    return json;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        if (canManageUsers) {
          try {
            const apiResult = await callAdminUsersApi('GET', {});
            if (apiResult?.users) {
              setUsers(apiResult.users);
              setCanViewPasswords(!!apiResult.canViewPasswords && owner);
            } else {
              const fetchedUsers = await realtimeService.getUsers();
              setUsers(fetchedUsers || []);
              setCanViewPasswords(false);
            }
          } catch {
            const fetchedUsers = await realtimeService.getUsers();
            setUsers(fetchedUsers || []);
            setCanViewPasswords(false);
          }
          if (propHouses && propHouses.length > 0) {
            setHouses(propHouses);
          } else {
            const fetchedHouses = await realtimeService.getHouses();
            setHouses(fetchedHouses || []);
          }
          if (isManager && managerHouse) {
            setHouse(managerHouse);
          }
        } else {
          setUsers(propUsers || []);
          setHouses(propHouses || []);
          setCanViewPasswords(false);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setUsers(propUsers || []);
        setHouses(propHouses || []);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    if (canManageUsers) {
      const channelUsers = realtimeService.subscribeToUsers(async () => {
        try {
          const apiResult = await callAdminUsersApi('GET', {});
          if (apiResult?.users) setUsers(apiResult.users);
          else {
            const fetchedUsers = await realtimeService.getUsers();
            setUsers(fetchedUsers || []);
          }
        } catch {
          const fetchedUsers = await realtimeService.getUsers();
          setUsers(fetchedUsers || []);
        }
      });
      const channelHouses = realtimeService.subscribeToHouses((updatedHouses) => {
        setHouses(updatedHouses || []);
      });

      return () => {
        channelUsers?.unsubscribe?.();
        channelHouses?.unsubscribe?.();
      };
    }
  }, [user, propUsers, propHouses, owner, isManager, canManageUsers, managerHouse]);

  if (!user || !['dueno', 'owner', 'manager'].includes(String(user.role || '').toLowerCase())) {
    return (
      <div className="users-container">
        <h2>Gestión de Usuarios</h2>
        <p>No tienes permiso para gestionar usuarios.</p>
        <ul className="users-list">
          {users && users.length > 0 ? (
            users.map((u, idx) => (
              <li key={idx}>
                <span>{u.username}</span>
                <strong>{u.role}</strong>
              </li>
            ))
          ) : (
            <li className="users-list-empty">No hay usuarios registrados.</li>
          )}
        </ul>
      </div>
    );
  }

  const handleAddUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError('');
    if (!username || !role || !house) {
      setFormError('Completa nombre, rol y casa');
      return;
    }
    try {
      if (canManageUsers) {
        const cleanEmail = email.trim().toLowerCase();
        if (!cleanEmail.includes('@')) {
          setFormError('Escribe un correo válido. Con ese correo entra la persona.');
          return;
        }
        if (!password || password.length < 6) {
          setFormError('La contraseña debe tener al menos 6 caracteres');
          return;
        }
        const houseToUse = isManager ? managerHouse : house;
        const roleToUse = isManager ? 'empleado' : role;
        if (!houseToUse) {
          setFormError('Selecciona una casa');
          return;
        }
        const result = await callAdminUsersApi('POST', {
          email: cleanEmail,
          password,
          username: username.trim(),
          role: roleToUse,
          house: houseToUse
        });

        if (result?.user) {
          setUsers(prev => {
            const next = prev.filter(u => String(u.id) !== String(result.user.id));
            return [...next, result.user];
          });
        }
      } else if (addUser) {
        await addUser({ username, password: password || '', role, house });
      }
      setUsername('');
      setEmail('');
      setPassword('');
      setRole('empleado');
      setHouse('');
    } catch (error) {
      console.error('Error adding user:', error);
      setFormError(error instanceof Error ? error.message : 'Error al agregar usuario');
    }
  };

  const handleEditUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError('');
    if (editData.username && editData.role && editUserId) {
      try {
        const idx = users.findIndex(u => String(u.id) === String(editUserId));
        const targetUser = idx >= 0 ? users[idx] : null;
        if (!targetUser) {
          throw new Error('Usuario a editar no encontrado');
        }

        if (canManageUsers) {
          if (targetUser?.id) {
            const result = await callAdminUsersApi('PATCH', {
              id: String(targetUser.id),
              username: editData.username,
              email: editData.email || '',
              password: editData.password || '',
              role: isManager ? 'empleado' : editData.role,
              house: isManager ? managerHouse : editData.house
            });

            if (result?.user) {
              setUsers(prev => prev.map((u) => (String(u.id) === String(editUserId) ? result.user : u)));
            }
          }
        } else if (editUser) {
          await editUser(idx, { ...editData, password: editData.password || '' });
        }
        setEditUserId(null);
        setEditData({ username: '', email: '', password: '', role: 'empleado', house: '' });
      } catch (error) {
        console.error('Error editing user:', error);
        setFormError(error instanceof Error ? error.message : 'Error al editar usuario');
      }
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setFormError('');
    const targetUser = users.find(u => String(u.id) === String(userId));
    if (!targetUser) {
      setFormError('Usuario a eliminar no encontrado');
      return;
    }
    if (!window.confirm(`¿Eliminar a ${targetUser.username}? Ya no podrá entrar.`)) {
      return;
    }
    try {
      const idx = users.findIndex(u => String(u.id) === String(userId));
      if (canManageUsers) {
        if (targetUser?.id) {
          await callAdminUsersApi('DELETE', { id: String(targetUser.id) });
          setUsers(prev => prev.filter((u) => String(u.id) !== String(userId)));
        }
      } else if (deleteUser) {
        await deleteUser(idx);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      setFormError(error instanceof Error ? error.message : 'Error al eliminar usuario');
    }
  };

  return (
    <div className="users-container">
      <h2>Gestión de Usuarios</h2>
      <p className="users-help">Agrega o elimina personas aquí. Se guardan en Supabase Auth + perfiles automáticamente. Managers solo gestionan su casa (empleados). Solo Jonathan ve contraseñas.</p>
      {loading && <p>Cargando datos...</p>}
      {formError && <p className="users-error">{formError}</p>}
      <form onSubmit={handleAddUser} className="users-add-form">
        <input
          type="text"
          placeholder="Nombre del usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="Correo para entrar"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required={canManageUsers}
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <label htmlFor="role-select" className="users-label">Rol:</label>
        <select id="role-select" value={isManager ? 'empleado' : role} onChange={(e) => setRole(e.target.value)} disabled={isManager}>
          {!isManager && <option value="manager">Manager</option>}
          <option value="empleado">Empleado</option>
        </select>
        <label htmlFor="house-select" className="users-label">Casa asignada:</label>
        <select
          id="house-select"
          value={isManager ? managerHouse : house}
          onChange={e => setHouse(e.target.value)}
          required
          disabled={isManager}
        >
          <option value="" disabled>Selecciona una casa</option>
          {(isManager ? houses.filter(h => (h.houseName || h.name || '') === managerHouse) : houses).map((h, idx) => {
            const houseName = h.houseName || h.name || '';
            return <option key={idx} value={houseName}>{houseName}</option>;
          })}
        </select>
        <button type="submit">Agregar Usuario</button>
      </form>
      <ul className="users-list">
        {users && users.length > 0 ? (
          users
            .filter(u => {
              if (owner) {
                if (selectedHouse) {
                  return u.house === selectedHouse;
                }
                return true;
              }
              if (user?.house) {
                return u.house === user.house;
              }
              return false;
            })
            .map((u, idx) => (
            <li key={u.id || idx}>
              {editUserId === String(u.id) ? (
                <form onSubmit={handleEditUser} className="users-edit-form">
                  <input
                    type="text"
                    value={editData.username}
                    onChange={e => setEditData({ ...editData, username: e.target.value })}
                    required
                    placeholder="Nombre del usuario"
                    title="Nombre del usuario"
                  />
                  <input
                    type="email"
                    value={editData.email}
                    onChange={e => setEditData({ ...editData, email: e.target.value })}
                    placeholder="Email"
                    title="Email de acceso"
                  />
                  <input
                    type="password"
                    value={editData.password}
                    onChange={e => setEditData({ ...editData, password: e.target.value })}
                    placeholder="Nueva contraseña (opcional)"
                  />
                  <select
                    value={isManager ? 'empleado' : editData.role}
                    onChange={e => setEditData({ ...editData, role: e.target.value })}
                    title="Rol del usuario"
                    disabled={isManager}
                  >
                    {!isManager && <option value="manager">Manager</option>}
                    <option value="empleado">Empleado</option>
                  </select>
                  <select
                    value={isManager ? managerHouse : editData.house}
                    onChange={e => setEditData({ ...editData, house: e.target.value })}
                    title="Casa asignada"
                    disabled={isManager}
                  >
                    <option value="" disabled>Selecciona una casa</option>
                    {(isManager ? houses.filter(h => (h.houseName || h.name || '') === managerHouse) : houses).map((h, houseIdx) => {
                      const houseName = h.houseName || h.name || '';
                      return <option key={houseIdx} value={houseName}>{houseName}</option>;
                    })}
                  </select>
                  <button type="submit">Guardar</button>
                  <button type="button" onClick={() => setEditUserId(null)}>Cancelar</button>
                </form>
              ) : (
                <>
                  <span>{u.username}</span>
                  {(u as any).email && <span className="users-email">{(u as any).email}</span>}
                  <strong>{u.role}</strong>
                  <span className="users-house">{u.house}</span>
                  {canViewPasswords && (
                    <span className="users-password">
                      🔑 {revealedPwdId === String(u.id) ? ((u as any).password || '(sin registro)') : '••••••••'}
                      <button
                        type="button"
                        className="users-reveal-pwd"
                        onClick={() => setRevealedPwdId(revealedPwdId === String(u.id) ? null : String(u.id))}
                        title="Solo Jonathan puede ver contraseñas"
                      >
                        {revealedPwdId === String(u.id) ? 'Ocultar' : 'Ver'}
                      </button>
                    </span>
                  )}
                  {u.role !== 'dueno' && u.role !== 'owner' && !(isManager && String(u.role).toLowerCase() === 'manager') && (
                    <>
                      <button onClick={() => {
                        setEditUserId(String(u.id));
                        setEditData({ username: u.username, email: (u as any).email || '', password: '', role: u.role, house: u.house || '' });
                      }}>Editar</button>
                      <button onClick={() => handleDeleteUser(String(u.id))} className="users-delete-btn">Eliminar</button>
                    </>
                  )}
                </>
              )}
            </li>
          ))
        ) : (
          <li className="users-list-empty">No hay usuarios registrados.</li>
        )}
      </ul>
    </div>
  );
};

export default Users;
