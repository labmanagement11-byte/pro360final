import React, { useState } from 'react';
import { FaCalendarAlt } from 'react-icons/fa';
import { supabase } from '../utils/supabaseClient';
import * as realtimeService from '../utils/supabaseRealtimeService';

const defaultTypes = [
  'Limpieza profunda',
  'Limpieza regular',
  'Mantenimiento',
];

interface User {
  username: string;
  role: string;
  house?: string;
  password?: string;
}
interface CalendarProps {
  users: User[];
  user: User;
  selectedHouse?: string;
}
const Calendar = ({ users, user, selectedHouse }: CalendarProps) => {
  const [form, setForm] = useState({
    date: '',
    type: defaultTypes[0],
    employee: '',
    time: '',
    tasks: '',
    inventory: '',
  });

  const addEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!supabase) return;
    const house = selectedHouse || 'EPIC D1';

    try {
      await (supabase as any)
        .from('subtask_progress')
        .delete()
        .eq('user_id', form.employee)
        .eq('house_id', house)
        .eq('assignment_type', form.type)
        .eq('assignment_date', form.date);
    } catch (err) {
      console.error('❌ Error eliminando progreso previo de subtareas:', err);
    }

    const newAssignment = {
      house,
      date: form.date,
      type: form.type,
      employee: form.employee,
      time: form.time,
      tasks: form.tasks,
      inventory: form.inventory,
    };

    const insertedAssignment = await realtimeService.createCalendarAssignment(newAssignment);
    let assignmentId = null;

    if (insertedAssignment) {
      assignmentId = insertedAssignment.id;
      console.log('✅ Assignment created with ID:', assignmentId, 'UUID:', insertedAssignment.checklist_uuid);
    }

    if (assignmentId && form.employee && form.type) {
      try {
        await realtimeService.createCleaningChecklistItems(
          assignmentId,
          form.employee,
          form.type,
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
  };

  const canEdit = user.role === 'owner' || user.role === 'manager';

  return (
    <div className="calendar-list">
      <h2 className="calendar-title"><FaCalendarAlt style={{marginRight:8, color:'#0369a1'}}/>Calendario de Asignaciones</h2>
      <p className="calendar-add-only-note">El calendario solo sirve para agregar. Los trabajos asignados se ven en Checklist de limpieza.</p>
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
    </div>
  );
};

export default Calendar;
