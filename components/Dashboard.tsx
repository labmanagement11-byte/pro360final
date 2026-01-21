import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { FaHome, FaEdit, FaTrash, FaPlus, FaCheck, FaTimes, FaCalendar, FaClipboard, FaShoppingCart, FaBoxes, FaBell } from 'react-icons/fa';
import './Dashboard.css';
import * as realtimeService from '../utils/supabaseRealtimeService';

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

const MANTENIMIENTO = {
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
  const [view, setView] = useState('home');
  const [selectedModalCard, setSelectedModalCard] = useState<string | null>(null);
  const [reminders, setReminders] = useState<any[]>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(REMINDERS_KEY) : null;
    return saved ? JSON.parse(saved) : defaultReminders;
  });

  // Estado para asignaciones de calendario - AHORA CON SUPABASE
  const CALENDAR_KEY = 'dashboard_calendar_assignments';
  const [calendarAssignments, setCalendarAssignments] = useState<any[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(true);
  const [newAssignment, setNewAssignment] = useState({
    employee: '',
    date: '',
    time: '',
    type: 'Limpieza regular',
  });

  // Estado para tareas en modal - AHORA CON SUPABASE
  const [tasksList, setTasksList] = useState<any[]>([]);
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
    const loadTasks = async () => {
      try {
        setLoadingTasks(true);
        const tasks = await realtimeService.getTasks('EPIC D1');
        console.log('✅ Tareas cargadas:', tasks);
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
      console.log('🔔 Suscribiendo a cambios en tiempo real de tareas...');
      subscription = realtimeService.subscribeToTasks('EPIC D1', (payload: any) => {
        console.log('⚡ Evento recibido en tiempo real:', payload);
        if (payload?.eventType === 'INSERT') {
          console.log('➕ Nueva tarea insertada:', payload.new);
          setTasksList(prev => [...prev, payload.new]);
        } else if (payload?.eventType === 'UPDATE') {
          console.log('✏️ Tarea actualizada:', payload.new);
          setTasksList(prev => prev.map(t => t.id === payload.new?.id ? payload.new : t));
        } else if (payload?.eventType === 'DELETE') {
          console.log('🗑️ Tarea eliminada:', payload.old);
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
  }, []);

  // Cargar inventario desde Supabase con suscripción en tiempo real
  useEffect(() => {
    const loadInventory = async () => {
      try {
        setLoadingInventory(true);
        const items = await realtimeService.getInventoryItems('EPIC D1');
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
      subscription = realtimeService.subscribeToInventory('EPIC D1', (payload: any) => {
        if (payload?.eventType === 'INSERT') {
          setInventoryList(prev => [...prev, payload.new]);
        } else if (payload?.eventType === 'UPDATE') {
          setInventoryList(prev => prev.map(i => i.id === payload.new?.id ? payload.new : i));
        } else if (payload?.eventType === 'DELETE') {
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
  }, []);

  // Cargar asignaciones de calendario desde Supabase con suscripción en tiempo real
  useEffect(() => {
    const loadCalendarAssignments = async () => {
      try {
        setLoadingCalendar(true);
        console.log('📅 Cargando asignaciones de calendario...');
        console.log('👤 Usuario:', { role: user.role, username: user.username });
        
        // Si es empleado, cargar solo sus asignaciones
        const assignments = user.role === 'empleado' 
          ? await realtimeService.getCalendarAssignments('EPIC D1', user.username)
          : await realtimeService.getCalendarAssignments('EPIC D1');
        
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
      console.log('🏠 House: EPIC D1');
      if (user.role === 'empleado') {
        console.log('👤 Empleado:', user.username, '- Solo verá sus propias asignaciones');
      }
      
      subscription = realtimeService.subscribeToCalendarAssignments(
        'EPIC D1',
        (payload: any) => {
          console.log('⚡ Evento de calendario recibido:', payload);
          
          if (payload?.eventType === 'INSERT') {
            console.log('➕ Nueva asignación insertada:', payload.new);
            // Si es empleado, solo agregar si es su asignación
            if (user.role === 'empleado' && payload.new?.employee !== user.username) {
              console.log('⏭️ Asignación no es para este empleado, ignorando');
              return;
            }
            setCalendarAssignments(prev => {
              console.log('📝 Agregando asignación al estado');
              return [...prev, payload.new];
            });
          } else if (payload?.eventType === 'UPDATE') {
            console.log('✏️ Asignación actualizada:', payload.new);
            setCalendarAssignments(prev => prev.map(a => a.id === payload.new?.id ? payload.new : a));
          } else if (payload?.eventType === 'DELETE') {
            console.log('🗑️ Asignación eliminada:', payload.old);
            setCalendarAssignments(prev => prev.filter(a => a.id !== payload.old?.id));
          }
        },
        user.role === 'empleado' ? user.username : undefined
      );
      
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
  }, [user.role, user.username]);

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
      show: user.role === 'owner' || user.role === 'manager',
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
      show: user.role === 'owner',
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
      // @ts-expect-error
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
    const { error } = await supabase!.from('shopping_list').delete().eq('id', item.id);
    if (!error) {
      setShoppingList(shoppingList.filter((_, i) => i !== idx));
    }
  };

  // Marcar compra como completada (mueve todos los productos a historial)
  const completeShopping = async () => {
    const ids = shoppingList.map(i => i.id);
    if (!ids.length) return;
    const { data, error } = await supabase!
      .from('shopping_list')
      // @ts-expect-error
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
    const { error } = await supabase!.from('shopping_list').delete().eq('id', item.id);
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
                onClick={() => {
                  // Para calendar, shopping, reminders: mostrar modal
                  if (['calendar', 'shopping', 'reminders', 'checklist', 'inventory', 'tasks'].includes(card.key)) {
                    setSelectedModalCard(card.key);
                  } else {
                    // Para los demás: cambiar vista
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
                          {(user.role === 'owner' || user.role === 'manager') && (
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
                {(user.role === 'empleado' || user.role === 'owner' || user.role === 'manager') && (
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
              {(user.role === 'owner' || user.role === 'manager') && shoppingList.length > 0 && (
                <button
                  className="dashboard-btn main"
                  style={{ marginTop: 16 }}
                  onClick={completeShopping}
                >
                  Marcar compra como completada
                </button>
              )}
              {(user.role === 'owner' || user.role === 'manager') && shoppingHistory.length > 0 && (
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
      {view === 'checklist' && <Checklist user={user} users={users} />}
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
                          
                          const result = await realtimeService.createCalendarAssignment({
                            employee: newAssignment.employee,
                            date: newAssignment.date,
                            time: newAssignment.time,
                            type: newAssignment.type,
                            house: 'EPIC D1'
                          });
                          
                          if (result && result.id) {
                            console.log('✅ Asignación creada:', result);
                            
                            // Crear los items del checklist para esta asignación
                            console.log('🧹 Creando items del checklist para asignación:', result.id);
                            const checklistItems = await realtimeService.createCleaningChecklistItems(
                              result.id,
                              newAssignment.employee,
                              newAssignment.type,  // Pasar el tipo de limpieza
                              'EPIC D1'
                            );
                            console.log('✅ Checklist creado con', checklistItems.length, 'items');

                            // Crear inventario para la asignación
                            const inventoryItems = await realtimeService.createAssignmentInventory(
                              result.id,
                              newAssignment.employee,
                              'EPIC D1'
                            );
                            console.log('✅ Inventario creado con', inventoryItems.length, 'items');
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
                              <button 
                                className="dashboard-btn success"
                                onClick={() => {
                                  console.log('📦 Abriendo inventario para asignación:', assignment.id);
                                  setSelectedAssignmentForInventory(assignment.id);
                                }}
                              >
                                📦 Ver Inventario
                              </button>
                              {(user.role === 'owner' || user.role === 'manager') && (
                                <button 
                                  className="dashboard-btn danger"
                                  onClick={() => {
                                    setCalendarAssignments(calendarAssignments.filter((_, i) => i !== idx));
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
              
              {selectedModalCard === 'shopping' && (
                <>
                  {/* Formulario para empleados agregar productos */}
                  {(user.role === 'empleado' || user.role === 'manager' || user.role === 'owner') && (
                    <div className="modal-assignment-form">
                      <h3>🛒 Agregar a Lista de Compras</h3>
                      <form onSubmit={addProduct}>
                        <div className="assignment-form-grid">
                          <div className="form-group">
                            <label>📝 Producto</label>
                            <input
                              type="text"
                              value={newProduct.name}
                              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                              required
                              placeholder="Ej: Papel higiénico"
                              title="Nombre del producto"
                            />
                          </div>
                          
                          <div className="form-group">
                            <label>🔢 Cantidad</label>
                            <input
                              type="number"
                              value={newProduct.qty}
                              min={1}
                              onChange={(e) => setNewProduct({ ...newProduct, qty: Number(e.target.value) })}
                              title="Cantidad"
                              style={{width: '100%'}}
                            />
                          </div>
                        </div>
                        
                        <button type="submit" className="dashboard-btn main" style={{width: '100%'}}>
                          ➕ Agregar a la Lista
                        </button>
                      </form>
                    </div>
                  )}
                  
                  <div className="subcards-grid">
                    <div className="modal-stats">
                      <div className="stat-box">
                        <p className="stat-box-number">{shoppingList.length}</p>
                        <p className="stat-box-label">Productos pendientes</p>
                      </div>
                      <div className="stat-box">
                        <p className="stat-box-number">{shoppingList.reduce((sum, item) => sum + item.qty, 0)}</p>
                        <p className="stat-box-label">Cantidad total</p>
                      </div>
                      <div className="stat-box">
                        <p className="stat-box-number">{shoppingHistory.length}</p>
                        <p className="stat-box-label">Compras realizadas</p>
                      </div>
                    </div>
                    
                    {shoppingList.length > 0 ? (
                      shoppingList.map((item, idx) => (
                        <div key={item.id || idx} className="subcard">
                          <div className="subcard-header">
                            <div className="subcard-icon">🛒</div>
                            <h3>{item.name}</h3>
                          </div>
                          <div className="subcard-content">
                            <p><strong>🔢 Cantidad:</strong> {item.qty} unidades</p>
                            <span className="subcard-badge success">✅ Por comprar</span>
                          </div>
                          
                          {/* Botón para manager: marcar como comprado */}
                          {(user.role === 'owner' || user.role === 'manager') && (
                            <div className="subcard-actions">
                              <button 
                                onClick={() => deleteProduct(idx)}
                                className="danger"
                              >
                                🗑️ Eliminar
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
                    
                    {/* Botón para manager: Marcar toda la compra como completada */}
                    {(user.role === 'owner' || user.role === 'manager') && shoppingList.length > 0 && (
                      <div className="subcard-full-width" style={{padding: '1rem'}}>
                        <button 
                          className="dashboard-btn main" 
                          onClick={completeShopping}
                          style={{width: '100%', padding: '1rem', fontSize: '1.1rem'}}
                        >
                          ✅ Marcar Todo como Comprado
                        </button>
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
                              <h3>{h.completed_at ? new Date(h.completed_at).toLocaleDateString('es-ES') : 'Compra'}</h3>
                            </div>
                            <div className="subcard-content">
                              <p><strong>📝 Producto:</strong> {h.name}</p>
                              <p><strong>🔢 Cantidad:</strong> {h.qty}</p>
                              <p><strong>📅 Fecha:</strong> {h.completed_at ? new Date(h.completed_at).toLocaleString('es-ES') : 'N/A'}</p>
                              <span className="subcard-badge">✅ Comprado</span>
                            </div>
                            <div className="subcard-actions">
                              <button 
                                className="danger"
                                onClick={() => deleteHistory(idx)}
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
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        if (editingReminderIdx >= 0) {
                          setReminders(reminders.map((r, i) => i === editingReminderIdx ? newReminder : r));
                          setEditingReminderIdx(-1);
                        } else {
                          setReminders([...reminders, newReminder]);
                        }
                        setNewReminder({ name: '', due: '', bank: '', account: '' });
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
                                setNewReminder({ name: '', due: '', bank: '', account: '' });
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
                                onClick={() => {
                                  setReminders(reminders.filter((_, i) => i !== idx));
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
                                  <label key={idx} style={{display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', padding: '0.5rem', borderRadius: '0.375rem', backgroundColor: task.completed ? '#f0fdf4' : '#fafafa', transition: 'background-color 0.2s'}}>
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
                  {/* Formulario para agregar inventario (Manager/Owner) */}
                  {(user.role === 'owner' || user.role === 'manager') && (
                    <div className="modal-assignment-form">
                      <h3>📦 {editingInventoryIdx >= 0 ? 'Editar Artículo' : 'Agregar al Inventario'}</h3>
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const currentInventory = houses[allowedHouseIdx]?.inventory || [];
                        const newItem = { ...newInventoryItem, complete: true, notes: '' };
                        
                        if (editingInventoryIdx >= 0) {
                          const updatedInventory = currentInventory.map((item: any, i: number) => 
                            i === editingInventoryIdx ? newItem : item
                          );
                          setHouses(houses.map((h, i) => i === allowedHouseIdx ? { ...h, inventory: updatedInventory } : h));
                          setEditingInventoryIdx(-1);
                        } else {
                          setHouses(houses.map((h, i) => i === allowedHouseIdx ? { 
                            ...h, 
                            inventory: [...currentInventory, newItem] 
                          } : h));
                        }
                        setNewInventoryItem({ name: '', quantity: '', location: '', complete: true, notes: '' });
                      }}>
                        <div className="assignment-form-grid">
                          <div className="form-group">
                            <label>📝 Nombre del artículo</label>
                            <input
                              type="text"
                              value={newInventoryItem.name}
                              onChange={(e) => setNewInventoryItem({...newInventoryItem, name: e.target.value})}
                              required
                              placeholder="Ej: Toallas"
                              title="Nombre del artículo"
                            />
                          </div>
                          
                          <div className="form-group">
                            <label>🔢 Cantidad</label>
                            <input
                              type="number"
                              value={newInventoryItem.quantity}
                              onChange={(e) => setNewInventoryItem({...newInventoryItem, quantity: e.target.value})}
                              required
                              min="1"
                              placeholder="Ej: 10"
                              title="Cantidad"
                            />
                          </div>
                          
                          <div className="form-group" style={{gridColumn: '1 / -1'}}>
                            <label>📍 Ubicación</label>
                            <input
                              type="text"
                              value={newInventoryItem.location}
                              onChange={(e) => setNewInventoryItem({...newInventoryItem, location: e.target.value})}
                              required
                              placeholder="Ej: Baño principal"
                              title="Ubicación"
                            />
                          </div>
                        </div>
                        
                        <div style={{display: 'flex', gap: '1rem'}}>
                          <button type="submit" className="dashboard-btn main" style={{flex: 1}}>
                            {editingInventoryIdx >= 0 ? '✏️ Actualizar' : '➕ Agregar al Inventario'}
                          </button>
                          {editingInventoryIdx >= 0 && (
                            <button 
                              type="button" 
                              className="dashboard-btn danger" 
                              onClick={() => {
                                setEditingInventoryIdx(-1);
                                setNewInventoryItem({ name: '', quantity: '', location: '', complete: true, notes: '' });
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
                    <div className="modal-stats">
                      <div className="stat-box">
                        <p className="stat-box-number">{(houses[allowedHouseIdx]?.inventory || []).length}</p>
                        <p className="stat-box-label">Artículos totales</p>
                      </div>
                      <div className="stat-box">
                        <p className="stat-box-number">
                          {(houses[allowedHouseIdx]?.inventory || []).filter((item: any) => item.complete).length}
                        </p>
                        <p className="stat-box-label">Completos</p>
                      </div>
                      <div className="stat-box">
                        <p className="stat-box-number">
                          {(houses[allowedHouseIdx]?.inventory || []).filter((item: any) => !item.complete).length}
                        </p>
                        <p className="stat-box-label">Incompletos</p>
                      </div>
                    </div>
                    {(houses[allowedHouseIdx]?.inventory || []).length > 0 ? (
                      (houses[allowedHouseIdx]?.inventory || []).map((item: any, idx: number) => (
                        <div key={idx} className="subcard">
                          <div className="subcard-header">
                            <div className="subcard-icon">📦</div>
                            <h3>{item.name || 'Sin nombre'}</h3>
                          </div>
                          <div className="subcard-content">
                            <p><strong>🔢 Cantidad:</strong> {item.quantity || 0}</p>
                            <p><strong>📍 Ubicación:</strong> {item.location || 'No especificada'}</p>
                            {item.notes && (
                              <p><strong>📝 Notas:</strong> {item.notes}</p>
                            )}
                            <span className={`subcard-badge ${item.complete ? 'success' : 'danger'}`}>
                              {item.complete ? '✅ Completo' : '⚠️ Incompleto'}
                            </span>
                          </div>
                          
                          {/* Botones para empleados: marcar completo/incompleto */}
                          {user.role === 'empleado' && (
                            <div className="subcard-actions">
                              {item.complete ? (
                                <button 
                                  className="danger"
                                  onClick={() => {
                                    const reason = prompt('¿Por qué está incompleto o cuántos faltan?');
                                    if (reason) {
                                      const updatedInventory = (houses[allowedHouseIdx]?.inventory || []).map((inv: any, i: number) => 
                                        i === idx ? { ...inv, complete: false, notes: reason } : inv
                                      );
                                      setHouses(houses.map((h, i) => i === allowedHouseIdx ? { ...h, inventory: updatedInventory } : h));
                                    }
                                  }}
                                >
                                  ⚠️ Marcar Incompleto
                                </button>
                              ) : (
                                <button 
                                  onClick={() => {
                                    const updatedInventory = (houses[allowedHouseIdx]?.inventory || []).map((inv: any, i: number) => 
                                      i === idx ? { ...inv, complete: true, notes: '' } : inv
                                    );
                                    setHouses(houses.map((h, i) => i === allowedHouseIdx ? { ...h, inventory: updatedInventory } : h));
                                  }}
                                >
                                  ✅ Marcar Completo
                                </button>
                              )}
                            </div>
                          )}
                          
                          {/* Botones para manager: editar y eliminar */}
                          {(user.role === 'owner' || user.role === 'manager') && (
                            <div className="subcard-actions">
                              <button 
                                onClick={() => {
                                  setNewInventoryItem({
                                    name: item.name,
                                    quantity: item.quantity.toString(),
                                    location: item.location,
                                    complete: item.complete,
                                    notes: item.notes || ''
                                  });
                                  setEditingInventoryIdx(idx);
                                }}
                              >
                                ✏️ Editar
                              </button>
                              <button 
                                className="danger"
                                onClick={() => {
                                  const updatedInventory = (houses[allowedHouseIdx]?.inventory || []).filter((_: any, i: number) => i !== idx);
                                  setHouses(houses.map((h, i) => i === allowedHouseIdx ? { ...h, inventory: updatedInventory } : h));
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
                        <p>📭 No hay artículos en el inventario</p>
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
                          const result = await realtimeService.createTask({
                            title: newTask.title,
                            description: newTask.description,
                            assignedTo: newTask.assignedTo,
                            type: newTask.type,
                            house: 'EPIC D1',
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
                                 task.type === 'Limpieza general' ? '✨' : '🔧'}
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
                                    onClick={() => {
                                      setNewTask({
                                        title: task.title,
                                        description: task.description,
                                        assignedTo: task.assignedTo,
                                        type: task.type
                                      });
                                      setEditingTaskIdx(idx);
                                    }}
                                  >
                                    ✏️ Editar
                                  </button>
                                  <button 
                                    className="danger"
                                    onClick={async () => {
                                      await realtimeService.deleteTask(task.id);
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
                                        await realtimeService.updateCleaningChecklistItem(
                                          item.id,
                                          e.target.checked,
                                          user.username
                                        );
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
                                        console.log('📝 Actualizando item inventario:', item.id, 'a', e.target.checked);
                                        await realtimeService.updateAssignmentInventoryItem(
                                          item.id,
                                          e.target.checked,
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

