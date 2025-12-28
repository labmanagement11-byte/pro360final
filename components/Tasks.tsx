
import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';

const TASKS_KEY = 'dashboard_tasks';

interface Task {
  id?: number; // ID de Supabase (opcional)
  task: string;
  employee: string;
  date?: string;
  time?: string;
  house?: string;
  complete?: boolean;
  reason?: string;
}

interface User {
  username: string;
  role: string;
  house?: string;
}

interface TasksProps {
  user: User;
  users: User[];
  tasks?: Task[];
  setTasks?: (tasks: Task[]) => void;
}

const Tasks: React.FC<TasksProps> = ({ user, users, tasks: externalTasks, setTasks: setExternalTasks }) => {
  const [tasks, setTasksState] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync with external tasks if provided
  useEffect(() => {
    if (externalTasks) setTasksState(externalTasks);
  }, [externalTasks]);

  // Update parent if setTasks provided
  useEffect(() => {
    if (setExternalTasks) setExternalTasks(tasks);
  }, [tasks]);
  // ...existing code...
  const [form, setForm] = useState({ task: '', employee: '', date: '', time: '', house: '' });
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ task: '', employee: '', date: '', time: '', house: '' });

  // Obtener casas desde localStorage (igual que Dashboard)
  const [houses, setHouses] = useState<{ name: string }[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dashboard_houses');
      if (saved) return JSON.parse(saved);
    }
    return [{ name: 'EPIC D1' }];
  });

  // Cargar tareas desde Supabase
  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      const { data, error } = await supabase!
        .from('tasks')
        .select('*')
        .eq('house', user.house || 'EPIC D1');
      if (!error && data) {
        setTasksState(data);
      } else {
        setTasksState([]);
      }
      setLoading(false);
    };
    fetchTasks();
  }, [user.house]);

  // Agregar tarea a Supabase
  const addTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newTask = { ...form, complete: false, house: form.house || user.house || 'EPIC D1' };
    // @ts-expect-error
    const { data, error } = await supabase!.from('tasks').insert([newTask]).select();
    if (!error && data && data.length > 0) {
      setTasksState([...tasks, data[0]]);
      setForm({ task: '', employee: '', date: '', time: '', house: '' });
    }
  };

  // Editar tarea en Supabase
  const saveEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (editIdx === null) return;
    const taskToEdit = tasks[editIdx];
    const updatedTask = { ...taskToEdit, ...editForm };
    const { data, error } = await supabase!
      .from('tasks')
      // @ts-expect-error
      .update({ task: updatedTask.task, employee: updatedTask.employee, date: updatedTask.date, time: updatedTask.time, house: updatedTask.house })
      .eq('id', taskToEdit.id)
      .select();
    if (!error && data && data.length > 0) {
      setTasksState(tasks.map((t, idx) => idx === editIdx ? data[0] : t));
      setEditIdx(null);
      setEditForm({ task: '', employee: '', date: '', time: '', house: '' });
    }
  };

  // Eliminar tarea en Supabase
  const deleteTask = async (idx: number) => {
    const task = tasks[idx];
    if (!task || !task.id) return;
    const { error } = await supabase.from('tasks').delete().eq('id', task.id);
    if (!error) {
      setTasksState(tasks.filter((_, i) => i !== idx));
    }
  };

  // Marcar como completa/incompleta (empleado)
  const toggleComplete = async (idx: number) => {
    const task = tasks[idx];
    if (!task || !task.id) return;
    const { data, error } = await supabase
      .from('tasks')
      .update({ complete: !task.complete })
      .eq('id', task.id)
      .select();
    if (!error && data && data.length > 0) {
      setTasksState(tasks.map((t, i) => i === idx ? data[0] : t));
    }
  };

  // Set reason for incomplete task
  const setReason = async (idx: number, value: string) => {
    const task = tasks[idx];
    if (!task || !task.id) return;
    const { data, error } = await supabase
      .from('tasks')
      .update({ reason: value })
      .eq('id', task.id)
      .select();
    if (!error && data && data.length > 0) {
      setTasksState(tasks.map((t, i) => i === idx ? data[0] : t));
    }
  };

  // Reiniciar tareas (manager/dueno)
  const resetTasks = async () => {
    const ids = tasks.map(t => t.id);
    const { data, error } = await supabase
      .from('tasks')
      .update({ complete: false })
      .in('id', ids);
    if (!error) {
      setTasksState(tasks.map(t => ({ ...t, complete: false })));
    }
  };

  // Filtrar tareas según rol y casa
  const visibleTasks = user.role === 'empleado'
    ? tasks.filter(t => t.employee === user.username && t.house === user.house)
    : tasks;

  return (
    <div>
      <h2>Asignación de Tareas</h2>
      <p>Aquí podrás asignar y ver tareas de los empleados.</p>
      {loading && <p>Cargando tareas...</p>}
      {!loading && (user.role === 'dueno' || user.role === 'manager') && (
        <form onSubmit={editIdx !== null ? saveEdit : addTask} className="tasks-form">
          <input
            type="text"
            placeholder="Tarea"
            value={editIdx !== null ? editForm.task : form.task}
            onChange={e => editIdx !== null ? setEditForm({ ...editForm, task: e.target.value }) : setForm({ ...form, task: e.target.value })}
            required
          />
          <select title="Empleado asignado"
            value={editIdx !== null ? editForm.employee : form.employee}
            onChange={e => editIdx !== null ? setEditForm({ ...editForm, employee: e.target.value }) : setForm({ ...form, employee: e.target.value })}
            required
          >
            <option value="">Empleado</option>
            {users.filter(u => u.role === 'empleado').map(u => <option key={u.username} value={u.username}>{u.username}</option>)}
          </select>
          <select title="Casa asignada"
            value={editIdx !== null ? editForm.house : form.house}
            onChange={e => editIdx !== null ? setEditForm({ ...editForm, house: e.target.value }) : setForm({ ...form, house: e.target.value })}
            required
          >
            <option value="">Casa</option>
            {houses.map((h, idx) => <option key={idx} value={h.name}>{h.name}</option>)}
          </select>
          <input
            type="date"
            placeholder="Fecha"
            value={editIdx !== null ? editForm.date : form.date}
            onChange={e => editIdx !== null ? setEditForm({ ...editForm, date: e.target.value }) : setForm({ ...form, date: e.target.value })}
            required
          />
          <input
            type="time"
            placeholder="Hora"
            value={editIdx !== null ? editForm.time : form.time}
            onChange={e => editIdx !== null ? setEditForm({ ...editForm, time: e.target.value }) : setForm({ ...form, time: e.target.value })}
            required
          />
          <button type="submit">{editIdx !== null ? 'Guardar' : 'Agregar Tarea'}</button>
          {editIdx !== null && <button type="button" onClick={() => setEditIdx(null)}>Cancelar</button>}
        </form>
      )}
      <ul className="tasks-list">
        {!loading && visibleTasks.length === 0 && <li>No hay tareas asignadas.</li>}
        {visibleTasks.map((t, idx) => (
          <li key={idx} className="tasks-list-item">
            <span className="tasks-task-text">{t.task} <span className="tasks-employee">({t.employee})</span> <span className="tasks-date">{t.date} {t.time}</span> <span className="tasks-house">[{t.house}]</span></span>
            {(user.role === 'dueno' || user.role === 'manager') && (
              <>
                <button onClick={() => { setEditIdx(tasks.indexOf(t)); setEditForm({ task: t.task, employee: t.employee, date: t.date || '', time: t.time || '', house: t.house || '' }); }}>Editar</button>
                <button onClick={() => deleteTask(tasks.indexOf(t))} className="tasks-delete-btn">Eliminar</button>
              </>
            )}
            {user.role === 'empleado' && (
              <>
                <label className="tasks-complete-label">
                  <input type="checkbox" checked={!!t.complete} onChange={() => toggleComplete(tasks.indexOf(t))} /> Completada
                </label>
                {!t.complete && (
                  <input
                    type="text"
                    placeholder="Motivo si no completa"
                    value={t.reason || ''}
                    onChange={e => setReason(tasks.indexOf(t), e.target.value)}
                    className="tasks-reason"
                    title="Motivo de no completar"
                  />
                )}
              </>
            )}
            {(user.role === 'dueno' || user.role === 'manager') && t.complete && (
              <span className="tasks-completed-label">Completada</span>
            )}
          </li>
        ))}
      </ul>
      {(user.role === 'dueno' || user.role === 'manager') && visibleTasks.length > 0 && (
        <button onClick={resetTasks} className="tasks-reset-btn">Reiniciar Tareas</button>
      )}
    </div>
  );
};

export default Tasks;
