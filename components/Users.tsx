import React, { useState, useEffect } from 'react';
import './Users.css';
import type { User } from './Dashboard';
import * as realtimeService from '../utils/supabaseRealtimeService';

interface UsersProps {
  user: User;
  users: User[];
  houses?: { id: string; houseName: string }[];
  addUser?: (user: User) => void;
  editUser?: (idx: number, user: User) => void;
  deleteUser?: (idx: number) => void;
}


const Users: React.FC<UsersProps> = ({ user, users: propUsers, houses: propHouses, addUser, editUser, deleteUser }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('empleado');
  const [house, setHouse] = useState('');
  const [editIdx, setEditIdx] = useState(-1);
  const [editData, setEditData] = useState({ username: '', password: '', role: 'empleado', house: '' });
  const [users, setUsers] = useState<User[]>([]);
  const [houses, setHouses] = useState<{ id?: string; houseName?: string; name?: string }[]>([]);
  const [loading, setLoading] = useState(false);

  // Cargar usuarios y casas desde Supabase si es jonathan
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Si es jonathan, cargar desde Supabase
        if (user?.username.toLowerCase() === 'jonathan') {
          const fetchedUsers = await realtimeService.getUsers();
          setUsers(fetchedUsers || []);
          
          // Usar casas del props si están disponibles, sino cargar desde Supabase
          if (propHouses && propHouses.length > 0) {
            setHouses(propHouses);
          } else {
            const fetchedHouses = await realtimeService.getHouses();
            setHouses(fetchedHouses || []);
          }
        } else {
          // Si no es jonathan, usar props
          setUsers(propUsers || []);
          setHouses(propHouses || []);
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

    // Suscribirse a cambios en tiempo real
    if (user?.username.toLowerCase() === 'jonathan') {
      const channelUsers = realtimeService.subscribeToUsers((updatedUsers) => {
        setUsers(updatedUsers || []);
      });
      const channelHouses = realtimeService.subscribeToHouses((updatedHouses) => {
        setHouses(updatedHouses || []);
      });

      return () => {
        channelUsers?.unsubscribe?.();
        channelHouses?.unsubscribe?.();
      };
    }
  }, [user, propUsers, propHouses]);

  if (!user || (user.role !== 'dueno' && (user.role !== 'manager' || user.username.toLowerCase() !== 'jonathan'))) {
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
    if (username && role && house) {
      try {
        if (user?.username.toLowerCase() === 'jonathan') {
          // Usar Supabase para jonathan
          await realtimeService.createUser({ username, password: password || '', role, house });
        } else if (addUser) {
          // Fallback para owner
          await addUser({ username, password: password || '', role, house });
        }
        setUsername('');
        setPassword('');
        setRole('empleado');
        setHouse('');
      } catch (error) {
        console.error('Error adding user:', error);
        alert('Error al agregar usuario');
      }
    }
  };

  const handleEditUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (editData.username && editData.role) {
      try {
        if (user?.username.toLowerCase() === 'jonathan') {
          // Usar Supabase para jonathan
          const editedUser = users[editIdx];
          if (editedUser?.id) {
            await realtimeService.updateUser(String(editedUser.id), {
              username: editData.username,
              password: editData.password || '',
              role: editData.role,
              house: editData.house
            });
          }
        } else if (editUser) {
          // Fallback para owner
          await editUser(editIdx, { ...editData, password: editData.password || '' });
        }
        setEditIdx(-1);
        setEditData({ username: '', password: '', role: 'empleado', house: '' });
      } catch (error) {
        console.error('Error editing user:', error);
        alert('Error al editar usuario');
      }
    }
  };

  const handleDeleteUser = async (idx: number) => {
    try {
      if (user?.username.toLowerCase() === 'jonathan') {
        // Usar Supabase para jonathan
        const userToDelete = users[idx];
        if (userToDelete?.id) {
          await realtimeService.deleteUser(String(userToDelete.id));
        }
      } else if (deleteUser) {
        // Fallback para owner
        await deleteUser(idx);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error al eliminar usuario');
    }
  };

  return (
    <div className="users-container">
      <h2>Gestión de Usuarios</h2>
      {loading && <p>Cargando datos...</p>}
      <form onSubmit={handleAddUser} className="users-add-form">
        <input
          type="text"
          placeholder="Correo del usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <label htmlFor="role-select" className="users-label">Rol:</label>
        <select id="role-select" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="manager">Manager</option>
          <option value="empleado">Empleado</option>
        </select>
        <label htmlFor="house-select" className="users-label">Casa asignada:</label>
        <select id="house-select" value={house} onChange={e => setHouse(e.target.value)} required>
          <option value="" disabled>Selecciona una casa</option>
          {houses.map((h, idx) => {
            const houseName = h.houseName || h.name || '';
            return <option key={idx} value={houseName}>{houseName}</option>;
          })}
        </select>
        <button type="submit">Agregar Usuario</button>
      </form>
      <ul className="users-list">
        {users && users.length > 0 ? (
          users.map((u, idx) => (
            <li key={idx}>
              {editIdx === idx ? (
                <form onSubmit={handleEditUser} className="users-edit-form">
                  <input
                    type="text"
                    value={editData.username}
                    onChange={e => setEditData({ ...editData, username: e.target.value })}
                    required
                    placeholder="Correo del usuario"
                    title="Correo del usuario"
                  />
                  <input
                    type="password"
                    value={editData.password}
                    onChange={e => setEditData({ ...editData, password: e.target.value })}
                    placeholder="Nueva contraseña (opcional)"
                  />
                  <select value={editData.role} onChange={e => setEditData({ ...editData, role: e.target.value })} title="Rol del usuario">
                    <option value="manager">Manager</option>
                    <option value="empleado">Empleado</option>
                  </select>
                  <select value={editData.house} onChange={e => setEditData({ ...editData, house: e.target.value })} title="Casa asignada">
                    <option value="" disabled>Selecciona una casa</option>
                    {houses.map((h, idx) => {
                      const houseName = h.houseName || h.name || '';
                      return <option key={idx} value={houseName}>{houseName}</option>;
                    })}
                  </select>
                  <button type="submit">Guardar</button>
                  <button type="button" onClick={() => setEditIdx(-1)}>Cancelar</button>
                </form>
              ) : (
                <>
                  <span>{u.username}</span>
                  <strong>{u.role}</strong>
                  <span className="users-house">{u.house}</span>
                  {u.role !== 'dueno' && (
                    <>
                      <button onClick={() => {
                        setEditIdx(idx);
                        setEditData({ username: u.username, password: u.password || '', role: u.role, house: u.house || '' });
                      }}>Editar</button>
                      <button onClick={() => handleDeleteUser(idx)} className="users-delete-btn">Eliminar</button>
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
