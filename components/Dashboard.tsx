import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
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


// Usuarios por defecto para la casa EPIC D1
const defaultUsers: User[] = [
  { username: 'Carlina', password: 'reyes123', role: 'empleado', house: 'EPIC D1' },
  { username: 'Victor', password: 'peralta123', role: 'empleado', house: 'EPIC D1' },
  { username: 'Alejandra', password: 'vela123', role: 'manager', house: 'EPIC D1' },
];

const defaultReminders = [
  { name: 'Luz', due: '2025-12-25' },
  { name: 'Agua', due: '2025-12-28' },
  { name: 'Teléfono', due: '2026-01-02' },
  { name: 'Administración', due: '2026-01-10' },
];

const REMINDERS_KEY = 'dashboard_reminders';


export interface User {
  id?: number; // ID de Supabase (opcional)
  role: string;
  username: string;
  password: string;
  house?: string; // Casa asignada (opcional para compatibilidad)
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

  // Estado para casas dinámicas y usuarios sincronizados
  const [houses, setHouses] = useState<any[]>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('dashboard_houses') : null;
    return saved ? JSON.parse(saved) : [
      { name: 'EPIC D1', tasks: [], inventory: [], users: defaultUsers }
    ];
  });
  // Si el usuario es empleado, forzar la casa asignada
  const employeeHouseIdx = user.role === 'empleado' && user.house
    ? houses.findIndex(h => h.name === user.house)
    : 0;
  const [selectedHouseIdx, setSelectedHouseIdx] = useState(employeeHouseIdx >= 0 ? employeeHouseIdx : 0);
    // Si es empleado, solo puede ver su casa y no puede cambiarla
    const isEmployee = user.role === 'empleado';
    const allowedHouseIdx = isEmployee ? (employeeHouseIdx >= 0 ? employeeHouseIdx : 0) : selectedHouseIdx;
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
      key: 'shopping',
      title: 'Lista de Compras',
      desc: 'Agrega productos por comprar y gestiona compras realizadas.',
      show: user.role === 'dueno' || user.role === 'manager' || user.role === 'empleado',
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
    // Solo mostrar la tarjeta de seleccionar casa si NO es empleado
    {
      key: 'house',
      title: 'Seleccionar Casa',
      desc: 'Elige y administra la casa actual.',
      show: user.role !== 'empleado',
    },
    {
      key: 'users',
      title: 'Usuarios',
      desc: 'Administra roles: dueño, manager, empleado.',
      show: user.role === 'dueno',
    },
  ];

  // --- Shopping List State ---
  // --- Shopping List State (Supabase) ---
  const [shoppingList, setShoppingList] = useState<any[]>([]);
  const [shoppingHistory, setShoppingHistory] = useState<any[]>([]);
  const [editShoppingIdx, setEditShoppingIdx] = useState(-1);
  const [newProduct, setNewProduct] = useState({ name: '', qty: 1 });
  const [loadingShopping, setLoadingShopping] = useState(true);

  // Cargar lista de compras desde Supabase
  useEffect(() => {
    const fetchShopping = async () => {
      setLoadingShopping(true);
      const { data, error } = await supabase!
        .from('shopping_list')
        .select('*')
        .eq('house', 'EPIC D1');
      if (!error && data) {
        // @ts-expect-error
        setShoppingList(data.filter(i => !i.completed));
        // @ts-expect-error
        setShoppingHistory(data.filter(i => i.completed).sort((a, b) => (b.completed_at || '').localeCompare(a.completed_at || '')));
      } else {
        setShoppingList([]);
        setShoppingHistory([]);
      }
      setLoadingShopping(false);
    };
    fetchShopping();
  }, []);

  // Agregar producto a Supabase
  const addProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newProduct.name.trim() || newProduct.qty < 1) return;
    const { data, error } = await supabase!
      .from('shopping_list')
      // @ts-expect-error
      .insert([{ name: newProduct.name, qty: newProduct.qty, completed: false, house: 'EPIC D1' }])
      .select();
    if (!error && data && data.length > 0) {
      setShoppingList([...shoppingList, data[0]]);
      setNewProduct({ name: '', qty: 1 });
    }
  };

  // Editar producto en Supabase
  const saveEditProduct = async (e: React.FormEvent<HTMLFormElement>, idx: number) => {
    e.preventDefault();
    const item = shoppingList[idx];
    if (!item || !item.id) return;
    const { data, error } = await supabase!
      .from('shopping_list')
      .update({ name: newProduct.name, qty: newProduct.qty })
      .eq('id', item.id)
      .select();
    if (!error && data && data.length > 0) {
      setShoppingList(shoppingList.map((prod, i) => i === idx ? data[0] : prod));
      setEditShoppingIdx(-1);
    }
  };

  // Eliminar producto en Supabase
  const deleteProduct = async (idx: number) => {
    const item = shoppingList[idx];
    if (!item || !item.id) return;
    const { error } = await supabase.from('shopping_list').delete().eq('id', item.id);
    if (!error) {
      setShoppingList(shoppingList.filter((_, i) => i !== idx));
    }
  };

  // Marcar compra como completada (mueve todos los productos a historial)
  const completeShopping = async () => {
    const ids = shoppingList.map(i => i.id);
    if (!ids.length) return;
    const { data, error } = await supabase
      .from('shopping_list')
      .update({ completed: true, completed_at: new Date().toISOString() })
      .in('id', ids)
      .select();
    if (!error && data) {
      setShoppingHistory([
        { items: shoppingList, date: new Date().toISOString() },
        ...shoppingHistory,
      ]);
      setShoppingList([]);
    }
  };

  // Eliminar historial de compras
  const deleteHistory = async (idx: number) => {
    const item = shoppingHistory[idx];
    if (!item || !item.id) return;
    const { error } = await supabase.from('shopping_list').delete().eq('id', item.id);
    if (!error) {
      setShoppingHistory(shoppingHistory.filter((_, i) => i !== idx));
    }
  };

  // --- END Shopping List State ---

  return (
    <div className="dashboard-container">
      {/* Logo eliminado, restaurado a versión previa */}
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
      {view === 'shopping' && (
        <div className="dashboard-inventory-container">
          <h2 className="dashboard-inventory-title">Lista de Compras</h2>
          {loadingShopping ? (
            <div className="dashboard-inventory-empty">Cargando lista de compras...</div>
          ) : (
            <>
              <div className="dashboard-inventory-list">
                {shoppingList.length === 0 && (
                  <div className="dashboard-inventory-empty">No hay productos por comprar.</div>
                )}
                {shoppingList.map((item, idx) => (
                  <div className="dashboard-inventory-card" key={item.id || idx}>
                    {editShoppingIdx === idx ? (
                      <form className="dashboard-inventory-edit-form" onSubmit={e => saveEditProduct(e, idx)}>
                        <input
                          type="text"
                          value={newProduct.name}
                          onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                          placeholder="Producto"
                          required
                          className="dashboard-inventory-input"
                        />
                        <input
                          type="number"
                          value={newProduct.qty}
                          min={1}
                          onChange={e => setNewProduct({ ...newProduct, qty: Number(e.target.value) })}
                          className="dashboard-inventory-input"
                          style={{ width: 60 }}
                        />
                        <button type="submit" className="dashboard-btn main">Guardar</button>
                        <button type="button" className="dashboard-btn danger" onClick={() => setEditShoppingIdx(-1)}>Cancelar</button>
                      </form>
                    ) : (
                      <>
                        <span className="dashboard-inventory-name">{item.name}</span>
                        <span className="dashboard-inventory-qty">x{item.qty}</span>
                        <div className="dashboard-inventory-actions">
                          {(user.role === 'dueno' || user.role === 'manager') && (
                            <>
                              <button className="dashboard-btn" onClick={() => { setEditShoppingIdx(idx); setNewProduct({ name: item.name, qty: item.qty }); }}>Editar</button>
                              <button className="dashboard-btn danger" onClick={() => deleteProduct(idx)}>Eliminar</button>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <div className="dashboard-inventory-add-row">
                {(user.role === 'empleado' || user.role === 'dueno' || user.role === 'manager') && (
                  <form className="dashboard-inventory-add-form" onSubmit={addProduct}>
                    <input
                      type="text"
                      value={newProduct.name}
                      onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                      placeholder="Producto por comprar"
                      required
                      className="dashboard-inventory-input"
                    />
                    <input
                      type="number"
                      value={newProduct.qty}
                      min={1}
                      onChange={e => setNewProduct({ ...newProduct, qty: Number(e.target.value) })}
                      className="dashboard-inventory-input"
                      style={{ width: 60 }}
                    />
                    <button type="submit" className="dashboard-btn main">Agregar</button>
                  </form>
                )}
              </div>
              {(user.role === 'dueno' || user.role === 'manager') && shoppingList.length > 0 && (
                <button
                  className="dashboard-btn main"
                  style={{ marginTop: 16 }}
                  onClick={completeShopping}
                >
                  Marcar compra como completada
                </button>
              )}
              {(user.role === 'dueno' || user.role === 'manager') && shoppingHistory.length > 0 && (
                <div className="dashboard-inventory-history">
                  <h3>Historial de compras</h3>
                  <div className="dashboard-inventory-list">
                    {shoppingHistory.map((h, idx) => (
                      <div className="dashboard-inventory-card" key={h.id || idx}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                          <span style={{ fontWeight: 600, color: '#2563eb', fontSize: '1.05rem' }}>{h.completed_at ? new Date(h.completed_at).toLocaleString() : ''}</span>
                          <button className="dashboard-btn danger" style={{ fontSize: '0.95rem', padding: '0.2rem 0.7rem' }} onClick={() => deleteHistory(idx)}>Eliminar</button>
                        </div>
                        <ul style={{ margin: '0.5rem 0 0 0.5rem', padding: 0 }}>
                          <li style={{ fontSize: '0.98rem', color: '#23272f' }}>{h.name} x{h.qty}</li>
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
      {view === 'tasks' && <Tasks
        user={user}
        users={users}
        tasks={houses[allowedHouseIdx]?.tasks || []}
        setTasks={(tasks: any[]) => setHouses(houses.map((h, i) => i === allowedHouseIdx ? { ...h, tasks } : h))}
      />}
      {view === 'inventory' && (
        <Inventory
          user={user}
          inventory={houses[allowedHouseIdx]?.inventory || []}
          setInventory={(inventory: any[]) => setHouses(houses.map((h, i) => i === allowedHouseIdx ? { ...h, inventory } : h))}
        />
      )}
      {view === 'calendar' && <Calendar users={users as any} user={user as any} />}
      {view === 'checklist' && <Checklist user={user} />}
      {view === 'reminders' && (
        <div className="dashboard-reminders redesigned-reminders">
          <h2 className="dashboard-reminders-title redesigned-reminders-title">Recordatorios</h2>
          <form className="dashboard-reminders-form redesigned-reminders-form" onSubmit={e => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const name = (form.elements.namedItem('name') as HTMLInputElement).value;
            const due = (form.elements.namedItem('due') as HTMLInputElement).value;
            const bank = (form.elements.namedItem('bank') as HTMLInputElement).value;
            const account = (form.elements.namedItem('account') as HTMLInputElement).value;
            setReminders([...reminders, { name, due, bank, account }]);
            form.reset();
          }}>
            <div className="reminders-form-row">
              <label htmlFor="reminder-name">Nombre del pago</label>
              <input id="reminder-name" name="name" type="text" placeholder="Nombre del pago" required />
              <label htmlFor="reminder-due">Fecha de pago</label>
              <input id="reminder-due" name="due" type="date" required placeholder="Fecha de pago" title="Fecha de pago" />
              <label htmlFor="reminder-bank">Banco</label>
              <input id="reminder-bank" name="bank" type="text" placeholder="Banco" required />
              <label htmlFor="reminder-account">N° de cuenta</label>
              <input id="reminder-account" name="account" type="text" placeholder="N° de cuenta" required />
              <button type="submit" className="dashboard-btn main">Agregar</button>
            </div>
          </form>
          <ul className="dashboard-reminders-list redesigned-reminders-list">
            {reminders.map((r, idx) => (
              <li key={idx} className="dashboard-reminder-item redesigned-reminder-item">
                {editIdx === idx ? (
                  <form className="dashboard-reminders-edit-form redesigned-reminders-edit-form" onSubmit={e => {
                    e.preventDefault();
                    const form = e.target as HTMLFormElement;
                    const name = (form.elements.namedItem('name') as HTMLInputElement).value;
                    const due = (form.elements.namedItem('due') as HTMLInputElement).value;
                    const bank = (form.elements.namedItem('bank') as HTMLInputElement).value;
                    const account = (form.elements.namedItem('account') as HTMLInputElement).value;
                    setReminders(reminders.map((rem, i) => i === idx ? { name, due, bank, account } : rem));
                    setEditIdx(-1);
                  }}>
                    <label htmlFor={`edit-reminder-name-${idx}`}>Nombre del pago</label>
                    <input id={`edit-reminder-name-${idx}`} name="name" type="text" defaultValue={r.name} required />
                    <label htmlFor={`edit-reminder-due-${idx}`}>Fecha de pago</label>
                    <input id={`edit-reminder-due-${idx}`} name="due" type="date" defaultValue={r.due} required placeholder="Fecha de pago" title="Fecha de pago" />
                    <label htmlFor={`edit-reminder-bank-${idx}`}>Banco</label>
                    <input id={`edit-reminder-bank-${idx}`} name="bank" type="text" defaultValue={r.bank} required />
                    <label htmlFor={`edit-reminder-account-${idx}`}>N° de cuenta</label>
                    <input id={`edit-reminder-account-${idx}`} name="account" type="text" defaultValue={r.account} required />
                    <button type="submit" className="dashboard-btn main">Guardar</button>
                    <button type="button" className="dashboard-btn danger" onClick={() => setEditIdx(-1)}>Cancelar</button>
                  </form>
                ) : (
                  <div className="reminder-card">
                    <div className="reminder-card-main">
                      <span className="dashboard-reminder-name">{r.name}</span>
                      <span className="dashboard-reminder-due">{r.due}</span>
                      <span className="dashboard-reminder-bank">{r.bank}</span>
                      <span className="dashboard-reminder-account">{r.account}</span>
                    </div>
                    <div className="reminder-card-actions">
                      <button className="dashboard-btn" onClick={() => setEditIdx(idx)}>Editar</button>
                      <button className="dashboard-btn danger" onClick={() => setReminders(reminders.filter((_, i) => i !== idx))}>Eliminar</button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {view === 'house' && !isEmployee && (
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

