import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';
import { FaHome, FaEdit, FaTrash, FaPlus, FaCheck, FaTimes, FaCalendar, FaClipboard, FaShoppingCart, FaBoxes, FaBell } from 'react-icons/fa';
import './Dashboard.css';
import * as realtimeService from '../utils/supabaseRealtimeService';
import { RealtimeNotificationsManager } from './RealtimeNotification';
import './RealtimeNotification.css';

import Tasks from './Tasks';

// Tarjeta personalizada para tareas asignadas
const AssignedTasksCard = ({ user }: { user: any }) => {
  const [assignedTasks, setAssignedTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[AssignedTasksCard] Usuario:', user);
    console.log('[AssignedTasksCard] Tareas asignadas recibidas:', assignedTasks);
  }, [assignedTasks, user]);

  // Mantener referencia a las suscripciones para limpiar (pueden ser varias)
  const subscriptionRef = useRef<any[]>([]);

  // Cargar tareas y suscribirse en tiempo real
  useEffect(() => {
    let isMounted = true;
    let refreshInterval: NodeJS.Timeout | null = null;
    
    const fetchAssignedTasks = async () => {
      console.log(`📅 [Dashboard] Cargando asignaciones para usuario:`, {
        username: user.username,
        house: user.house,
        house_id: user.house_id
      });
      
      // Query usando columnas correctas (house y employee como texto)
      // Query SIN filtro de employee para ver si el problema es ese
      const { data, error } = await (supabase as any)
        .from('calendar_assignments')
        .select('*')
        .eq('house', user.house || user.house_id)
        .in('type', ['Limpieza', 'Limpieza profunda', 'Limpieza regular', 'Mantenimiento']);
      
      if (error) {
        console.error(`❌ [Dashboard] Error fetching assignments:`, error);
      }
      
      if (isMounted) {
        // Filter by employee on client side
        const filtered = (data || []).filter((a: any) => a.employee === user.username);
        console.log(`✅ [Dashboard] Total asignaciones en casa:`, data?.length, `| Para usuario:`, filtered.length);
        (data || []).forEach((a: any) => {
          console.log(`  - ID:${a.id} | Employee:${a.employee} | Type:${a.type} | Date:${a.date}`);
        });
        setAssignedTasks(filtered || []);
      }
      setLoading(false);
    };
    
    if (user && user.house) {
      fetchAssignedTasks();
      
      // Limpiar suscripciones previas
      if (subscriptionRef.current && subscriptionRef.current.length > 0) {
        subscriptionRef.current.forEach(sub => sub?.unsubscribe && sub.unsubscribe());
        subscriptionRef.current = [];
      }
      
      // Suscribirse a TODOS los cambios en calendar_assignments
      const userHouse = user.house || user.house_id;
      console.log(`🔔 [Dashboard] Suscribiéndose para ${user.username} en casa ${userHouse}`);
      
      const subHouse = realtimeService.subscribeToAllCalendarAssignmentsByHouse(userHouse, (payload: any) => {
        const newAssignment = payload.new;
        const oldAssignment = payload.old;
        
        // Verificar si el cambio es relevante para este usuario
        const isRelevant = 
          newAssignment?.house === userHouse || 
          oldAssignment?.house === userHouse;
        
        if (isRelevant) {
          console.log(`📲 [Dashboard] Cambio detectado en calendario, refrescando tareas...`);
          fetchAssignedTasks();
        }
      });
      subscriptionRef.current = [subHouse].filter(Boolean);
      
      // Agregar un intervalo de refresco cada 5 segundos como fallback
      refreshInterval = setInterval(() => {
        console.log(`🔄 [Dashboard] Refresco automático de asignaciones...`);
        fetchAssignedTasks();
      }, 5000);
    }
    
    return () => {
      isMounted = false;
      if (refreshInterval) clearInterval(refreshInterval);
      if (subscriptionRef.current && subscriptionRef.current.length > 0) {
        subscriptionRef.current.forEach(sub => sub?.unsubscribe && sub.unsubscribe());
        subscriptionRef.current = [];
      }
    };
  }, [user]);

  const markTaskComplete = async (assignmentId: string) => {
    // @ts-ignore
    await supabase.from('calendar_assignments').update({ completed: true }).eq('id', assignmentId);
    setAssignedTasks(tasks => tasks.map(t => t.id === assignmentId ? { ...t, completed: true } : t));
  };

  // Mapas de subtareas por tipo
  // La definición completa de LIMPIEZA_REGULAR está más abajo, se usará esa para todas las subtareas.
  const LIMPIEZA_PROFUNDA = {
    'LIMPIEZA PROFUNDA': [
      'Lavar los forros de los muebles (sofás, sillas y cojines).',
      'Limpiar todas las ventanas y ventanales de la casa, por dentro y por fuera.',
      'Limpiar con hidrolavadora el piso exterior, incluyendo escaleras, terraza y placas vehiculares.',
      'Lavar la caneca grande de basura ubicada debajo de la escalera.',
      'Limpiar las paredes y los guardaescobas de toda la casa.'
    ]
  };
  // La definición completa de MANTENIMIENTO está más abajo, se usará esa para todas las subtareas.

  // Función para obtener subtareas según tipo
  // Estado para progreso de subtareas por tarea
  // Para managers: progreso por tarea y usuario (assignment_id + user_id)
  const [subtaskProgress, setSubtaskProgress] = useState<{ [key: string]: boolean[] }>({});

  // Cargar progreso de subtareas desde Supabase al iniciar
  useEffect(() => {
    if (!user || !user.id || !user.house) return;
    const isManager = user.role && user.role.toLowerCase().includes('manager');
    const fetchProgress = async () => {
      if (!supabase) return;
      let query = (supabase as any)
        .from('subtask_progress')
        .select('assignment_id, user_id, subtasks_progress');
      if (isManager) {
        // Para managers: traer todos los progresos de la casa
        query = query.eq('house_id', user.house_id || user.house);
      } else {
        // Para empleados: solo su propio progreso
        query = query.eq('user_id', user.id);
      }
      const { data, error } = await query;
      if (!error && data) {
        const progressMap: { [key: string]: boolean[] } = {};
        data.forEach((row: any) => {
          const key = isManager ? `${row.assignment_id}_${row.user_id}` : row.assignment_id;
          progressMap[key] = row.subtasks_progress;
        });
        setSubtaskProgress(progressMap);
      }
    };
    fetchProgress();

    // Suscripción realtime a cambios en subtask_progress
    if (!supabase) return;
    const channel = (supabase as any).channel('subtask_progress_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subtask_progress' }, (payload: any) => {
        if (!payload.new) return;
        if (isManager) {
          if (payload.new.house_id === (user.house_id || user.house)) {
            setSubtaskProgress(prev => ({ ...prev, [`${payload.new.assignment_id}_${payload.new.user_id}`]: payload.new.subtasks_progress }));
          }
        } else {
          if (payload.new.user_id === user.id) {
            setSubtaskProgress(prev => ({ ...prev, [payload.new.assignment_id]: payload.new.subtasks_progress }));
          }
        }
      })
      .subscribe();
    return () => {
      if (supabase) supabase.removeChannel(channel);
    };
  }, [user]);

  function getSubtasks(type: string) {
    if (type.toLowerCase().includes('profunda')) return LIMPIEZA_PROFUNDA;
    if (type.toLowerCase().includes('regular')) return LIMPIEZA_REGULAR;
    if (type.toLowerCase().includes('mantenimiento')) {
      // Unir todas las secciones de MANTENIMIENTO en un solo objeto plano (sin duplicados)
      const allSections = Object.keys(MANTENIMIENTO).filter(z => z !== 'RUTINA DE MANTENIMIENTO');
      const result: { [zona: string]: string[] } = {};
      allSections.forEach(zona => {
        result[zona] = MANTENIMIENTO[zona as keyof typeof MANTENIMIENTO];
      });
      return result;
    }
    return null;
  }

  // Guardar progreso de subtareas en Supabase (puedes mejorar esto usando una tabla aparte si lo deseas)
  async function handleSubtaskToggle(taskId: string, idx: number, checked: boolean) {
    setSubtaskProgress(prev => {
      const arr = prev[taskId] ? [...prev[taskId]] : [];
      arr[idx] = checked;
      return { ...prev, [taskId]: arr };
    });
    // Guardar progreso en Supabase
    const current = subtaskProgress[taskId] ? [...subtaskProgress[taskId]] : [];
    current[idx] = checked;
    // Buscar si ya existe registro
    if (!supabase) return;
    const { data: existing, error } = await (supabase as any)
      .from('subtask_progress')
      .select('id')
      .eq('assignment_id', taskId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (existing && existing.id) {
      await (supabase as any)
        .from('subtask_progress')
        .update({ subtasks_progress: current, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await (supabase as any)
        .from('subtask_progress')
        .insert({
          assignment_id: taskId,
          user_id: user.id,
          house_id: user.house_id || null,
          subtasks_progress: current,
          updated_at: new Date().toISOString(),
        });
    }
  }

  // Si el usuario es manager, mostrar todas las tareas de todos los empleados
  const isManager = user.role && user.role.toLowerCase().includes('manager');
  const groupedTasks = isManager
    ? assignedTasks.reduce((acc: any, t: any) => {
        if (!acc[t.employee]) acc[t.employee] = [];
        acc[t.employee].push(t);
        return acc;
      }, {})
    : { [user.username]: assignedTasks };

  return (
    <div className="dashboard-assigned-tasks-modal">
      <h2 style={{ color: '#111827' }}>{isManager ? 'Progreso de Tareas de Empleados' : 'Tareas Asignadas'}</h2>
      {loading ? (
        <p>Cargando tareas...</p>
      ) : Object.keys(groupedTasks).length === 0 ? (
        <div>
          <p>No hay tareas asignadas.</p>
        </div>
      ) : (
        <div className="assigned-tasks-list-modern">
          {Object.entries(groupedTasks).map(([employee, tasks]: any) => (
            <div key={employee} style={{marginBottom: '2rem'}}>
              {isManager && (
                <div style={{fontWeight: 700, color: '#0284c7', fontSize: '1.1rem', marginBottom: '0.5rem'}}>
                  {employee}
                </div>
              )}
              {tasks.map((task: any) => {
                const subtasksMap = getSubtasks(task.type || '');
                const allSubtasks = subtasksMap ? Object.values(subtasksMap).flat() : [];
                // Para managers: clave es assignment_id + user_id
                const progressKey = isManager ? `${task.id}_${task.user_id || task.employee_id || task.employee}` : task.id;
                const progressArr = subtaskProgress[progressKey] || Array(allSubtasks.length).fill(false);
                const completedCount = progressArr.filter(Boolean).length;
                const allComplete = allSubtasks.length > 0 && completedCount === allSubtasks.length;
                const percent = allSubtasks.length > 0 ? Math.round((completedCount / allSubtasks.length) * 100) : 0;
                return (
                  <div key={task.id} className={`assigned-task-card ${allComplete ? 'completed' : 'incomplete'}`} style={{
                    background: allComplete ? '#e0f7e9' : '#fff8e1',
                    border: allComplete ? '2px solid #22c55e' : '2px solid #fbbf24',
                    borderRadius: '12px',
                    marginBottom: '1.2rem',
                    padding: '1.2rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1.5rem',
                    transition: 'background 0.2s, border 0.2s'
                  }}>
                    <div style={{flex: 1}}>
                      <div style={{fontWeight: 600, fontSize: '1.1rem', color: '#0284c7'}}>{task.type}</div>
                      <div style={{fontSize: '1rem', color: '#374151', margin: '0.2rem 0'}}>
                        {task.title || task.description || ''}
                      </div>
                      <div style={{fontSize: '0.95rem', color: '#64748b'}}>
                        Fecha: {task.date} {task.time ? `- ${task.time}` : ''}
                      </div>
                      <div style={{fontSize: '0.95rem', color: '#64748b', marginTop: '0.2rem'}}>
                        Estado: {allComplete ? <span style={{color:'#22c55e', fontWeight:600}}>Completada</span> : <span style={{color:'#f59e42', fontWeight:600}}>Pendiente</span>}
                      </div>
                      {/* Barra de progreso para manager */}
                      {isManager && allSubtasks.length > 0 && (
                        <div style={{margin: '0.7rem 0 0.2rem 0'}}>
                          <div style={{height: '10px', background: '#e5e7eb', borderRadius: '6px', overflow: 'hidden', marginBottom: '0.2rem'}}>
                            <div style={{width: `${percent}%`, height: '100%', background: allComplete ? '#22c55e' : '#fbbf24', transition: 'width 0.3s'}}></div>
                          </div>
                          <span style={{fontSize: '0.95rem', color: allComplete ? '#22c55e' : '#64748b', fontWeight: 500}}>
                            {percent}% completado
                          </span>
                        </div>
                      )}
                      {/* Subtareas con checkboxes (solo para empleados, agrupadas por secciones completas) */}
                      {!isManager && subtasksMap && (
                        <div style={{marginTop: '1rem'}}>
                          <div style={{fontWeight: 500, color: '#0284c7', marginBottom: '0.3rem'}}>Lista de subtareas:</div>
                          {Object.entries(subtasksMap).map(([zona, subtasks], zonaIdx) => (
                            <div key={zona} style={{marginBottom: '0.7rem'}}>
                              <div style={{fontWeight: 600, color: '#374151', fontSize: '1.02rem', marginBottom: '0.2rem'}}>{zona}</div>
                              <ul style={{margin: 0, paddingLeft: '1.2rem'}}>
                                {(subtasks as string[]).map((st, idx) => {
                                  // Calcular el índice global de la subtarea para el array de progreso
                                  const globalIdx = Object.values(subtasksMap).slice(0, zonaIdx).flat().length + idx;
                                  return (
                                    <li key={zona + '-' + idx} style={{color: '#64748b', fontSize: '0.97rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.15rem'}}>
                                      <input type="checkbox" checked={!!progressArr[globalIdx]} onChange={e => handleSubtaskToggle(task.id, globalIdx, e.target.checked)} />
                                      <span style={{textDecoration: progressArr[globalIdx] ? 'line-through' : 'none'}}>{st}</span>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          ))}
                          <div style={{marginTop: '0.7rem', fontWeight: 500, color: allComplete ? '#22c55e' : '#64748b'}}>
                            Progreso: {completedCount} / {allSubtasks.length} subtareas completadas
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      {allComplete ? (
                        <button style={{
                          background: '#22c55e',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '0.7rem 1.2rem',
                          fontWeight: 600,
                          fontSize: '1rem',
                          cursor: 'not-allowed',
                          opacity: 0.7
                        }} disabled>Completada</button>
                      ) : (!isManager && (
                        <button style={{
                          background: '#fbbf24',
                          color: '#222',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '0.7rem 1.2rem',
                          fontWeight: 600,
                          fontSize: '1rem',
                          cursor: 'pointer',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
                        }} onClick={() => markTaskComplete(task.id)}>Marcar como completada</button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
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


// Usuarios por defecto para la casa HYNTIBA2 APTO 406
const defaultUsers: User[] = [
  { username: 'Carlina', password: 'reyes123', role: 'empleado', house: 'HYNTIBA2 APTO 406' },
  { username: 'Victor', password: 'peralta123', role: 'empleado', house: 'HYNTIBA2 APTO 406' },
  { username: 'Alejandra', password: 'vela123', role: 'manager', house: 'HYNTIBA2 APTO 406' },
];

const defaultReminders = [
  { name: 'Luz', due: '2025-12-25' },
  { name: 'Agua', due: '2025-12-28' },
  { name: 'Teléfono', due: '2026-01-02' },
  { name: 'Administración', due: '2026-01-10' },
];

const REMINDERS_KEY = 'dashboard_reminders';
const CHECKLIST_KEY = 'dashboard_checklist';

// Tareas de limpieza organizadas por zona y tipo
const LIMPIEZA_REGULAR = {
  'LIMPIEZA GENERAL': [
    'Barrer y trapear toda la casa.',
    'Quitar el polvo de todas las superficies y decoración usando un trapo húmedo.',
    'Limpiar los televisores cuidadosamente sin dejar marcas en la pantalla.',
    'Revisar zócalos y esquinas para asegurarse de que estén limpios.',
    'Limpiar telaraña'
  ],
  'SALA': [
    'Limpiar todas las superficies.',
    'Mover los cojines del sofá y verificar que no haya suciedad ni hormigas debajo.',
    'Organizar cojines y dejar la sala ordenada.'
  ],
  'COMEDOR': [
    'Limpiar mesa, sillas y superficies.',
    'Asegurarse de que el área quede limpia y ordenada.'
  ],
  'COCINA': [
    'Limpiar superficies, gabinetes por fuera y por dentro.',
    'Verificar que los gabinetes estén limpios y organizados y funcionales.',
    'Limpiar la cafetera y su filtro.',
    'Verificar que el dispensador de jabón de loza esté lleno.',
    'Dejar toallas de cocina limpias y disponibles para los visitantes.',
    'Limpiar microondas por dentro y por fuera.',
    'Limpiar el filtro de agua.',
    'Limpiar la nevera por dentro y por fuera (no dejar alimentos).',
    'Lavar las canecas de basura y colocar bolsas nuevas.'
  ],
  'BAÑOS': [
    'Limpiar ducha (pisos y paredes).',
    'Limpiar divisiones de vidrio y asegurarse de que no queden marcas.',
    'Limpiar espejo, sanitario y lavamanos con Clorox.',
    'Lavar las canecas de basura y colocar bolsas nuevas.',
    'Verificar disponibilidad de toallas (Máximo 10 toallas blancas de cuerpo en toda la casa, Máximo 4 toallas de mano en total).',
    'Dejar un rollo de papel higiénico nuevo instalado en cada baño.',
    'Dejar un rollo extra en el cuarto de lavado.',
    'Lavar y volver a colocar los tapetes de baño.'
  ],
  'HABITACIONES': [
    'Revisar que no haya objetos dentro de los cajones.',
    'Lavar sábanas y hacer las camas correctamente.',
    'Limpiar el polvo de todas las superficies.',
    'Lavar los tapetes de la habitación y volver a colocarlos limpios.'
  ],
  'ZONA DE LAVADO': [
    'Limpiar el filtro de la lavadora en cada lavada.',
    'Limpiar el gabinete debajo del lavadero.',
    'Dejar ganchos de ropa disponibles.',
    'Dejar toallas disponibles para la piscina.'
  ],
  'ÁREA DE BBQ': [
    'Barrer y trapear el área.',
    'Limpiar mesa y superficies.',
    'Limpiar la mini nevera y no dejar ningún alimento dentro.',
    'Limpiar la parrilla con el cepillo (no usar agua).',
    'Retirar las cenizas del carbón.',
    'Dejar toda el área limpia y ordenada.'
  ],
  'ÁREA DE PISCINA': [
    'Barrer y trapear el área.',
    'Organizar los muebles alrededor de la piscina.'
  ],
  'TERRAZA': [
    'Limpiar el piso de la terraza.',
    'Limpiar superficies.',
    'Organizar los cojines de la sala exterior.'
  ]
};

const LIMPIEZA_PROFUNDA = {
  'LIMPIEZA PROFUNDA': [
    'Lavar los forros de los muebles (sofás, sillas y cojines).',
    'Limpiar todas las ventanas y ventanales de la casa, por dentro y por fuera.',
    'Limpiar con hidrolavadora el piso exterior, incluyendo escaleras, terraza y placas vehiculares.',
    'Lavar la caneca grande de basura ubicada debajo de la escalera.',
    'Limpiar las paredes y los guardaescobas de toda la casa.'
  ]
};

const MANTENIMIENTO: { [zona: string]: string[] } = {
  'PISCINA Y AGUA': [
    'Mantener la piscina limpia y en funcionamiento.',
    'Revisar constantemente el cuarto de máquinas para verificar su funcionamiento y detectar posibles filtraciones de agua.'
  ],
  'SISTEMAS ELÉCTRICOS': [
    'Chequear que el generador eléctrico funcione correctamente y tenga diesel suficiente.',
    'Encender la planta eléctrica al menos 2 veces al mes durante mínimo media hora.'
  ],
  'ÁREAS VERDES': [
    'Cortar el césped cada mes y medio a dos meses, y limpiar restos de césped.',
    'Mantenimiento de palmeras: remover hojas secas.',
    'Mantener la matera de la terraza libre de maleza y deshierbar regularmente.',
    'Regar las plantas vivas según necesidad.'
  ],
  'RUTINA DE MANTENIMIENTO': [
    'Mantener la piscina limpia y en funcionamiento.',
    'Revisar constantemente el cuarto de máquinas para verificar su funcionamiento y detectar posibles filtraciones de agua.',
    'Chequear que el generador eléctrico funcione correctamente y tenga diesel suficiente.',
    'Encender la planta eléctrica al menos 2 veces al mes durante mínimo media hora.',
    'Cortar el césped cada mes y medio a dos meses, y limpiar restos de césped.',
    'Mantenimiento de palmeras: remover hojas secas.',
    'Mantener la matera de la terraza libre de maleza y deshierbar regularmente.',
    'Regar las plantas vivas según necesidad.'
  ]
};


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

      // Declarar calendarAssignments y tasksList justo después de la declaración del componente
      const [calendarAssignments, setCalendarAssignments] = useState<any[]>([]);
      const [tasksList, setTasksList] = useState<any[]>([]);

      // Debug global: mostrar datos principales en la pantalla
      useEffect(() => {
        console.log('[Dashboard] Usuario:', user);
        console.log('[Dashboard] CalendarAssignments:', calendarAssignments);
        console.log('[Dashboard] TasksList:', tasksList);
      }, [user, calendarAssignments, tasksList]);
  const [view, setView] = useState('home');
  const [selectedModalCard, setSelectedModalCard] = useState<string | null>(null);
  
  // Estado para recordatorios - AHORA CON SUPABASE
  const [reminders, setReminders] = useState<any[]>([]);
  const [loadingReminders, setLoadingReminders] = useState(true);

  // Estado para asignaciones de calendario - AHORA CON SUPABASE
  const CALENDAR_KEY = 'dashboard_calendar_assignments';
  const [loadingCalendar, setLoadingCalendar] = useState(true);
  const [newAssignment, setNewAssignment] = useState({
    employee: '',
    date: '',
    time: '',
    type: 'Limpieza regular',
  });

  // Estado para tareas en modal - AHORA CON SUPABASE
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assignedTo: '',
    type: 'Limpieza general',
  });
  const [editingTaskIdx, setEditingTaskIdx] = useState(-1);

  // Estado para recordatorios en modal
  const [newReminder, setNewReminder] = useState({
    name: '',
    due: '',
    bank: '',
    account: '',
    invoiceNumber: '',
  });
  const [editingReminderIdx, setEditingReminderIdx] = useState(-1);

  // Estado para inventario en modal - AHORA CON SUPABASE
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [newInventoryItem, setNewInventoryItem] = useState({
    name: '',
    quantity: '',
    location: '',
    complete: true,
    notes: '',
  });
  const [editingInventoryIdx, setEditingInventoryIdx] = useState(-1);

  // Estado para checklist sincronizado en tiempo real por asignación
  const [syncedChecklists, setSyncedChecklists] = useState<Map<string, any[]>>(new Map());
  const [selectedAssignmentForChecklist, setSelectedAssignmentForChecklist] = useState<string | null>(null);
  const [checklistSubscriptions, setChecklistSubscriptions] = useState<Map<string, any>>(new Map());

  // Estado para inventario sincronizado en tiempo real por asignación
  const [syncedInventories, setSyncedInventories] = useState<Map<string, any[]>>(new Map());
  const [selectedAssignmentForInventory, setSelectedAssignmentForInventory] = useState<string | null>(null);
  const [inventorySubscriptions, setInventorySubscriptions] = useState<Map<string, any>>(new Map());

  // Estado para notificaciones en tiempo real
  const [realtimeNotifications, setRealtimeNotifications] = useState<Array<{
    id: string;
    message: string;
    type: 'success' | 'info' | 'warning' | 'error';
  }>>([]);
  const [isRealtimeSyncing, setIsRealtimeSyncing] = useState(true);

  // Función para agregar notificación
  const addRealtimeNotification = (message: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') => {
    const id = `notification-${Date.now()}-${Math.random()}`;
    setRealtimeNotifications(prev => [...prev, { id, message, type }]);
  };

  // Función para remover notificación
  const removeRealtimeNotification = (id: string) => {
    setRealtimeNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Estado para template de inventario (manager edita el template)
  const [inventoryTemplate, setInventoryTemplate] = useState<any[]>([]);
  const [loadingInventoryTemplate, setLoadingInventoryTemplate] = useState(true);
  const [editingTemplateItemId, setEditingTemplateItemId] = useState<string | null>(null);
  const [newTemplateItem, setNewTemplateItem] = useState({
    item_name: '',
    quantity: '',
    category: 'Cocina',
  });

  // Casas y selección de casa
  // IMPORTANTE: Limpiamos localStorage de casas para forzar que cargue desde Supabase
  // Esto garantiza que siempre tenga los nombres correctos, sin nombres antiguos
  const [houses, setHouses] = useState<any[]>(() => {
    // SIEMPRE limpiar localStorage de casas para forzar que cargue desde Supabase con valores correctos
    if (typeof window !== 'undefined') {
      localStorage.removeItem('dashboard_houses');
      localStorage.removeItem('dashboard_selected_house_idx');
      console.log('🧹 localStorage limpiado completamente al iniciar (casas + índice)');
    }
    // Iniciar con las dos casas correctas (para evitar Hydration errors)
    // Estos valores serán reemplazados por getHouses() tan pronto cargue desde Supabase
    return [
      { name: 'EPIC D1', tasks: [], inventory: [], users: [] },
      { name: 'HYNTIBA2 APTO 406', tasks: [], inventory: [], users: [] }
    ];
  });
  // Si el usuario es empleado o manager (no owner), forzar la casa asignada
  const isRestrictedUser = (user.role === 'empleado') || (user.role === 'manager');
  const employeeHouseIdx = (isRestrictedUser && user.house)
    ? houses.findIndex(h => h.name === user.house)
    : -1;

  // LOG: Ver qué está pasando con la búsqueda de casa
  if (isRestrictedUser) {
    console.log(`👤 ${user.username} (${user.role}): buscando user.house="${user.house}" en houses=[${houses.map(h => `"${h.name}"`).join(', ')}], índice encontrado: ${employeeHouseIdx}`);
  }
  
  const [selectedHouseIdx, setSelectedHouseIdx] = useState(() => {
    if (employeeHouseIdx >= 0) return employeeHouseIdx;
    const saved = typeof window !== 'undefined' ? localStorage.getItem('dashboard_selected_house_idx') : null;
    return saved ? parseInt(saved, 10) : 0;
  });
  
  // Guardar casa seleccionada en localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboard_selected_house_idx', selectedHouseIdx.toString());
    }
  }, [selectedHouseIdx]);

  // LIMPIEZA SELECTIVA de localStorage para usuario - SOLO keys de casas
  // No tocamos SESSION_KEY para mantener el usuario logueado
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('🧹 Limpieza selectiva de localStorage para:', user?.username);
      
      // Limpiar SOLO los keys relacionados con casas
      const keysToDelete = ['dashboard_houses', 'dashboard_selected_house_idx'];
      
      keysToDelete.forEach(key => {
        if (localStorage.getItem(key)) {
          console.log(`  Borrando: ${key}`);
          localStorage.removeItem(key);
        }
      });
      
      console.log('✅ Limpieza selectiva completada');
    }
  }, [user?.username]); // Ejecutar cada vez que cambie el usuario
  
  // Guardar casas en localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboard_houses', JSON.stringify(houses));
    }
  }, [houses]);

  // Si es empleado o manager (no jonathan), solo puede ver su casa y no puede cambiarla
  const allowedHouseIdx = isRestrictedUser ? (employeeHouseIdx >= 0 ? employeeHouseIdx : 0) : selectedHouseIdx;
  const [newHouseName, setNewHouseName] = useState('');

  // Estado para checklist
  const [checklistType, setChecklistType] = useState<'regular' | 'profunda' | 'mantenimiento'>('regular');
  const [selectedTaskMaintenance, setSelectedTaskMaintenance] = useState<any>(null); // Para mostrar checklist de tarea específica
  const [taskMaintenanceData, setTaskMaintenanceData] = useState<any>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('dashboard_task_maintenance') : null;
    return saved ? JSON.parse(saved) : {};
  });
  const [checklistData, setChecklistData] = useState<any>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(CHECKLIST_KEY) : null;
    if (saved) {
      const data = JSON.parse(saved);
      // Asegurar que existan todas las zonas de mantenimiento
      Object.keys(MANTENIMIENTO).forEach(zona => {
        if (!data[zona]) {
          data[zona] = {
            type: 'mantenimiento',
            tasks: MANTENIMIENTO[zona as keyof typeof MANTENIMIENTO].map((task: string) => ({
              text: task,
              completed: false
            }))
          };
        }
      });
      return data;
    }
    
    // Inicializar con estructura vacía
    const initial: any = {};
    Object.keys(LIMPIEZA_REGULAR).forEach(zona => {
      initial[zona] = {
        type: 'regular',
        tasks: LIMPIEZA_REGULAR[zona as keyof typeof LIMPIEZA_REGULAR].map((task: string) => ({
          text: task,
          completed: false
        }))
      };
    });
    Object.keys(LIMPIEZA_PROFUNDA).forEach(zona => {
      initial[zona] = {
        type: 'profunda',
        tasks: LIMPIEZA_PROFUNDA[zona as keyof typeof LIMPIEZA_PROFUNDA].map((task: string) => ({
          text: task,
          completed: false
        }))
      };
    });
    Object.keys(MANTENIMIENTO).forEach(zona => {
      initial[zona] = {
        type: 'mantenimiento',
        tasks: MANTENIMIENTO[zona as keyof typeof MANTENIMIENTO].map((task: string) => ({
          text: task,
          completed: false
        }))
      };
    });
    return initial;
  });

  // Cargar tareas desde Supabase con suscripción en tiempo real
  useEffect(() => {
    const selectedHouse = houses[allowedHouseIdx]?.name || 'HYNTIBA2 APTO 406';
    
    const loadTasks = async () => {
      try {
        setLoadingTasks(true);
        const tasks = await realtimeService.getTasks(selectedHouse);
        console.log('✅ Tareas cargadas para', selectedHouse, ':', tasks);
        setTasksList(tasks || []);
        setLoadingTasks(false);
      } catch (error) {
        console.error('❌ Error loading tasks:', error);
        setTasksList([]);
        setLoadingTasks(false);
      }
    };

    loadTasks();

    // Suscribirse a cambios en tiempo real
    let subscription: any;
    try {
      console.log('🔔 Suscribiendo a cambios en tiempo real de tareas para:', selectedHouse);
      subscription = realtimeService.subscribeToTasks(selectedHouse, (payload: any) => {
        console.log('⚡ Evento recibido en tiempo real:', payload);
        if (payload?.eventType === 'INSERT') {
          console.log('➕ Nueva tarea insertada:', payload.new);
          addRealtimeNotification(`Nueva tarea: ${payload.new?.title || 'Sin título'}`, 'info');
          setTasksList(prev => [...prev, payload.new]);
        } else if (payload?.eventType === 'UPDATE') {
          console.log('✏️ Tarea actualizada:', payload.new);
          addRealtimeNotification(`Tarea actualizada: ${payload.new?.title || 'Sin título'}`, 'info');
          setTasksList(prev => prev.map(t => t.id === payload.new?.id ? payload.new : t));
        } else if (payload?.eventType === 'DELETE') {
          console.log('🗑️ Tarea eliminada:', payload.old);
          addRealtimeNotification('Tarea eliminada', 'warning');
          setTasksList(prev => prev.filter(t => t.id !== payload.old?.id));
        }
      });
      console.log('✅ Suscripción activa:', subscription);
    } catch (error) {
      console.error('❌ Error subscribing to tasks:', error);
    }

    return () => {
      try {
        console.log('🔌 Desconectando suscripción de tareas...');
        if (subscription) {
          supabase?.removeChannel(subscription);
        }
      } catch (error) {
        console.error('❌ Error unsubscribing from tasks:', error);
      }
    };
  }, [allowedHouseIdx, houses]);

  // Cargar inventario desde Supabase con suscripción en tiempo real
  useEffect(() => {
    const selectedHouse = houses[allowedHouseIdx]?.name || 'HYNTIBA2 APTO 406';
    
    const loadInventory = async () => {
      try {
        setLoadingInventory(true);
        const items = await realtimeService.getInventoryItems(selectedHouse);
        setInventoryList(items || []);
        setLoadingInventory(false);
      } catch (error) {
        console.error('Error loading inventory:', error);
        setInventoryList([]);
        setLoadingInventory(false);
      }
    };

    loadInventory();

    // Suscribirse a cambios en tiempo real
    let subscription: any;
    try {
      subscription = realtimeService.subscribeToInventory(selectedHouse, (payload: any) => {
        if (payload?.eventType === 'INSERT') {
          addRealtimeNotification(`Nuevo item: ${payload.new?.item || 'Sin nombre'}`, 'info');
          setInventoryList(prev => [...prev, payload.new]);
        } else if (payload?.eventType === 'UPDATE') {
          addRealtimeNotification(`Item actualizado: ${payload.new?.item || 'Sin nombre'}`, 'info');
          setInventoryList(prev => prev.map(i => i.id === payload.new?.id ? payload.new : i));
        } else if (payload?.eventType === 'DELETE') {
          addRealtimeNotification('Item eliminado del inventario', 'warning');
          setInventoryList(prev => prev.filter(i => i.id !== payload.old?.id));
        }
      });
    } catch (error) {
      console.error('Error subscribing to inventory:', error);
    }

    return () => {
      try {
        if (subscription) {
          supabase?.removeChannel(subscription);
        }
      } catch (error) {
        console.error('Error unsubscribing from inventory:', error);
      }
    };
  }, [allowedHouseIdx, houses]);

  // Cargar recordatorios desde Supabase con suscripción en tiempo real
  useEffect(() => {
    const selectedHouse = houses[allowedHouseIdx]?.name || 'HYNTIBA2 APTO 406';
    
    const loadReminders = async () => {
      try {
        setLoadingReminders(true);
        const items = await realtimeService.getReminders(selectedHouse);
        console.log('✅ Recordatorios cargados para', selectedHouse, ':', items);
        setReminders(items || []);
        setLoadingReminders(false);
      } catch (error) {
        console.error('❌ Error loading reminders:', error);
        setReminders([]);
        setLoadingReminders(false);
      }
    };

    loadReminders();

    // Suscribirse a cambios en tiempo real
    let subscription: any;
    try {
      console.log('🔔 Suscribiendo a cambios en tiempo real de recordatorios para:', selectedHouse);
      subscription = realtimeService.subscribeToReminders(selectedHouse, (payload: any) => {
        console.log('⚡ Evento de recordatorios recibido:', payload);
        if (payload?.eventType === 'INSERT') {
          console.log('➕ Nuevo recordatorio insertado:', payload.new);
          addRealtimeNotification(`Nuevo recordatorio: ${payload.new?.title || 'Sin título'}`, 'info');
          setReminders(prev => [...prev, payload.new]);
        } else if (payload?.eventType === 'UPDATE') {
          console.log('✏️ Recordatorio actualizado:', payload.new);
          addRealtimeNotification('Recordatorio actualizado', 'info');
          setReminders(prev => prev.map(r => r.id === payload.new?.id ? payload.new : r));
        } else if (payload?.eventType === 'DELETE') {
          console.log('🗑️ Recordatorio eliminado:', payload.old);
          addRealtimeNotification('Recordatorio eliminado', 'warning');
          setReminders(prev => prev.filter(r => r.id !== payload.old?.id));
        }
      });
      console.log('✅ Suscripción activa:', subscription);
    } catch (error) {
      console.error('❌ Error subscribing to reminders:', error);
    }

    return () => {
      try {
        console.log('🔌 Desconectando suscripción de recordatorios...');
        if (subscription) {
          supabase?.removeChannel(subscription);
        }
      } catch (error) {
        console.error('❌ Error unsubscribing from reminders:', error);
      }
    };
  }, [allowedHouseIdx, houses]);

  // Cargar casas y usuarios desde Supabase con suscripción en tiempo real (para todos, especialmente para sincronizar nombres correctos)
  useEffect(() => {
    const loadHousesAndUsers = async () => {
      try {
        // Cargar casas (para TODOS los usuarios, para sincronizar nombres correctos)
        const housesData = await realtimeService.getHouses();
        console.log('🏠 [getHouses] Datos crudos de Supabase:', JSON.stringify(housesData, null, 2));
        
        if (housesData.length > 0) {
          const mappedHouses = housesData.map((h: any) => ({ 
            name: h.name, 
            id: h.id, 
            houseName: h.name, 
            tasks: [], 
            inventory: [], 
            users: [] 
          }));
          console.log('🏠 [mapeo] Casas después de mapear:', JSON.stringify(mappedHouses, null, 2));
          console.log('🏠 [setHouses] Estableciendo state con:', mappedHouses.map((h: any) => h.name));
          setHouses(mappedHouses);
          
          // Guardar en localStorage con los nombres correctos de Supabase
          if (typeof window !== 'undefined') {
            const toSave = JSON.stringify(mappedHouses);
            console.log('💾 [localStorage.setItem] Guardando:', toSave);
            localStorage.setItem('dashboard_houses', toSave);
          }
        }

        // Cargar usuarios para owners
        if (user.role === 'owner') {
          const usersData = await realtimeService.getUsers();
          console.log('👥 Usuarios cargados:', usersData);
        }
      } catch (error) {
        console.error('❌ Error loading houses/users:', error);
      }
    };

    loadHousesAndUsers();

    // Suscribirse a cambios en tiempo real de casas y usuarios
    let housesSubscription: any;
    let usersSubscription: any;
    try {
      housesSubscription = realtimeService.subscribeToHouses((housesArray: any) => {
        console.log('🏠 [realtime] Casas actualizadas:', housesArray);
        // subscribeToHouses ahora devuelve el array completo de casas
        if (Array.isArray(housesArray) && housesArray.length > 0) {
          const mappedHouses = housesArray.map((h: any) => ({ 
            name: h.name, 
            id: h.id, 
            houseName: h.name, 
            tasks: [], 
            inventory: [], 
            users: [] 
          }));
          console.log('🏠 [realtime.mapeo] Casas mapeadas desde realtime:', mappedHouses);
          setHouses(mappedHouses);
          // Guardar en localStorage con los nombres correctos
          if (typeof window !== 'undefined') {
            localStorage.setItem('dashboard_houses', JSON.stringify(mappedHouses));
          }
        }
      });

      usersSubscription = realtimeService.subscribeToUsers((usersArray: any) => {
        console.log('👥 Usuarios actualizados (realtime):', usersArray);
        // Los usuarios se actualizan a través de los props desde el componente padre
      });
    } catch (error) {
      console.error('Error subscribing to houses/users:', error);
    }

    return () => {
      try {
        if (housesSubscription) supabase?.removeChannel(housesSubscription);
        if (usersSubscription) supabase?.removeChannel(usersSubscription);
      } catch (error) {
        console.error('Error unsubscribing:', error);
      }
    };
  }, [user.username]);

  // Cargar y sincronizar checklist cuando se selecciona una asignación
  useEffect(() => {
    if (!selectedAssignmentForChecklist) return;
    
    const loadChecklist = async () => {
      try {
        console.log('🧹 Cargando checklist para asignación:', selectedAssignmentForChecklist);
        const items = await realtimeService.getCleaningChecklistItems(selectedAssignmentForChecklist);
        console.log('✅ Checklist cargado:', items);
        setSyncedChecklists(prev => new Map(prev).set(selectedAssignmentForChecklist, items));
      } catch (error) {
        console.error('❌ Error loading checklist:', error);
      }
    };
    
    loadChecklist();
    
    // Suscribirse a cambios en tiempo real
    let subscription: any;
    try {
      console.log('🔔 Suscribiendo a cambios del checklist en tiempo real...');
      subscription = realtimeService.subscribeToChecklist(
        selectedAssignmentForChecklist,
        (payload: any) => {
          console.log('⚡ Evento de checklist recibido:', payload);
          
          if (payload?.eventType === 'INSERT') {
            console.log('➕ Nuevo item de checklist:', payload.new);
            setSyncedChecklists(prev => {
              const newMap = new Map(prev);
              const items = newMap.get(selectedAssignmentForChecklist) || [];
              newMap.set(selectedAssignmentForChecklist, [...items, payload.new]);
              return newMap;
            });
          } else if (payload?.eventType === 'UPDATE') {
            console.log('📝 Item de checklist actualizado:', payload.new);
            setSyncedChecklists(prev => {
              const newMap = new Map(prev);
              const items = newMap.get(selectedAssignmentForChecklist) || [];
              newMap.set(
                selectedAssignmentForChecklist,
                items.map(item => item.id === payload.new.id ? payload.new : item)
              );
              return newMap;
            });
          }
        }
      );
      
      if (subscription) {
        console.log('✅ Suscripción de checklist activa:', subscription);
        setChecklistSubscriptions(prev => new Map(prev).set(selectedAssignmentForChecklist, subscription));
      }
    } catch (error) {
      console.error('❌ Error subscribing to checklist:', error);
    }
    
    return () => {
      try {
        console.log('🔌 Desconectando suscripción de checklist...');
        const sub = checklistSubscriptions.get(selectedAssignmentForChecklist);
        if (sub) {
          supabase?.removeChannel(sub);
          setChecklistSubscriptions(prev => {
            const newMap = new Map(prev);
            newMap.delete(selectedAssignmentForChecklist);
            return newMap;
          });
        }
      } catch (error) {
        console.error('❌ Error unsubscribing from checklist:', error);
      }
    };
  }, [selectedAssignmentForChecklist]);

  // useEffect para cargar inventario cuando se selecciona una asignación
  useEffect(() => {
    if (!selectedAssignmentForInventory) return;
    
    const loadInventory = async () => {
      try {
        console.log('📦 Cargando inventario para asignación:', selectedAssignmentForInventory);
        const items = await realtimeService.getAssignmentInventory(selectedAssignmentForInventory);
        console.log('✅ Inventario cargado:', items);
        setSyncedInventories(prev => new Map(prev).set(selectedAssignmentForInventory, items));
      } catch (error) {
        console.error('❌ Error loading inventory:', error);
      }
    };
    
    loadInventory();
    
    // Suscribirse a cambios en tiempo real
    let subscription: any;
    try {
      console.log('🔔 Suscribiendo a cambios del inventario en tiempo real...');
      subscription = realtimeService.subscribeToAssignmentInventory(
        selectedAssignmentForInventory,
        (payload: any) => {
          console.log('⚡ Evento de inventario recibido:', payload);
          
          if (payload?.eventType === 'INSERT') {
            console.log('➕ Nuevo item de inventario:', payload.new);
            setSyncedInventories(prev => {
              const newMap = new Map(prev);
              const items = newMap.get(selectedAssignmentForInventory) || [];
              newMap.set(selectedAssignmentForInventory, [...items, payload.new]);
              return newMap;
            });
          } else if (payload?.eventType === 'UPDATE') {
            console.log('📝 Item de inventario actualizado:', payload.new);
            setSyncedInventories(prev => {
              const newMap = new Map(prev);
              const items = newMap.get(selectedAssignmentForInventory) || [];
              newMap.set(
                selectedAssignmentForInventory,
                items.map(item => item.id === payload.new.id ? payload.new : item)
              );
              return newMap;
            });
          }
        }
      );
      
      if (subscription) {
        console.log('✅ Suscripción de inventario activa:', subscription);
        setInventorySubscriptions(prev => new Map(prev).set(selectedAssignmentForInventory, subscription));
      }
    } catch (error) {
      console.error('❌ Error subscribing to inventory:', error);
    }
    
    return () => {
      try {
        console.log('🔌 Desconectando suscripción de inventario...');
        const sub = inventorySubscriptions.get(selectedAssignmentForInventory);
        if (sub) {
          supabase?.removeChannel(sub);
          setInventorySubscriptions(prev => {
            const newMap = new Map(prev);
            newMap.delete(selectedAssignmentForInventory);
            return newMap;
          });
        }
      } catch (error) {
        console.error('❌ Error unsubscribing from inventory:', error);
      }
    };
  }, [selectedAssignmentForInventory]);

  // useEffect para cargar template de inventario cuando se abre el modal
  useEffect(() => {
    if (selectedModalCard !== 'inventory') return;
    
    const selectedHouse = houses[allowedHouseIdx]?.name || 'EPIC D1';
    
    const loadTemplate = async () => {
      try {
        setLoadingInventoryTemplate(true);
        const template = await realtimeService.getInventoryTemplate(selectedHouse);
        setInventoryTemplate(template);
        setLoadingInventoryTemplate(false);
      } catch (error) {
        console.error('Error loading inventory template:', error);
        setLoadingInventoryTemplate(false);
      }
    };
    
    loadTemplate();
    
    // Suscribirse a cambios en el template
    const subscription = realtimeService.subscribeToInventoryTemplate(selectedHouse, (payload: any) => {
      if (payload.eventType === 'INSERT') {
        setInventoryTemplate(prev => [...prev, payload.new]);
      } else if (payload.eventType === 'UPDATE') {
        setInventoryTemplate(prev => prev.map(item => item.id === payload.new.id ? payload.new : item));
      } else if (payload.eventType === 'DELETE') {
        setInventoryTemplate(prev => prev.filter(item => item.id !== payload.old.id));
      }
    });
    
    return () => {
      if (subscription) {
        supabase?.removeChannel(subscription);
      }
    };
  }, [selectedModalCard, allowedHouseIdx, houses]);

  // Cargar checklist desde Supabase y sincronizar en tiempo real
  useEffect(() => {
    if (!houses.length || selectedHouseIdx === -1) return;

    const selectedHouse = houses[selectedHouseIdx];
    const houseName = selectedHouse?.houseName || selectedHouse?.name;
    if (!houseName) return;

    const loadChecklistFromSupabase = async () => {
      try {
        console.log(`📋 Cargando checklist desde Supabase para: ${houseName}`);
        const { data, error } = await (supabase as any)
          .from('checklist')
          .select('*')
          .eq('house', houseName);
        
        if (error) {
          console.error('❌ Error cargando checklist:', error);
          return;
        }

        // Transformar datos de Supabase al formato esperado
        const checklistByZona: any = {};
        
        // Inicializar con zonas predefinidas
        Object.keys(LIMPIEZA_REGULAR).forEach(zona => {
          checklistByZona[zona] = {
            type: 'regular',
            tasks: LIMPIEZA_REGULAR[zona as keyof typeof LIMPIEZA_REGULAR].map((task: string) => ({
              text: task,
              completed: false
            }))
          };
        });
        Object.keys(LIMPIEZA_PROFUNDA).forEach(zona => {
          checklistByZona[zona] = {
            type: 'profunda',
            tasks: LIMPIEZA_PROFUNDA[zona as keyof typeof LIMPIEZA_PROFUNDA].map((task: string) => ({
              text: task,
              completed: false
            }))
          };
        });
        Object.keys(MANTENIMIENTO).forEach(zona => {
          checklistByZona[zona] = {
            type: 'mantenimiento',
            tasks: MANTENIMIENTO[zona as keyof typeof MANTENIMIENTO].map((task: string) => ({
              text: task,
              completed: false
            }))
          };
        });

        // Agregar/actualizar tareas de Supabase
        if (data && data.length > 0) {
          data.forEach((item: any) => {
            const zona = item.room || 'Sin asignar';
            if (!checklistByZona[zona]) {
              checklistByZona[zona] = {
                type: item.type || 'custom',
                tasks: []
              };
            }
            
            // Buscar si ya existe esta tarea en la zona
            const existingTaskIdx = checklistByZona[zona].tasks.findIndex((t: any) => 
              t.text === item.item && !t.id
            );
            
            if (existingTaskIdx >= 0) {
              // Actualizar tarea existente con info de Supabase
              checklistByZona[zona].tasks[existingTaskIdx] = {
                ...checklistByZona[zona].tasks[existingTaskIdx],
                completed: item.complete || false,
                id: item.id
              };
            } else {
              // Agregar nueva tarea de Supabase
              checklistByZona[zona].tasks.push({
                text: item.item,
                completed: item.complete || false,
                id: item.id
              });
            }
          });
          console.log(`✅ Checklist cargado de Supabase para ${houseName}:`, checklistByZona);
        }
        
        setChecklistData(checklistByZona);
      } catch (error) {
        console.error('❌ Error en loadChecklistFromSupabase:', error);
      }
    };

    loadChecklistFromSupabase();

    // Suscribirse a cambios en tiempo real del checklist
    let checklistSubscription: any;
    try {
      console.log(`🔔 Suscribiendo a cambios de checklist para: ${houseName}`);
      checklistSubscription = (supabase as any)
        .channel(`checklist-realtime-${houseName}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'checklist',
            filter: `house=eq.${houseName}`
          },
          async (payload: any) => {
            console.log(`⚡ Cambio en checklist recibido (${payload.eventType}):`, payload);
            // Recargar el checklist completo para mantener sincronizado
            await loadChecklistFromSupabase();
          }
        )
        .subscribe((status: any) => {
          console.log(`📡 Estado de suscripción checklist (${houseName}):`, status);
        });
    } catch (error) {
      console.error('❌ Error suscribiendo a cambios de checklist:', error);
    }

    return () => {
      if (checklistSubscription) {
        supabase?.removeChannel(checklistSubscription);
        console.log('❌ Suscripción de checklist removida');
      }
    };
  }, [houses, selectedHouseIdx]);

  // Guardar checklist en localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CHECKLIST_KEY, JSON.stringify(checklistData));
    }
  }, [checklistData]);

  // Guardar mantenimiento de tareas en localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboard_task_maintenance', JSON.stringify(taskMaintenanceData));
    }
  }, [taskMaintenanceData]);

  const showReminders = user.role === 'owner' || user.role === 'manager';

  // Estado para casas dinámicas y usuarios sincronizados
  // Ensure all users have a username string
  useEffect(() => {
    if (users) {
      users.forEach(u => { if (!u.username) u.username = ''; });
    }
  }, [users]);

  const extraTasksForUser = tasksList.filter(t => t.assignedTo === user.username && t.type === 'Tarea extra' && !t.completed);
  
  // Debug: mostrar tareas que se cargan y el filtro
  useEffect(() => {
    console.log('👤 Usuario actual:', user.username);
    console.log('📋 Todas las tareas cargadas:', tasksList);
    console.log('🟦 Tareas extra para este usuario:', extraTasksForUser);
  }, [tasksList, user.username]);

  // Cargar tareas de la casa seleccionada
  useEffect(() => {
    if (!houses.length || selectedHouseIdx === -1) return;

    const selectedHouse = houses[selectedHouseIdx];
    const houseName = selectedHouse?.houseName || selectedHouse?.name;
    if (!houseName) return;

    const loadTasks = async () => {
      try {
        setLoadingTasks(true);
        console.log(`📋 Cargando tareas para casa: ${houseName}`);
        const tasks = await realtimeService.getTasks(houseName);
        console.log(`✅ Tareas cargadas para ${houseName}:`, tasks);
        setTasksList(tasks || []);
      } catch (error) {
        console.error(`❌ Error cargando tareas para ${houseName}:`, error);
        setTasksList([]);
      } finally {
        setLoadingTasks(false);
      }
    };

    loadTasks();

    // Suscribirse a cambios en tiempo real de tareas
    let tasksSubscription: any;
    try {
      tasksSubscription = realtimeService.subscribeToTasks(houseName, (tasks: any) => {
        console.log(`⚡ Tareas actualizadas (realtime) para ${houseName}:`, tasks);
        setTasksList(tasks || []);
      });
    } catch (error) {
      console.error(`❌ Error suscribiendo a tareas para ${houseName}:`, error);
    }

    return () => {
      try {
        if (tasksSubscription) supabase?.removeChannel(tasksSubscription);
      } catch (error) {
        console.error('Error unsubscribing from tasks:', error);
      }
    };
  }, [houses, selectedHouseIdx]);

  // Cargar inventario de la casa seleccionada
  useEffect(() => {
    if (!houses.length || selectedHouseIdx === -1) return;

    const selectedHouse = houses[selectedHouseIdx];
    const houseName = selectedHouse?.houseName || selectedHouse?.name;
    if (!houseName) return;

    const loadInventory = async () => {
      try {
        setLoadingInventory(true);
        console.log(`📦 Cargando inventario para casa: ${houseName}`);
        const inventory = await realtimeService.getInventoryItems(houseName);
        console.log(`✅ Inventario cargado para ${houseName}:`, inventory);
        setInventoryList(inventory || []);
      } catch (error) {
        console.error(`❌ Error cargando inventario para ${houseName}:`, error);
        setInventoryList([]);
      } finally {
        setLoadingInventory(false);
      }
    };

    loadInventory();

    // Suscribirse a cambios en tiempo real de inventario
    let inventorySubscription: any;
    try {
      inventorySubscription = realtimeService.subscribeToInventory(houseName, (inventory: any) => {
        console.log(`⚡ Inventario actualizado (realtime) para ${houseName}:`, inventory);
        setInventoryList(inventory || []);
      });
    } catch (error) {
      console.error(`❌ Error suscribiendo a inventario para ${houseName}:`, error);
    }

    return () => {
      try {
        if (inventorySubscription) supabase?.removeChannel(inventorySubscription);
      } catch (error) {
        console.error('Error unsubscribing from inventory:', error);
      }
    };
  }, [houses, selectedHouseIdx]);

  const cards = [
    {
      key: 'tasks',
      title: 'Asignar Tareas',
      desc: 'Gestiona y asigna tareas a empleados.',
      show: user.role !== 'empleado',
    },
    {
      key: 'extraTasks',
      title: 'Tareas Extra',
      desc: 'Tareas adicionales asignadas al empleado.',
      show: user.role === 'empleado' && extraTasksForUser.length > 0,
    },
    {
      key: 'checklist',
      title: 'Checklist Limpieza',
      desc: 'Verifica y gestiona la limpieza y mantenimiento.',
      show: user.role === 'owner' || user.role === 'manager',
    },
    {
      key: 'inventory',
      title: 'Inventario',
      desc: 'Controla y revisa el inventario de la propiedad.',
      show: user.role === 'owner' || user.role === 'manager', // Solo manager/owner pueden editar template
    },
    {
      key: 'shopping',
      title: 'Lista de Compras',
      desc: 'Agrega productos por comprar y gestiona compras realizadas.',
      show: user.role === 'owner' || user.role === 'manager' || user.role === 'empleado',
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
      show: user.role === 'owner' || user.role === 'manager',
    },
    // Mostrar selector de casa para todos los owners
    {
      key: 'house',
      title: 'Seleccionar Casa',
      desc: 'Elige y administra la casa actual.',
      show: user.role === 'owner',
    },
    {
      key: 'users',
      title: 'Usuarios',
      desc: 'Administra roles: dueño, manager, empleado.',
      show: user.role === 'owner',
    },
  ];

  // --- Shopping List State ---
  // --- Shopping List State (Supabase) ---
  const [shoppingList, setShoppingList] = useState<any[]>([]);  // Items pendientes
  const [shoppingHistory, setShoppingHistory] = useState<any[]>([]);  // Items comprados
  const [loadingShopping, setLoadingShopping] = useState(true);
  const [newShoppingItem, setNewShoppingItem] = useState({
    item_name: '',
    quantity: '',
    category: 'General'
  });

  // Cargar lista de compras desde Supabase
  useEffect(() => {
    const selectedHouse = houses[allowedHouseIdx]?.name || 'EPIC D1';
    const loadShopping = async () => {
      setLoadingShopping(true);
      const pending = await realtimeService.getShoppingList(selectedHouse, false);
      const purchased = await realtimeService.getShoppingList(selectedHouse, true);
      setShoppingList(pending);
      setShoppingHistory(purchased.filter((i: any) => i.is_purchased));
      setLoadingShopping(false);
    };
    loadShopping();
    
    // Suscribirse a cambios en tiempo real
    const subscription = realtimeService.subscribeToShoppingList(selectedHouse, (payload: any) => {
      if (payload.eventType === 'INSERT') {
        if (!payload.new.is_purchased) {
          addRealtimeNotification(`Nuevo item en lista: ${payload.new.item_name}`, 'info');
          setShoppingList(prev => [payload.new, ...prev]);
        }
      } else if (payload.eventType === 'UPDATE') {
        if (payload.new.is_purchased) {
          // Movido a comprado
          addRealtimeNotification(`Item comprado: ${payload.new.item_name}`, 'success');
          setShoppingList(prev => prev.filter(i => i.id !== payload.new.id));
          setShoppingHistory(prev => [payload.new, ...prev]);
        } else {
          addRealtimeNotification('Item de compras actualizado', 'info');
          // Actualizado
          setShoppingList(prev => prev.map(i => i.id === payload.new.id ? payload.new : i));
        }
      } else if (payload.eventType === 'DELETE') {
        addRealtimeNotification('Item eliminado de la lista', 'warning');
        setShoppingList(prev => prev.filter(i => i.id !== payload.old.id));
        setShoppingHistory(prev => prev.filter(i => i.id !== payload.old.id));
      }
    });
    
    return () => {
      if (subscription) {
        supabase?.removeChannel(subscription);
      }
    };
  }, [allowedHouseIdx, houses]);

  // Agregar producto (actualizado para realtime)
  const addShoppingItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newShoppingItem.item_name.trim()) return;
    const selectedHouse = houses[allowedHouseIdx]?.name || 'HYNTIBA2 APTO 406';
    await realtimeService.addShoppingListItem({
      item_name: newShoppingItem.item_name,
      quantity: newShoppingItem.quantity,
      category: newShoppingItem.category,
      added_by: user.username
    }, selectedHouse);
    setNewShoppingItem({ item_name: '', quantity: '', category: 'General' });
  };

  // --- END Shopping List State ---

  // Cargar asignaciones de calendario desde Supabase con suscripción en tiempo real
  useEffect(() => {
    if (!houses.length || selectedHouseIdx === -1) return;

    const selectedHouse = houses[selectedHouseIdx];
    const houseName = selectedHouse?.houseName || selectedHouse?.name;
    if (!houseName) return;

    const loadCalendarAssignments = async () => {
      try {
        setLoadingCalendar(true);
        console.log('📅 Cargando asignaciones de calendario...');
        console.log('👤 Usuario:', { role: user.role, username: user.username });
        console.log('🏠 Casa:', houseName);
        
        // Si es empleado, cargar solo sus asignaciones de su casa
        const assignments = user.role === 'empleado' 
          ? await realtimeService.getCalendarAssignments(houseName, user.username)
          : await realtimeService.getCalendarAssignments(houseName);
        
        console.log('✅ Asignaciones cargadas:', assignments);
        setCalendarAssignments(assignments || []);
        setLoadingCalendar(false);
      } catch (error) {
        console.error('❌ Error loading calendar assignments:', error);
        setCalendarAssignments([]);
        setLoadingCalendar(false);
      }
    };

    loadCalendarAssignments();

    // Suscribirse a cambios en tiempo real
    let subscription: any;
    try {
      console.log('🔔 Suscribiendo a cambios de calendario en tiempo real...');
      console.log('🏠 House:', houseName);
      if (user.role === 'empleado') {
        console.log('👤 Empleado:', user.username, '- Solo verá sus propias asignaciones');
      }
      
      if (user.role === 'empleado' && user.id !== undefined) {
        subscription = realtimeService.subscribeToCalendarAssignments(
          String(user.id),
          (payload: any) => {
            console.log('⚡ Evento de calendario recibido:', payload);
            if (payload?.eventType === 'INSERT') {
              setCalendarAssignments(prev => [...prev, payload.new]);
            } else if (payload?.eventType === 'UPDATE') {
              setCalendarAssignments(prev => prev.map(a => a.id === payload.new?.id ? payload.new : a));
            } else if (payload?.eventType === 'DELETE') {
              setCalendarAssignments(prev => prev.filter(a => a.id !== payload.old?.id));
            }
          }
        );
      } else {
        // Si es manager/owner, puedes suscribirte a todos o implementar lógica similar si lo deseas
      }
      
      console.log('✅ Suscripción de calendario activa:', subscription);
    } catch (error) {
      console.error('❌ Error subscribing to calendar assignments:', error);
    }

    return () => {
      try {
        console.log('🔌 Desconectando suscripción de calendario...');
        if (subscription) {
          supabase?.removeChannel(subscription);
        }
      } catch (error) {
        console.error('❌ Error unsubscribing from calendar:', error);
      }
    };
  }, [user.role, user.username, houses, selectedHouseIdx]);

  // Solución robusta: solo renderizar dashboard en cliente, nunca en SSR
  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true); }, []);
  if (!isClient) {
    // SSR y primer render del cliente muestran exactamente lo mismo
    return <div style={{padding: 40, textAlign: 'center'}}>Cargando...</div>;
  }
  // Ya en cliente, renderizar dashboard normalmente
  if (!user || !user.username) {
    return <div style={{padding: 40, textAlign: 'center'}}>Cargando usuario...</div>;
  }
  return (
    <div className="dashboard-container">
      {/* Notificaciones en tiempo real */}
      <RealtimeNotificationsManager 
        notifications={realtimeNotifications}
        onRemove={removeRealtimeNotification}
      />
      
      {/* Indicador de sincronización */}
      {isRealtimeSyncing && (
        <div className="realtime-sync-indicator">
          <div className="realtime-sync-indicator-pulse"></div>
          <span>Sincronización en tiempo real activa</span>
        </div>
      )}
      
      {/* Logo y Header */}
      <div className="dashboard-header-row">
        <div className="dashboard-title-block">
          <img 
            src="/limpieza360pro-logo.png" 
            alt="Limpieza 360Pro" 
            className="dashboard-logo"
            style={{ width: '50px', height: '50px', objectFit: 'contain', marginRight: '15px' }}
          />
          <h1>Dashboard</h1>
          <span className="dashboard-user-pill" aria-label="Usuario en sesión">👤 {user.username}</span>
          {user.role === 'owner' ? (
            <select
              value={selectedHouseIdx}
              onChange={(e) => setSelectedHouseIdx(parseInt(e.target.value, 10))}
              className="dashboard-house-selector"
              aria-label="Seleccionar casa"
            >
              {houses.map((h, idx) => (
                <option key={idx} value={idx}>
                  🏠 {h.houseName || h.name}
                </option>
              ))}
            </select>
          ) : (
            user.house && <span className="dashboard-house-pill" aria-label="Casa asignada">🏠 {user.house}</span>
          )}
        </div>
        {onLogout && (
          <button className="dashboard-btn danger dashboard-logout-btn" onClick={onLogout}>
            Cerrar sesión
          </button>
        )}
      </div>
      {view === 'home' && (
        <>
          <div className="dashboard-cards">
            {/* Tarjeta personalizada para tareas asignadas (solo empleados) */}
            {user.role === 'empleado' && (
              <button
                className="dashboard-card"
                onClick={() => setSelectedModalCard('assignedTasks')}
                aria-label="Tareas Asignadas"
              >
                <span className="dashboard-card-title">Tareas Asignadas</span>
                <span className="dashboard-card-desc">Tareas de limpieza o mantenimiento asignadas por el manager</span>
              </button>
            )}
            {cards.filter(card => card.show).map(card => (
              <button
                key={card.key}
                className="dashboard-card"
                onClick={() => {
                  if (['calendar', 'shopping', 'reminders', 'checklist', 'inventory', 'tasks', 'extraTasks'].includes(card.key)) {
                    setSelectedModalCard(card.key);
                  } else {
                    setView(card.key);
                  }
                }}
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
                    <span className="dashboard-inventory-name">{item.item_name}</span>
                    {item.quantity && <span className="dashboard-inventory-qty">{item.quantity}</span>}
                    <div className="dashboard-inventory-meta">
                      <small>🏷️ {item.category}</small>
                      <small>👤 {item.added_by}</small>
                    </div>
                    <div className="dashboard-inventory-actions">
                      {(user.role === 'owner' || user.role === 'manager') && (
                        <>
                          <button className="dashboard-btn" onClick={async () => {
                            await realtimeService.markAsPurchased(item.id, user.username);
                          }}>✅ Comprado</button>
                          <button className="dashboard-btn danger" onClick={async () => {
                            if (confirm('¿Eliminar este producto?')) {
                              await realtimeService.deleteShoppingListItem(item.id);
                            }
                          }}>🗑️ Eliminar</button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="dashboard-inventory-add-row">
                <form className="dashboard-inventory-add-form" onSubmit={addShoppingItem}>
                  <input
                    type="text"
                    value={newShoppingItem.item_name}
                    onChange={e => setNewShoppingItem({ ...newShoppingItem, item_name: e.target.value })}
                    placeholder="Producto por comprar"
                    required
                    className="dashboard-inventory-input"
                  />
                  <input
                    type="text"
                    value={newShoppingItem.quantity}
                    onChange={e => setNewShoppingItem({ ...newShoppingItem, quantity: e.target.value })}
                    placeholder="Cantidad (opcional)"
                    className="dashboard-inventory-input"
                    style={{ width: 140 }}
                  />
                  <select
                    value={newShoppingItem.category}
                    onChange={e => setNewShoppingItem({ ...newShoppingItem, category: e.target.value })}
                    className="dashboard-inventory-input"
                    style={{ width: 140 }}
                  >
                    <option value="General">General</option>
                    <option value="Alimentos">Alimentos</option>
                    <option value="Limpieza">Limpieza</option>
                    <option value="Baño">Baño</option>
                    <option value="Cocina">Cocina</option>
                  </select>
                  <button type="submit" className="dashboard-btn main">Agregar</button>
                </form>
              </div>

              {(user.role === 'owner' || user.role === 'manager') && shoppingHistory.length > 0 && (
                <div className="dashboard-inventory-history" style={{ marginTop: 24 }}>
                  <h3>Historial de compras</h3>
                  <div className="dashboard-inventory-list">
                    {shoppingHistory.map((h, idx) => (
                      <div className="dashboard-inventory-card" key={h.id || idx}>
                        <span className="dashboard-inventory-name">{h.item_name}</span>
                        {h.quantity && <span className="dashboard-inventory-qty">{h.quantity}</span>}
                        <div className="dashboard-inventory-meta">
                          <small>🏷️ {h.category}</small>
                          <small>👤 Agregado por {h.added_by}</small>
                          <small>✅ Comprado por {h.purchased_by || 'N/A'}</small>
                          <small>📅 {h.purchased_at ? new Date(h.purchased_at).toLocaleString('es-ES') : ''}</small>
                        </div>
                        <div className="dashboard-inventory-actions">
                          <button className="dashboard-btn danger" onClick={async () => {
                            if (confirm('¿Eliminar del historial?')) {
                              await realtimeService.deleteShoppingListItem(h.id);
                            }
                          }}>🗑️ Eliminar</button>
                        </div>
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
        selectedHouse={houses[allowedHouseIdx]?.houseName || houses[allowedHouseIdx]?.name}
      />}
      {view === 'inventory' && (
        <Inventory
          user={user}
          houseName={houses[allowedHouseIdx]?.houseName || houses[allowedHouseIdx]?.name || 'HYNTIBA2 APTO 406'}
          inventory={houses[allowedHouseIdx]?.inventory || []}
          setInventory={(inventory: any[]) => setHouses(houses.map((h, i) => i === allowedHouseIdx ? { ...h, inventory } : h))}
        />
      )}
      {view === 'calendar' && <Calendar users={users as any} user={user as any} selectedHouse={houses[allowedHouseIdx]?.houseName || houses[allowedHouseIdx]?.name} />}
      {view === 'checklist' && <Checklist user={user} users={users} />}
      {view === 'reminders' && (
        <div className="dashboard-reminders redesigned-reminders">
          <h2 className="dashboard-reminders-title redesigned-reminders-title">Recordatorios</h2>
          <form className="dashboard-reminders-form redesigned-reminders-form" onSubmit={async e => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const name = (form.elements.namedItem('name') as HTMLInputElement).value;
            const due = (form.elements.namedItem('due') as HTMLInputElement).value;
            const bank = (form.elements.namedItem('bank') as HTMLInputElement).value;
            const account = (form.elements.namedItem('account') as HTMLInputElement).value;
            const invoiceNumber = (form.elements.namedItem('invoiceNumber') as HTMLInputElement)?.value || '';
            const selectedHouse = houses[allowedHouseIdx]?.name || 'EPIC D1';
            try {
              const created = await realtimeService.createReminder({ name, due, bank, account, invoiceNumber, house: selectedHouse });
              if (created) {
                setReminders(prev => prev.some(r => r.id === created.id) ? prev : [...prev, created]);
              }
            } catch (err) {
              console.error('❌ Error creando recordatorio:', err);
            }
            form.reset();
          }}>
            <div className="reminders-form-row">
              <label htmlFor="reminder-name">Nombre del pago</label>
              <input id="reminder-name" name="name" type="text" placeholder="Nombre del pago" required />
              <label htmlFor="reminder-due">Fecha de pago</label>
              <input id="reminder-due" name="due" type="date" required placeholder="Fecha de pago" title="Fecha de pago" />
              <label htmlFor="reminder-invoice">N° de factura (opcional)</label>
              <input id="reminder-invoice" name="invoiceNumber" type="text" placeholder="N° de factura" />
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
                  <form className="dashboard-reminders-edit-form redesigned-reminders-edit-form" onSubmit={async e => {
                    e.preventDefault();
                    const form = e.target as HTMLFormElement;
                    const name = (form.elements.namedItem('name') as HTMLInputElement).value;
                    const due = (form.elements.namedItem('due') as HTMLInputElement).value;
                    const bank = (form.elements.namedItem('bank') as HTMLInputElement).value;
                    const account = (form.elements.namedItem('account') as HTMLInputElement).value;
                    const invoiceNumber = (form.elements.namedItem('invoiceNumber') as HTMLInputElement)?.value || '';
                    try {
                      const updated = await realtimeService.updateReminder(r.id, { name, due, bank, account, invoiceNumber });
                      if (updated) {
                        setReminders(prev => prev.map(rem => rem.id === updated.id ? updated : rem));
                      }
                    } catch (err) {
                      console.error('❌ Error actualizando recordatorio:', err);
                    }
                    setEditIdx(-1);
                  }}>
                    <label htmlFor={`edit-reminder-name-${idx}`}>Nombre del pago</label>
                    <input id={`edit-reminder-name-${idx}`} name="name" type="text" defaultValue={r.name} required />
                    <label htmlFor={`edit-reminder-due-${idx}`}>Fecha de pago</label>
                    <input id={`edit-reminder-due-${idx}`} name="due" type="date" defaultValue={r.due} required placeholder="Fecha de pago" title="Fecha de pago" />
                    <label htmlFor={`edit-reminder-invoice-${idx}`}>N° de factura (opcional)</label>
                    <input id={`edit-reminder-invoice-${idx}`} name="invoiceNumber" type="text" defaultValue={r.invoiceNumber || ''} />
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
                      {r.invoiceNumber ? (
                        <span className="dashboard-reminder-invoice">Factura: {r.invoiceNumber}</span>
                      ) : null}
                      <span className="dashboard-reminder-bank">{r.bank}</span>
                      <span className="dashboard-reminder-account">{r.account}</span>
                    </div>
                    <div className="reminder-card-actions">
                      <button className="dashboard-btn" onClick={() => setEditIdx(idx)}>Editar</button>
                      <button className="dashboard-btn danger" onClick={async () => {
                        try {
                          const ok = await realtimeService.deleteReminder(r.id);
                          if (ok) {
                            setReminders(prev => prev.filter(rem => rem.id !== r.id));
                          }
                        } catch (err) {
                          console.error('❌ Error eliminando recordatorio:', err);
                        }
                      }}>Eliminar</button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {view === 'house' && !isRestrictedUser && (
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
                <span className="house-name">{house.houseName || house.name}</span>
                {user.role === 'owner' && (
                  <div className="house-card-actions" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={async () => {
                        const newName = prompt(`Nuevo nombre para ${house.houseName || house.name}:`, house.houseName || house.name);
                        if (newName && newName.trim()) {
                          try {
                            if (house.id) {
                              await realtimeService.updateHouse(house.id, { houseName: newName.trim() });
                            }
                          } catch (error) {
                            console.error('Error updating house:', error);
                            alert('Error al actualizar casa');
                          }
                        }
                      }}
                      title="Editar casa"
                      className="house-action-btn edit"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={async () => {
                        if (confirm(`¿Eliminar ${house.houseName || house.name}?`)) {
                          try {
                            if (house.id) {
                              await realtimeService.deleteHouse(house.id);
                            }
                          } catch (error) {
                            console.error('Error deleting house:', error);
                            alert('Error al eliminar casa');
                          }
                        }
                      }}
                      title="Eliminar casa"
                      className="house-action-btn delete"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            ))}
            <div className="house-card add">
              <span className="house-icon">➕</span>
              <form className="dashboard-add-house-form" onSubmit={async (e) => {
                e.preventDefault();
                if (newHouseName.trim()) {
                  try {
                    if (user.role === 'owner') {
                      // Usar Supabase para owner
                      const newHouse = await realtimeService.createHouse({ houseName: newHouseName.trim() });
                      // Agregar la casa al estado local inmediatamente
                      if (newHouse) {
                        setHouses(prev => [...prev, { 
                          name: newHouse.name || newHouse.houseName, 
                          id: newHouse.id, 
                          houseName: newHouse.name || newHouse.houseName,
                          tasks: [], 
                          inventory: [], 
                          users: [] 
                        }]);
                      }
                    } else {
                      // Fallback para owner
                      setHouses([...houses, { name: newHouseName.trim(), houseName: newHouseName.trim(), tasks: [], inventory: [] }]);
                    }
                    setNewHouseName('');
                  } catch (error) {
                    console.error('Error adding house:', error);
                    alert('Error al agregar casa');
                  }
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
            <strong>Casa seleccionada:</strong> {houses[selectedHouseIdx]?.houseName || houses[selectedHouseIdx]?.name}
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
          houses={houses}
          addUser={addUser}
          editUser={editUser}
          deleteUser={deleteUser}
          selectedHouse={houses[allowedHouseIdx]?.name || 'HYNTIBA2 APTO 406'}
        />
      )}
      
      {/* Modal de Subtarjetas */}
      {selectedModalCard && (
        <div className="modal-overlay" onClick={() => setSelectedModalCard(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {selectedModalCard === 'calendar' && '📅 Calendario de Asignaciones'}
                {selectedModalCard === 'shopping' && '🛒 Lista de Compras'}
                {selectedModalCard === 'reminders' && '🔔 Recordatorios'}
                {selectedModalCard === 'checklist' && '✅ Checklist Limpieza'}
                {selectedModalCard === 'inventory' && '📦 Inventario'}
                {selectedModalCard === 'tasks' && '📋 Asignar Tareas'}
                {selectedModalCard === 'extraTasks' && '🟦 Tareas Extra'}
              </h2>
              <button className="modal-close" onClick={() => setSelectedModalCard(null)}>✕</button>
            </div>
            
            <div className="modal-body">
              {selectedModalCard === 'calendar' && (
                <>
                  {/* Formulario de asignación */}
                  {(user.role === 'owner' || user.role === 'manager') && (
                    <div className="modal-assignment-form">
                      <h3>📅 Nueva Asignación de Horario</h3>
                      <form onSubmit={async (e) => {
                        e.preventDefault();
                        if (newAssignment.employee && newAssignment.date && newAssignment.time) {
                          console.log('📅 Creando asignación de calendario:', newAssignment);
                          const selectedHouse = houses[allowedHouseIdx]?.name || 'HYNTIBA2 APTO 406';
                          const result = await realtimeService.createCalendarAssignment({
                            employee: newAssignment.employee,
                            date: newAssignment.date,
                            time: newAssignment.time,
                            type: newAssignment.type,
                            house: selectedHouse
                          });
                          
                          if (result && result.id) {
                            console.log('✅ Asignación creada:', result);

                            // Añadir la asignación al estado local inmediatamente para visibilidad instantánea
                            setCalendarAssignments(prev => [result, ...(prev || [])]);

                            // Crear los items del checklist para esta asignación
                            let checklistItems: any[] = [];
                            try {
                              console.log('🧹 Creando items del checklist para asignación:', result.id);
                              checklistItems = await realtimeService.createCleaningChecklistItems(
                                result.id,
                                newAssignment.employee,
                                newAssignment.type,  // Pasar el tipo de limpieza
                                selectedHouse
                              );
                              console.log('✅ Checklist creado con', checklistItems.length, 'items');

                              // Guardar inmediatamente en el estado sincronizado para visibilidad instantánea
                              try {
                                setSyncedChecklists(prev => new Map(prev).set(String(result.id), checklistItems));
                                console.log('✅ Synced checklists actualizado en estado local para assignment', result.id);
                              } catch (err) {
                                console.warn('⚠️ No se pudo actualizar synced checklists localmente:', err);
                              }
                            } catch (err) {
                              console.error('❌ Error creando checklist items:', err);
                              // No alert here to avoid blocking UX; continuaremos con fallback para mostrar plantilla
                              console.warn('⚠️ Falló la creación remota; usando fallback local/legacy para visibilidad');
                            }

                            // Si no se crearon items en la BD (o la creación falló), obtener items vía getCleaningChecklistItems
                            // que aplicará los fallbacks (calendar_assignment_id_bigint, employee+house, o plantilla en memoria)
                            try {
                              if (!checklistItems || checklistItems.length === 0) {
                                const fallbackItems = await realtimeService.getCleaningChecklistItems(result.id);
                                setSyncedChecklists(prev => new Map(prev).set(String(result.id), fallbackItems));
                                console.log('✅ Synced checklists actualizado con fallback/template para assignment', result.id);
                              }
                            } catch (err) {
                              console.error('❌ Error obteniendo fallback checklist items:', err);
                            }

                            // Crear inventario para la asignación (solo si no es Mantenimiento)
                            if (newAssignment.type !== 'Mantenimiento') {
                              let inventoryItems: any[] = [];
                              try {
                                inventoryItems = await realtimeService.createAssignmentInventory(
                                  result.id,
                                  newAssignment.employee,
                                  selectedHouse
                                );
                                console.log('✅ Inventario creado con', inventoryItems.length, 'items');

                                // Guardar inventario en estado sincronizado para visibilidad instantánea
                                try {
                                  setSyncedInventories(prev => new Map(prev).set(String(result.id), inventoryItems));
                                  console.log('✅ Synced inventories actualizado en estado local para assignment', result.id);
                                } catch (err) {
                                  console.warn('⚠️ No se pudo actualizar synced inventories localmente:', err);
                                }
                              } catch (err) {
                                console.error('❌ Error creando inventario:', err);
                                console.warn('⚠️ Falló la creación remota de inventario; usando fallback de cargar inventario por asignación');
                              }

                              // Si no se crearon items de inventario en la BD (o la creación falló), intentar obtenerlos por la API (fallback) y setear estado
                              try {
                                if (!inventoryItems || inventoryItems.length === 0) {
                                  const fallbackInv = await realtimeService.getAssignmentInventory(result.id);
                                  setSyncedInventories(prev => new Map(prev).set(String(result.id), fallbackInv));
                                  console.log('✅ Synced inventories actualizado con fallback para assignment', result.id);
                                }
                              } catch (err) {
                                console.error('❌ Error obteniendo fallback inventory items:', err);
                              }
                            }

                            // Limpiar formulario
                            setNewAssignment({ employee: '', date: '', time: '', type: 'Limpieza regular' });

                          } else {
                            console.error('❌ No se pudo crear la asignación:', result);
                            alert('No se pudo crear la asignación. Revisa la consola para más detalles.');
                          }
                          
                          setNewAssignment({ employee: '', date: '', time: '', type: 'Limpieza regular' });
                        }
                      }}>
                        <div className="assignment-form-grid">
                          <div className="form-group">
                            <label>👤 Empleado</label>
                            <select 
                              value={newAssignment.employee}
                              onChange={(e) => setNewAssignment({...newAssignment, employee: e.target.value})}
                              required
                              title="Seleccionar empleado"
                            >
                              <option value="">Seleccionar empleado...</option>
                              {users && users.length > 0 ? (
                                users.filter(u => u.role === 'empleado' || u.role === 'manager').map((u, idx) => (
                                  <option key={u.id || idx} value={u.username}>{u.username} ({u.role})</option>
                                ))
                              ) : (
                                <option value="" disabled>No hay empleados disponibles</option>
                              )}
                            </select>
                          </div>
                          
                          <div className="form-group">
                            <label>📅 Fecha</label>
                            <input
                              type="date"
                              value={newAssignment.date}
                              onChange={(e) => setNewAssignment({...newAssignment, date: e.target.value})}
                              required
                              title="Seleccionar fecha"
                            />
                          </div>
                          
                          <div className="form-group">
                            <label>🕐 Hora</label>
                            <input
                              type="time"
                              value={newAssignment.time}
                              onChange={(e) => setNewAssignment({...newAssignment, time: e.target.value})}
                              required
                              title="Seleccionar hora"
                            />
                          </div>
                          
                          <div className="form-group">
                            <label>🏠 Tipo de servicio</label>
                            <select
                              value={newAssignment.type}
                              onChange={(e) => setNewAssignment({...newAssignment, type: e.target.value})}
                              required
                              title="Tipo de servicio"
                            >
                              <option value="Limpieza regular">✨ Limpieza regular</option>
                              <option value="Limpieza profunda">🧹 Limpieza profunda</option>
                              <option value="Mantenimiento">🔧 Mantenimiento</option>
                            </select>
                          </div>
                        </div>
                        
                        <button type="submit" className="dashboard-btn main">✅ Asignar Horario</button>
                      </form>
                    </div>
                  )}
                  
                  {/* Asignaciones actuales */}
                  <div className="subcards-grid">
                    {calendarAssignments.length > 0 ? (
                      <>
                        <div className="modal-stats">
                          <div className="stat-box">
                            <p className="stat-box-number">{calendarAssignments.length}</p>
                            <p className="stat-box-label">Asignaciones totales</p>
                          </div>
                          <div className="stat-box">
                            <p className="stat-box-number">
                              {calendarAssignments.filter(a => a.type === 'Limpieza profunda').length}
                            </p>
                            <p className="stat-box-label">Limpiezas profundas</p>
                          </div>
                          <div className="stat-box">
                            <p className="stat-box-number">
                              {calendarAssignments.filter(a => a.type === 'Limpieza regular').length}
                            </p>
                            <p className="stat-box-label">Limpiezas regulares</p>
                          </div>
                        </div>
                        
                        {calendarAssignments
                          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                          .map((assignment, idx) => (
                          <div key={assignment.id || idx} className="subcard">
                            <div className="subcard-header">
                              <div className="subcard-icon">
                                {assignment.type === 'Limpieza profunda' ? '🧹' : 
                                 assignment.type === 'Limpieza regular' ? '✨' : '🔧'}
                              </div>
                              <h3>{assignment.employee}</h3>
                            </div>
                            <div className="subcard-content">
                              <p><strong>📅 Fecha:</strong> {new Date(assignment.date).toLocaleDateString('es-ES', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}</p>
                              <p><strong>🕐 Hora:</strong> {assignment.time}</p>
                              <p><strong>🏠 Servicio:</strong> {assignment.type}</p>
                              <span className={`subcard-badge ${
                                assignment.type === 'Limpieza profunda' ? 'warning' : 
                                assignment.type === 'Limpieza regular' ? 'success' : ''
                              }`}>
                                {assignment.type === 'Limpieza profunda' ? '🧹 Profunda' : 
                                 assignment.type === 'Limpieza regular' ? '✨ Regular' : '🔧 Mantenimiento'}
                              </span>
                            </div>
                            <div className="subcard-actions">
                              <button 
                                className="dashboard-btn main"
                                onClick={() => {
                                  console.log('🧹 Abriendo checklist para asignación:', assignment.id);
                                  setSelectedAssignmentForChecklist(assignment.id);
                                }}
                              >
                                ✅ Ver Checklist
                              </button>
                              {assignment.type !== 'Mantenimiento' && (
                                <button 
                                  className="dashboard-btn success"
                                  onClick={() => {
                                    console.log('📦 Abriendo inventario para asignación:', assignment.id);
                                    setSelectedAssignmentForInventory(assignment.id);
                                  }}
                                >
                                  📦 Ver Inventario
                                </button>
                              )}
                              {(user.role === 'owner' || user.role === 'manager') && (
                                <button 
                                  className="dashboard-btn danger"
                                  onClick={async () => {
                                    if (confirm(`¿Eliminar la asignación de ${assignment.employee} para ${assignment.type}?`)) {
                                      console.log('🗑️ Eliminando asignación del calendario:', assignment.id);
                                      await realtimeService.deleteCalendarAssignment(assignment.id);
                                      // Actualizar estado local
                                      setCalendarAssignments(calendarAssignments.filter(a => a.id !== assignment.id));
                                    }
                                  }}
                                >
                                  🗑️ Eliminar
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div className="modal-body-empty">
                        <p>📭 No hay asignaciones programadas</p>
                      </div>
                    )}
                  </div>
                </>
              )}
              
              {selectedModalCard === 'assignedTasks' && (
                <AssignedTasksCard user={user} />
              )}
              {selectedModalCard === 'shopping' && (
                <>
                  {/* Formulario para agregar productos */}
                  <div className="modal-assignment-form">
                    <h3>🛒 Agregar a Lista de Compras</h3>
                    <form onSubmit={addShoppingItem}>
                      <div className="assignment-form-grid">
                        <div className="form-group">
                          <label>📝 Producto</label>
                          <input
                            type="text"
                            value={newShoppingItem.item_name}
                            onChange={(e) => setNewShoppingItem({ ...newShoppingItem, item_name: e.target.value })}
                            required
                            placeholder="Ej: Papel higiénico"
                          />
                        </div>
                        
                        <div className="form-group">
                          <label>🔢 Cantidad</label>
                          <input
                            type="text"
                            value={newShoppingItem.quantity}
                            onChange={(e) => setNewShoppingItem({ ...newShoppingItem, quantity: e.target.value })}
                            placeholder="Ej: 2 unidades, 3 kg"
                          />
                        </div>
                        
                        <div className="form-group">
                          <label>🏷️ Categoría</label>
                          <select
                            value={newShoppingItem.category}
                            onChange={(e) => setNewShoppingItem({ ...newShoppingItem, category: e.target.value })}
                          >
                            <option value="General">General</option>
                            <option value="Alimentos">Alimentos</option>
                            <option value="Limpieza">Limpieza</option>
                            <option value="Baño">Baño</option>
                            <option value="Cocina">Cocina</option>
                          </select>
                        </div>
                      </div>
                      
                      <button type="submit" className="dashboard-btn main" style={{width: '100%'}}>
                        ➕ Agregar a la Lista
                      </button>
                      </form>
                  </div>
                  
                  <div className="subcards-grid">
                    <div className="modal-stats">
                      <div className="stat-box">
                        <p className="stat-box-number">{shoppingList.length}</p>
                        <p className="stat-box-label">Productos pendientes</p>
                      </div>
                      <div className="stat-box">
                        <p className="stat-box-number">{shoppingHistory.length}</p>
                        <p className="stat-box-label">Comprados</p>
                      </div>
                      <div className="stat-box">
                        <p className="stat-box-number">{new Set(shoppingList.map(i => i.category)).size}</p>
                        <p className="stat-box-label">Categorías</p>
                      </div>
                    </div>
                    
                    {shoppingList.length > 0 ? (
                      shoppingList.map((item, idx) => (
                        <div key={item.id || idx} className="subcard">
                          <div className="subcard-header">
                            <div className="subcard-icon">🛒</div>
                            <h3>{item.item_name}</h3>
                          </div>
                          <div className="subcard-content">
                            {item.quantity && <p><strong>🔢 Cantidad:</strong> {item.quantity}</p>}
                            <p><strong>🏷️ Categoría:</strong> {item.category}</p>
                            <p><strong>👤 Agregado por:</strong> {item.added_by}</p>
                            <span className="subcard-badge success">🛒 Por comprar</span>
                          </div>
                          
                          {/* Botón para manager: marcar como comprado */}
                          {(user.role === 'owner' || user.role === 'manager') && (
                            <div className="subcard-actions">
                              <button 
                                onClick={async () => {
                                  await realtimeService.markAsPurchased(item.id, user.username);
                                }}
                              >
                                ✅ Marcar Comprado
                                                            <button 
                                                              onClick={async () => {
                                                                if (confirm('¿Eliminar este item?')) {
                                                                  await realtimeService.deleteShoppingListItem(item.id);
                                                                }
                                                              }}
                                                              className="danger"
                                                            >
                                                              🗑️ Eliminar
                                                            </button>
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="modal-body-empty">
                        <p>🎉 No hay productos por comprar</p>
                      </div>
                    )}
                    
                    {/* Historial de compras (solo manager) */}
                    {(user.role === 'owner' || user.role === 'manager') && shoppingHistory.length > 0 && (
                      <>
                        <div className="subcard-full-width" style={{marginTop: '2rem', borderTop: '3px solid #e5e7eb', paddingTop: '2rem'}}>
                          <h3 style={{margin: '0 0 1rem 0', color: '#0284c7'}}>📋 Historial de Compras</h3>
                        </div>
                        
                        {shoppingHistory.map((h, idx) => (
                          <div key={h.id || idx} className="subcard">
                            <div className="subcard-header">
                              <div className="subcard-icon">📦</div>
                              <h3>{h.item_name}</h3>
                            </div>
                            <div className="subcard-content">
                              {h.quantity && <p><strong>🔢 Cantidad:</strong> {h.quantity}</p>}
                              <p><strong>🏷️ Categoría:</strong> {h.category}</p>
                              <p><strong>👤 Agregado por:</strong> {h.added_by}</p>
                              <p><strong>✅ Comprado por:</strong> {h.purchased_by}</p>
                              <p><strong>📅 Fecha compra:</strong> {h.purchased_at ? new Date(h.purchased_at).toLocaleString('es-ES') : 'N/A'}</p>
                              <span className="subcard-badge">✅ Comprado</span>
                            </div>
                            <div className="subcard-actions">
                              <button 
                                className="danger"
                                onClick={async () => {
                                  if (confirm('¿Eliminar del historial?')) {
                                    await realtimeService.deleteShoppingListItem(h.id);
                                  }
                                }}
                              >
                                🗑️ Eliminar del Historial
                              </button>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </>
              )}
              
              {selectedModalCard === 'reminders' && (
                <>
                  {/* Formulario para agregar/editar recordatorios (Manager/Owner) */}
                  {(user.role === 'owner' || user.role === 'manager') && (
                    <div className="modal-assignment-form">
                      <h3>🔔 {editingReminderIdx >= 0 ? 'Editar Recordatorio' : 'Nuevo Recordatorio'}</h3>
                      <form onSubmit={async (e) => {
                        e.preventDefault();
                        const selectedHouse = houses[allowedHouseIdx]?.name || 'EPIC D1';
                        if (editingReminderIdx >= 0) {
                          // Editar recordatorio existente
                          const reminder = reminders[editingReminderIdx];
                          const updated = await realtimeService.updateReminder(reminder.id, {
                            name: newReminder.name,
                            due: newReminder.due,
                            bank: newReminder.bank,
                            account: newReminder.account,
                            invoiceNumber: newReminder.invoiceNumber
                          });
                          if (updated) {
                            setReminders(prev => prev.map(r => r.id === reminder.id ? updated : r));
                          }
                          setEditingReminderIdx(-1);
                        } else {
                          // Agregar nuevo recordatorio
                          const created = await realtimeService.createReminder({
                            name: newReminder.name,
                            due: newReminder.due,
                            bank: newReminder.bank,
                            account: newReminder.account,
                            invoiceNumber: newReminder.invoiceNumber,
                            house: selectedHouse
                          });
                          if (created) {
                            setReminders(prev => [...prev, created]);
                          }
                        }
                        setNewReminder({ name: '', due: '', bank: '', account: '', invoiceNumber: '' });
                      }}>
                        <div className="assignment-form-grid">
                          <div className="form-group">
                            <label>💳 Nombre del pago</label>
                            <input
                              type="text"
                              value={newReminder.name}
                              onChange={(e) => setNewReminder({...newReminder, name: e.target.value})}
                              required
                              placeholder="Ej: Luz, Agua, Internet..."
                              title="Nombre del pago"
                            />
                          </div>
                          
                          <div className="form-group">
                            <label>📅 Fecha de pago</label>
                            <input
                              type="date"
                              value={newReminder.due}
                              onChange={(e) => setNewReminder({...newReminder, due: e.target.value})}
                              required
                              title="Fecha de pago"
                            />
                          </div>
                          
                          <div className="form-group">
                            <label>🏦 Banco</label>
                            <input
                              type="text"
                              value={newReminder.bank}
                              onChange={(e) => setNewReminder({...newReminder, bank: e.target.value})}
                              required
                              placeholder="Ej: Banco Popular"
                              title="Nombre del banco"
                            />
                          </div>
                          
                          <div className="form-group">
                            <label>🔢 Número de cuenta</label>
                            <input
                              type="text"
                              value={newReminder.account}
                              onChange={(e) => setNewReminder({...newReminder, account: e.target.value})}
                              required
                              placeholder="Ej: ****1234"
                              title="Número de cuenta"
                            />
                          </div>
                          
                          <div className="form-group">
                            <label>📄 Número de factura</label>
                            <input
                              type="text"
                              value={newReminder.invoiceNumber}
                              onChange={(e) => setNewReminder({...newReminder, invoiceNumber: e.target.value})}
                              placeholder="Ej: FAC-001234"
                              title="Número de factura"
                            />
                          </div>
                        </div>
                        
                        <div style={{display: 'flex', gap: '1rem'}}>
                          <button type="submit" className="dashboard-btn main" style={{flex: 1}}>
                            {editingReminderIdx >= 0 ? '✏️ Actualizar' : '➕ Agregar Recordatorio'}
                          </button>
                          {editingReminderIdx >= 0 && (
                            <button 
                              type="button" 
                              className="dashboard-btn danger" 
                              onClick={() => {
                                setEditingReminderIdx(-1);
                                setNewReminder({ name: '', due: '', bank: '', account: '', invoiceNumber: '' });
                              }}
                            >
                              ❌ Cancelar
                            </button>
                          )}
                        </div>
                      </form>
                    </div>
                  )}
                  
                  <div className="subcards-grid">
                    {loadingReminders ? (
                      <div className="modal-body-empty"><p>Cargando recordatorios...</p></div>
                    ) : (
                      <>
                        <div className="modal-stats">
                          <div className="stat-box">
                            <p className="stat-box-number">{reminders.length}</p>
                            <p className="stat-box-label">Recordatorios activos</p>
                          </div>
                        </div>
                        {reminders.length > 0 ? (
                      reminders.map((item, idx) => (
                        <div key={idx} className="subcard">
                          <div className="subcard-header">
                            <div className="subcard-icon">🔔</div>
                            <h3>{item.name}</h3>
                          </div>
                          <div className="subcard-content">
                            <p><strong>📅 Fecha:</strong> {item.due}</p>
                            <p><strong>🏦 Banco:</strong> {item.bank}</p>
                            <p><strong>🔢 Cuenta:</strong> {item.account}</p>
                            {item.invoiceNumber && <p><strong>📄 Factura:</strong> {item.invoiceNumber}</p>}
                            <span className="subcard-badge">{item.bank}</span>
                          </div>
                          {(user.role === 'owner' || user.role === 'manager') && (
                            <div className="subcard-actions">
                              <button 
                                onClick={() => {
                                  setNewReminder(item);
                                  setEditingReminderIdx(idx);
                                }}
                              >
                                ✏️ Editar
                              </button>
                              <button 
                                className="danger"
                                onClick={async () => {
                                  if (confirm('¿Eliminar este recordatorio?')) {
                                    await realtimeService.deleteReminder(item.id);
                                  }
                                }}
                              >
                                🗑️ Eliminar
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                        ) : (
                          <div className="modal-body-empty">
                            <p>✨ No hay recordatorios pendientes</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}
              
              {selectedModalCard === 'checklist' && (
                <>
                  {/* Controles de tipo de limpieza */}
                  <div className="checklist-controls" style={{marginBottom: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap'}}>
                    <button 
                      onClick={() => setChecklistType('regular')}
                      className={`dashboard-btn ${checklistType === 'regular' ? 'main' : ''}`}
                      style={{fontSize: '1rem', padding: '0.75rem 1.5rem'}}
                    >
                      🧹 Limpieza Regular
                    </button>
                    <button 
                      onClick={() => setChecklistType('profunda')}
                      className={`dashboard-btn ${checklistType === 'profunda' ? 'main' : ''}`}
                      style={{fontSize: '1rem', padding: '0.75rem 1.5rem'}}
                    >
                      🏠 Limpieza Profunda
                    </button>
                    <button 
                      onClick={() => setChecklistType('mantenimiento')}
                      className={`dashboard-btn ${checklistType === 'mantenimiento' ? 'main' : ''}`}
                      style={{fontSize: '1rem', padding: '0.75rem 1.5rem'}}
                    >
                      🔧 Mantenimiento
                    </button>
                  </div>

                  {/* Formulario para agregar nueva tarea (solo manager/owner) */}
                  {(user.role === 'owner' || user.role === 'manager') && (
                    <div className="modal-assignment-form" style={{marginBottom: '2rem'}}>
                      <h3>➕ Agregar Nueva Tarea al Checklist</h3>
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const form = e.target as HTMLFormElement;
                        const taskText = (form.elements.namedItem('taskText') as HTMLInputElement).value;
                        const zona = (form.elements.namedItem('zona') as HTMLSelectElement).value;
                        
                        if (!taskText.trim() || !zona) return;
                        
                        const selectedHouse = houses[allowedHouseIdx]?.name || 'HYNTIBA2 APTO 406';
                        
                        // Agregar tarea a Supabase para sincronización en tiempo real
                        (async () => {
                          try {
                            if (!supabase) {
                              console.error('❌ Supabase no está disponible');
                              alert('Error: Supabase no configurado');
                              return;
                            }
                            
                            console.log('📝 Insertando tarea en checklist:', {
                              house: selectedHouse,
                              item: taskText,
                              room: zona,
                              type: checklistType
                            });
                            
                            const { data, error } = await (supabase as any)
                              .from('checklist')
                              .insert([{
                                house: selectedHouse,
                                item: taskText,
                                room: zona,
                                complete: false,
                                assigned_to: null
                              }])
                              .select();
                            
                            if (error) {
                              console.error('❌ Error agregando tarea al checklist:', {
                                code: error.code,
                                message: error.message,
                                details: error.details,
                                hint: error.hint
                              });
                              alert(`❌ Error al guardar: ${error.message}`);
                            } else {
                              console.log('✅ Tarea agregada correctamente al checklist:', data);
                              alert('✅ Tarea guardada en Supabase');
                            }
                          } catch (error: any) {
                            console.error('❌ Error en insert checklist:', error);
                            alert(`❌ Error: ${error?.message || 'Error desconocido'}`);
                          }
                        })();
                        
                        // También actualizar el estado local para UI inmediata
                        const updatedZone = {
                          ...checklistData[zona],
                          tasks: [...(checklistData[zona]?.tasks || []), { text: taskText, completed: false }]
                        };
                        setChecklistData({
                          ...checklistData,
                          [zona]: updatedZone
                        });
                        
                        form.reset();
                      }}>
                        <div className="assignment-form-grid">
                          <div className="form-group">
                            <label>📋 Descripción de la tarea</label>
                            <input
                              type="text"
                              name="taskText"
                              required
                              placeholder="Ej: Limpiar lavamanos"
                              style={{padding: '0.75rem', borderRadius: '0.5rem', border: '2px solid #e5e7eb'}}
                            />
                          </div>
                          <div className="form-group">
                            <label>📍 Zona</label>
                            <select
                              name="zona"
                              required
                              style={{padding: '0.75rem', borderRadius: '0.5rem', border: '2px solid #e5e7eb'}}
                            >
                              <option value="">Seleccionar zona...</option>
                              {Object.keys(checklistData)
                                .filter(zona => checklistData[zona].type === checklistType)
                                .map(zona => (
                                  <option key={zona} value={zona}>{zona}</option>
                                ))
                              }
                            </select>
                          </div>
                        </div>
                        <button type="submit" className="dashboard-btn main" style={{marginTop: '1rem'}}>
                          ➕ Agregar Tarea
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Estadísticas generales */}
                  {(() => {
                    const stats = Object.entries(checklistData)
                      .filter(([_, data]: any) => data.type === checklistType)
                      .reduce((acc, [_, data]: any) => {
                        const totalTasks = data.tasks.length;
                        const completedTasks = data.tasks.filter((t: any) => t.completed).length;
                        return {
                          total: acc.total + totalTasks,
                          completed: acc.completed + completedTasks
                        };
                      }, { total: 0, completed: 0 });
                    
                    return (
                      <div className="modal-stats" style={{marginBottom: '2rem'}}>
                        <div className="stat-box">
                          <p className="stat-box-number">{stats.total}</p>
                          <p className="stat-box-label">Tareas totales</p>
                        </div>
                        <div className="stat-box">
                          <p className="stat-box-number">{stats.completed}</p>
                          <p className="stat-box-label">Completadas</p>
                        </div>
                        <div className="stat-box">
                          <p className="stat-box-number">{stats.total - stats.completed}</p>
                          <p className="stat-box-label">Pendientes</p>
                        </div>
                        <div className="stat-box">
                          <p className="stat-box-number">{stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%</p>
                          <p className="stat-box-label">Progreso</p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Zonas con tareas */}
                  <div className="subcards-grid">
                    {Object.entries(checklistData)
                      .filter(([_, data]: any) => data.type === checklistType)
                      .map(([zona, data]: any) => {
                        const completedCount = data.tasks.filter((t: any) => t.completed).length;
                        const totalCount = data.tasks.length;
                        
                        return (
                          <div key={zona} className="subcard" style={{border: '2px solid #e5e7eb'}}>
                            <div className="subcard-header" style={{backgroundColor: completedCount === totalCount ? '#dcfce7' : '#fef3c7'}}>
                              <h3 style={{flex: 1}}>{zona}</h3>
                              <span style={{fontSize: '0.9rem', fontWeight: 'bold', color: '#374151'}}>
                                {completedCount}/{totalCount}
                              </span>
                            </div>
                            <div className="subcard-content" style={{padding: '1rem'}}>
                              <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
                                {data.tasks.map((task: any, idx: number) => (
                                  <div key={idx} style={{display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.5rem', borderRadius: '0.375rem', backgroundColor: task.completed ? '#f0fdf4' : '#fafafa', transition: 'background-color 0.2s'}}>
                                    <label style={{display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', flex: 1}}>
                                      <input
                                        type="checkbox"
                                        checked={task.completed}
                                        onChange={(e) => {
                                          const updatedZone = {
                                            ...checklistData[zona],
                                            tasks: checklistData[zona].tasks.map((t: any, i: number) => 
                                              i === idx ? { ...t, completed: e.target.checked } : t
                                            )
                                          };
                                          setChecklistData({
                                            ...checklistData,
                                            [zona]: updatedZone
                                          });
                                        }}
                                        style={{marginTop: '0.25rem', width: '1.25rem', height: '1.25rem', cursor: 'pointer', accentColor: '#10b981'}}
                                      />
                                      <span style={{flex: 1, color: task.completed ? '#6b7280' : '#1f2937', textDecoration: task.completed ? 'line-through' : 'none', fontSize: '0.95rem', lineHeight: '1.5'}}>
                                        {task.text}
                                      </span>
                                    </label>
                                    {(user.role === 'owner' || user.role === 'manager') && (
                                      <div style={{display: 'flex', gap: '0.25rem', marginLeft: 'auto'}}>
                                        <button
                                          onClick={() => {
                                            const newText = prompt('Editar tarea:', task.text);
                                            if (newText && newText.trim()) {
                                              const updatedZone = {
                                                ...checklistData[zona],
                                                tasks: checklistData[zona].tasks.map((t: any, i: number) => 
                                                  i === idx ? { ...t, text: newText.trim() } : t
                                                )
                                              };
                                              setChecklistData({
                                                ...checklistData,
                                                [zona]: updatedZone
                                              });
                                            }
                                          }}
                                          style={{padding: '0.25rem 0.5rem', fontSize: '0.75rem', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', backgroundColor: '#3b82f6', color: 'white'}}
                                          title="Editar tarea"
                                        >
                                          ✏️
                                        </button>
                                        <button
                                          onClick={() => {
                                            if (confirm(`¿Eliminar la tarea "${task.text}"?`)) {
                                              const updatedZone = {
                                                ...checklistData[zona],
                                                tasks: checklistData[zona].tasks.filter((t: any, i: number) => i !== idx)
                                              };
                                              setChecklistData({
                                                ...checklistData,
                                                [zona]: updatedZone
                                              });
                                            }
                                          }}
                                          style={{padding: '0.25rem 0.5rem', fontSize: '0.75rem', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', backgroundColor: '#ef4444', color: 'white'}}
                                          title="Eliminar tarea"
                                        >
                                          🗑️
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    }
                  </div>

                  {/* Botón para limpiar/resetear */}
                  {Object.entries(checklistData)
                    .filter(([_, data]: any) => data.type === checklistType)
                    .some(([_, data]: any) => data.tasks.some((t: any) => t.completed)) && (
                    <div style={{marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center'}}>
                      <button 
                        onClick={() => {
                          const resetData = { ...checklistData };
                          Object.entries(resetData).forEach(([zona, data]: any) => {
                            if (data.type === checklistType) {
                              resetData[zona] = {
                                ...data,
                                tasks: data.tasks.map((t: any) => ({ ...t, completed: false }))
                              };
                            }
                          });
                          setChecklistData(resetData);
                        }}
                        className="dashboard-btn danger"
                        style={{fontSize: '1rem', padding: '0.75rem 1.5rem'}}
                      >
                        🔄 Resetear Checklist
                      </button>
                    </div>
                  )}
                </>
              )}
              {selectedTaskMaintenance && (
                <div className="modal-overlay" onClick={() => setSelectedTaskMaintenance(null)}>
                  <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                      <h2>🔧 Checklist de Mantenimiento</h2>
                      <button className="modal-close" onClick={() => setSelectedTaskMaintenance(null)}>✕</button>
                    </div>
                    
                    <div className="modal-body">
                      <div style={{marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f0f9ff', borderRadius: '0.75rem', borderLeft: '4px solid #0284c7'}}>
                        <p style={{margin: '0.25rem 0'}}><strong>📋 Tarea:</strong> {selectedTaskMaintenance.title}</p>
                        <p style={{margin: '0.25rem 0'}}><strong>👤 Asignado a:</strong> {selectedTaskMaintenance.assignedTo}</p>
                        <p style={{margin: '0.25rem 0'}}><strong>📝 Descripción:</strong> {selectedTaskMaintenance.description}</p>
                      </div>

                      {(() => {
                        const taskKey = `task_${selectedTaskMaintenance.taskIdx}_maintenance`;
                        const data = taskMaintenanceData[taskKey] || {};
                        const stats = Object.entries(data).reduce((acc, [_, zonaData]: any) => {
                          const total = zonaData.tasks.length;
                          const completed = zonaData.tasks.filter((t: any) => t.completed).length;
                          return {
                            total: acc.total + total,
                            completed: acc.completed + completed
                          };
                        }, { total: 0, completed: 0 });

                        return (
                          <>
                            <div className="modal-stats" style={{marginBottom: '2rem'}}>
                              <div className="stat-box">
                                <p className="stat-box-number">{stats.total}</p>
                                <p className="stat-box-label">Tareas totales</p>
                              </div>
                              <div className="stat-box">
                                <p className="stat-box-number">{stats.completed}</p>
                                <p className="stat-box-label">Completadas</p>
                              </div>
                              <div className="stat-box">
                                <p className="stat-box-number">{stats.total - stats.completed}</p>
                                <p className="stat-box-label">Pendientes</p>
                              </div>
                              <div className="stat-box">
                                <p className="stat-box-number">{stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%</p>
                                <p className="stat-box-label">Progreso</p>
                              </div>
                            </div>

                            <div className="subcards-grid">
                              {Object.entries(data).map(([zona, zonaData]: any) => {
                                const completedCount = zonaData.tasks.filter((t: any) => t.completed).length;
                                const totalCount = zonaData.tasks.length;
                                
                                return (
                                  <div key={zona} className="subcard" style={{border: '2px solid #e5e7eb'}}>
                                    <div className="subcard-header" style={{backgroundColor: completedCount === totalCount ? '#dcfce7' : '#fef3c7'}}>
                                      <h3 style={{flex: 1}}>{zona}</h3>
                                      <span style={{fontSize: '0.9rem', fontWeight: 'bold', color: '#374151'}}>
                                        {completedCount}/{totalCount}
                                      </span>
                                    </div>
                                    <div className="subcard-content" style={{padding: '1rem'}}>
                                      <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
                                        {zonaData.tasks.map((task: any, idx: number) => (
                                          <label key={idx} style={{display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', padding: '0.5rem', borderRadius: '0.375rem', backgroundColor: task.completed ? '#f0fdf4' : '#fafafa', transition: 'background-color 0.2s'}}>
                                            <input
                                              type="checkbox"
                                              checked={task.completed}
                                              onChange={(e) => {
                                                const updatedZone = {
                                                  ...zonaData,
                                                  tasks: zonaData.tasks.map((t: any, i: number) => 
                                                    i === idx ? { ...t, completed: e.target.checked } : t
                                                  )
                                                };
                                                setTaskMaintenanceData({
                                                  ...taskMaintenanceData,
                                                  [taskKey]: {
                                                    ...data,
                                                    [zona]: updatedZone
                                                  }
                                                });
                                              }}
                                              style={{marginTop: '0.25rem', width: '1.25rem', height: '1.25rem', cursor: 'pointer', accentColor: '#10b981'}}
                                            />
                                            <span style={{flex: 1, color: task.completed ? '#6b7280' : '#1f2937', textDecoration: task.completed ? 'line-through' : 'none', fontSize: '0.95rem', lineHeight: '1.5'}}>
                                              {task.text}
                                            </span>
                                          </label>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {stats.completed > 0 && (
                              <div style={{marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center'}}>
                                <button 
                                  onClick={() => {
                                    const resetData = { ...data };
                                    Object.entries(resetData).forEach(([zona, zonaData]: any) => {
                                      resetData[zona] = {
                                        tasks: zonaData.tasks.map((t: any) => ({ ...t, completed: false }))
                                      };
                                    });
                                    setTaskMaintenanceData({
                                      ...taskMaintenanceData,
                                      [taskKey]: resetData
                                    });
                                  }}
                                  className="dashboard-btn danger"
                                  style={{fontSize: '1rem', padding: '0.75rem 1.5rem'}}
                                >
                                  🔄 Resetear Checklist
                                </button>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {selectedModalCard === 'inventory' && (
                <>
                  {/* Formulario para agregar/editar items del template */}
                  <div className="modal-assignment-form">
                    <h3>📦 {editingTemplateItemId ? 'Editar Item del Template' : 'Agregar Item al Template'}</h3>
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      
                      if (editingTemplateItemId) {
                        // Actualizar item existente
                        await realtimeService.updateInventoryTemplateItem(editingTemplateItemId, {
                          item_name: newTemplateItem.item_name,
                          quantity: parseInt(newTemplateItem.quantity),
                          category: newTemplateItem.category
                        });
                        setEditingTemplateItemId(null);
                      } else {
                        // Crear nuevo item
                        await realtimeService.createInventoryTemplateItem({
                          item_name: newTemplateItem.item_name,
                          quantity: parseInt(newTemplateItem.quantity),
                          category: newTemplateItem.category
                        }, 'HYNTIBA2 APTO 406');
                      }
                      
                      setNewTemplateItem({ item_name: '', quantity: '', category: 'Cocina' });
                    }}>
                      <div className="assignment-form-grid">
                        <div className="form-group">
                          <label>📝 Nombre del artículo</label>
                          <input
                            type="text"
                            value={newTemplateItem.item_name}
                            onChange={(e) => setNewTemplateItem({...newTemplateItem, item_name: e.target.value})}
                            required
                            placeholder="Ej: Tenedores"
                            title="Nombre del artículo"
                          />
                        </div>
                        
                        <div className="form-group">
                          <label>🔢 Cantidad</label>
                          <input
                            type="number"
                            value={newTemplateItem.quantity}
                            onChange={(e) => setNewTemplateItem({...newTemplateItem, quantity: e.target.value})}
                            required
                            min="1"
                            placeholder="Ej: 10"
                            title="Cantidad"
                          />
                        </div>
                        
                        <div className="form-group">
                          <label>🏷️ Categoría</label>
                          <select
                            value={newTemplateItem.category}
                            onChange={(e) => setNewTemplateItem({...newTemplateItem, category: e.target.value})}
                            required
                          >
                            <option value="Cocina">Cocina</option>
                            <option value="Baños">Baños</option>
                            <option value="Dormitorios">Dormitorios</option>
                            <option value="Sala">Sala</option>
                            <option value="Comedor">Comedor</option>
                            <option value="Lavandería">Lavandería</option>
                            <option value="Limpieza">Limpieza</option>
                          </select>
                        </div>
                      </div>
                      
                      <div style={{display: 'flex', gap: '1rem'}}>
                        <button type="submit" className="dashboard-btn main" style={{flex: 1}}>
                          {editingTemplateItemId ? '✏️ Actualizar' : '➕ Agregar al Template'}
                        </button>
                        {editingTemplateItemId && (
                          <button 
                            type="button" 
                            className="dashboard-btn danger" 
                            onClick={() => {
                              setEditingTemplateItemId(null);
                              setNewTemplateItem({ item_name: '', quantity: '', category: 'Cocina' });
                            }}
                          >
                            ❌ Cancelar
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                  
                  <div className="subcards-grid">
                    <div className="modal-stats">
                      <div className="stat-box">
                        <p className="stat-box-number">{inventoryTemplate.length}</p>
                        <p className="stat-box-label">Items en Template</p>
                      </div>
                      <div className="stat-box">
                        <p className="stat-box-number">
                          {new Set(inventoryTemplate.map(i => i.category)).size}
                        </p>
                        <p className="stat-box-label">Categorías</p>
                      </div>
                      <div className="stat-box">
                        <p className="stat-box-number">
                          {inventoryTemplate.reduce((sum, i) => sum + i.quantity, 0)}
                        </p>
                        <p className="stat-box-label">Items Totales</p>
                      </div>
                    </div>
                    
                    {loadingInventoryTemplate ? (
                      <div className="modal-body-empty">
                        <p>Cargando template...</p>
                      </div>
                    ) : inventoryTemplate.length > 0 ? (
                      (() => {
                        // Agrupar por categoría
                        const categories = new Map<string, any[]>();
                        inventoryTemplate.forEach(item => {
                          if (!categories.has(item.category)) {
                            categories.set(item.category, []);
                          }
                          categories.get(item.category)!.push(item);
                        });
                        
                        return (
                          <div style={{gridColumn: '1 / -1'}}>
                            {Array.from(categories.entries()).map(([category, items]) => (
                              <div key={category} style={{marginBottom: '2rem'}}>
                                <h3 style={{marginBottom: '1rem', color: '#2563eb'}}>
                                  {category} ({items.length} items)
                                </h3>
                                <div className="subcards-grid">
                                  {items.map((item) => (
                                    <div key={item.id} className="subcard">
                                      <div className="subcard-header">
                                        <div className="subcard-icon">📦</div>
                                        <h3>{item.item_name}</h3>
                                      </div>
                                      <div className="subcard-content">
                                        <p><strong>🔢 Cantidad:</strong> {item.quantity}</p>
                                        <p><strong>🏷️ Categoría:</strong> {item.category}</p>
                                      </div>
                                      <div className="subcard-actions">
                                        <button 
                                          onClick={() => {
                                            setNewTemplateItem({
                                              item_name: item.item_name,
                                              quantity: item.quantity.toString(),
                                              category: item.category
                                            });
                                            setEditingTemplateItemId(item.id);
                                          }}
                                        >
                                          ✏️ Editar
                                        </button>
                                        <button 
                                          className="danger"
                                          onClick={async () => {
                                            if (confirm(`¿Eliminar "${item.item_name}" del template?`)) {
                                              await realtimeService.deleteInventoryTemplateItem(item.id);
                                            }
                                          }}
                                        >
                                          🗑️ Eliminar
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()
                    ) : (
                      <div className="modal-body-empty">
                        <p>📭 No hay items en el template de inventario</p>
                      </div>
                    )}
                  </div>
                </>
              )}
              
              {selectedModalCard === 'tasks' && (
                <>
                  {/* Formulario para agregar tareas (Manager/Owner) */}
                  {(user.role === 'owner' || user.role === 'manager') && (
                    <div className="modal-assignment-form">
                      <h3>📋 {editingTaskIdx >= 0 ? 'Editar Tarea' : 'Nueva Tarea'}</h3>
                      <form onSubmit={async (e) => {
                        e.preventDefault();
                        
                        if (editingTaskIdx >= 0) {
                          // Editar tarea existente
                          await realtimeService.updateTask(tasksList[editingTaskIdx].id, {
                            title: newTask.title,
                            description: newTask.description,
                            assignedTo: newTask.assignedTo,
                            type: newTask.type
                          });
                          setEditingTaskIdx(-1);
                        } else {
                          // Agregar nueva tarea
                          console.log('📝 Creando nueva tarea:', {
                            title: newTask.title,
                            assignedTo: newTask.assignedTo,
                            type: newTask.type,
                            createdBy: user.username
                          });
                            const selectedHouse = houses[allowedHouseIdx]?.name || 'HYNTIBA2 APTO 406';
                          const result = await realtimeService.createTask({
                            title: newTask.title,
                            description: newTask.description,
                            assignedTo: newTask.assignedTo,
                            type: newTask.type,
                              house: selectedHouse,
                            createdBy: user.username
                          });
                          console.log('✅ Tarea creada con resultado:', result);
                        }
                        setNewTask({ title: '', description: '', assignedTo: '', type: 'Limpieza general' });
                      }}>
                        <div className="assignment-form-grid">
                          <div className="form-group">
                            <label>📝 Título de la tarea</label>
                            <input
                              type="text"
                              value={newTask.title}
                              onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                              required
                              placeholder="Ej: Limpiar sala"
                              title="Título de la tarea"
                            />
                          </div>
                          
                          <div className="form-group">
                            <label>👤 Asignar a</label>
                            <select 
                              value={newTask.assignedTo}
                              onChange={(e) => setNewTask({...newTask, assignedTo: e.target.value})}
                              required
                              title="Seleccionar empleado"
                            >
                              <option value="">Seleccionar empleado...</option>
                              {users && users.length > 0 ? (
                                users.filter(u => u.role === 'empleado' || u.role === 'manager').map((u, idx) => (
                                  <option key={u.id || idx} value={u.username}>{u.username}</option>
                                ))
                              ) : (
                                <option value="" disabled>No hay empleados</option>
                              )}
                            </select>
                          </div>
                          
                          <div className="form-group">
                            <label>🏠 Tipo de tarea</label>
                            <select
                              value={newTask.type}
                              onChange={(e) => setNewTask({...newTask, type: e.target.value})}
                              required
                              title="Tipo de tarea"
                            >
                              <option value="Limpieza general">✨ Limpieza general</option>
                              <option value="Limpieza profunda">🧹 Limpieza profunda</option>
                              <option value="Mantenimiento">🔧 Mantenimiento</option>
                              <option value="Tarea extra">🟦 Tarea extra</option>
                            </select>
                          </div>
                          
                          <div className="form-group" style={{gridColumn: '1 / -1'}}>
                            <label>📄 Descripción</label>
                            <textarea
                              value={newTask.description}
                              onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                              placeholder="Descripción detallada de la tarea..."
                              rows={3}
                              style={{resize: 'vertical', padding: '0.75rem', borderRadius: '0.5rem', border: '2px solid #e5e7eb', color: '#111827', backgroundColor: '#ffffff'}}
                            />
                          </div>
                        </div>
                        
                        <div style={{display: 'flex', gap: '1rem'}}>
                          <button type="submit" className="dashboard-btn main" style={{flex: 1}}>
                            {editingTaskIdx >= 0 ? '✏️ Actualizar Tarea' : '➕ Agregar Tarea'}
                          </button>
                          {editingTaskIdx >= 0 && (
                            <button 
                              type="button" 
                              className="dashboard-btn danger" 
                              onClick={() => {
                                setEditingTaskIdx(-1);
                                setNewTask({ title: '', description: '', assignedTo: '', type: 'Limpieza general' });
                              }}
                            >
                              ❌ Cancelar
                            </button>
                          )}
                        </div>
                      </form>
                    </div>
                  )}
                  
                  {/* Lista de tareas */}
                  <div className="subcards-grid">
                    {loadingTasks ? (
                      <div className="modal-body-empty"><p>Cargando tareas...</p></div>
                    ) : tasksList.length > 0 ? (
                      <>
                        <div className="modal-stats">
                          <div className="stat-box">
                            <p className="stat-box-number">{tasksList.length}</p>
                            <p className="stat-box-label">Tareas totales</p>
                          </div>
                          <div className="stat-box">
                            <p className="stat-box-number">
                              {tasksList.filter((t: any) => t.completed).length}
                            </p>
                            <p className="stat-box-label">Completadas</p>
                          </div>
                          <div className="stat-box">
                            <p className="stat-box-number">
                              {tasksList.filter((t: any) => !t.completed).length}
                            </p>
                            <p className="stat-box-label">Pendientes</p>
                          </div>
                        </div>
                        
                        {tasksList.map((task: any, idx: number) => (
                          <div key={task.id} className="subcard">
                            <div className="subcard-header">
                              <div className="subcard-icon">
                                {task.type === 'Limpieza profunda' ? '🧹' : 
                                 task.type === 'Limpieza general' ? '✨' : 
                                 task.type === 'Tarea extra' ? '🟦' : '🔧'}
                              </div>
                              <h3>{task.title || 'Sin título'}</h3>
                            </div>
                            <div className="subcard-content">
                              <p><strong>👤 Asignado a:</strong> {task.assignedTo || 'Sin asignar'}</p>
                              <p><strong>🏠 Tipo:</strong> {task.type}</p>
                              <p><strong>📄 Descripción:</strong> {task.description || 'Sin descripción'}</p>
                              <span className={`subcard-badge ${task.completed ? 'success' : 'warning'}`}>
                                {task.completed ? '✅ Completada' : '⏳ Pendiente'}
                              </span>
                            </div>
                            <div className="subcard-actions">
                              {task.type === 'Mantenimiento' && (user.role === 'empleado' || user.role === 'manager' || user.role === 'owner') && (
                                <button 
                                  className="dashboard-btn main"
                                  onClick={() => {
                                    setSelectedTaskMaintenance({ ...task, taskIdx: idx });
                                    // Inicializar checklist para esta tarea si no existe
                                    const taskKey = `task_${task.id}_maintenance`;
                                    if (!taskMaintenanceData[taskKey]) {
                                      const newData: any = {};
                                      Object.keys(MANTENIMIENTO).forEach(zona => {
                                        newData[zona] = {
                                          tasks: MANTENIMIENTO[zona as keyof typeof MANTENIMIENTO].map((t: string) => ({
                                            text: t,
                                            completed: false
                                          }))
                                        };
                                      });
                                      setTaskMaintenanceData({
                                        ...taskMaintenanceData,
                                        [taskKey]: newData
                                      });
                                    }
                                  }}
                                >
                                  📋 Ver Checklist
                                </button>
                              )}
                              {(user.role === 'owner' || user.role === 'manager') && (
                                <>
                                  <button
                                    className="dashboard-btn"
                                    onClick={() => {
                                      setNewTask({
                                        title: task.title || '',
                                        description: task.description || '',
                                        assignedTo: task.assignedTo || '',
                                        type: task.type || 'Limpieza general'
                                      });
                                      setEditingTaskIdx(idx);
                                    }}
                                  >
                                    ✏️ Editar
                                  </button>
                                  <button
                                    className="dashboard-btn danger"
                                    onClick={async () => {
                                      if (confirm('¿Eliminar esta tarea?')) {
                                        await realtimeService.deleteTask(task.id);
                                      }
                                    }}
                                  >
                                    🗑️ Eliminar
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div className="modal-body-empty">
                        <p>🎉 No hay tareas asignadas</p>
                      </div>
                    )}
                  </div>
                </>
              )}
              
              {selectedModalCard === 'extraTasks' && (
                <>
                  <div className="subcards-grid">
                    {extraTasksForUser.length === 0 ? (
                      <div className="modal-body-empty">
                        <p>No tienes tareas extra pendientes.</p>
                      </div>
                    ) : (
                      extraTasksForUser.map(task => (
                        <div key={task.id} className="subcard">
                          <div className="subcard-header">
                            <div className="subcard-icon">🟦</div>
                            <h3>{task.title}</h3>
                          </div>
                          <div className="subcard-content">
                            <p><strong>📄 Descripción:</strong> {task.description || 'Sin descripción'}</p>
                            <p><strong>👤 Asignado por:</strong> {task.createdBy || task.created_by || 'Manager'}</p>
                            <span className={`subcard-badge ${task.completed ? 'success' : 'warning'}`}>
                              {task.completed ? '✅ Completada' : '⏳ Pendiente'}
                            </span>
                          </div>
                          <div className="subcard-actions">
                            {!task.completed && (
                              <button
                                className="dashboard-btn main"
                                onClick={async () => {
                                  await realtimeService.updateTask(task.id, { completed: true });
                                }}
                              >
                                ✅ Marcar Completada
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Modal para Checklist Sincronizado */}
      {selectedAssignmentForChecklist && (
        <div className="modal-overlay" onClick={() => setSelectedAssignmentForChecklist(null)}>
          <div className="modal-content large-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🧹 Checklist de Limpieza</h2>
              <button className="modal-close" onClick={() => setSelectedAssignmentForChecklist(null)}>✕</button>
            </div>
            <div className="modal-body">
              {syncedChecklists.get(selectedAssignmentForChecklist) ? (
                (() => {
                  const checklistItems = syncedChecklists.get(selectedAssignmentForChecklist) || [];
                  const assignment = calendarAssignments.find(a => a.id === selectedAssignmentForChecklist);
                  
                  if (!assignment) return <div className="modal-body-empty"><p>Asignación no encontrada</p></div>;
                  
                  // Agrupar por zona
                  const zones = new Map<string, any[]>();
                  checklistItems.forEach(item => {
                    if (!zones.has(item.zone)) {
                      zones.set(item.zone, []);
                    }
                    zones.get(item.zone)!.push(item);
                  });
                  
                  const totalItems = checklistItems.length;
                  const completedItems = checklistItems.filter(i => i.completed).length;
                  const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
                  
                  return (
                    <>
                      <div className="modal-stats" style={{marginBottom: '2rem'}}>
                        <div className="stat-box">
                          <p className="stat-box-number">{assignment.employee}</p>
                          <p className="stat-box-label">Empleado</p>
                        </div>
                        <div className="stat-box">
                          <p className="stat-box-number">{progress}%</p>
                          <p className="stat-box-label">Progreso</p>
                        </div>
                        <div className="stat-box">
                          <p className="stat-box-number">{completedItems}/{totalItems}</p>
                          <p className="stat-box-label">Completadas</p>
                        </div>
                      </div>

                      {/* Mostrar aviso si la lista es una plantilla local (no hay filas en BD) */}
                      {checklistItems && checklistItems.length > 0 && checklistItems[0].isTemplate && (
                        <div style={{textAlign: 'center', marginBottom: '1rem', color: '#6b7280'}}>
                          <strong>Plantilla local</strong> — No se encontraron items en la base de datos; mostrando la plantilla por defecto.
                        </div>
                      )}
                      
                      <div className="progress-bar" style={{marginBottom: '2rem'}}>
                        <div className="progress-fill" style={{width: `${progress}%`}}></div>
                      </div>
                      
                      {/* Botón para eliminar asignación cuando esté completa (solo manager/owner) */}
                      {(user.role === 'manager' || user.role === 'owner') && progress === 100 && (
                        <div style={{marginBottom: '2rem', textAlign: 'center'}}>
                          <button 
                            className="dashboard-btn danger"
                            style={{fontSize: '1rem', padding: '0.75rem 2rem'}}
                            onClick={async () => {
                              if (confirm(`¿Eliminar esta asignación completada de ${assignment.employee}? Esto también eliminará el checklist.`)) {
                                console.log('🗑️ Eliminando asignación:', selectedAssignmentForChecklist);
                                await realtimeService.deleteCalendarAssignment(selectedAssignmentForChecklist);
                                setSelectedAssignmentForChecklist(null);
                              }
                            }}
                          >
                            ✅ Trabajo Completado - Eliminar Asignación
                          </button>
                        </div>
                      )}
                      
                      <div className="checklist-zones">
                        {Array.from(zones.entries()).map(([zone, items]) => {
                          const zoneCompleted = items.filter(i => i.completed).length;
                          const zoneTotal = items.length;
                          const zoneProgress = Math.round((zoneCompleted / zoneTotal) * 100);
                          
                          return (
                            <div key={zone} className="checklist-zone-card">
                              <div className="checklist-zone-header">
                                <h3>{zone}</h3>
                                <span className="zone-progress">{zoneCompleted}/{zoneTotal}</span>
                              </div>
                              <div className="checklist-items">
                                {items.map(item => (
                                  <label key={item.id} className="checklist-item">
                                    <input
                                      type="checkbox"
                                      checked={item.completed}
                                      onChange={async (e) => {
                                        console.log('📝 Actualizando item:', item.id, 'a', e.target.checked);
                                        try {
                                          const result = await realtimeService.updateCleaningChecklistItem(
                                            item.id,
                                            e.target.checked,
                                            user.username
                                          );
                                          if (result) {
                                            console.log('✅ Item actualizado exitosamente:', result);
                                          } else {
                                            console.error('❌ updateCleaningChecklistItem retornó null');
                                          }
                                        } catch (err) {
                                          console.error('❌ Error en onChange:', err);
                                        }
                                      }}
                                      disabled={user.role === 'manager' && user.username !== assignment.employee}
                                    />
                                    <span className={item.completed ? 'completed' : ''}>{item.task}</span>
                                    {item.completed && item.completed_by && (
                                      <span className="completed-by">✓ por {item.completed_by}</span>
                                    )}
                                  </label>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  );
                })()
              ) : (
                <div className="modal-body-empty">
                  <p>Cargando checklist...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Modal para Inventario Sincronizado */}
      {selectedAssignmentForInventory && (
        <div className="modal-overlay" onClick={() => setSelectedAssignmentForInventory(null)}>
          <div className="modal-content large-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📦 Inventario</h2>
              <button className="modal-close" onClick={() => setSelectedAssignmentForInventory(null)}>✕</button>
            </div>
            <div className="modal-body">
              {syncedInventories.get(selectedAssignmentForInventory) ? (
                (() => {
                  const inventoryItems = syncedInventories.get(selectedAssignmentForInventory) || [];
                  const assignment = calendarAssignments.find(a => a.id === selectedAssignmentForInventory);
                  
                  if (!assignment) return <div className="modal-body-empty"><p>Asignación no encontrada</p></div>;
                  
                  // Agrupar por categoría
                  const categories = new Map<string, any[]>();
                  inventoryItems.forEach(item => {
                    if (!categories.has(item.category)) {
                      categories.set(item.category, []);
                    }
                    categories.get(item.category)!.push(item);
                  });
                  
                  const totalItems = inventoryItems.length;
                  const completeItems = inventoryItems.filter(i => i.is_complete).length;
                  const progress = totalItems > 0 ? Math.round((completeItems / totalItems) * 100) : 0;
                  
                  return (
                    <>
                      <div className="modal-stats" style={{marginBottom: '2rem'}}>
                        <div className="stat-box">
                          <p className="stat-box-number">{assignment.employee}</p>
                          <p className="stat-box-label">Empleado</p>
                        </div>
                        <div className="stat-box">
                          <p className="stat-box-number">{progress}%</p>
                          <p className="stat-box-label">Verificado</p>
                        </div>
                        <div className="stat-box">
                          <p className="stat-box-number">{completeItems}/{totalItems}</p>
                          <p className="stat-box-label">Items Completos</p>
                        </div>
                      </div>
                      
                      <div className="progress-bar" style={{marginBottom: '2rem'}}>
                        <div className="progress-fill" style={{width: `${progress}%`}}></div>
                      </div>
                      
                      {/* Botón para eliminar asignación cuando esté completa (solo manager/owner) */}
                      {(user.role === 'manager' || user.role === 'owner') && progress === 100 && (
                        <div style={{marginBottom: '2rem', textAlign: 'center'}}>
                          <button 
                            className="dashboard-btn danger"
                            style={{fontSize: '1rem', padding: '0.75rem 2rem'}}
                            onClick={async () => {
                              if (confirm(`¿Eliminar esta asignación completada de ${assignment.employee}? Esto también eliminará el inventario verificado.`)) {
                                console.log('🗑️ Eliminando asignación:', selectedAssignmentForInventory);
                                await realtimeService.deleteCalendarAssignment(selectedAssignmentForInventory);
                                setSelectedAssignmentForInventory(null);
                              }
                            }}
                          >
                            ✅ Inventario Verificado - Eliminar Asignación
                          </button>
                        </div>
                      )}
                      
                      <div className="checklist-zones">
                        {Array.from(categories.entries()).map(([category, items]) => {
                          const categoryComplete = items.filter(i => i.is_complete).length;
                          const categoryTotal = items.length;
                          
                          return (
                            <div key={category} className="checklist-zone-card">
                              <div className="checklist-zone-header">
                                <h3>{category}</h3>
                                <span className="zone-progress">{categoryComplete}/{categoryTotal}</span>
                              </div>
                              <div className="checklist-items">
                                {items.map(item => (
                                  <label key={item.id} className="checklist-item" style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                                    <input
                                      type="checkbox"
                                      checked={item.is_complete}
                                      onChange={async (e) => {
                                        const newCheckedState = e.target.checked;
                                        console.log('📝 Actualizando item inventario:', item.id, 'a', newCheckedState);
                                        
                                        // Actualizar estado local PRIMERO para respuesta inmediata
                                        setSyncedInventories(prev => {
                                          const newMap = new Map(prev);
                                          const items = newMap.get(selectedAssignmentForInventory) || [];
                                          const updatedItems = items.map(i => 
                                            i.id === item.id ? {
                                              ...i,
                                              is_complete: newCheckedState,
                                              complete: newCheckedState  // También actualizar complete por si acaso
                                            } : i
                                          );
                                          newMap.set(selectedAssignmentForInventory, updatedItems);
                                          return newMap;
                                        });
                                        
                                        // Luego actualizar en Supabase
                                        await realtimeService.updateAssignmentInventoryItem(
                                          item.id,
                                          newCheckedState,
                                          item.notes,
                                          user.username
                                        );
                                      }}
                                      disabled={user.role === 'manager' && user.username !== assignment.employee}
                                    />
                                    <span className={item.is_complete ? 'completed' : ''} style={{flex: '1'}}>
                                      {item.item_name} ({item.quantity})
                                    </span>
                                    {item.is_complete && item.checked_by && (
                                      <span className="completed-by">✓ por {item.checked_by}</span>
                                    )}
                                    {item.notes && (
                                      <span style={{fontSize: '0.875rem', color: '#666'}}>📝 {item.notes}</span>
                                    )}
                                  </label>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  );
                })()
              ) : (
                <div className="modal-body-empty">
                  <p>Cargando inventario...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {view !== 'home' && (
        <button className="dashboard-back-btn" onClick={() => setView('home')} aria-label="Volver al dashboard">← Volver</button>
      )}
    </div>
  );
};

export default Dashboard;

