import React, { useState, useEffect } from 'react';
import { FaCalendarAlt, FaUser, FaTasks, FaClock, FaBoxOpen, FaTrash } from 'react-icons/fa';

const CALENDAR_KEY = 'dashboard_calendar';

const defaultTypes = [
  'Limpieza profunda',
  'Limpieza regular',
  'Mantenimiento',
];


interface User {
  username: string;
  role: string;
}
interface CalendarProps {
  users: User[];
  user: User;
}
const Calendar = ({ users, user }: CalendarProps) => {
  const [events, setEvents] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(CALENDAR_KEY);
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [form, setForm] = useState({
    date: '',
    type: defaultTypes[0],
    employee: '',
    time: '',
    tasks: '',
    inventory: '',
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CALENDAR_KEY, JSON.stringify(events));
    }
  }, [events]);

  const addEvent = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEvents([...events, form]);
    setForm({ date: '', type: defaultTypes[0], employee: '', time: '', tasks: '', inventory: '' });
  };

  const deleteEvent = (idx: number) => {
    setEvents(events.filter((_: any, i: number) => i !== idx));
  };

  // Solo managers y dueños pueden agregar/eliminar
  const canEdit = user.role === 'owner' || user.role === 'manager';
  // Empleados solo ven sus asignaciones
  const visibleEvents = user.role === 'empleado' ? events.filter((ev: any) => ev.employee === user.username) : events;

  return (
    <div className="calendar-list">
      <h2 className="calendar-title"><FaCalendarAlt style={{marginRight:8, color:'#2563eb'}}/>Calendario de Asignaciones</h2>
      {canEdit && (
        <form className="calendar-form" onSubmit={addEvent}>
          <label htmlFor="calendar-date" className="calendar-label">Fecha:</label>
          <input id="calendar-date" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required title="Selecciona la fecha" placeholder="Selecciona la fecha" />
          <label htmlFor="calendar-type" className="calendar-label">Tipo:</label>
          <select id="calendar-type" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} title="Selecciona el tipo de evento">
            {defaultTypes.map((t: string) => <option key={t} value={t}>{t}</option>)}
          </select>
          <label htmlFor="calendar-employee" className="calendar-label">Empleado:</label>
          <select id="calendar-employee" value={form.employee} onChange={e => setForm({ ...form, employee: e.target.value })} required title="Selecciona el empleado">
            <option value="">Empleado</option>
            {users.filter((u: User) => u.role === 'empleado').map((u: User) => <option key={u.username} value={u.username}>{u.username}</option>)}
          </select>
          <label htmlFor="calendar-time" className="calendar-label">Hora:</label>
          <input id="calendar-time" type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} required title="Selecciona la hora" placeholder="Selecciona la hora" />
          <label htmlFor="calendar-tasks" className="calendar-label">Tareas:</label>
          <input id="calendar-tasks" type="text" placeholder="Tareas" value={form.tasks} onChange={e => setForm({ ...form, tasks: e.target.value })} title="Tareas a realizar" />
          <label htmlFor="calendar-inventory" className="calendar-label">Inventario:</label>
          <input id="calendar-inventory" type="text" placeholder="Inventario" value={form.inventory} onChange={e => setForm({ ...form, inventory: e.target.value })} title="Inventario relacionado" />
          <button type="submit" className="calendar-btn main">Agregar</button>
        </form>
      )}
      <div className="calendar-events">
        {visibleEvents.length === 0 && <div className="calendar-empty">No hay asignaciones.</div>}
        {visibleEvents.map((ev: any, idx: number) => (
          <div key={idx} className="calendar-event-card">
            <div className="calendar-event-row">
              <span className="calendar-event-icon"><FaCalendarAlt /></span>
              <span className="calendar-event-date">{ev.date}</span>
              <span className="calendar-event-type">{ev.type}</span>
            </div>
            <div className="calendar-event-row">
              <span className="calendar-event-icon"><FaUser /></span>
              <span className="calendar-event-employee">{ev.employee}</span>
              <span className="calendar-event-icon"><FaClock /></span>
              <span className="calendar-event-time">{ev.time}</span>
            </div>
            <div className="calendar-event-row">
              <span className="calendar-event-icon"><FaTasks /></span>
              <span className="calendar-event-tasks">{ev.tasks}</span>
            </div>
            <div className="calendar-event-row">
              <span className="calendar-event-icon"><FaBoxOpen /></span>
              <span className="calendar-event-inventory">{ev.inventory}</span>
            </div>
            {canEdit && <button className="calendar-btn danger" onClick={() => deleteEvent(events.indexOf(ev))} title="Eliminar"><FaTrash /></button>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Calendar;
