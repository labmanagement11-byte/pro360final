import React, { useState, useEffect } from 'react';
import { FaCalendarAlt, FaUser, FaTasks, FaClock, FaBoxOpen, FaTrash } from 'react-icons/fa';
import { supabase } from '../utils/supabaseClient';
import * as realtimeService from '../utils/supabaseRealtimeService';

const CALENDAR_KEY = 'dashboard_calendar'; // legacy, no longer used

const defaultTypes = [
  'Limpieza profunda',
  'Limpieza regular',
  'Mantenimiento',
];

interface CalendarEvent {
  id?: number;
  house: string;
  date: string;
  type: string;
  employee: string;
  time: string;
  tasks: string;
  inventory: string;
  created_at?: string;
}

interface User {
  username: string;
  role: string;
  house?: string; // Casa asignada (opcional)
}
interface CalendarProps {
  users: User[];
  user: User;
  selectedHouse?: string; // Casa seleccionada para filtrar usuarios
}
const Calendar = ({ users, user, selectedHouse }: CalendarProps) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    date: '',
    type: defaultTypes[0],
    employee: '',
    time: '',
    tasks: '',
    inventory: '',
  });

  // Cargar eventos desde Supabase
  const fetchEvents = async (house: string = 'EPIC D1') => {
    setLoading(true);
    if (!supabase) return;
    const { data, error } = await (supabase as any)
      .from('calendar')
      .select('*')
      .eq('house', house)
      .order('date', { ascending: true });
    if (!error && data) {
      setEvents(data);
    } else {
      setEvents([]);
    }
    setLoading(false);
  };

  // Cargar eventos al montar y suscribirse a cambios en tiempo real
  useEffect(() => {
    const house = selectedHouse || 'EPIC D1';
    fetchEvents(house);

    if (!supabase) return;

    // Suscripción realtime a cambios en calendar
    const channel = supabase
      .channel('calendar-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar' }, (payload: any) => {
        console.log('Cambio en calendar:', payload);
        fetchEvents(house);
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [selectedHouse]);

  const addEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!supabase) return;
    const house = selectedHouse || 'EPIC D1';
    const newAssignment = {
      house,
      date: form.date,
      type: form.type,
      employee: form.employee,
      time: form.time,
      tasks: form.tasks,
      inventory: form.inventory,
      created_at: new Date().toISOString(),
    };
    // Insertar el evento en la tabla calendar_assignments y obtener el id
    const { data: inserted, error } = await (supabase as any).from('calendar_assignments').insert(newAssignment).select();
    let assignmentId = null;
    if (!error && inserted && inserted.length > 0) {
      assignmentId = inserted[0].id;
    }

    // Si hay tareas y empleado, crear checklist e inventario automáticamente
    if (assignmentId && form.tasks && form.employee) {
      try {
        await realtimeService.createCleaningChecklistItems(
          assignmentId,
          form.employee,
          form.type, // tipo de limpieza/mantenimiento
          house
        );
      } catch (err) {
        console.error('❌ Error creando checklist items modernos:', err);
      }
      try {
        await realtimeService.createAssignmentInventory(
          assignmentId,
          form.employee,
          house
        );
      } catch (err) {
        console.error('❌ Error creando inventario para asignación:', err);
      }
    }
    setForm({ date: '', type: defaultTypes[0], employee: '', time: '', tasks: '', inventory: '' });
    // Realtime actualizará automáticamente
  };

  const deleteEvent = async (eventId: number) => {
    if (!supabase) return;
    await (supabase as any).from('calendar').delete().eq('id', eventId);
    // Realtime actualizará automáticamente
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
            {users.filter((u: User) => u.role === 'empleado' && (!selectedHouse || u.house === selectedHouse)).map((u: User) => <option key={u.username} value={u.username}>{u.username}</option>)}
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
        {loading && <div className="calendar-empty">Cargando eventos...</div>}
        {!loading && visibleEvents.length === 0 && <div className="calendar-empty">No hay asignaciones.</div>}
        {!loading && visibleEvents.map((ev: CalendarEvent) => (
          <div key={ev.id} className="calendar-event-card">
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
            {canEdit && <button className="calendar-btn danger" onClick={() => deleteEvent(ev.id!)} title="Eliminar"><FaTrash /></button>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Calendar;
