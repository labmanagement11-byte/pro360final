
import React, { useState, useEffect } from 'react';

const TASKS_KEY = 'dashboard_tasks';

const Tasks = ({ user, users }) => {
  const [tasks, setTasks] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(TASKS_KEY);
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [form, setForm] = useState({ task: '', employee: '' });
  const [editIdx, setEditIdx] = useState(null);
  const [editForm, setEditForm] = useState({ task: '', employee: '' });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
    }
  }, [tasks]);

  // Agregar tarea
  const addTask = (e) => {
    e.preventDefault();
    setTasks([...tasks, { ...form, complete: false }]);
    setForm({ task: '', employee: '' });
  };

  // Editar tarea
  const saveEdit = (e) => {
    e.preventDefault();
    setTasks(tasks.map((t, idx) => idx === editIdx ? { ...editForm, complete: t.complete } : t));
    setEditIdx(null);
    setEditForm({ task: '', employee: '' });
  };

  // Eliminar tarea
  const deleteTask = (idx) => {
    setTasks(tasks.filter((_, i) => i !== idx));
  };

  // Marcar como completa/incompleta (empleado)
  const toggleComplete = (idx) => {
    setTasks(tasks.map((t, i) => i === idx ? { ...t, complete: !t.complete } : t));
  };

  // Reiniciar tareas (manager/dueno)
  const resetTasks = () => {
    setTasks(tasks.map(t => ({ ...t, complete: false })));
  };

  // Filtrar tareas según rol
  const visibleTasks = user.role === 'empleado' ? tasks.filter(t => t.employee === user.username) : tasks;

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
          <button type="submit">{editIdx !== null ? 'Guardar' : 'Agregar Tarea'}</button>
          {editIdx !== null && <button type="button" onClick={() => setEditIdx(null)}>Cancelar</button>}
        </form>
      )}
      <ul className="tasks-list">
        {visibleTasks.length === 0 && <li>No hay tareas asignadas.</li>}
        {visibleTasks.map((t, idx) => (
          <li key={idx} className="tasks-list-item">
            <span className="tasks-task-text">{t.task} <span className="tasks-employee">({t.employee})</span></span>
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
