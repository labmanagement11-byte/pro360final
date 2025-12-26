import React, { useState, useEffect } from 'react';
import { FaHome, FaEdit, FaTrash, FaPlus, FaCheck, FaTimes } from 'react-icons/fa';
import './Dashboard.css';

import Tasks from './Tasks';
import Inventory from './Inventory';
import Checklist from './Checklist';
import Users from './Users';
import Calendar from './Calendar';

const cardStyles = {
  minHeight: '180px',
  minWidth: '320px',
  fontSize: '1.2rem',
  boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  transition: 'transform 0.2s',
};

const defaultReminders = [
  { name: 'Luz', due: '2025-12-25' },
  { name: 'Agua', due: '2025-12-28' },
  { name: 'Teléfono', due: '2026-01-02' },
  { name: 'Administración', due: '2026-01-10' },
];

const REMINDERS_KEY = 'dashboard_reminders';


export interface User {
  role: string;
  username: string;
  password?: string;
}

declare global {
  interface Window {
    dashboardUsers?: User[];
  }
}

interface DashboardProps {
  user: User;
  users: User[];
  addUser: (user: User) => void;
  editUser: (idx: number, user: User) => void;
  deleteUser: (idx: number) => void;
  setUser: (user: User | null) => void;
  onLogout?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, users, addUser, editUser, deleteUser, setUser, onLogout }) => {

    // Estado para edición de recordatorio
    const [editIdx, setEditIdx] = useState(-1);
  const [view, setView] = useState('home');
  const [reminders, setReminders] = useState<any[]>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(REMINDERS_KEY) : null;
    return saved ? JSON.parse(saved) : defaultReminders;
  });

  const showReminders = user.role === 'dueno' || user.role === 'manager';

  // Estado para casas dinámicas
  const [houses, setHouses] = useState<any[]>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('dashboard_houses') : null;
    return saved ? JSON.parse(saved) : [
      { name: 'Casa Principal', tasks: [], inventory: [] }
    ];
  });
  const [selectedHouseIdx, setSelectedHouseIdx] = useState(0);
  const [newHouseName, setNewHouseName] = useState('');

  // Guardar casas en localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboard_houses', JSON.stringify(houses));
    }
  }, [houses]);
  // Ensure all users have a username string
  useEffect(() => {
    if (users) {
      users.forEach(u => { if (!u.username) u.username = ''; });
    }
  }, [users]);

  const cards = [
    {
      key: 'tasks',
      title: 'Asignar Tareas',
      desc: 'Gestiona y asigna tareas a empleados.',
      show: user.role !== 'empleado',
    },
    {
      key: 'checklist',
      title: 'Checklist Limpieza',
      desc: 'Verifica y gestiona la limpieza y mantenimiento.',
      show: true,
    },
    {
      key: 'inventory',
      title: 'Inventario',
      desc: 'Controla y revisa el inventario de la propiedad.',
      show: true,
    },
    {
      key: 'calendar',
      title: 'Calendario',
      desc: 'Gestiona eventos y tareas programadas.',
      show: true,
    },
    {
      key: 'reminders',
      title: 'Recordatorios',
      desc: 'Visualiza y gestiona los recordatorios de pagos y eventos.',
      show: user.role === 'dueno' || user.role === 'manager',
    },
    {
      key: 'house',
      title: 'Seleccionar Casa',
      desc: 'Elige y administra la casa actual.',
      show: true,
    },
    {
      key: 'users',
      title: 'Usuarios',
      desc: 'Administra roles: dueño, manager, empleado.',
      show: user.role === 'dueno',
    },
  ];

  return (
    <div className="dashboard-container">
      <div className="dashboard-header-row">
        <h1>Dashboard</h1>
        {onLogout && (
          <button className="dashboard-btn danger dashboard-logout-btn" onClick={onLogout}>
            Cerrar sesión
          </button>
        )}
      </div>
      {view === 'home' && (
        <>
          <div className="dashboard-cards">
            {cards.filter(card => card.show).map(card => (
              <button
                key={card.key}
                className="dashboard-card"
                onClick={() => setView(card.key)}
                aria-label={card.title}
              >
                <span className="dashboard-card-title">{card.title}</span>
                <span className="dashboard-card-desc">{card.desc}</span>
              </button>
            ))}
          </div>
          <p className="dashboard-home-desc">Haz clic en una tarjeta para ver el módulo correspondiente.</p>
        </>
      )}
      {view === 'tasks' && <Tasks
        user={user}
        users={users}
        tasks={houses[selectedHouseIdx]?.tasks || []}
        setTasks={(tasks: any[]) => setHouses(houses.map((h, i) => i === selectedHouseIdx ? { ...h, tasks } : h))}
      />}
      {view === 'inventory' && <Inventory
        user={user}
        inventory={houses[selectedHouseIdx]?.inventory || []}
        setInventory={(inventory: any[]) => setHouses(houses.map((h, i) => i === selectedHouseIdx ? { ...h, inventory } : h))}
      />}
      {view === 'calendar' && <Calendar users={users as any} user={user as any} />}
      {view === 'checklist' && <Checklist user={user} />}
      {view === 'reminders' && (
        <div className="dashboard-reminders">
          <h2 className="dashboard-reminders-title">Recordatorios</h2>
          <form className="dashboard-reminders-form" onSubmit={e => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const name = (form.elements.namedItem('name') as HTMLInputElement).value;
            const due = (form.elements.namedItem('due') as HTMLInputElement).value;
            const bank = (form.elements.namedItem('bank') as HTMLInputElement).value;
            const account = (form.elements.namedItem('account') as HTMLInputElement).value;
            setReminders([...reminders, { name, due, bank, account }]);
            form.reset();
          }}>
            <input name="name" type="text" placeholder="Nombre del pago" required />
            <input name="due" type="date" required placeholder="Fecha de pago" title="Fecha de pago" />
            <input name="bank" type="text" placeholder="Banco" required />
            <input name="account" type="text" placeholder="N° de cuenta" required />
            <button type="submit" className="dashboard-btn main">Agregar</button>
          </form>
          <ul className="dashboard-reminders-list">
            {reminders.map((r, idx) => (
              <li key={idx} className="dashboard-reminder-item">
                {editIdx === idx ? (
                  <form className="dashboard-reminders-edit-form" onSubmit={e => {
                    e.preventDefault();
                    const form = e.target as HTMLFormElement;
                    const name = (form.elements.namedItem('name') as HTMLInputElement).value;
                    const due = (form.elements.namedItem('due') as HTMLInputElement).value;
                    const bank = (form.elements.namedItem('bank') as HTMLInputElement).value;
                    const account = (form.elements.namedItem('account') as HTMLInputElement).value;
                    setReminders(reminders.map((rem, i) => i === idx ? { name, due, bank, account } : rem));
                    setEditIdx(-1);
                  }}>
                    <input name="name" type="text" defaultValue={r.name} required />
                    <input name="due" type="date" defaultValue={r.due} required placeholder="Fecha de pago" title="Fecha de pago" />
                    <input name="bank" type="text" defaultValue={r.bank} required />
                    <input name="account" type="text" defaultValue={r.account} required />
                    <button type="submit" className="dashboard-btn main">Guardar</button>
                    <button type="button" className="dashboard-btn danger" onClick={() => setEditIdx(-1)}>Cancelar</button>
                  </form>
                ) : (
                  <>
                    <div>
                      <span className="dashboard-reminder-name">{r.name}</span> | 
                      <span className="dashboard-reminder-due">{r.due}</span> | 
                      <span className="dashboard-reminder-bank">{r.bank}</span> | 
                      <span className="dashboard-reminder-account">{r.account}</span>
                    </div>
                    <div>
                      <button className="dashboard-btn" onClick={() => setEditIdx(idx)}>Editar</button>
                      <button className="dashboard-btn danger" onClick={() => setReminders(reminders.filter((_, i) => i !== idx))}>Eliminar</button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {view === 'house' && (
        <div className="house-selector">
          <h2 className="house-title">Seleccionar Casa</h2>
          <div className="house-cards">
            {houses.map((house, idx) => (
              <div
                key={idx}
                className={`house-card${selectedHouseIdx === idx ? ' selected' : ''}`}
                onClick={() => setSelectedHouseIdx(idx)}
              >
                <span className="house-icon">🏠</span>
                <span className="house-name">{house.name}</span>
              </div>
            ))}
            <div className="house-card add">
              <span className="house-icon">➕</span>
              <form className="dashboard-add-house-form" onSubmit={e => {
                e.preventDefault();
                if (newHouseName.trim()) {
                  setHouses([...houses, { name: newHouseName.trim(), tasks: [], inventory: [] }]);
                  setNewHouseName('');
                }
              }}>
                <input
                  type="text"
                  value={newHouseName}
                  onChange={e => setNewHouseName(e.target.value)}
                  placeholder="Nombre de la casa"
                  title="Nombre de la casa"
                  className="dashboard-add-house-input"
                  required
                />
                <button type="submit" className="dashboard-btn main dashboard-add-house-btn">Agregar</button>
              </form>
            </div>
          </div>
          <div className="dashboard-selected-house-info">
            <strong>Casa seleccionada:</strong> {houses[selectedHouseIdx]?.name}
            <div className="dashboard-selected-house-desc">
              Cada casa tiene su propia lista de tareas e inventario.
            </div>
          </div>
        </div>
      )}
      {view === 'users' && (
        <Users
          user={user}
          users={users}
          addUser={addUser}
          editUser={editUser}
          deleteUser={deleteUser}
        />
      )}
      {view !== 'home' && (
        <button className="dashboard-back-btn" onClick={() => setView('home')} aria-label="Volver al dashboard">← Volver</button>
      )}
    </div>
  );
};

export default Dashboard;
