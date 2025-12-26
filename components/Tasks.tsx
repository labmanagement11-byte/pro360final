
import React, { useState, useEffect } from 'react';

const TASKS_KEY = 'dashboard_tasks';

interface Task {
  task: string;
  employee: string;
  date?: string;
  time?: string;
  house?: string;
  complete?: boolean;
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
  const [tasks, setTasksState] = useState<Task[]>(() => {
    if (externalTasks) return externalTasks;
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(TASKS_KEY);
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
    }
  }, [tasks]);

  // Agregar tarea
  const addTask = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTasksState([...tasks, { ...form, complete: false }]);
    setForm({ task: '', employee: '', date: '', time: '', house: '' });
  };

  // Editar tarea
  const saveEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTasksState(tasks.map((t, idx) => idx === editIdx ? { ...editForm, complete: t.complete } : t));
    setEditIdx(null);
    setEditForm({ task: '', employee: '', date: '', time: '', house: '' });
  };

  // Eliminar tarea
  const deleteTask = (idx: number) => {
    setTasksState(tasks.filter((_, i) => i !== idx));
  };

  // Marcar como completa/incompleta (empleado)
  const toggleComplete = (idx: number) => {
    setTasksState(tasks.map((t, i) => i === idx ? { ...t, complete: !t.complete } : t));
  };

  // Reiniciar tareas (manager/dueno)
  const resetTasks = () => {
    setTasksState(tasks.map(t => ({ ...t, complete: false })));
  };

  // Filtrar tareas según rol y casa
  const visibleTasks = user.role === 'empleado'
    ? tasks.filter(t => t.employee === user.username && t.house === user.house)
    : tasks;

  return (
    <div>
      <h2>Asignación de Tareas</h2>
      <p>Aquí podrás asignar y ver tareas de los empleados.</p>
      {(user.role === 'dueno' || user.role === 'manager') && (
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
        {visibleTasks.length === 0 && <li>No hay tareas asignadas.</li>}
        {visibleTasks.map((t, idx) => (
          <li key={idx} className="tasks-list-item">
            <span className="tasks-task-text">{t.task} <span className="tasks-employee">({t.employee})</span> <span className="tasks-date">{t.date} {t.time}</span> <span className="tasks-house">[{t.house}]</span></span>
            {(user.role === 'dueno' || user.role === 'manager') && (
              <>
                <button onClick={() => { setEditIdx(tasks.indexOf(t)); setEditForm({ task: t.task, employee: t.employee }); }}>Editar</button>
                <button onClick={() => deleteTask(tasks.indexOf(t))} className="tasks-delete-btn">Eliminar</button>
              </>
            )}
            {user.role === 'empleado' && (
              <label className="tasks-complete-label">
                <input type="checkbox" checked={!!t.complete} onChange={() => toggleComplete(tasks.indexOf(t))} /> Completada
              </label>
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
