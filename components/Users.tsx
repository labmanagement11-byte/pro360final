import React, { useState } from 'react';
import './Users.css';
import type { User } from './Dashboard';

interface UsersProps {
  user: User;
  users: User[];
  addUser: (user: User) => void;
  editUser: (idx: number, user: User) => void;
  deleteUser: (idx: number) => void;
}


const Users: React.FC<UsersProps> = ({ user, users, addUser, editUser, deleteUser }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('empleado');
  const [house, setHouse] = useState('');
  const [editIdx, setEditIdx] = useState(-1);
  const [editData, setEditData] = useState({ username: '', password: '', role: 'empleado', house: '' });

  // Obtener casas desde localStorage (igual que Dashboard)
  const [houses, setHouses] = useState<{ name: string }[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dashboard_houses');
      if (saved) return JSON.parse(saved);
    }
    return [{ name: 'EPIC D1' }];
  });

  if (!user || user.role !== 'dueno') {
    return (
      <div className="users-container">
        <h2>Gestión de Usuarios</h2>
        <p>Solo el dueño puede gestionar usuarios.</p>
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

  const handleAddUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (username && role && house) {
      addUser({ username, password: password || '', role, house });
      setUsername('');
      setPassword('');
      setRole('empleado');
      setHouse('');
    }
  };

  const handleEditUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (editData.username && editData.role) {
      editUser(editIdx, { ...editData, password: editData.password || '' });
      setEditIdx(-1);
      setEditData({ username: '', password: '', role: 'empleado', house: '' });
    }
  };

  return (
    <div className="users-container">
      <h2>Gestión de Usuarios</h2>
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
          {houses.map((h, idx) => (
            <option key={idx} value={h.name}>{h.name}</option>
          ))}
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
                  <button type="submit">Guardar</button>
                  <button type="button" onClick={() => setEditIdx(-1)}>Cancelar</button>
                </form>
              ) : (
                <>
                  <span>{u.username}</span>
                  <strong>{u.role}</strong>
                  {u.role !== 'dueno' && (
                    <>
                      <button onClick={() => {
                        setEditIdx(idx);
                        setEditData({ username: u.username, password: u.password || '', role: u.role, house: u.house || '' });
                      }}>Editar</button>
                      <button onClick={() => deleteUser(idx)} className="users-delete-btn">Eliminar</button>
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
