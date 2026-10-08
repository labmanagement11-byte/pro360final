import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';
import { FaCheck, FaTimes, FaCalendar, FaClipboard, FaShoppingCart, FaBoxes, FaBell } from 'react-icons/fa';
import './Dashboard.css';
import './AssignedTasks.css';
import * as realtimeService from '../utils/supabaseRealtimeService';
import { RealtimeNotificationsManager } from './RealtimeNotification';
import './RealtimeNotification.css';

import Tasks from './Tasks';
import { archiveCalendarAssignment, shouldArchiveAssignment } from '../utils/archiveCompletedAssignment';
import { canCloseExtraTask, closeExtraTaskByAdmin, confirmExtraTaskByEmployee } from '../utils/completeExtraTask';
import { canDeleteCompletedJob, deleteCompletedJob, isCompletedWithinRetention } from '../utils/deleteCompletedJob';
import { closeCalendarAssignment, employeeConfirmation, syncPendingEmployeeConfirmations } from '../utils/calendarWork';
import { isEmpleadoRole, nameBelongsToEmployee } from '../utils/employeeScope';
import {
  REMINDER_FREQUENCY_OPTIONS,
  canMarkReminderDone,
  dedupeRemindersById,
  doneByLabel,
  formatShortDate,
  frequencyLabel,
  isRecurring,
  nextDueDate,
  upsertReminderById,
  type ReminderFrequency,
} from '../utils/reminderRecurrence';
import {
  HouseCustomCardPanel,
  HouseCustomCardTiles,
  customCardModalKey,
  parseCustomCardModalKey,
  useHouseCustomCards,
} from './HouseCustomCards';

// Tarjeta personalizada para tareas asignadas
const AssignedTasksCard = ({ user, onNavigateToInventory, onTaskCompleted, resolveAssignmentIdForTask, assignmentIdMap }: { 
  user: any; 
  onNavigateToInventory?: () => void;
  onTaskCompleted?: (taskId: string, assignmentId: string) => void;
  resolveAssignmentIdForTask: (task: any) => Promise<string | null>;
  assignmentIdMap: Record<string, string>;
}) => {
  const [assignedTasks, setAssignedTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inventoryByAssignment, setInventoryByAssignment] = useState<Record<string, any[]>>({});
  const [inventoryLoading, setInventoryLoading] = useState<Record<string, boolean>>({});
  const [inventoryProgress, setInventoryProgress] = useState<{ [key: string]: boolean }>({});
  const [expandedInventory, setExpandedInventory] = useState<Set<string>>(new Set());
  const [openAssignedZone, setOpenAssignedZone] = useState<string | null>(null);
  const [assignedView, setAssignedView] = useState<'pendiente' | 'hecho' | 'todo'>('pendiente');
  const [houseChecklistRows, setHouseChecklistRows] = useState<any[]>([]);
  const [houseChecklistByHouse, setHouseChecklistByHouse] = useState<Record<string, any[]>>({});

  // Estados para inventario completo de la casa
  const [houseInventory, setHouseInventory] = useState<any[]>([]);
  const [houseInventoryExpanded, setHouseInventoryExpanded] = useState(false);
  const [houseInventoryLoading, setHouseInventoryLoading] = useState(false);
  const [houseInventoryProgress, setHouseInventoryProgress] = useState<Record<string, boolean>>({});
  // Estados para formulario de items incompletos (faltantes/roto)
  const [incompleteFormOpen, setIncompleteFormOpen] = useState<Record<string, boolean>>({});
  const [incompleteData, setIncompleteData] = useState<Record<string, { missing: number; reason: string }>>({});

  // Suscripción realtime al inventario de la casa para sincronización entre dispositivos
  // Se activa siempre que el usuario tenga una casa asignada
  useEffect(() => {
    if (!supabase || !user.house) return;
    
    const houseName = user.house || user.house_id;
    console.log('📡 [Realtime] Suscribiendo a cambios de inventario de:', houseName);
    
    const channel = (supabase as any)
      .channel(`house-inventory-sync-${houseName}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory', filter: `house=eq.${houseName}` }, async (payload: any) => {
        console.log('📦 [Realtime] Cambio en inventario detectado:', payload);
        // Recargar inventario completo para sincronizar
        const items = await realtimeService.getInventoryItems(houseName);
        setHouseInventory(items || []);
        // Actualizar progreso local basado en los items actualizados
        const progressUpdate: Record<string, boolean> = {};
        (items || []).forEach((item: any) => {
          progressUpdate[`house_${item.id}`] = item.complete ?? false;
        });
        setHouseInventoryProgress(prev => ({ ...prev, ...progressUpdate }));
      })
      .subscribe((status: string) => {
        console.log('📡 [Realtime] Estado de suscripción:', status);
      });
    
    return () => {
      console.log('📡 [Realtime] Desuscribiendo de inventario de:', houseName);
      channel.unsubscribe();
    };
  }, [user.house, user.house_id]);

  // Cargar checklist de la casa del usuario; si house==='all', cargar por casa de cada asignación
  useEffect(() => {
    const houseName = String(user.house || user.house_id || '').trim();
    if (!supabase) {
      setHouseChecklistRows([]);
      return;
    }
    if (!houseName || houseName === 'all') {
      setHouseChecklistRows([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('checklist')
          .select('*')
          .eq('house', houseName)
          .order('id', { ascending: true });
        if (cancelled) return;
        if (error) {
          console.error('[AssignedTasksCard] Error cargando checklist de casa:', error);
          setHouseChecklistRows([]);
          return;
        }
        const only = (data || []).filter((row: any) => String(row.house || '').trim() === houseName);
        setHouseChecklistRows(only);
        setHouseChecklistByHouse(prev => ({ ...prev, [houseName]: only }));
      } catch (err) {
        if (!cancelled) setHouseChecklistRows([]);
      }
    })();
    const channel = (supabase as any)
      .channel(`assigned-house-checklist-${houseName.replace(/\s+/g, '-')}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checklist', filter: `house=eq.${houseName}` }, async () => {
        const { data } = await (supabase as any).from('checklist').select('*').eq('house', houseName).order('id', { ascending: true });
        const only = (data || []).filter((row: any) => String(row.house || '').trim() === houseName);
        setHouseChecklistRows(only);
        setHouseChecklistByHouse(prev => ({ ...prev, [houseName]: only }));
      })
      .subscribe();
    return () => {
      cancelled = true;
      try { (supabase as any).removeChannel(channel); } catch {}
    };
  }, [user.house, user.house_id]);

  // When user.house==='all', load checklist rows for each assignment house (never filter by 'all')
  useEffect(() => {
    const ownerHouse = String(user.house || user.house_id || '').trim();
    if (ownerHouse !== 'all' || !supabase || !assignedTasks?.length) return;
    let cancelled = false;
    const houses = Array.from(new Set(
      assignedTasks.map((t: any) => String(t.house || '').trim()).filter((h: string) => h && h !== 'all')
    ));
    (async () => {
      const next: Record<string, any[]> = {};
      for (const h of houses) {
        if (houseChecklistByHouse[h]?.length) { next[h] = houseChecklistByHouse[h]; continue; }
        try {
          const { data, error } = await (supabase as any)
            .from('checklist')
            .select('*')
            .eq('house', h)
            .order('id', { ascending: true });
          if (cancelled) return;
          next[h] = error ? [] : (data || []).filter((row: any) => String(row.house || '').trim() === h);
        } catch { next[h] = []; }
      }
      if (!cancelled) setHouseChecklistByHouse(prev => ({ ...prev, ...next }));
    })();
    return () => { cancelled = true; };
  }, [user.house, user.house_id, assignedTasks]);

  useEffect(() => {
    console.log('[AssignedTasksCard] Usuario:', user);
    console.log('[AssignedTasksCard] Tareas asignadas recibidas:', assignedTasks);
  }, [assignedTasks, user]);

  // Mantener referencia a las suscripciones para limpiar (pueden ser varias)
  const subscriptionRef = useRef<any[]>([]);
  const inventorySubsRef = useRef<Map<string, any>>(new Map());

  // Cargar tareas y suscribirse en tiempo real
  useEffect(() => {
    let isMounted = true;
    let refreshInterval: NodeJS.Timeout | null = null;
    
    const fetchAssignedTasks = async () => {
      const isManagerUser = user?.role && user.role.toLowerCase().includes('manager');
      console.log(`📅 [Dashboard] Cargando asignaciones para usuario:`, {
        username: user.username,
        house: user.house,
        house_id: user.house_id
      });
      
      // Query usando columnas correctas (house y employee como texto)
      const houseFilter = user.house || user.house_id;
      console.log(`🏠 [Dashboard] Filtrando por casa: ${houseFilter} para ${user.username} (${user.role})`);
      let assignQuery = (supabase as any)
        .from('calendar_assignments')
        .select('*')
        .in('type', ['Limpieza', 'Limpieza profunda', 'Limpieza regular', 'Mantenimiento']);
      // Never query house='all' — that mixes nothing useful; owner without house sees none here
      if (houseFilter && houseFilter !== 'all') {
        assignQuery = assignQuery.eq('house', houseFilter);
      }
      const { data, error } = await assignQuery;
      
      if (error) {
        console.error(`❌ [Dashboard] Error fetching assignments:`, error);
      }
      
      if (isMounted) {
        // Empleado: solo sus trabajos. Manager sigue viendo toda la casa.
        // Dueño u otro rol que no es manager conserva el filtro exacto de antes.
        const employeeViewer = isEmpleadoRole(user.role);
        const isOwnerUser = ['owner', 'dueno'].includes(String(user.role || '').toLowerCase())
          || String(user.username || '').trim().toLowerCase() === 'jonathan';
        const scoped = employeeViewer
          ? (data || []).filter((a: any) => nameBelongsToEmployee(a.employee, user))
          : (isManagerUser || isOwnerUser)
            ? (data || [])
            : (data || []).filter((a: any) => a.employee === user.username);
        const filtered = scoped.filter((a: any) => !a.completed);
        const visible = employeeViewer ? filtered : await syncPendingEmployeeConfirmations(filtered);
        console.log(`✅ [Dashboard] Asignaciones visibles:`, visible.length);
        setAssignedTasks(visible || []);
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

  const loadAssignmentInventory = async (task: any) => {
    if (!task?.id) return null;
    const assignmentId = await resolveAssignmentIdForTask(task);
    if (!assignmentId) return null;
    console.log('📦 [loadAssignmentInventory] Task ID:', task.id, 'Resolved ID:', assignmentId, 'Type:', typeof task.id);

    const keyForStorage = assignmentId;
    console.log('📦 [loadAssignmentInventory] Using key:', keyForStorage);

    setInventoryLoading(prev => ({ ...prev, [keyForStorage]: true }));
    try {
      const items = await realtimeService.getAssignmentInventory(assignmentId);
      console.log('📦 [loadAssignmentInventory] Items fetched:', items?.length, 'Items:', items);
      if ((!items || items.length === 0) && !String(task.type || '').toLowerCase().includes('mantenimiento')) {
        console.log('📦 [loadAssignmentInventory] Creating new inventory...');
        const created = await realtimeService.createAssignmentInventory(
          assignmentId,
          task.employee || user.username,
          task.house || user.house
        );
        console.log('📦 [loadAssignmentInventory] Inventory created:', created?.length, 'items');
        setInventoryByAssignment(prev => ({ ...prev, [keyForStorage]: created || [] }));
      } else {
        console.log('📦 [loadAssignmentInventory] Using existing items:', items?.length);
        setInventoryByAssignment(prev => ({ ...prev, [keyForStorage]: items || [] }));
      }
    } catch (error) {
      console.error('❌ Error loading assignment inventory:', error);
    } finally {
      setInventoryLoading(prev => ({ ...prev, [keyForStorage]: false }));
    }

    return keyForStorage;
  };

  // Cargar inventario por asignación para empleados
  useEffect(() => {
    if (!user || user.role?.toLowerCase().includes('manager')) return;
    if (!assignedTasks || assignedTasks.length === 0) return;

    const loadAll = async () => {
      for (const task of assignedTasks) {
        const assignmentId = await loadAssignmentInventory(task);
        if (!assignmentId) continue;

        if (!inventorySubsRef.current.has(assignmentId)) {
          const sub = realtimeService.subscribeToAssignmentInventory(assignmentId, (payload: any) => {
            if (payload?.eventType === 'INSERT') {
              setInventoryByAssignment(prev => {
                const items = prev[assignmentId] || [];
                return { ...prev, [assignmentId]: items.some((i: any) => i.id === payload.new?.id) ? items : [...items, payload.new] };
              });
            } else if (payload?.eventType === 'UPDATE') {
              setInventoryByAssignment(prev => {
                const items = prev[assignmentId] || [];
                return { ...prev, [assignmentId]: items.map((i: any) => i.id === payload.new?.id ? payload.new : i) };
              });
            } else if (payload?.eventType === 'DELETE') {
              setInventoryByAssignment(prev => {
                const items = prev[assignmentId] || [];
                return { ...prev, [assignmentId]: items.filter((i: any) => i.id !== payload.old?.id) };
              });
            }
          });
          if (sub) inventorySubsRef.current.set(assignmentId, sub);
        }
      }
    };
    loadAll();

    return () => {
      inventorySubsRef.current.forEach((sub) => {
        try {
          if (supabase && sub) supabase.removeChannel(sub);
        } catch (err) {
          console.error('Error removing inventory subscription:', err);
        }
      });
      inventorySubsRef.current.clear();
    };
  }, [assignedTasks, user]);

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

  // Cargar progreso de subtareas desde calendar_assignments.notes (fallback robusto)
  useEffect(() => {
    if (!user || !user.house || !supabase) return;

    const isManager = user.role && (user.role.toLowerCase().includes('manager') || user.role === 'owner' || user.role === 'dueno');
    const currentHouse = user.house || user.house_id;

    const parseProgressFromNotes = (notes: any): boolean[] => {
      if (!notes) return [];
      if (typeof notes === 'string') {
        try {
          const parsed = JSON.parse(notes);
          return Array.isArray(parsed?.subtasks_progress) ? parsed.subtasks_progress : [];
        } catch {
          return [];
        }
      }
      return Array.isArray(notes?.subtasks_progress) ? notes.subtasks_progress : [];
    };

    const loadProgress = async () => {
      let query = (supabase as any)
        .from('calendar_assignments')
        .select('id, house, employee, notes')
        .eq('house', currentHouse)
        .in('type', ['Limpieza', 'Limpieza profunda', 'Limpieza regular', 'Mantenimiento']);

      const { data, error } = await query;
      if (error || !data) return;

      const employeeViewer = isEmpleadoRole(user.role);
      const rows = isManager
        ? data
        : data.filter((row: any) => employeeViewer
            ? nameBelongsToEmployee(row.employee, user)
            : row.employee === user.username);

      const progressMap: { [key: string]: boolean[] } = {};
      rows.forEach((row: any) => {
        const progressArr = parseProgressFromNotes(row.notes);
        if (isManager) {
          progressMap[`${row.id}_${row.employee}`] = progressArr;
        } else {
          progressMap[String(row.id)] = progressArr;
        }
      });
      setSubtaskProgress(progressMap);
    };

    loadProgress();

    const channel = (supabase as any)
      .channel(`calendar-assignment-progress-${String(currentHouse).replace(/\s+/g, '-')}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_assignments' }, (payload: any) => {
        const changed = payload?.new || payload?.old;
        if (!changed || changed.house !== currentHouse) return;

        const progressArr = parseProgressFromNotes(payload?.new?.notes);
        if (isManager) {
          const employeeName = payload?.new?.employee || payload?.old?.employee;
          if (!employeeName) return;
          setSubtaskProgress(prev => ({ ...prev, [`${changed.id}_${employeeName}`]: progressArr }));
        } else {
          const who = payload?.new?.employee || payload?.old?.employee;
          const employeeViewer = isEmpleadoRole(user.role);
          if (employeeViewer ? !nameBelongsToEmployee(who, user) : who !== user.username) return;
          setSubtaskProgress(prev => ({ ...prev, [String(changed.id)]: progressArr }));
        }
      })
      .subscribe();

    return () => {
      try {
        (supabase as any).removeChannel(channel);
      } catch {
        // noop
      }
    };
  }, [user]);

  function buildSubtasksFromHouseChecklist(type: string, houseOverride?: string): { [zona: string]: string[] } | null {
    const typeLower = String(type || '').toLowerCase();
    const isDeep = typeLower.includes('profund');
    const isMaint = typeLower.includes('manten');
    const houseKey = String(houseOverride || '').trim();
    const rows = (houseKey && houseChecklistByHouse[houseKey])
      ? houseChecklistByHouse[houseKey]
      : (houseChecklistRows || []);
    if (!rows.length) {
      // Casa sin checklist propio: vacío (no mezclar globals de otras casas)
      return {};
    }
    const result: { [zona: string]: string[] } = {};
    rows.forEach((row: any) => {
      const room = String(row.room || 'GENERAL').trim() || 'GENERAL';
      const assigned = String(row.assigned_to || '').toLowerCase();
      const roomUp = room.toUpperCase();
      const roomIsDeep = roomUp.includes('PROFUNDA') || roomUp === 'LIMPIEZA PROFUNDA';
      const roomIsMaint = roomUp.includes('MANTEN') || ['ÁREAS VERDES','PISCINA Y AGUA','RUTINA DE MANTENIMIENTO','SISTEMAS ELÉCTRICOS'].includes(roomUp);
      let include = false;
      if (isMaint) include = assigned.includes('manten') || roomIsMaint;
      else if (isDeep) include = assigned.includes('profund') || roomIsDeep;
      else include = !assigned.includes('manten') && !assigned.includes('profund') && !roomIsDeep && !roomIsMaint;
      if (!include) return;
      if (!result[room]) result[room] = [];
      result[room].push(String(row.item || ''));
    });
    return result;
  }

  function getSubtasks(type: string, taskHouse?: string) {
    const effectiveHouse = String(taskHouse || '').trim() && String(taskHouse).trim() !== 'all'
      ? String(taskHouse).trim()
      : (String(user.house || user.house_id || '').trim() !== 'all' ? String(user.house || user.house_id || '').trim() : '');
    const fromHouse = buildSubtasksFromHouseChecklist(type, effectiveHouse);
    if (fromHouse && Object.keys(fromHouse).length > 0) return fromHouse;
    const rows = effectiveHouse && houseChecklistByHouse[effectiveHouse]
      ? houseChecklistByHouse[effectiveHouse]
      : houseChecklistRows;
    if ((rows || []).length === 0) return {};
    return fromHouse;
  }

  // Guardar progreso de subtareas en Supabase (puedes mejorar esto usando una tabla aparte si lo deseas)
  async function handleSubtaskToggle(taskId: string, idx: number, checked: boolean, totalSubtasks: number) {
    setSubtaskProgress(prev => {
      const arr = prev[taskId] ? [...prev[taskId]] : [];
      arr[idx] = checked;
      return { ...prev, [taskId]: arr };
    });
    // Guardar progreso en Supabase (calendar_assignments.notes)
    const current = subtaskProgress[taskId] ? [...subtaskProgress[taskId]] : [];
    current[idx] = checked;
    if (!supabase) return;

    const now = new Date().toISOString();
    const { data: assignmentRow } = await (supabase as any)
      .from('calendar_assignments')
      .select('notes')
      .eq('id', taskId)
      .single();

    let notesObj: any = {};
    const rawNotes = assignmentRow?.notes;
    if (rawNotes) {
      if (typeof rawNotes === 'string') {
        try {
          notesObj = JSON.parse(rawNotes);
        } catch {
          notesObj = { legacy_note: rawNotes };
        }
      } else {
        notesObj = rawNotes;
      }
    }

    const allDone = totalSubtasks > 0 && current.length >= totalSubtasks && current.slice(0, totalSubtasks).every(Boolean);
    if (allDone) {
      notesObj.employee_confirmed_by = user.username;
      notesObj.employee_confirmed_at = now;
    } else {
      delete notesObj.employee_confirmed_by;
      delete notesObj.employee_confirmed_at;
    }
    const nextNotes = JSON.stringify({
      ...notesObj,
      subtasks_progress: current,
      progress_updated_by: user.username,
      progress_updated_at: now,
    });

    const updateData: any = {
      notes: nextNotes,
      updated_at: now
    };

    // Jonathan cierra el trabajo. Aquí solo se guarda el progreso en verde.

    await (supabase as any)
      .from('calendar_assignments')
      .update(updateData)
      .eq('id', taskId);

    setAssignedTasks(prev => prev.map(t => String(t.id) === String(taskId) ? { ...t, notes: nextNotes } : t));

    // El estado final "Trabajo Completado" lo confirma admin/manager.
    // Aquí solo guardamos progreso por subtarea para mantener evidencia en tiempo real.
  }

  // Manejar complete/incompleto de items de assignment_inventory (empleado toggle)
  async function handleAssignmentInventoryToggle(assignmentKey: string, item: any, isComplete: boolean) {
    // Optimistic update
    setInventoryByAssignment(prev => ({
      ...prev,
      [assignmentKey]: (prev[assignmentKey] || []).map((i: any) =>
        i.id === item.id ? { ...i, is_complete: isComplete, checked_by: isComplete ? user.username : null } : i
      )
    }));
    // Guardar en DB
    await realtimeService.updateAssignmentInventoryItem(item.id, isComplete, undefined, user.username);
  }

  // Manejar completar items de inventario
  async function handleInventoryItemToggle(assignmentId: string, itemId: string, checked: boolean, totalItems: number) {
    const progressKey = `${assignmentId}_${itemId}`;
    setInventoryProgress(prev => {
      return { ...prev, [progressKey]: checked };
    });

    if (!supabase) return;

    // Obtener o crear registro de progreso de inventario
    const { data: existing, error } = await (supabase as any)
      .from('inventory_progress')
      .select('id')
      .eq('assignment_id', assignmentId)
      .eq('item_id', itemId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing && existing.id) {
      await (supabase as any)
        .from('inventory_progress')
        .update({ completed: checked, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await (supabase as any)
        .from('inventory_progress')
        .insert({
          assignment_id: assignmentId,
          item_id: itemId,
          user_id: user.id,
          house_id: user.house_id || user.house,
          completed: checked,
          updated_at: new Date().toISOString(),
        });
    }
  }

  // Cargar progreso de inventario desde Supabase
  useEffect(() => {
    if (!user || !user.id || !user.house) return;
    const isManager = user.role && user.role.toLowerCase().includes('manager');
    
    const fetchInventoryProgress = async () => {
      if (!supabase) return;
      let query = (supabase as any)
        .from('inventory_progress')
        .select('assignment_id, item_id, user_id, completed');
      
      if (!isManager) {
        query = query.eq('user_id', user.id);
      } else {
        query = query.eq('house_id', user.house_id || user.house);
      }
      
      const { data, error } = await query;
      if (!error && data) {
        const progressMap: { [key: string]: boolean } = {};
        data.forEach((row: any) => {
          progressMap[`${row.assignment_id}_${row.item_id}`] = row.completed;
        });
        setInventoryProgress(progressMap);
      }
    };
    fetchInventoryProgress();

    // Suscripción realtime a cambios en inventory_progress
    if (!supabase) return;
    const channel = (supabase as any).channel('inventory_progress_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_progress' }, (payload: any) => {
        if (!payload.new) return;
        if (!isManager) {
          if (payload.new.user_id === user.id) {
            setInventoryProgress(prev => ({ 
              ...prev, 
              [`${payload.new.assignment_id}_${payload.new.item_id}`]: payload.new.completed 
            }));
          }
        } else {
          if (payload.new.house_id === (user.house_id || user.house)) {
            setInventoryProgress(prev => ({ 
              ...prev, 
              [`${payload.new.assignment_id}_${payload.new.item_id}`]: payload.new.completed 
            }));
          }
        }
      })
      .subscribe();
    
    return () => {
      if (supabase) supabase.removeChannel(channel);
    };
  }, [user]);

  // Si el usuario es manager, mostrar todas las tareas de todos los empleados
  const isManager = user.role && user.role.toLowerCase().includes('manager');
  const isOwnerViewer = ['owner', 'dueno'].includes(String(user.role || '').toLowerCase())
    || String(user.username || '').trim().toLowerCase() === 'jonathan';
  const canManageAssignments = user.role && (
    user.role.toLowerCase().includes('manager') ||
    user.role.toLowerCase().includes('owner') ||
    user.role.toLowerCase().includes('dueno')
  ) || isOwnerViewer;
  const seesAllEmployees = isManager || isOwnerViewer;
  const groupedTasks = seesAllEmployees
    ? assignedTasks.reduce((acc: any, t: any) => {
        if (!acc[t.employee]) acc[t.employee] = [];
        acc[t.employee].push(t);
        return acc;
      }, {})
    : { [user.username]: assignedTasks };

  const handleDeleteAssignment = async (task: any) => {
    if (!task?.id) return;
    const typeLabel = task.type || 'tarea';
    const employeeLabel = task.employee ? ` de ${task.employee}` : '';
    if (!confirm(`¿Eliminar esta asignación ${typeLabel}${employeeLabel}?`)) return;

    try {
      setLoading(true);
      const resolvedId = await resolveAssignmentIdForTask(task);
      const target = { ...task, id: resolvedId || task.id };
      const archive = await shouldArchiveAssignment(target);
      const ok = archive
        ? await archiveCalendarAssignment(target, user.username)
        : await realtimeService.deleteCalendarAssignmentCascade(String(target.id));
      if (ok) {
        setAssignedTasks(prev => prev.filter(t => t.id !== task.id));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-assigned-tasks-modal">
      <div className="assigned-tasks-header-v2">
        <div className="assigned-tasks-title-group">
          <h3 className="assigned-tasks-title-v2">{seesAllEmployees ? 'Progreso de empleados' : 'Tareas Asignadas'}</h3>
          <p className="assigned-tasks-subtitle">{seesAllEmployees ? 'Trabajos activos de cada empleado' : 'Toca una zona para ver solo lo que falta'}</p>
        </div>
        <span className="assigned-tasks-badge-v2">{Object.values(groupedTasks).flat().length}</span>
      </div>
      <div className="at-tabs">
        <button type="button" className={assignedView === 'pendiente' ? 'on' : ''} onClick={() => setAssignedView('pendiente')}>Por hacer</button>
        <button type="button" className={assignedView === 'hecho' ? 'on' : ''} onClick={() => setAssignedView('hecho')}>Hechas</button>
        <button type="button" className={assignedView === 'todo' ? 'on' : ''} onClick={() => setAssignedView('todo')}>Todo</button>
      </div>

      {loading ? (
        <div style={{textAlign: 'center', padding: '2rem', color: '#64748b'}}>
          <p>Cargando tareas...</p>
        </div>
      ) : Object.keys(groupedTasks).length === 0 ? (
        <div style={{textAlign: 'center', padding: '2rem', background: '#f0f9ff', borderRadius: '1rem', border: '2px dashed #0284c7', color: '#0284c7', fontSize: '1.1rem', fontWeight: '600'}}>
          🎉 No hay tareas asignadas
        </div>
      ) : (
        <div className="assigned-tasks-container-v2">
          {Object.entries(groupedTasks).map(([employee, tasks]: any) => (
            <div key={employee} className="assigned-tasks-card-v2" style={{borderTopColor: seesAllEmployees ? '#0284c7' : '#0ea5e9'}}>
              <div className="assigned-tasks-card-header-v2">
                <div className="assigned-tasks-card-title-group">
                  <span className="assigned-tasks-card-icon">👤</span>
                  <div>
                    <h4 className="assigned-tasks-card-title">{employee}</h4>
                    <span className="assigned-tasks-card-count">{tasks.length} {tasks.length === 1 ? 'tarea' : 'tareas'}</span>
                  </div>
                </div>
              </div>
              <div className="assigned-tasks-items-v2">
                {tasks.map((task: any) => {
                  const subtasksMap = getSubtasks(task.type || '', task.house);
                  const allSubtasks = subtasksMap ? Object.values(subtasksMap).flat() : [];
                  const progressKey = seesAllEmployees ? `${task.id}_${task.user_id || task.employee_id || task.employee}` : task.id;
                  const progressArr = subtaskProgress[progressKey] || Array(allSubtasks.length).fill(false);
                  const completedCount = progressArr.filter(Boolean).length;
                  const allComplete = allSubtasks.length > 0 && completedCount === allSubtasks.length;
                  const isCompleted = !!task.completed || allComplete;
                  const confirmed = employeeConfirmation(task) || (allComplete ? { by: task.employee, at: '' } : null);
                  const assignmentKey = assignmentIdMap[String(task.id)] || String(task.id);
                  const percent = allSubtasks.length > 0 ? Math.round((completedCount / allSubtasks.length) * 100) : 0;
                  
                  return (
                    <div key={task.id} className="assigned-tasks-item-v2 assigned-tasks-item-pro">
                      <div className="assigned-tasks-item-header-v2">
                        <div className="assigned-task-main-info">
                          <div className="assigned-task-type-label">
                            {task.type === 'Limpieza profunda' ? '🧹 Profunda' : task.type === 'Limpieza regular' ? '✨ Regular' : '🔧 Mantenimiento'}
                          </div>
                          <div className="assigned-task-date-label">
                            🏠 {task.house} • 📅 {new Date(task.date).toLocaleDateString('es-CO', {month: 'short', day: 'numeric'})} {task.time ? `• 🕐 ${task.time}` : ''}
                          </div>
                          {confirmed && (
                            <div className="assigned-task-date-label">Empleado confirmó: {confirmed.by || task.employee}</div>
                          )}
                        </div>
                        <div className="assigned-task-actions-box">
                          <span className={`assigned-tasks-status-badge ${confirmed ? 'status-done' : 'status-pending'}`}>
                            {confirmed ? 'Confirmado por el empleado' : '⏳ Pendiente'}
                          </span>
                          {canManageAssignments && confirmed && (
                            <button className="assigned-task-delete-btn" style={{background:'#dcfce7', color:'#166534', border:'1px solid #86efac'}} onClick={async () => {
                              const ok = await closeCalendarAssignment(task, user.username);
                              if (!ok) {
                                alert('No se pudo pasar el trabajo a completados.');
                                return;
                              }
                              setAssignedTasks(prev => prev.filter(t => t.id !== task.id));
                              if (onTaskCompleted) onTaskCompleted(String(task.id), String(task.id));
                            }}>
                              Completar
                            </button>
                          )}
                          {canManageAssignments && (
                            <button className="assigned-task-delete-btn" onClick={() => handleDeleteAssignment(task)}>
                              🗑️ Eliminar
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Barra de progreso */}
                      <div className="assigned-task-progress-wrap">
                        <div className="assigned-task-progress-head">
                          <span className="assigned-task-progress-title">Progreso</span>
                          <span className="assigned-task-progress-value">{percent}%</span>
                        </div>
                        <div className="progress-bar-modern-container">
                          <div className={`progress-bar-modern-fill ${isCompleted ? 'complete' : ''}`} style={{width: `${percent}%`}}></div>
                        </div>
                      </div>

                      {/* Zonas/Subtareas para empleados */}
                      {!seesAllEmployees && subtasksMap && (
                        <div className="assigned-task-zones-wrap">
                          <div className="assigned-task-zones-grid">
                            {Object.entries(subtasksMap).map(([zona, subtasks], zonaIdx) => {
                              const zoneItemsCount = (subtasks as string[]).length;
                              const zoneCompletedCount = (subtasks as string[]).filter((_, idx) => {
                                const globalIdx = Object.values(subtasksMap).slice(0, zonaIdx).flat().length + idx;
                                return progressArr[globalIdx];
                              }).length;
                              const zoneKey = `${task.id}-${zona}`;
                              const visibleSubs = (subtasks as string[]).map((subtask, idx) => {
                                const globalIdx = Object.values(subtasksMap).slice(0, zonaIdx).flat().length + idx;
                                const done = !!progressArr[globalIdx];
                                return { subtask, idx, globalIdx, done };
                              }).filter((row) => {
                                if (assignedView === 'pendiente') return !row.done;
                                if (assignedView === 'hecho') return row.done;
                                return true;
                              });
                              if (assignedView !== 'todo' && visibleSubs.length === 0) return null;
                              const open = openAssignedZone === null ? zonaIdx === 0 : openAssignedZone === zoneKey;
                              return (
                                <div key={zona} className={`assigned-task-zone-card${open ? ' open' : ''}`}>
                                  <button
                                    type="button"
                                    className="assigned-task-zone-head"
                                    onClick={() => setOpenAssignedZone(open ? null : zoneKey)}
                                  >
                                    <span className="assigned-task-zone-name">{zona}</span>
                                    <span className="assigned-task-zone-count">{assignedView === 'pendiente' ? (String(visibleSubs.length) + ' por hacer') : (String(zoneCompletedCount) + '/' + String(zoneItemsCount))}</span>
                                  </button>
                                  {open && (
                                  <div className="assigned-task-subtasks-grid">
                                    {visibleSubs.map((row) => (
                                        <div key={`${zona}-${row.idx}`} className={`assigned-task-subtask-row ${row.done ? 'is-completed' : ''}`}>
                                          <button
                                            className={`assigned-task-subtask-btn ${row.done ? 'done' : 'pending'}`}
                                            onClick={() => handleSubtaskToggle(task.id, row.globalIdx, !row.done, allSubtasks.length)}
                                          >
                                            {row.done ? 'Hecha' : 'Completar'}
                                          </button>
                                          <span className={`assigned-task-subtask-text ${row.done ? 'is-completed' : ''}`}>
                                            {row.subtask}
                                          </span>
                                        </div>
                                    ))}
                                  </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Inventario por Asignación - completo/incompleto */}
                      {(() => {
                        const invItems = inventoryByAssignment[assignmentKey] || [];
                        if (invItems.length === 0) return null;
                        const completedInv = invItems.filter((i: any) => i.is_complete).length;
                        const isInvExpanded = expandedInventory.has(assignmentKey);
                        const categoryMap: Record<string, any[]> = {};
                        invItems.forEach((i: any) => {
                          const cat = i.category || 'General';
                          if (!categoryMap[cat]) categoryMap[cat] = [];
                          categoryMap[cat].push(i);
                        });
                        return (
                          <div style={{marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0'}}>
                            <div
                              style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: isInvExpanded ? '0.75rem' : 0}}
                              onClick={() => setExpandedInventory(prev => {
                                const next = new Set(prev);
                                if (next.has(assignmentKey)) next.delete(assignmentKey); else next.add(assignmentKey);
                                return next;
                              })}
                            >
                              <span style={{fontWeight: '600', color: '#0f172a', fontSize: '0.95rem'}}>📦 Inventario</span>
                              <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                                <span style={{background: completedInv === invItems.length ? '#10b981' : '#f59e0b', color: 'white', padding: '0.25rem 0.6rem', borderRadius: '1rem', fontSize: '0.8rem', fontWeight: 700}}>
                                  {completedInv}/{invItems.length}
                                </span>
                                <span style={{color: '#64748b', fontSize: '0.85rem'}}>{isInvExpanded ? '▲' : '▼'}</span>
                              </div>
                            </div>
                            {isInvExpanded && (
                              <div style={{display: 'grid', gap: '0.5rem', maxHeight: '55vh', overflowY: 'auto'}}>
                                {Object.entries(categoryMap).map(([category, catItems]) => (
                                  <div key={category} style={{background: '#f8fafc', borderRadius: '0.75rem', padding: '0.75rem', border: '1px solid #e2e8f0'}}>
                                    <div style={{fontWeight: '700', color: '#374151', marginBottom: '0.5rem', fontSize: '0.875rem'}}>{category}</div>
                                    <div style={{display: 'grid', gap: '0.35rem'}}>
                                      {catItems.map((invItem: any) => (
                                        <div key={invItem.id} style={{display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'white', borderRadius: '0.5rem', border: invItem.is_complete ? '1px solid #10b981' : '1px solid #e5e7eb'}}>
                                          <span style={{flex: 1, fontSize: '0.9rem', color: invItem.is_complete ? '#166534' : '#1f2937'}}>
                                            {invItem.item_name} <span style={{color: '#94a3b8', fontSize: '0.82rem'}}>x{invItem.quantity}</span>
                                          </span>
                                          {!isManager ? (
                                            <button
                                              onClick={() => handleAssignmentInventoryToggle(assignmentKey, invItem, !invItem.is_complete)}
                                              style={{
                                                padding: '0.35rem 0.75rem',
                                                borderRadius: '0.375rem',
                                                border: 'none',
                                                fontWeight: 700,
                                                fontSize: '0.8rem',
                                                cursor: 'pointer',
                                                background: invItem.is_complete ? '#10b981' : '#f59e0b',
                                                color: 'white',
                                                whiteSpace: 'nowrap',
                                                flexShrink: 0,
                                                transition: 'all 0.2s ease'
                                              }}
                                            >
                                              {invItem.is_complete ? '✅ Completo' : '⏳ Incompleto'}
                                            </button>
                                          ) : (
                                            <span style={{
                                              padding: '0.25rem 0.6rem',
                                              borderRadius: '0.375rem',
                                              fontWeight: 700,
                                              fontSize: '0.8rem',
                                              background: invItem.is_complete ? '#10b981' : '#f59e0b',
                                              color: 'white',
                                              whiteSpace: 'nowrap',
                                              flexShrink: 0
                                            }}>
                                              {invItem.is_complete ? '✅ Completo' : '⏳ Pendiente'}
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                    </div>
                  );
                })}
              </div>
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
  { username: 'Carlina', password: '', role: 'empleado', house: 'HYNTIBA2 APTO 406' },
  { username: 'Victor', password: '', role: 'empleado', house: 'HYNTIBA2 APTO 406' },
  { username: 'Alejandra', password: '', role: 'manager', house: 'HYNTIBA2 APTO 406' },
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
  email?: string; // Email de autenticación (opcional)
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
  const viewerRef = useRef(user);
  viewerRef.current = user;
  const taskIsVisibleToViewer = (task: any) => {
    const viewer = viewerRef.current;
    if (!isEmpleadoRole(viewer?.role)) return true;
    const assignee = task?.assignedTo || task?.assigned_to || '';
    return nameBelongsToEmployee(assignee, viewer);
  };
  // Estado para mapear IDs de tareas a IDs de asignaciones
  const [assignmentIdMap, setAssignmentIdMap] = useState<Record<string, string>>({});

  const resolveAssignmentIdForTask = async (task: any) => {
    // Si ya tiene calendar_assignment_uuid, usar ese directamente
    if (task?.calendar_assignment_uuid) {
      return task.calendar_assignment_uuid;
    }

    const rawId = String(task?.id ?? '').trim();
    if (!rawId) return null;

    if (assignmentIdMap[rawId]) return assignmentIdMap[rawId];

    if (/^\d+$/.test(rawId)) {
      const resolved = await realtimeService.resolveAssignmentIdFromTask(task);
      if (resolved) {
        const resolvedId = String(resolved);
        setAssignmentIdMap(prev => ({ ...prev, [rawId]: resolvedId }));
        return resolvedId;
      }
    }

    setAssignmentIdMap(prev => ({ ...prev, [rawId]: rawId }));
    return rawId;
  };

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
    type: 'Tarea extra',
  });
  const [editingTaskIdx, setEditingTaskIdx] = useState(-1);

  // Estado para recordatorios en modal
  const [newReminder, setNewReminder] = useState({
    name: '',
    due: '',
    bank: '',
    account: '',
    invoiceNumber: '',
    frequency: 'once' as ReminderFrequency,
    interval_days: '',
    amount: '',
  });
  const [editingReminderIdx, setEditingReminderIdx] = useState(-1);
  // Evita doble envío al crear/editar y doble toque en "Ya lo hice"
  const [savingReminder, setSavingReminder] = useState(false);
  const savingReminderRef = useRef(false);
  const [doneBusyId, setDoneBusyId] = useState<string | null>(null);

  // Estado para inventario en modal - AHORA CON SUPABASE
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [newInventoryItem, setNewInventoryItem] = useState({
    name: '',
    quantity: '',
    location: '',
    complete: false,
    notes: '',
  });
  const [editingInventoryIdx, setEditingInventoryIdx] = useState<string | null>(null);
  const [inventoryAreaCustom, setInventoryAreaCustom] = useState(false);

  // Estado para checklist sincronizado en tiempo real por asignación
  const [syncedChecklists, setSyncedChecklists] = useState<Map<string, any[]>>(new Map());
  const [selectedAssignmentForChecklist, setSelectedAssignmentForChecklist] = useState<string | null>(null);
  const [currentAssignmentType, setCurrentAssignmentType] = useState<string | null>(null);
  const [checklistSubscriptions, setChecklistSubscriptions] = useState<Map<string, any>>(new Map());

  // Estado para inventario sincronizado en tiempo real por asignación
  const [syncedInventories, setSyncedInventories] = useState<Map<string, any[]>>(new Map());
  const [selectedAssignmentForInventory, setSelectedAssignmentForInventory] = useState<string | null>(null);
  const [inventorySubscriptions, setInventorySubscriptions] = useState<Map<string, any>>(new Map());

  // Estado para ver progreso de empleado específico (manager view)
  const [selectedEmployeeForProgress, setSelectedEmployeeForProgress] = useState<{assignment: any; employee: string; type: string} | null>(null);
  const [employeeInventoryProgress, setEmployeeInventoryProgress] = useState<any[]>([]);
  const [employeeChecklistProgress, setEmployeeChecklistProgress] = useState<any[]>([]);
  const [loadingEmployeeProgress, setLoadingEmployeeProgress] = useState(false);

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

  const checklistFormRef = useRef<HTMLDivElement | null>(null);
  const inventoryFormRef = useRef<HTMLDivElement | null>(null);

  // Estado para template de checklist (por casa)
  const [checklistTemplates, setChecklistTemplates] = useState<any[]>([]);
  const [loadingChecklistTemplates, setLoadingChecklistTemplates] = useState(true);
  const [checklistTemplatesError, setChecklistTemplatesError] = useState<string | null>(null);
  const [checklistTemplatesSource, setChecklistTemplatesSource] = useState<'checklist_templates' | 'checklist'>('checklist_templates');
  const [editingChecklistTemplateId, setEditingChecklistTemplateId] = useState<string | null>(null);
  const [checklistTemplateTypeFilter, setChecklistTemplateTypeFilter] = useState<string>('Limpieza regular');
  const [openChecklistTemplateZone, setOpenChecklistTemplateZone] = useState<string | null>(null);
  const [newChecklistTemplate, setNewChecklistTemplate] = useState({
    zone: '',
    task: '',
    task_type: 'Limpieza regular'
  });
  const CHECKLIST_TEMPLATE_ROOM_ORDER = [
    'LIMPIEZA GENERAL',
    'GENERAL',
    'HABITACIÓN 1',
    'HABITACIÓN 2',
    'HABITACIONES',
    'ÁREA DE LA CAMA',
    'ÁREA DE TV Y SALA',
    'SALA / COMEDOR',
    'SALA',
    'COMEDOR',
    'COCINA',
    'BAÑO 1',
    'BAÑO 2',
    'BAÑO 3',
    'BAÑOS',
    'BAÑO',
    'ZONA DE LAVADO',
    'TERRAZA',
    'ÁREA DE BBQ',
    'ÁREA DE PISCINA',
    'LIMPIEZA PROFUNDA',
    'ÁREAS VERDES',
    'PISCINA Y AGUA',
    'RUTINA DE MANTENIMIENTO',
    'SISTEMAS ELÉCTRICOS',
    'MANTENIMIENTO – ÁREA DE LA CAMA',
    'MANTENIMIENTO – ÁREA DE TV Y SALA',
    'MANTENIMIENTO – COCINA',
    'MANTENIMIENTO – BAÑO Y GENERAL',
  ];

  const inferChecklistTemplateType = (item: any): string => {
    const explicit = String(item?.task_type || item?.assigned_to || '').trim();
    if (explicit) return explicit;
    const room = String(item?.zone || item?.room || '').trim().toUpperCase();
    if (room.includes('PROFUNDA') || room === 'LIMPIEZA PROFUNDA') return 'Limpieza profunda';
    if (
      room.includes('MANTEN') ||
      ['ÁREAS VERDES', 'PISCINA Y AGUA', 'RUTINA DE MANTENIMIENTO', 'SISTEMAS ELÉCTRICOS'].includes(room)
    ) {
      return 'Mantenimiento';
    }
    return 'Limpieza regular';
  };

  // Casas y selección de casa
  // IMPORTANTE: Limpiamos localStorage de casas para forzar que cargue desde Supabase
  // Esto garantiza que siempre tenga los nombres correctos, sin nombres antiguos
  const [houses, setHouses] = useState<any[]>(() => {
    // SIEMPRE limpiar localStorage de casas para forzar que cargue desde Supabase con valores correctos
    if (typeof window !== 'undefined') {
      localStorage.removeItem('dashboard_houses');
      console.log('🧹 localStorage de la lista de casas limpiado al iniciar');
    }
    // Iniciar con las dos casas correctas (para evitar Hydration errors)
    // Estos valores serán reemplazados por getHouses() tan pronto cargue desde Supabase
    return [
      { name: 'EPIC D1', tasks: [], inventory: [], users: [] },
      { name: 'HYNTIBA2 APTO 406', tasks: [], inventory: [], users: [] },
      { name: 'TORRE MAGNA PI', tasks: [], inventory: [], users: [] }
    ];
  });
  const isJonathanUser = String((user as any)?.username || '').toLowerCase() === 'jonathan'
    || String((user as any)?.email || '').toLowerCase() === 'jonathan@360pro.com';
  // Si el usuario es empleado o manager, forzar la casa asignada
  const isRestrictedUser = (user.role === 'empleado') || (user.role === 'manager');

  const normalizeHouseName = (house?: string) =>
    String(house || '').trim().toLowerCase().replace(/\s+/g, ' ');

  const findHouseIdxByName = (houseName?: string) => {
    if (!houseName) return -1;
    return houses.findIndex(h => normalizeHouseName(h.name) === normalizeHouseName(houseName));
  };

  const employeeHouseIdx = (isRestrictedUser && user.house)
    ? findHouseIdxByName(user.house)
    : -1;

  // LOG: Ver qué está pasando con la búsqueda de casa
  if (isRestrictedUser) {
    console.log(`👤 ${user.username} (${user.role}): buscando user.house="${user.house}" en houses=[${houses.map(h => `"${h.name}"`).join(', ')}], índice encontrado: ${employeeHouseIdx}`);
  }
  
  const [selectedHouseIdx, setSelectedHouseIdx] = useState(() => {
    if (employeeHouseIdx >= 0) return employeeHouseIdx;
    return 0;
  });
  // Última casa que el dueño estaba viendo. El índice no sirve: al ordenar por
  // nombre la primera casa cambia y un refresh la volvía a elegir.
  const selectedHouseStorageKey = `limpieza360_selected_house:${String((user as any)?.id || user?.username || 'anon').trim().toLowerCase()}`;
  const houseChoiceReady = useRef(false);

  const markTaskComplete = async (task: any, completed: boolean) => {
    const assignmentId = await resolveAssignmentIdForTask(task);
    if (!assignmentId) return;

    const now = new Date().toISOString();
    const updateData: any = { completed };
    if (completed) {
      updateData.completed_at = now;
      updateData.completed_by = user.username;
    }

    // @ts-ignore
    await supabase.from('calendar_assignments').update(updateData).eq('id', assignmentId);

    // Actualizar calendarAssignments - AssignedTasksCard se actualizará a través de la sincronización realtime
    setCalendarAssignments(assignments => assignments.map(a => a.id === assignmentId ? { ...a, completed, completed_at: completed ? now : null, completed_by: completed ? user.username : null } : a));
  };

  useEffect(() => {
    if (!isRestrictedUser || !user.house) return;
    const idx = findHouseIdxByName(user.house);
    if (idx >= 0 && idx !== selectedHouseIdx) {
      console.log(`🔧 [Dashboard] Actualizando selectedHouseIdx para usuario restringido a índice ${idx} (${user.house})`);
      setSelectedHouseIdx(idx);
    }
  }, [houses, user.house, isRestrictedUser, selectedHouseIdx]);
  
  // Guardar la casa por nombre, solo después de restaurar la lista real de Supabase.
  useEffect(() => {
    if (typeof window === 'undefined' || !houseChoiceReady.current || isRestrictedUser) return;
    const name = houses[selectedHouseIdx]?.houseName || houses[selectedHouseIdx]?.name;
    if (!name) return;
    localStorage.setItem(selectedHouseStorageKey, String(name));
  }, [selectedHouseIdx, houses, isRestrictedUser, selectedHouseStorageKey]);

  // LIMPIEZA SELECTIVA de localStorage para usuario - SOLO keys de casas
  // No tocamos SESSION_KEY para mantener el usuario logueado
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('🧹 Limpieza selectiva de localStorage para:', user?.username);
      
      // Limpiar SOLO los keys relacionados con casas
      const keysToDelete = ['dashboard_houses'];
      
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
  const selectedHouseName = houses[allowedHouseIdx]?.name || user.house || '';

  // Tarjetas personalizadas por casa (Notas, etc.). Manager: su casa de perfil. Jonathan: la casa elegida.
  const customCardsHouse = isRestrictedUser
    ? String(user.house || '').trim()
    : String(houses[allowedHouseIdx]?.houseName || houses[allowedHouseIdx]?.name || '').trim();
  const customCards = useHouseCustomCards(customCardsHouse, user as any);
  const customCardsEmployees = users
    .filter(u => String(u.role || '').trim().toLowerCase() === 'empleado' && u.id != null)
    .filter(u => normalizeHouseName(u.house) === normalizeHouseName(customCardsHouse))
    .map(u => ({ id: String(u.id), username: String(u.username || '') }))
    .sort((a, b) => a.username.localeCompare(b.username, 'es'));
  const openCustomCardKey = parseCustomCardModalKey(selectedModalCard);
  const openCustomCard = openCustomCardKey
    ? customCards.cards.find(c => c.id === openCustomCardKey.cardId) || null
    : null;
  const assignableEmployees = users
    .filter(u => u.role === 'empleado')
    .filter(u => {
      // Manager: solo empleados de su casa asignada
      if (user.role === 'manager') {
        return String(u.house || '').trim() === String(user.house || '').trim();
      }

      // Owner/Dueño: empleados de la casa actualmente seleccionada
      if (user.role === 'owner' || user.role === 'dueno') {
        return !selectedHouseName || String(u.house || '').trim() === String(selectedHouseName).trim();
      }

      return String(u.house || '').trim() === String(user.house || '').trim();
    });

  // Suscripción en tiempo real para el progreso del empleado (manager view)
  useEffect(() => {
    if (!selectedEmployeeForProgress || !supabase) return;
    
    const assignmentId = selectedEmployeeForProgress.assignment.id;
    const timestamp = Date.now();
    
    console.log('📡 [Manager View] Suscribiendo a progreso del empleado:', selectedEmployeeForProgress.employee);
    console.log('📡 [Manager View] Assignment ID:', assignmentId);
    
    // Cargar inventario de la asignación (NO de la casa)
    const loadAssignmentInventory = async () => {
      console.log('📦 [Manager View] Cargando inventario de asignación:', assignmentId);
      const items = await realtimeService.getAssignmentInventory(assignmentId);
      console.log('📦 [Manager View] Items cargados:', items?.length || 0);
      setEmployeeInventoryProgress(items || []);
    };
    loadAssignmentInventory();
    
    // Suscripción a cambios del inventario de la asignación
    const inventoryChannel = (supabase as any)
      .channel(`employee-progress-inventory-${assignmentId}-${timestamp}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignment_inventory', filter: `calendar_assignment_id=eq.${assignmentId}` }, async (payload: any) => {
        console.log('📦 [Manager View] Inventario asignación actualizado en tiempo real:', payload);
        const items = await realtimeService.getAssignmentInventory(assignmentId);
        setEmployeeInventoryProgress(items || []);
      })
      .subscribe((status: string) => {
        console.log('📡 [Manager View] Estado suscripción inventario:', status);
      });
    
    // Suscripción a cambios del checklist (usa el mismo assignmentId definido arriba)
    const checklistChannel = (supabase as any)
      .channel(`employee-progress-checklist-${assignmentId}-${timestamp}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignment_checklist', filter: `assignment_id=eq.${assignmentId}` }, async (payload: any) => {
        console.log('✅ [Manager View] Checklist actualizado en tiempo real:', payload);
        const checklistItems = syncedChecklists.get(String(assignmentId)) || [];
        setEmployeeChecklistProgress(checklistItems);
      })
      .subscribe((status: string) => {
        console.log('📡 [Manager View] Estado suscripción checklist:', status);
      });
    
    return () => {
      console.log('📡 [Manager View] Desuscribiendo de progreso del empleado');
      inventoryChannel.unsubscribe();
      checklistChannel.unsubscribe();
    };
  }, [selectedEmployeeForProgress, houses, allowedHouseIdx, syncedChecklists]);

  const [newHouseName, setNewHouseName] = useState('');

  // Estado para checklist
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

  const buildChecklistSeedTemplates = (house: string) => {
    const templates: any[] = [];
    const addTemplates = (taskType: string, zones: Record<string, string[]>) => {
      let order = 1;
      Object.entries(zones).forEach(([zone, tasks]) => {
        tasks.forEach((task) => {
          templates.push({
            house,
            task_type: taskType,
            zone,
            task,
            order_num: order++,
            active: true
          });
        });
      });
    };

    addTemplates('Limpieza regular', LIMPIEZA_REGULAR as Record<string, string[]>);
    addTemplates('Limpieza profunda', LIMPIEZA_PROFUNDA as Record<string, string[]>);
    addTemplates('Mantenimiento', MANTENIMIENTO as Record<string, string[]>);

    return templates;
  };

  const dedupeChecklistTemplates = (items: any[]) => {
    const seen = new Set<string>();
    return items.filter((item) => {
      const type = (item.task_type || item.assigned_to || '').toString().trim().toLowerCase();
      const zone = (item.zone || item.room || '').toString().trim().toLowerCase();
      const task = (item.task || item.item || '').toString().trim().toLowerCase();
      const key = `${type}||${zone}||${task}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };


  // Cargar tareas desde Supabase con suscripción en tiempo real
  useEffect(() => {
    const selectedHouse = houses[allowedHouseIdx]?.name || 'HYNTIBA2 APTO 406';
    
    const loadTasks = async () => {
      try {
        setLoadingTasks(true);
        const tasks = await realtimeService.getTasks(selectedHouse);
        const visible = (tasks || []).filter(taskIsVisibleToViewer);
        console.log('✅ Tareas cargadas para', selectedHouse, ':', visible.length);
        setTasksList(visible);
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
        const row = payload?.new;
        const visible = !row || taskIsVisibleToViewer(row);
        if (payload?.eventType === 'INSERT') {
          if (!visible) return;
          addRealtimeNotification(`Nueva tarea: ${row?.title || 'Sin título'}`, 'info');
          setTasksList(prev => [...prev, row]);
        } else if (payload?.eventType === 'UPDATE') {
          if (!visible) {
            setTasksList(prev => prev.filter(t => String(t.id) !== String(row?.id)));
            return;
          }
          addRealtimeNotification(`Tarea actualizada: ${row?.title || 'Sin título'}`, 'info');
          setTasksList(prev => prev.map(t => String(t.id) === String(row?.id) ? row : t));
        } else if (payload?.eventType === 'DELETE') {
          const oldRow = payload?.old;
          const assigneeKnown = !!(oldRow?.assignedTo || oldRow?.assigned_to);
          const mine = assigneeKnown && taskIsVisibleToViewer(oldRow);
          if (!isEmpleadoRole(viewerRef.current?.role) || mine) {
            addRealtimeNotification('Tarea eliminada', 'warning');
          }
          setTasksList(prev => prev.filter(t => String(t.id) !== String(oldRow?.id)));
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
      console.log('🔔 Suscribiendo a cambios en tiempo real de inventario para:', selectedHouse);
      subscription = realtimeService.subscribeToInventory(selectedHouse, (payload: any) => {
        if (payload?.eventType === 'INSERT') {
          addRealtimeNotification(`Item agregado: ${payload.new?.item || payload.new?.name || 'Sin nombre'}`, 'info');
          setInventoryList(prev => [...prev, payload.new]);
        } else if (payload?.eventType === 'UPDATE') {
          addRealtimeNotification(`Item actualizado: ${payload.new?.item || payload.new?.name || 'Sin nombre'}`, 'info');
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

  // Cargar recordatorios desde Supabase (managers: siempre su casa)
  useEffect(() => {
    const selectedHouse = (isRestrictedUser && user.house && user.house !== 'all')
      ? user.house
      : (houses[allowedHouseIdx]?.name || 'HYNTIBA2 APTO 406');
    
    let cancelled = false;
    const loadReminders = async () => {
      try {
        setLoadingReminders(true);
        const items = await realtimeService.getReminders(selectedHouse);
        if (cancelled) return;
        console.log('✅ Recordatorios cargados para', selectedHouse, ':', items);
        setReminders(dedupeRemindersById(items || []));
        setLoadingReminders(false);
      } catch (error) {
        if (cancelled) return;
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
          addRealtimeNotification(`Nuevo recordatorio: ${payload.new?.name || 'Sin nombre'}`, 'info');
          // El que lo crea ya lo agregó con la respuesta del insert: reemplazar por id, no duplicar.
          setReminders(prev => upsertReminderById(prev, payload.new));
        } else if (payload?.eventType === 'UPDATE') {
          console.log('✏️ Recordatorio actualizado:', payload.new);
          addRealtimeNotification('Recordatorio actualizado', 'info');
          setReminders(prev => prev.map(r => r.id === payload.new?.id ? { ...r, ...payload.new } : r));
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
      cancelled = true;
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

  const restoreOwnerHouse = (list: any[]) => {
    if (houseChoiceReady.current) return;
    houseChoiceReady.current = true;
    if (isRestrictedUser || typeof window === 'undefined') return;
    const saved = localStorage.getItem(selectedHouseStorageKey);
    if (!saved) return;
    const idx = list.findIndex((h) => normalizeHouseName(h?.name || h?.houseName) === normalizeHouseName(saved));
    if (idx >= 0) setSelectedHouseIdx(idx);
  };

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
          restoreOwnerHouse(mappedHouses);
          
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
          restoreOwnerHouse(mappedHouses);
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

  // Cargar y sincronizar checklist/inventario cuando se selecciona una asignación
  useEffect(() => {
    if (!selectedAssignmentForChecklist) return;
    
    const loadData = async () => {
      try {
        // Siempre cargar checklist (incluye Limpieza Profunda)
        console.log('🧹 Cargando checklist para asignación:', selectedAssignmentForChecklist);
        const items = await realtimeService.getCleaningChecklistItems(selectedAssignmentForChecklist);
        console.log('✅ Checklist cargado:', items);
        setSyncedChecklists(prev => new Map(prev).set(selectedAssignmentForChecklist, items));
      } catch (error) {
        console.error('❌ Error loading data:', error);
      }
    };
    
    loadData();
    
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
      console.error('❌ Error subscribing:', error);
    }
    
    return () => {
      try {
        console.log('🔌 Desconectando suscripción...');
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
        console.error('❌ Error unsubscribing:', error);
      }
    };
  }, [selectedAssignmentForChecklist, currentAssignmentType]);

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

  // useEffect para cargar templates de checklist por casa
  useEffect(() => {
    if (selectedModalCard !== 'checklist') return;

    const selectedHouse = houses[allowedHouseIdx]?.name || 'EPIC D1';

    const loadChecklistTemplates = async () => {
      try {
        setLoadingChecklistTemplates(true);
        setChecklistTemplatesError(null);
        const { data, error } = await realtimeService.getChecklistTemplatesWithError(selectedHouse);
        if (error) {
          const errorMessage = error.message || 'No se pudo cargar desde Supabase';
          const errorCode = String((error as any)?.code || '');
          // Fallback: usar tabla checklist si checklist_templates no existe
          if (errorCode === 'PGRST205' || String(errorMessage).includes('checklist_templates')) {
            const legacy = await realtimeService.getChecklistTemplatesLegacy(selectedHouse);
            setChecklistTemplatesSource('checklist');
            if (!legacy || legacy.length === 0) {
              // Casa nueva / vacía: NO auto-copiar plantillas de otras casas ni seeds globales
              setChecklistTemplatesError(null);
              setChecklistTemplates([]);
            } else {
              setChecklistTemplatesError(null);
              setChecklistTemplates(dedupeChecklistTemplates(legacy || []));
            }
          } else {
            setChecklistTemplatesSource('checklist_templates');
            setChecklistTemplatesError(errorMessage);
            setChecklistTemplates([]);
          }
        } else if (!data || data.length === 0) {
          // Prefer legacy rows when modern table is empty but legacy has house data
          const legacy = await realtimeService.getChecklistTemplatesLegacy(selectedHouse);
          if (legacy && legacy.length > 0) {
            setChecklistTemplatesSource('checklist');
            setChecklistTemplatesError(null);
            setChecklistTemplates(dedupeChecklistTemplates(legacy));
          } else {
            // Casa nueva: checklist vacío (admin agrega tareas manualmente). Sin seed/copia.
            setChecklistTemplates([]);
            setChecklistTemplatesSource('checklist_templates');
          }
        } else {
          setChecklistTemplatesSource('checklist_templates');
          setChecklistTemplates(dedupeChecklistTemplates(data || []));
        }
        setLoadingChecklistTemplates(false);
      } catch (error) {
        console.error('Error loading checklist templates:', error);
        setChecklistTemplatesError('No se pudo cargar desde Supabase');
        setLoadingChecklistTemplates(false);
      }
    };

    loadChecklistTemplates();

    let subscription: any;
    try {
      if (checklistTemplatesSource === 'checklist') {
        subscription = realtimeService.subscribeToChecklistLegacy(selectedHouse, (payload: any) => {
          if (payload?.eventType === 'INSERT') {
            setChecklistTemplates(prev => dedupeChecklistTemplates(prev.some(t => String(t.id) === String(payload.new?.id)) ? prev : [...prev, payload.new]));
          } else if (payload?.eventType === 'UPDATE') {
            setChecklistTemplates(prev => dedupeChecklistTemplates(prev.map(t => String(t.id) === String(payload.new?.id) ? payload.new : t)));
          } else if (payload?.eventType === 'DELETE') {
            setChecklistTemplates(prev => dedupeChecklistTemplates(prev.filter(t => String(t.id) !== String(payload.old?.id))));
          }
        });
      } else {
        subscription = realtimeService.subscribeToChecklistTemplates(selectedHouse, (payload: any) => {
          if (payload?.eventType === 'INSERT') {
            setChecklistTemplates(prev => dedupeChecklistTemplates(prev.some(t => String(t.id) === String(payload.new?.id)) ? prev : [...prev, payload.new]));
          } else if (payload?.eventType === 'UPDATE') {
            setChecklistTemplates(prev => dedupeChecklistTemplates(prev.map(t => String(t.id) === String(payload.new?.id) ? payload.new : t)));
          } else if (payload?.eventType === 'DELETE') {
            setChecklistTemplates(prev => dedupeChecklistTemplates(prev.filter(t => String(t.id) !== String(payload.old?.id))));
          }
        });
      }
    } catch (error) {
      console.error('Error subscribing to checklist templates:', error);
    }

    return () => {
      try {
        if (subscription) supabase?.removeChannel(subscription);
      } catch (error) {
        console.error('Error unsubscribing from checklist templates:', error);
      }
    };
  }, [selectedModalCard, allowedHouseIdx, houses, checklistTemplatesSource]);

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
        // HOUSE_ISOLATION_EMPTY_INIT: no prefill from global templates (avoids mixing other houses)

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

  const isOwnerLike = user.role === 'owner' || user.role === 'dueno';
  const canManageReminders = isOwnerLike || user.role === 'manager';
  const showReminders = canManageReminders;

  // "Ya lo hice": marca hecho y reinicia el recordatorio (Jonathan/dueño o manager de la casa)
  const [reminderDoneError, setReminderDoneError] = useState<{ id: string; text: string } | null>(null);
  const handleReminderDone = async (item: any) => {
    if (!item?.id || doneBusyId) return;
    if (!canMarkReminderDone(user as any, item, isJonathanUser)) return;
    const id = String(item.id);
    setDoneBusyId(id);
    setReminderDoneError(null);
    try {
      const result = await realtimeService.markReminderDone(id);
      if (result.ok) {
        setReminders(prev => upsertReminderById(prev, result.row));
      } else {
        setReminderDoneError({ id, text: result.error });
      }
    } finally {
      setDoneBusyId(null);
    }
  };

  const renderReminderDone = (item: any) => {
    const allowed = canMarkReminderDone(user as any, item, isJonathanUser);
    const doneText = doneByLabel(item);
    const finished = !isRecurring(item) && item.paid;
    const busy = doneBusyId === String(item.id);
    return (
      <div className="reminder-done-block">
        {doneText && <p className="reminder-done-by">✅ {doneText}</p>}
        {allowed && !finished && (
          <button
            type="button"
            className="reminder-done-btn"
            disabled={busy || !!doneBusyId}
            aria-busy={busy}
            onClick={(e) => { e.stopPropagation(); handleReminderDone(item); }}
          >
            {busy ? 'Guardando…' : '✔️ Ya lo hice'}
          </button>
        )}
        {allowed && !finished && isRecurring(item) && nextDueDate(item) !== String(item.due || '').slice(0, 10) && (
          <p className="reminder-done-hint">Si lo marcas hoy, vuelve a vencer el {formatShortDate(nextDueDate(item))}.</p>
        )}
        {reminderDoneError?.id === String(item.id) && (
          <p className="reminder-done-error" role="alert">{reminderDoneError.text}</p>
        )}
      </div>
    );
  };

  // Alertas de recordatorios vencidos o próximos (7 días antes del vencimiento)
  useEffect(() => {
    if (!showReminders || !reminders?.length) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const soonLimit = new Date(today);
    soonLimit.setDate(soonLimit.getDate() + 7);

    const urgent = reminders.filter((r: any) => {
      if (r.paid) return false;
      const raw = r.due_date || r.due;
      if (!raw) return false;
      const due = new Date(raw);
      if (Number.isNaN(due.getTime())) return false;
      due.setHours(0, 0, 0, 0);
      return due <= soonLimit;
    });

    if (!urgent.length) return;

    const overdue = urgent.filter((r: any) => {
      const due = new Date(r.due_date || r.due);
      due.setHours(0, 0, 0, 0);
      return due < today;
    });
    const soon = urgent.filter((r: any) => {
      const due = new Date(r.due_date || r.due);
      due.setHours(0, 0, 0, 0);
      return due >= today;
    });

    const parts: string[] = [];
    if (overdue.length) parts.push(`${overdue.length} vencido${overdue.length > 1 ? 's' : ''}`);
    if (soon.length) parts.push(`${soon.length} por vencer`);
    const msg = `Recordatorios: ${parts.join(' y ')} en ${houses[allowedHouseIdx]?.name || 'tu casa'}`;

    const dayKey = today.toISOString().slice(0, 10);
    const storageKey = `reminder_alert_${houses[allowedHouseIdx]?.name || 'house'}_${dayKey}`;
    try {
      if (typeof window !== 'undefined' && localStorage.getItem(storageKey) === msg) {
        return;
      }
      if (typeof window !== 'undefined') localStorage.setItem(storageKey, msg);
    } catch {}

    addRealtimeNotification(msg, 'warning');

    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default') {
          Notification.requestPermission().catch(() => {});
        }
        if (Notification.permission === 'granted') {
          new Notification('Limpieza360 Pro — Recordatorios', {
            body: msg + (overdue[0] ? `. Ej: ${overdue[0].name}` : soon[0] ? `. Ej: ${soon[0].name}` : ''),
          });
        }
      }
    } catch {}
  }, [reminders, showReminders, allowedHouseIdx, houses]);


  // Estado para casas dinámicas y usuarios sincronizados
  // Ensure all users have a username string
  useEffect(() => {
    if (users) {
      users.forEach(u => { if (!u.username) u.username = ''; });
    }
  }, [users]);

  const isExtraTask = (t: any) => String(t?.type || '').trim().toLowerCase() === 'tarea extra';
  const taskAssignee = (t: any) => t?.assignedTo || t?.assigned_to || '';
  const taskCompletedBy = (t: any) => t?.completedBy || t?.completed_by || '';
  const taskCompletedAt = (t: any) => t?.completedAt || t?.completed_at || '';
  const taskEmployeeConfirmedAt = (t: any) => t?.employeeConfirmedAt || t?.employee_confirmed_at || '';
  const taskEmployeeConfirmedBy = (t: any) => t?.employeeConfirmedBy || t?.employee_confirmed_by || '';
  const isEmployeeViewer = isEmpleadoRole(user.role);
  // Empleado: solo tareas cuyo asignado es su usuario o la parte local de su correo.
  // Manager y dueño siguen viendo todas las de la casa.
  const tasksVisibleToViewer = (Array.isArray(tasksList) ? tasksList : []).filter((t: any) =>
    !isEmployeeViewer || nameBelongsToEmployee(taskAssignee(t), user)
  );
  const houseExtraTasks = tasksVisibleToViewer.filter(isExtraTask);
  // Abiertas: el empleado confirma y después Jonathan o el manager cierran.
  // completed=true ya no vive aquí; pasa a Trabajos completados.
  const extraTasksOpen = houseExtraTasks.filter((t: any) => !t.completed);
  const extraTasksAwaitingEmployee = extraTasksOpen.filter((t: any) => !taskEmployeeConfirmedAt(t));
  const extraTasksAwaitingClose = extraTasksOpen.filter((t: any) => !!taskEmployeeConfirmedAt(t));
  const extraTasksPending = extraTasksOpen;
  const extraTasksForUser = extraTasksOpen;
  const formatExtraTaskWhen = (value: string | null | undefined) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/Bogota',
    });
  };
  
  // Debug: mostrar tareas que se cargan y el filtro
  useEffect(() => {
    console.log('👤 Usuario actual:', user.username);
    console.log('📋 Tareas visibles:', tasksVisibleToViewer.length, 'de', Array.isArray(tasksList) ? tasksList.length : 0);
    console.log('🟦 Tareas extra visibles:', extraTasksForUser.length);
  }, [tasksList, user.username, user.role, user.email]);

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
        const visible = (tasks || []).filter(taskIsVisibleToViewer);
        console.log(`✅ Tareas cargadas para ${houseName}:`, visible.length);
        setTasksList(visible);
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
      tasksSubscription = realtimeService.subscribeToTasks(houseName, (payload: any) => {
        console.log(`⚡ Tareas actualizadas (realtime) para ${houseName}:`, payload);
        if (payload?.eventType === 'INSERT' && payload.new) {
          if (!taskIsVisibleToViewer(payload.new)) return;
          setTasksList(prev => {
            if (!Array.isArray(prev)) return [payload.new];
            if (prev.some(t => t.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        } else if (payload?.eventType === 'UPDATE' && payload.new) {
          if (!taskIsVisibleToViewer(payload.new)) {
            setTasksList(prev => Array.isArray(prev) ? prev.filter(t => t.id !== payload.new.id) : []);
            return;
          }
          setTasksList(prev => Array.isArray(prev)
            ? prev.map(t => t.id === payload.new.id ? {
                ...t,
                ...payload.new,
                completedBy: payload.new.completedBy || payload.new.completed_by || t.completedBy || '',
                completedAt: payload.new.completedAt || payload.new.completed_at || t.completedAt || null,
                employeeConfirmedBy: payload.new.employeeConfirmedBy || payload.new.employee_confirmed_by || t.employeeConfirmedBy || '',
                employeeConfirmedAt: payload.new.employeeConfirmedAt || payload.new.employee_confirmed_at || t.employeeConfirmedAt || null,
              } : t)
            : [payload.new]);
        } else if (payload?.eventType === 'DELETE' && payload.old) {
          setTasksList(prev => Array.isArray(prev)
            ? prev.filter(t => t.id !== payload.old.id)
            : []);
        }
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

  const openAssignments = (calendarAssignments || [])
    .filter((a: any) => !a.completed)
    .slice()
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const pendingAssignments = openAssignments.filter((a: any) => !employeeConfirmation(a));
  const readyAssignments = openAssignments.filter((a: any) => !!employeeConfirmation(a));
  const formatAssignedDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = String(dateStr).split('T')[0].split('-');
    if (parts.length < 3) return String(dateStr);
    const date = new Date(Number(parts[0]), parseInt(parts[1], 10) - 1, Number(parts[2]));
    if (Number.isNaN(date.getTime())) return String(dateStr);
    return date.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
  };
  const jobTypeLabel = (type: string) => {
    if (type === 'Limpieza profunda') return 'Limpieza profunda';
    if (type === 'Mantenimiento') return 'Mantenimiento';
    return type || 'Limpieza regular';
  };
  const renderAssignedJob = (assignment: any, ready = false) => {
    const confirmed = employeeConfirmation(assignment);
    const canDelete = user.role === 'owner' || user.role === 'manager' || user.role === 'dueno' || isJonathanUser;
    return (
      <article key={assignment.id} className={`job-card${ready ? ' is-ready' : ''}`}>
        <div className="job-card-top">
          <h3 className="job-card-name">{assignment.employee || 'Sin empleado'}</h3>
          <span className={`job-card-status${ready ? ' is-ready' : ''}`}>
            {ready ? 'Listo para completar' : 'Pendiente'}
          </span>
        </div>
        <p className="job-card-type">{jobTypeLabel(assignment.type)}</p>
        <dl className="job-card-meta">
          <div><dt>Fecha</dt><dd>{formatAssignedDate(assignment.date)}</dd></div>
          {assignment.time ? <div><dt>Hora</dt><dd>{assignment.time}</dd></div> : null}
          {assignment.house ? <div><dt>Casa</dt><dd>{assignment.house}</dd></div> : null}
          {ready ? <div><dt>Confirmó</dt><dd>{confirmed?.by || assignment.employee}</dd></div> : null}
        </dl>
        <div className="job-card-actions">
          <button
            type="button"
            className="job-card-btn"
            onClick={() => {
              setSelectedAssignmentForChecklist(String(assignment.id));
              setCurrentAssignmentType(assignment.type);
            }}
          >
            Ver checklist
          </button>
          {ready && canCloseExtraTask(user, assignment) && (
            <button
              type="button"
              className="job-card-btn is-complete"
              onClick={async () => {
                const ok = await closeCalendarAssignment(assignment, user.username);
                if (!ok) {
                  alert('No se pudo pasar el trabajo a completados.');
                  return;
                }
                const now = new Date().toISOString();
                setCalendarAssignments(prev => prev.map((a: any) => a.id === assignment.id ? { ...a, completed: true, completed_at: a.completed_at || now, completed_by: user.username } : a));
              }}
            >
              Completar
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              className="job-card-btn is-danger"
              onClick={async () => {
                if (!confirm(`¿Eliminar la asignación de ${assignment.employee}?`)) return;
                const archive = await shouldArchiveAssignment(assignment);
                const deleted = archive
                  ? await archiveCalendarAssignment(assignment, user.username)
                  : await realtimeService.deleteCalendarAssignmentCascade(String(assignment.id));
                if (deleted) {
                  setCalendarAssignments(prev => archive
                    ? prev.map((a: any) => a.id === assignment.id ? { ...a, completed: true, completed_at: a.completed_at || new Date().toISOString(), completed_by: a.completed_by || user.username } : a)
                    : prev.filter((a: any) => a.id !== assignment.id));
                  setSyncedChecklists(prev => {
                    const next = new Map(prev);
                    next.delete(String(assignment.id));
                    return next;
                  });
                }
              }}
            >
              Eliminar
            </button>
          )}
        </div>
      </article>
    );
  };

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
      desc: isEmployeeViewer
        ? 'Solo tus tareas extra. Tú confirmas y Jonathan o el manager cierran.'
        : 'El empleado confirma. Jonathan o el manager de la casa cierran.',
      show: (isEmployeeViewer
        ? extraTasksOpen.length > 0
        : ['owner', 'manager', 'empleado', 'admin', 'dueno'].includes(String(user.role || '').toLowerCase()) && extraTasksOpen.length > 0),
    },
    {
      key: 'checklist',
      title: 'Checklist Limpieza',
      desc: 'Aquí se ven los trabajos asignados y su checklist.',
      show: user.role === 'owner' || user.role === 'manager',
    },
    {
      key: 'inventory',
      title: 'Inventario',
      desc: 'Controla y revisa el inventario de la propiedad.',
      show: user.role === 'owner' || user.role === 'manager' || user.role === 'empleado',
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
      desc: 'Solo para agregar limpiezas y mantenimiento.',
      show: user.role === 'owner' || user.role === 'manager',
    },
    {
      key: 'reminders',
      title: 'Recordatorios',
      desc: 'Visualiza y gestiona los recordatorios de pagos y eventos.',
      show: canManageReminders,
    },
    // Mostrar selector de casa para owners y Jonathan (manager)
    {
      key: 'house',
      title: 'Seleccionar Casa',
      desc: 'Elige y administra la casa actual.',
      show: user.role === 'owner' || (user.role === 'manager' && isJonathanUser),
    },
    {
      key: 'users',
      title: 'Usuarios',
      desc: 'Agregar o eliminar usuarios.',
      show: ['owner', 'dueno', 'manager'].includes(String(user.role || '').toLowerCase()),
    },
    {
      key: 'completedJobs',
      title: '✅ Trabajos Completados',
      desc: 'Trabajos y tareas extra cerradas. Se guardan 6 meses y después se borran solos.',
      show: user.role === 'owner' || user.role === 'manager' || user.role === 'dueno',
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
    category: 'General',
    size: 'Mediano'
  });
  const [purchaseDraft, setPurchaseDraft] = useState({ itemId: '', amount: '' });
  const [editPurchaseAmount, setEditPurchaseAmount] = useState({ itemId: '', amount: '' });
  const [shoppingHistoryFilterType, setShoppingHistoryFilterType] = useState<'total' | 'year' | 'month'>('total');
  const [shoppingHistoryFilterYear, setShoppingHistoryFilterYear] = useState('');
  const [shoppingHistoryFilterMonth, setShoppingHistoryFilterMonth] = useState('');

  const pendingRemindersCount = (reminders || []).filter((r: any) => {
    if (r.paid) return false;
    const raw = r.due_date || r.due;
    if (!raw) return false;
    const due = new Date(raw);
    if (Number.isNaN(due.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const limit = new Date(today);
    limit.setDate(limit.getDate() + 7);
    return due <= limit;
  }).length;

  const pendingShoppingCount = (shoppingList || []).filter((i: any) => !i.is_purchased).length;
  // Aviso de Inventario (tarjeta en rojo) en TODAS las casas y roles.
  // Solo si hay trabajo asignado todavía abierto en esta casa:
  // tarea pendiente, lista para marcar terminada, o asignada a un empleado.
  // Objetos sin revisar, sin tarea asignada, no generan el aviso.
  const roleLowerForInv = String(user.role || '').toLowerCase();
  const assignedOpenTask = (t: any) => {
    if (!t || t.completed) return false;
    const assignee = t.assignedTo || t.assigned_to || t.employee;
    if (!assignee) return false;
    if (roleLowerForInv === 'empleado') return nameBelongsToEmployee(assignee, user);
    return true;
  };
  const hasActiveInventoryAssignmentWork =
    (calendarAssignments || []).some((a: any) => !a.completed && (
      roleLowerForInv === 'empleado'
        ? nameBelongsToEmployee(a.employee, user)
        : !!(a.employee || a.assignedTo || a.assigned_to)
    )) ||
    (tasksList || []).some(assignedOpenTask);
  const incompleteInventoryCount = (inventoryList || []).filter((i: any) => !i.complete).length;
  const pendingInventoryIssuesCount = hasActiveInventoryAssignmentWork
    ? incompleteInventoryCount
    : 0;
  const pendingTasksCount = (tasksList || []).filter((t: any) => !t.completed && !isExtraTask(t) && (
    isEmployeeViewer ? nameBelongsToEmployee(t.assignedTo || t.assigned_to, user) : true
  )).length;
  const pendingAssignmentsCount = (calendarAssignments || []).filter((a: any) => !a.completed).length;
  const pendingCardCounts: Record<string, number> = {
    shopping: pendingShoppingCount,
    inventory: pendingInventoryIssuesCount,
    reminders: pendingRemindersCount,
    tasks: pendingTasksCount,
    assignedTasks: pendingAssignmentsCount,
    checklist: pendingAssignmentsCount,
    extraTasks: extraTasksPending.length,
  };

  const formatPurchaseAmount = (value: number | string | null | undefined) => {

    const amount = Number(value ?? 0);
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(Number.isFinite(amount) ? amount : 0);
  };

  const formatPurchaseDate = (value: string | null | undefined) => {
    if (!value) return 'N/A';
    return new Date(value).toLocaleString('es-CO', { timeZone: 'America/Bogota' });
  };

  const availableShoppingYears = Array.from(
    new Set(
      shoppingHistory
        .map(item => item.purchased_at ? new Date(item.purchased_at).getFullYear().toString() : null)
        .filter((year): year is string => Boolean(year))
    )
  ).sort((a, b) => Number(b) - Number(a));

  const filteredShoppingHistory = shoppingHistory.filter(item => {
    if (!item.purchased_at) {
      return shoppingHistoryFilterType === 'total';
    }

    const purchaseDate = new Date(item.purchased_at);
    const itemYear = purchaseDate.getFullYear().toString();
    const itemMonth = (purchaseDate.getMonth() + 1).toString().padStart(2, '0');

    if (shoppingHistoryFilterType === 'year') {
      return !shoppingHistoryFilterYear || itemYear === shoppingHistoryFilterYear;
    }

    if (shoppingHistoryFilterType === 'month') {
      return (!shoppingHistoryFilterYear || itemYear === shoppingHistoryFilterYear)
        && (!shoppingHistoryFilterMonth || itemMonth === shoppingHistoryFilterMonth);
    }

    return true;
  });

  const shoppingHistoryTotal = filteredShoppingHistory.reduce((sum, item) => {
    const amount = Number(item.purchase_amount ?? 0);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);

  const shoppingHistoryTotalLabel = shoppingHistoryFilterType === 'month'
    ? 'Total del mes'
    : shoppingHistoryFilterType === 'year'
      ? 'Total del año'
      : 'Total histórico';

  const handleShoppingPurchase = async (itemId: string) => {
    const amount = Number(purchaseDraft.amount);

    if (!purchaseDraft.amount.trim() || !Number.isFinite(amount) || amount < 0) {
      alert('Ingresa un valor de compra válido.');
      return;
    }

    await realtimeService.markAsPurchased(itemId, user.username, amount);
    setPurchaseDraft({ itemId: '', amount: '' });
  };

  const handleUpdatePurchaseAmount = async (itemId: string) => {
    const amount = Number(editPurchaseAmount.amount);
    if (!editPurchaseAmount.amount.trim() || !Number.isFinite(amount) || amount < 0) {
      alert('Ingresa un valor válido.');
      return;
    }
    const updated = await realtimeService.updateShoppingPurchaseAmount(itemId, amount);
    if (updated) {
      setShoppingHistory(prev => prev.map(h => h.id === itemId ? { ...h, purchase_amount: amount } : h));
    }
    setEditPurchaseAmount({ itemId: '', amount: '' });
  };

  // Cargar lista de compras desde Supabase (managers: siempre su casa)
  useEffect(() => {
    const selectedHouse = (isRestrictedUser && user.house && user.house !== 'all')
      ? user.house
      : (houses[allowedHouseIdx]?.name || 'EPIC D1');
    const loadShopping = async () => {
      setLoadingShopping(true);
      const pending = await realtimeService.getShoppingList(selectedHouse, false);
      const purchased = await realtimeService.getShoppingList(selectedHouse, true);
      setShoppingList(pending);
      setShoppingHistory(purchased.filter((i: any) => i.is_purchased));
      setLoadingShopping(false);
    };
    loadShopping();
    setPurchaseDraft({ itemId: '', amount: '' });
    
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
          setShoppingHistory(prev => {
            const exists = prev.some(i => i.id === payload.new.id);
            if (exists) {
              return prev.map(i => i.id === payload.new.id ? payload.new : i);
            }
            return [payload.new, ...prev];
          });
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
      size: newShoppingItem.size,
      added_by: user.username
    }, selectedHouse);
    setNewShoppingItem({ item_name: '', quantity: '', category: 'General', size: 'Mediano' });
  };

  // --- END Shopping List State ---

  // Cargar asignaciones de calendario desde Supabase con suscripción en tiempo real
  useEffect(() => {
    if (!houses.length || selectedHouseIdx === -1) return;

    const selectedHouse = houses[selectedHouseIdx];
    const houseName = isRestrictedUser
      ? user.house || selectedHouse?.houseName || selectedHouse?.name
      : selectedHouse?.houseName || selectedHouse?.name;
    if (!houseName) return;

    const loadCalendarAssignments = async () => {
      try {
        setLoadingCalendar(true);
        console.log('📅 Cargando asignaciones de calendario...');
        console.log('👤 Usuario:', { role: user.role, username: user.username });
        console.log('🏠 Casa:', houseName);
        
        // Si es empleado, cargar solo sus asignaciones de su casa
        const assignments = isEmpleadoRole(user.role)
          ? await realtimeService.getCalendarAssignments(houseName, { username: user.username, email: user.email })
          : await realtimeService.getCalendarAssignments(houseName);
        const withConfirmation = isEmpleadoRole(user.role)
          ? (assignments || [])
          : await syncPendingEmployeeConfirmations(assignments || []);
        
        console.log('✅ Asignaciones cargadas:', withConfirmation);
        setCalendarAssignments(withConfirmation);
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
    let houseSubscription: any;
    try {
      console.log('🔔 Suscribiendo a cambios de calendario en tiempo real...');
      console.log('🏠 House:', houseName);
      if (user.role === 'empleado') {
        console.log('👤 Empleado:', user.username, '- Casa:', user.house);
      }
      
      if (user.role === 'empleado' && user.username) {
        // Empleado: suscribirse a cambios de SU username
        subscription = realtimeService.subscribeToCalendarAssignments(
          user.username,
          (payload: any) => {
            console.log('⚡ Evento de calendario recibido (empleado):', payload);
            if (payload?.eventType === 'INSERT') {
              if (nameBelongsToEmployee(payload.new?.employee, user)) {
                setCalendarAssignments(prev => {
                  if (prev.some(a => a.id === payload.new?.id)) return prev;
                  return [...prev, payload.new];
                });
              }
            } else if (payload?.eventType === 'UPDATE') {
              if (!nameBelongsToEmployee(payload.new?.employee, user)) {
                setCalendarAssignments(prev => prev.filter(a => a.id !== payload.new?.id));
              } else {
                setCalendarAssignments(prev => prev.map(a => a.id === payload.new?.id ? payload.new : a));
              }
            } else if (payload?.eventType === 'DELETE') {
              setCalendarAssignments(prev => prev.filter(a => a.id !== payload.old?.id));
            }
          }
        );
        
        // También suscribirse a la casa para recibir cambios cuando el manager asigna tareas
        if (user.house) {
          houseSubscription = realtimeService.subscribeToCalendarAssignmentsByHouse(
            user.house,
            (payload: any) => {
              console.log('⚡ Evento de casa recibido (empleado):', payload);
              // Solo procesar si es para este empleado
              if (payload?.eventType === 'INSERT' && nameBelongsToEmployee(payload.new?.employee, user)) {
                setCalendarAssignments(prev => {
                  if (prev.some(a => a.id === payload.new?.id)) return prev;
                  return [...prev, payload.new];
                });
              }
            }
          );
        }
      } else if ((user.role === 'manager' || user.role === 'owner' || user.role === 'dueno' || isJonathanUser) && houseName) {
        // Manager/Owner: suscribirse a TODOS los cambios de la casa
        subscription = realtimeService.subscribeToCalendarAssignmentsByHouse(
          houseName,
          (payload: any) => {
            console.log('⚡ Evento de calendario recibido (manager):', payload);
            if (payload?.eventType === 'INSERT') {
              setCalendarAssignments(prev => {
                // Evitar duplicados
                if (prev.some(a => a.id === payload.new?.id)) return prev;
                return [...prev, payload.new];
              });
            } else if (payload?.eventType === 'UPDATE') {
              setCalendarAssignments(prev => prev.map(a => a.id === payload.new?.id ? payload.new : a));
            } else if (payload?.eventType === 'DELETE') {
              setCalendarAssignments(prev => prev.filter(a => a.id !== payload.old?.id));
            }
          }
        );
      }
      
      console.log('✅ Suscripción de calendario activa:', subscription);
      if (houseSubscription) {
        console.log('✅ Suscripción de casa activa para empleado');
      }
    } catch (error) {
      console.error('❌ Error subscribing to calendar assignments:', error);
    }

    return () => {
      try {
        console.log('🔌 Desconectando suscripciones de calendario...');
        if (subscription) {
          supabase?.removeChannel(subscription);
        }
        if (houseSubscription) {
          supabase?.removeChannel(houseSubscription);
        }
      } catch (error) {
        console.error('❌ Error unsubscribing from calendar:', error);
      }
    };
  }, [user.role, user.username, user.house, houses, selectedHouseIdx]);

  // Historial interno de pantallas (vistas y modales) para el botón Volver
  // y para que el atrás del teléfono no salga del sitio.
  type NavSnap = {
    view: string;
    modal: string | null;
    checklist: string | null;
    assignmentType: string | null;
    inventory: string | null;
    progress: { assignment: any; employee: string; type: string } | null;
    maintenance: any | null;
  };
  const navKey = (s: NavSnap) => {
    const progressKey = s.progress
      ? `${s.progress.employee}|${s.progress.type}|${s.progress.assignment?.id ?? ''}`
      : '';
    const maintKey = s.maintenance
      ? `${s.maintenance.id ?? s.maintenance.taskIdx ?? ''}|${s.maintenance.title ?? ''}`
      : '';
    return [s.view, s.modal ?? '', s.checklist ?? '', s.inventory ?? '', progressKey, maintKey].join('::');
  };
  const readNavSnap = (): NavSnap => ({
    view,
    modal: selectedModalCard,
    checklist: selectedAssignmentForChecklist,
    assignmentType: currentAssignmentType,
    inventory: selectedAssignmentForInventory,
    progress: selectedEmployeeForProgress,
    maintenance: selectedTaskMaintenance,
  });
  const navStackRef = useRef<NavSnap[]>([]);
  const navFutureRef = useRef<NavSnap[]>([]);
  const navCurrentRef = useRef<NavSnap | null>(null);
  const navIgnoreRef = useRef(false);
  const navSeededRef = useRef(false);
  const navSkipPopRef = useRef(0);
  const navPushedRef = useRef(0);
  const applyNavSnapRef = useRef<(snap: NavSnap) => void>(() => {});
  applyNavSnapRef.current = (snap: NavSnap) => {
    setView(snap.view);
    setSelectedModalCard(snap.modal);
    setSelectedAssignmentForChecklist(snap.checklist);
    setCurrentAssignmentType(snap.assignmentType);
    setSelectedAssignmentForInventory(snap.inventory);
    setSelectedEmployeeForProgress(snap.progress);
    setSelectedTaskMaintenance(snap.maintenance);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const next = readNavSnap();
    if (!navSeededRef.current) {
      navSeededRef.current = true;
      navCurrentRef.current = next;
      const existing = window.history.state;
      if (!existing || existing.app !== 'l360') {
        const base = { app: 'l360', kind: 'root', key: navKey(next) };
        window.history.replaceState(base, '');
        window.history.pushState({ ...base, sentinel: true }, '');
      }
      return;
    }
    if (navIgnoreRef.current) {
      navIgnoreRef.current = false;
      navCurrentRef.current = next;
      return;
    }
    const prev = navCurrentRef.current;
    if (prev && navKey(prev) === navKey(next)) {
      navCurrentRef.current = next;
      return;
    }
    const stack = navStackRef.current;
    const top = stack[stack.length - 1];
    if (top && navKey(top) === navKey(next)) {
      stack.pop();
      if (prev) navFutureRef.current.push(prev);
      navCurrentRef.current = next;
      if (navPushedRef.current > 0) {
        navPushedRef.current -= 1;
        navSkipPopRef.current += 1;
        window.history.back();
      }
      return;
    }
    if (prev) stack.push(prev);
    navFutureRef.current = [];
    navCurrentRef.current = next;
    navPushedRef.current += 1;
    window.history.pushState({ app: 'l360', kind: 'screen', key: navKey(next) }, '');
  }, [
    view,
    selectedModalCard,
    selectedAssignmentForChecklist,
    currentAssignmentType,
    selectedAssignmentForInventory,
    selectedEmployeeForProgress,
    selectedTaskMaintenance,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPop = (event: PopStateEvent) => {
      if (navSkipPopRef.current > 0) {
        navSkipPopRef.current -= 1;
        return;
      }
      const state = event.state as { app?: string; kind?: string; key?: string } | null;
      if (!state || state.app !== 'l360') return;
      const landedKey = state.key || '';
      const futureTop = navFutureRef.current[navFutureRef.current.length - 1];
      if (futureTop && navKey(futureTop) === landedKey) {
        const forwardSnap = navFutureRef.current.pop()!;
        if (navCurrentRef.current) navStackRef.current.push(navCurrentRef.current);
        navPushedRef.current += 1;
        navIgnoreRef.current = true;
        navCurrentRef.current = forwardSnap;
        applyNavSnapRef.current(forwardSnap);
        return;
      }
      const top = navStackRef.current[navStackRef.current.length - 1];
      if (top && navPushedRef.current > 0 && (navKey(top) === landedKey || state.kind === 'root')) {
        navStackRef.current.pop();
        navPushedRef.current -= 1;
        if (navCurrentRef.current) navFutureRef.current.push(navCurrentRef.current);
        navIgnoreRef.current = true;
        navCurrentRef.current = top;
        applyNavSnapRef.current(top);
        return;
      }
      // Ya en el dashboard raíz: este atrás se queda en la página y el siguiente puede salir.
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const atNavRoot = view === 'home'
    && !selectedModalCard
    && !selectedAssignmentForChecklist
    && !selectedAssignmentForInventory
    && !selectedEmployeeForProgress
    && !selectedTaskMaintenance;
  const nestedNavOpen = !!(
    selectedModalCard
    || selectedAssignmentForChecklist
    || selectedAssignmentForInventory
    || selectedEmployeeForProgress
    || selectedTaskMaintenance
  );
  const goBackInApp = () => {
    const top = navStackRef.current[navStackRef.current.length - 1];
    if (top) {
      applyNavSnapRef.current(top);
      return;
    }
    if (!atNavRoot) {
      navIgnoreRef.current = true;
      applyNavSnapRef.current({
        view: 'home',
        modal: null,
        checklist: null,
        assignmentType: null,
        inventory: null,
        progress: null,
        maintenance: null,
      });
    }
  };
  const backRow = !atNavRoot ? (
    <div className="dashboard-back-row">
      <button type="button" className="dashboard-back-btn" onClick={goBackInApp} aria-label="Volver">
        <span className="dashboard-back-arrow" aria-hidden="true">←</span>
        Volver
      </button>
    </div>
  ) : null;

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
      {!nestedNavOpen && backRow}
      {view === 'home' && (
        <>
          <div className="dashboard-cards">
            {/* Tarjeta personalizada para tareas asignadas (solo empleados) */}
            {user.role === 'empleado' && (
              <button
                className={`dashboard-card${(pendingCardCounts.assignedTasks || 0) > 0 ? ' has-pending' : ''}`}
                onClick={() => setSelectedModalCard('assignedTasks')}
                aria-label="Tareas Asignadas"
              >
                <span className="dashboard-card-title">
                  Tareas Asignadas
                  {(pendingCardCounts.assignedTasks || 0) > 0 && (
                    <span className="dashboard-card-badge-pending">{pendingCardCounts.assignedTasks}</span>
                  )}
                </span>
                <span className="dashboard-card-desc">Tareas de limpieza o mantenimiento asignadas por el manager</span>
              </button>
            )}
            {cards.filter(card => card.show).map(card => {
              const pendingN = pendingCardCounts[card.key] || 0;
              const showPending = pendingN > 0 && ['shopping', 'inventory', 'reminders', 'tasks', 'extraTasks', 'checklist'].includes(card.key);
              return (
              <button
                key={card.key}
                className={`dashboard-card${showPending ? ' has-pending' : ''}`}
                onClick={() => {
                  if (['calendar', 'shopping', 'reminders', 'checklist', 'inventory', 'tasks', 'extraTasks', 'completedJobs'].includes(card.key)) {
                    setSelectedModalCard(card.key);
                  } else {
                    setView(card.key);
                  }
                }}
                aria-label={card.title}
              >
                <span className="dashboard-card-title">
                  {card.title}
                  {showPending && (
                    <span className="dashboard-card-badge-pending">{pendingN}</span>
                  )}
                </span>
                <span className="dashboard-card-desc">{card.desc}</span>
              </button>
              );
            })}
            {customCards.enabled && customCardsHouse && customCards.loaded && (
              <HouseCustomCardTiles
                key={customCardsHouse}
                house={customCardsHouse}
                user={user as any}
                cards={customCards.cards}
                counts={customCards.counts}
                employees={customCardsEmployees}
                authUid={customCards.authUid}
                onOpen={(card) => setSelectedModalCard(customCardModalKey(card.id))}
                onCreated={customCards.reload}
              />
            )}
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
                      {item.size && <small>📏 {item.size}</small>}
                      <small>👤 {item.added_by}</small>
                    </div>
                    <div className="dashboard-inventory-actions">
                      {(user.role === 'owner' || user.role === 'manager') && (
                        <>
                          <button className="dashboard-btn" onClick={() => setPurchaseDraft({ itemId: item.id, amount: '' })}>✅ Comprado</button>
                          <button className="dashboard-btn danger" onClick={async () => {
                            if (confirm('¿Eliminar este producto?')) {
                              await realtimeService.deleteShoppingListItem(item.id);
                            }
                          }}>🗑️ Eliminar</button>
                        </>
                      )}
                    </div>
                    {purchaseDraft.itemId === item.id && (
                      <div className="dashboard-inventory-add-form" style={{ marginTop: 12 }}>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={purchaseDraft.amount}
                          onChange={e => setPurchaseDraft({ itemId: item.id, amount: e.target.value })}
                          placeholder="Valor de la compra"
                          className="dashboard-inventory-input"
                        />
                        <button type="button" className="dashboard-btn main" onClick={async () => {
                          await handleShoppingPurchase(item.id);
                        }}>Guardar compra</button>
                        <button type="button" className="dashboard-btn" onClick={() => setPurchaseDraft({ itemId: '', amount: '' })}>Cancelar</button>
                      </div>
                    )}
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
                  <div className="dashboard-inventory-add-form" style={{ marginBottom: 16 }}>
                    <select
                      value={shoppingHistoryFilterType}
                      onChange={e => setShoppingHistoryFilterType(e.target.value as 'total' | 'year' | 'month')}
                      className="dashboard-inventory-input"
                    >
                      <option value="total">Totales</option>
                      <option value="year">Por año</option>
                      <option value="month">Por mes</option>
                    </select>
                    <select
                      value={shoppingHistoryFilterYear}
                      onChange={e => setShoppingHistoryFilterYear(e.target.value)}
                      className="dashboard-inventory-input"
                      disabled={shoppingHistoryFilterType === 'total'}
                    >
                      <option value="">Todos los años</option>
                      {availableShoppingYears.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                    <select
                      value={shoppingHistoryFilterMonth}
                      onChange={e => setShoppingHistoryFilterMonth(e.target.value)}
                      className="dashboard-inventory-input"
                      disabled={shoppingHistoryFilterType !== 'month'}
                    >
                      <option value="">Todos los meses</option>
                      <option value="01">Enero</option>
                      <option value="02">Febrero</option>
                      <option value="03">Marzo</option>
                      <option value="04">Abril</option>
                      <option value="05">Mayo</option>
                      <option value="06">Junio</option>
                      <option value="07">Julio</option>
                      <option value="08">Agosto</option>
                      <option value="09">Septiembre</option>
                      <option value="10">Octubre</option>
                      <option value="11">Noviembre</option>
                      <option value="12">Diciembre</option>
                    </select>
                    <div className="dashboard-inventory-input" style={{ display: 'flex', alignItems: 'center', fontWeight: 700 }}>
                      {shoppingHistoryTotalLabel}: {formatPurchaseAmount(shoppingHistoryTotal)}
                    </div>
                  </div>
                  <div className="dashboard-inventory-list">
                    {filteredShoppingHistory.map((h, idx) => (
                      <div className="dashboard-inventory-card" key={h.id || idx}>
                        <span className="dashboard-inventory-name">{h.item_name}</span>
                        {h.quantity && <span className="dashboard-inventory-qty">{h.quantity}</span>}
                        <div className="dashboard-inventory-meta">
                          {h.size && <small>📏 {h.size}</small>}
                          <small>👤 Agregado por {h.added_by}</small>
                          <small>✅ Comprado por {h.purchased_by || 'N/A'}</small>
                          <small>💵 Valor: {formatPurchaseAmount(h.purchase_amount)}</small>
                          <small>📅 {formatPurchaseDate(h.purchased_at)}</small>
                        </div>
                        {editPurchaseAmount.itemId === h.id && (
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
                            <input
                              type="number"
                              min="0"
                              placeholder="Nuevo valor"
                              value={editPurchaseAmount.amount}
                              onChange={e => setEditPurchaseAmount({ itemId: h.id, amount: e.target.value })}
                              className="dashboard-inventory-input"
                              style={{ maxWidth: 140 }}
                              autoFocus
                            />
                            <button className="dashboard-btn" onClick={() => handleUpdatePurchaseAmount(h.id)}>💾 Guardar</button>
                            <button className="dashboard-btn" onClick={() => setEditPurchaseAmount({ itemId: '', amount: '' })}>Cancelar</button>
                          </div>
                        )}
                        <div className="dashboard-inventory-actions">
                          <button className="dashboard-btn" onClick={() => setEditPurchaseAmount({ itemId: h.id, amount: String(h.purchase_amount ?? '') })}>✏️ Editar valor</button>
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
        />
      )}
      {view === 'calendar' && <Calendar users={users as any} user={user as any} selectedHouse={houses[allowedHouseIdx]?.houseName || houses[allowedHouseIdx]?.name} />}
      {view === 'checklist' && <Checklist user={user} />}
      {view === 'reminders' && (
        <div className="dashboard-reminders redesigned-reminders">
          <h2 className="dashboard-reminders-title redesigned-reminders-title">Recordatorios</h2>
          <form className="dashboard-reminders-form redesigned-reminders-form" onSubmit={async e => {
            e.preventDefault();
            if (savingReminderRef.current) return;
            const form = e.target as HTMLFormElement;
            const name = (form.elements.namedItem('name') as HTMLInputElement).value;
            const due = (form.elements.namedItem('due') as HTMLInputElement).value;
            const bank = (form.elements.namedItem('bank') as HTMLInputElement).value;
            const account = (form.elements.namedItem('account') as HTMLInputElement).value;
            const invoiceNumber = (form.elements.namedItem('invoiceNumber') as HTMLInputElement)?.value || '';
            const frequency = (form.elements.namedItem('frequency') as HTMLSelectElement)?.value || 'once';
            const amount = (form.elements.namedItem('amount') as HTMLInputElement)?.value || '';
            const intervalDays = (form.elements.namedItem('interval_days') as HTMLInputElement)?.value || '';
            const selectedHouse = houses[allowedHouseIdx]?.name || 'EPIC D1';
            savingReminderRef.current = true;
            setSavingReminder(true);
            try {
              const created = await realtimeService.createReminder({ name, due, bank, account, invoiceNumber, frequency, interval_days: intervalDays, amount, house: selectedHouse, created_by: (user as any)?.username || null });
              if (created) {
                setReminders(prev => upsertReminderById(prev, created));
              }
              form.reset();
            } catch (err) {
              console.error('❌ Error creando recordatorio:', err);
            } finally {
              savingReminderRef.current = false;
              setSavingReminder(false);
            }
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
              <label htmlFor="reminder-frequency">Frecuencia</label>
              <select id="reminder-frequency" name="frequency" defaultValue="once" required>
                {REMINDER_FREQUENCY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <label htmlFor="reminder-interval-days">Cada cuántos días (solo si eliges "Cada N días")</label>
              <input id="reminder-interval-days" name="interval_days" type="number" min="1" step="1" inputMode="numeric" placeholder="Ej: 15" />
              <label htmlFor="reminder-amount">Monto (opcional)</label>
              <input id="reminder-amount" name="amount" type="number" min="0" step="any" placeholder="Monto" />
              <button type="submit" className="dashboard-btn main" disabled={savingReminder} aria-busy={savingReminder}>{savingReminder ? 'Guardando…' : 'Agregar'}</button>
            </div>
          </form>
          <ul className="dashboard-reminders-list redesigned-reminders-list">
            {reminders.map((r, idx) => (
              <li key={r.id ?? idx} className="dashboard-reminder-item redesigned-reminder-item">
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
                      <span className="dashboard-reminder-due">Vence: {formatShortDate(r.due)}{isRecurring(r) ? ` · ${frequencyLabel(r)}` : ''}</span>
                      {r.invoiceNumber ? (
                        <span className="dashboard-reminder-invoice">Factura: {r.invoiceNumber}</span>
                      ) : null}
                      <span className="dashboard-reminder-bank">{r.bank}</span>
                      <span className="dashboard-reminder-account">{r.account}</span>
                      {renderReminderDone(r)}
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
              Cada casa nueva nace vacía con la misma estructura (Checklist por zonas, Inventario, Compras, Recordatorios). El manager asignado llena los datos desde cero — no se copia de otras casas.
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
            {backRow}
            <div className="modal-header">
              <h2>
                {selectedModalCard === 'calendar' && '📅 Calendario de Asignaciones'}
                {selectedModalCard === 'shopping' && '🛒 Lista de Compras'}
                {selectedModalCard === 'reminders' && '🔔 Recordatorios'}
                {selectedModalCard === 'checklist' && '✅ Checklist Limpieza'}
                {selectedModalCard === 'inventory' && '📦 Inventario'}
                {selectedModalCard === 'tasks' && '📋 Asignar Tareas'}
                {selectedModalCard === 'extraTasks' && '🟦 Tareas Extra'}
                {selectedModalCard === 'completedJobs' && '✅ Trabajos Completados'}
                {openCustomCardKey && (openCustomCard
                  ? `${openCustomCard.icon || '📝'} ${openCustomCard.title}${openCustomCard.target_user_id && openCustomCard.target_name ? ` · ${openCustomCard.target_name}` : ''}`
                  : 'Tarjeta')}
              </h2>
              <button className="modal-close" onClick={() => setSelectedModalCard(null)}>✕</button>
            </div>
            
            <div className="modal-body">
              {openCustomCardKey && openCustomCard && (
                <HouseCustomCardPanel
                  key={openCustomCard.id}
                  card={openCustomCard}
                  user={user as any}
                  authUid={customCards.authUid}
                  entriesVersion={customCards.entriesVersion}
                  photo={openCustomCardKey.photo}
                  onOpenPhoto={(entryId, index) => setSelectedModalCard(customCardModalKey(openCustomCard.id, { entryId, index }))}
                  onClosePhoto={goBackInApp}
                  onCardDeleted={() => {
                    customCards.reload();
                    setSelectedModalCard(null);
                  }}
                  onCardChanged={customCards.reload}
                />
              )}
              {openCustomCardKey && !openCustomCard && (
                <p className="modal-body-empty">
                  {customCards.loaded || !customCards.enabled
                    ? 'Esta tarjeta ya no existe o no tienes acceso.'
                    : 'Cargando tarjeta…'}
                </p>
              )}
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
                              {assignableEmployees.length > 0 ? (
                                assignableEmployees.map((u, idx) => (
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
                  
                  <p className="calendar-add-only-note">
                    El calendario solo sirve para agregar. Los trabajos asignados se ven en Checklist de limpieza.
                  </p>
                </>
              )}
              
              {selectedModalCard === 'assignedTasks' && (
                <AssignedTasksCard 
                  user={user} 
                  onNavigateToInventory={() => { setSelectedModalCard(null); setView('inventory'); }}
                  onTaskCompleted={(taskId, assignmentId) => {
                    // Actualizar calendarAssignments cuando una tarea se completa desde AssignedTasksCard
                    const now = new Date().toISOString();
                    setCalendarAssignments(prev => prev.map(a => 
                      a.id === assignmentId 
                        ? { ...a, completed: true, completed_at: now, completed_by: user.username } 
                        : a
                    ));
                  }}
                  resolveAssignmentIdForTask={resolveAssignmentIdForTask}
                  assignmentIdMap={assignmentIdMap}
                />
              )}

              {selectedModalCard === 'completedJobs' && (() => {
                const completedCalendarJobs = calendarAssignments
                  .filter((a: any) => a.completed && isCompletedWithinRetention(a.completed_at))
                  .map((a: any) => ({ ...a, kind: 'calendar', title: a.title || a.type || '', employee_confirmed_by: employeeConfirmation(a)?.by || '' }));
                const completedExtraJobs = houseExtraTasks
                  .filter((t: any) => !!t.completed && isCompletedWithinRetention(taskCompletedAt(t)))
                  .map((t: any) => ({
                    id: t.id,
                    kind: 'extra',
                    employee: taskAssignee(t) || 'Sin asignar',
                    type: 'Tarea extra',
                    house: t.house || '',
                    completed_at: taskCompletedAt(t),
                    completed_by: taskCompletedBy(t),
                    employee_confirmed_by: taskEmployeeConfirmedBy(t),
                    title: t.title || 'Tarea extra',
                  }));
                const completedJobs = [...completedCalendarJobs, ...completedExtraJobs]
                  .sort((a: any, b: any) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());
                const removeCompletedJob = async (job: any) => {
                  const what = job.kind === 'extra' ? 'esta tarea extra completada' : 'este trabajo completado';
                  if (!confirm(`¿Eliminar ${what}?\n\n${job.title || job.type} — ${job.employee}\n\nSe borra para siempre. La plantilla de la casa no se toca.`)) return;
                  const result = await deleteCompletedJob(job.kind === 'extra' ? 'extra' : 'calendar', job.id);
                  if (!result.ok) {
                    alert(result.error);
                    return;
                  }
                  if (job.kind === 'extra') {
                    setTasksList(prev => (Array.isArray(prev) ? prev : []).filter((t: any) => String(t.id) !== String(job.id)));
                  } else {
                    setCalendarAssignments(prev => prev.filter((a: any) => String(a.id) !== String(job.id)));
                  }
                };
                return (
                  <div className="completed-jobs">
                    {completedJobs.length === 0 ? (
                      <div className="completed-jobs-empty">
                        <div className="completed-jobs-empty-icon">📋</div>
                        <p className="completed-jobs-empty-title">No hay trabajos completados aún.</p>
                        <p className="completed-jobs-empty-text">Aparecen aquí cuando Jonathan o el manager cierran la tarea extra, la limpieza o el mantenimiento.</p>
                      </div>
                    ) : (
                      <div className="completed-jobs-list">
                        {completedJobs.map((job: any) => (
                          <div key={`cj-${job.kind || "job"}-${job.id}`} className="completed-job-card">
                            <div className="completed-job-info">
                              <div className="completed-job-head">
                                <span className="completed-job-icon">👤</span>
                                <span className="completed-job-employee">{job.employee}</span>
                                <span className="completed-job-type">{job.type}</span>
                              </div>
                              <div className="completed-job-meta">
                                <span>🏠 {job.house}</span>
                                <span>📅 {new Date(job.completed_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                <span>🕐 {new Date(job.completed_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              {job.title && (
                                <div className="completed-job-title">{job.title}</div>
                              )}
                              {job.employee_confirmed_by && (
                                <div className="completed-job-note">Empleado confirmó: {job.employee_confirmed_by}</div>
                              )}
                              {job.completed_by && (
                                <div className="completed-job-note is-muted">Cerrado por: {job.completed_by}</div>
                              )}
                            </div>
                            {canDeleteCompletedJob(user, job) && (
                              <button
                                type="button"
                                className="completed-job-delete"
                                onClick={() => removeCompletedJob(job)}
                                aria-label={`Eliminar ${job.kind === 'extra' ? 'tarea extra' : 'trabajo'} completado de ${job.employee}`}
                              >🗑️ Eliminar</button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="completed-jobs-footnote">Se guardan 6 meses desde el cierre. Después se borran solos.</p>
                  </div>
                );
              })()}
              {selectedModalCard === 'shopping' && (
                <>
                  {/* Formulario para agregar productos */}
                  <div className="modal-assignment-form" ref={inventoryFormRef}>
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
                          <label>📏 Tamaño</label>
                          <select
                            value={newShoppingItem.size}
                            onChange={(e) => setNewShoppingItem({ ...newShoppingItem, size: e.target.value })}
                          >
                            <option value="Pequeño">Pequeño</option>
                            <option value="Mediano">Mediano</option>
                            <option value="Grande">Grande</option>
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
                        <p className="stat-box-number">{formatPurchaseAmount(shoppingHistoryTotal)}</p>
                        <p className="stat-box-label">{shoppingHistoryTotalLabel}</p>
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
                            {item.size && <p><strong>📏 Tamaño:</strong> {item.size}</p>}
                            <p><strong>👤 Agregado por:</strong> {item.added_by}</p>
                            <span className="subcard-badge success">🛒 Por comprar</span>
                          </div>
                          
                          {/* Botón para manager: marcar como comprado */}
                          {(user.role === 'owner' || user.role === 'manager') && (
                            <div className="subcard-actions">
                              <button 
                                onClick={() => setPurchaseDraft({ itemId: item.id, amount: '' })}
                              >
                                ✅ Marcar Comprado
                              </button>
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
                            </div>
                          )}
                          {purchaseDraft.itemId === item.id && (
                            <div className="modal-assignment-form" style={{ marginTop: '1rem' }}>
                              <div className="assignment-form-grid">
                                <div className="form-group">
                                  <label>💵 Valor de la compra</label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={purchaseDraft.amount}
                                    onChange={(e) => setPurchaseDraft({ itemId: item.id, amount: e.target.value })}
                                    placeholder="Ej: 25000"
                                  />
                                </div>
                              </div>
                              <div className="subcard-actions">
                                <button type="button" onClick={async () => {
                                  await handleShoppingPurchase(item.id);
                                }}>Guardar compra</button>
                                <button type="button" className="secondary" onClick={() => setPurchaseDraft({ itemId: '', amount: '' })}>Cancelar</button>
                              </div>
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
                          <div className="assignment-form-grid" style={{marginTop: '1rem'}}>
                            <div className="form-group">
                              <label>Filtro</label>
                              <select
                                value={shoppingHistoryFilterType}
                                onChange={(e) => setShoppingHistoryFilterType(e.target.value as 'total' | 'year' | 'month')}
                              >
                                <option value="total">Totales</option>
                                <option value="year">Por año</option>
                                <option value="month">Por mes</option>
                              </select>
                            </div>
                            <div className="form-group">
                              <label>Año</label>
                              <select
                                value={shoppingHistoryFilterYear}
                                onChange={(e) => setShoppingHistoryFilterYear(e.target.value)}
                                disabled={shoppingHistoryFilterType === 'total'}
                              >
                                <option value="">Todos los años</option>
                                {availableShoppingYears.map(year => (
                                  <option key={year} value={year}>{year}</option>
                                ))}
                              </select>
                            </div>
                            <div className="form-group">
                              <label>Mes</label>
                              <select
                                value={shoppingHistoryFilterMonth}
                                onChange={(e) => setShoppingHistoryFilterMonth(e.target.value)}
                                disabled={shoppingHistoryFilterType !== 'month'}
                              >
                                <option value="">Todos los meses</option>
                                <option value="01">Enero</option>
                                <option value="02">Febrero</option>
                                <option value="03">Marzo</option>
                                <option value="04">Abril</option>
                                <option value="05">Mayo</option>
                                <option value="06">Junio</option>
                                <option value="07">Julio</option>
                                <option value="08">Agosto</option>
                                <option value="09">Septiembre</option>
                                <option value="10">Octubre</option>
                                <option value="11">Noviembre</option>
                                <option value="12">Diciembre</option>
                              </select>
                            </div>
                            <div className="form-group">
                              <label>{shoppingHistoryTotalLabel}</label>
                              <input value={formatPurchaseAmount(shoppingHistoryTotal)} readOnly />
                            </div>
                          </div>
                        </div>
                        
                        {filteredShoppingHistory.map((h, idx) => (
                          <div key={h.id || idx} className="subcard">
                            <div className="subcard-header">
                              <div className="subcard-icon">📦</div>
                              <h3>{h.item_name}</h3>
                            </div>
                            <div className="subcard-content">
                              {h.quantity && <p><strong>🔢 Cantidad:</strong> {h.quantity}</p>}
                              {h.size && <p><strong>📏 Tamaño:</strong> {h.size}</p>}
                              <p><strong>👤 Agregado por:</strong> {h.added_by}</p>
                              <p><strong>✅ Comprado por:</strong> {h.purchased_by}</p>
                              <p><strong>💵 Valor:</strong> {formatPurchaseAmount(h.purchase_amount)}</p>
                              <p><strong>📅 Fecha compra:</strong> {formatPurchaseDate(h.purchased_at)}</p>
                              <span className="subcard-badge">✅ Comprado</span>
                            </div>
                            {editPurchaseAmount.itemId === h.id && (
                              <div className="form-row" style={{ gap: 8, alignItems: 'center', padding: '8px 0' }}>
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="Nuevo valor"
                                  value={editPurchaseAmount.amount}
                                  onChange={e => setEditPurchaseAmount({ itemId: h.id, amount: e.target.value })}
                                  className="form-input"
                                  style={{ maxWidth: 150 }}
                                  autoFocus
                                />
                                <button className="btn-primary" onClick={() => handleUpdatePurchaseAmount(h.id)}>💾 Guardar</button>
                                <button className="btn-secondary" onClick={() => setEditPurchaseAmount({ itemId: '', amount: '' })}>Cancelar</button>
                              </div>
                            )}
                            <div className="subcard-actions">
                              <button
                                onClick={() => setEditPurchaseAmount({ itemId: h.id, amount: String(h.purchase_amount ?? '') })}
                              >
                                ✏️ Editar valor
                              </button>
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
                  {(canManageReminders) && (
                    <div className="modal-assignment-form">
                      <h3>🔔 {editingReminderIdx >= 0 ? 'Editar Recordatorio' : 'Nuevo Recordatorio'}</h3>
                      <form onSubmit={async (e) => {
                        e.preventDefault();
                        if (savingReminderRef.current) return;
                        savingReminderRef.current = true;
                        setSavingReminder(true);
                        try {
                        const selectedHouse = houses[allowedHouseIdx]?.name || 'EPIC D1';
                        if (editingReminderIdx >= 0) {
                          // Editar recordatorio existente
                          const reminder = reminders[editingReminderIdx];
                          const updated = await realtimeService.updateReminder(reminder.id, {
                            name: newReminder.name,
                            due: newReminder.due,
                            bank: newReminder.bank,
                            account: newReminder.account,
                            invoiceNumber: newReminder.invoiceNumber,
                            frequency: newReminder.frequency,
                            interval_days: newReminder.frequency === 'custom' ? newReminder.interval_days : null,
                            amount: newReminder.amount ? parseFloat(newReminder.amount) : null
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
                            frequency: newReminder.frequency,
                            interval_days: newReminder.frequency === 'custom' ? newReminder.interval_days : null,
                            amount: newReminder.amount ? parseFloat(newReminder.amount) : null,
                            house: selectedHouse,
                            created_by: (user as any)?.username || null
                          });
                          if (created) {
                            // El evento realtime INSERT también llega: upsert por id para no duplicar.
                            setReminders(prev => upsertReminderById(prev, created));
                          }
                        }
                        setNewReminder({ name: '', due: '', bank: '', account: '', invoiceNumber: '', frequency: 'once', interval_days: '', amount: '' });
                        } catch (err) {
                          console.error('❌ Error guardando recordatorio:', err);
                          addRealtimeNotification('No se pudo guardar el recordatorio', 'error');
                        } finally {
                          savingReminderRef.current = false;
                          setSavingReminder(false);
                        }
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
                          
                          <div className="form-group">
                            <label>💰 Monto</label>
                            <input
                              type="number"
                              step="0.01"
                              value={newReminder.amount}
                              onChange={(e) => setNewReminder({...newReminder, amount: e.target.value})}
                              placeholder="Ej: 150.00"
                              title="Monto del pago"
                            />
                          </div>
                          
                          <div className="form-group">
                            <label>🔄 Frecuencia</label>
                            <select
                              value={newReminder.frequency}
                              onChange={(e) => setNewReminder({...newReminder, frequency: e.target.value as ReminderFrequency})}
                              title="Frecuencia del pago"
                              style={{padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '1rem', width: '100%'}}
                            >
                              {REMINDER_FREQUENCY_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </div>

                          {newReminder.frequency === 'custom' && (
                            <div className="form-group">
                              <label>⏱️ Cada cuántos días</label>
                              <input
                                type="number"
                                min="1"
                                step="1"
                                inputMode="numeric"
                                value={newReminder.interval_days}
                                onChange={(e) => setNewReminder({...newReminder, interval_days: e.target.value})}
                                required
                                placeholder="Ej: 15"
                                title="Cada cuántos días se repite"
                              />
                            </div>
                          )}
                        </div>
                        
                        <div style={{display: 'flex', gap: '1rem'}}>
                          <button type="submit" className="dashboard-btn main" style={{flex: 1}} disabled={savingReminder} aria-busy={savingReminder}>
                            {savingReminder ? 'Guardando…' : editingReminderIdx >= 0 ? '✏️ Actualizar' : '➕ Agregar Recordatorio'}
                          </button>
                          {editingReminderIdx >= 0 && (
                            <button 
                              type="button" 
                              className="dashboard-btn danger" 
                              onClick={() => {
                                setEditingReminderIdx(-1);
                                setNewReminder({ name: '', due: '', bank: '', account: '', invoiceNumber: '', frequency: 'once', interval_days: '', amount: '' });
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
                      reminders.map((item, idx) => {
                        const rawDue = item.due_date || item.due;
                        let urgency: 'ok' | 'soon' | 'overdue' = 'ok';
                        if (!item.paid && rawDue) {
                          const due = new Date(rawDue);
                          const today = new Date();
                          today.setHours(0,0,0,0);
                          due.setHours(0,0,0,0);
                          const soon = new Date(today); soon.setDate(soon.getDate() + 7);
                          if (!Number.isNaN(due.getTime())) {
                            if (due < today) urgency = 'overdue';
                            else if (due <= soon) urgency = 'soon';
                          }
                        }
                        return (
                        <div key={item.id ?? idx} className={`subcard reminder-subcard${urgency !== 'ok' ? ' reminder-urgent' : ''}`} style={urgency === 'overdue' ? {borderColor:'#dc2626', background:'#fef2f2'} : urgency === 'soon' ? {borderColor:'#f59e0b', background:'#fffbeb'} : undefined}>
                          <div className="subcard-header">
                            <div className="subcard-icon">{urgency === 'overdue' ? '🚨' : urgency === 'soon' ? '⚠️' : '🔔'}</div>
                            <h3>{item.name}{urgency === 'overdue' ? ' (VENCIDO)' : urgency === 'soon' ? ' (por vencer)' : ''}</h3>
                            {isRecurring(item) && (
                              <span className="reminder-freq-pill">🔁 {frequencyLabel(item)}</span>
                            )}
                          </div>
                          <div className="subcard-content">
                            <p><strong>📅 Vence:</strong> {formatShortDate(item.due)}</p>
                            {item.amount && <p><strong>💰 Monto:</strong> ${parseFloat(item.amount).toFixed(2)}</p>}
                            <p><strong>🏦 Banco:</strong> {item.bank}</p>
                            <p><strong>🔢 Cuenta:</strong> {item.account}</p>
                            {item.invoiceNumber && <p><strong>📄 Factura:</strong> {item.invoiceNumber}</p>}
                            <span className="subcard-badge">{item.bank}</span>
                          </div>
                          {renderReminderDone(item)}
                          {(user.role === 'owner' || user.role === 'manager') && (
                            <div className="subcard-actions">
                              <button 
                                onClick={() => {
                                  setNewReminder({
                                    ...item,
                                    frequency: item.frequency || 'once',
                                    interval_days: item.interval_days ? String(item.interval_days) : '',
                                    amount: item.amount ? String(item.amount) : ''
                                  });
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
                      );
                      })
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
                  {(user.role === 'owner' || (user.role === 'manager' && isJonathanUser)) && (
                    <div className="modal-assignment-form" style={{marginBottom: '1.5rem'}}>
                      <h3>🏠 Casa</h3>
                      <div className="assignment-form-grid">
                        <div className="form-group" style={{gridColumn: '1 / -1'}}>
                          <label>Seleccionar casa</label>
                          <select
                            value={selectedHouseIdx}
                            onChange={(e) => setSelectedHouseIdx(parseInt(e.target.value, 10))}
                            title="Seleccionar casa"
                          >
                            {houses.map((house, idx) => (
                              <option key={house.id || idx} value={idx}>
                                {house.houseName || house.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <p style={{margin: '0.75rem 0 0', color: '#6b7280', fontSize: '0.9rem'}}>
                        Esta lista se sincroniza con las asignaciones de la casa seleccionada.
                      </p>
                    </div>
                  )}
                  <p className="job-board-lead">
                    Los trabajos asignados están aquí. El calendario solo sirve para agregarlos.
                  </p>

                  <div className="job-board">
                    <div className="job-board-head">
                      <div>
                        <h3 className="job-board-title">Trabajos asignados</h3>
                        <p className="job-board-sub">Se completan aquí. El calendario no muestra esta lista.</p>
                      </div>
                      <span className="job-board-count">{openAssignments.length}</span>
                    </div>
                    {openAssignments.length === 0 ? (
                      <p className="job-board-empty">No hay trabajos asignados. Agrégalos en Calendario.</p>
                    ) : (
                      <>
                        <section className="job-board-section">
                          <h4 className="job-board-section-title">Pendientes</h4>
                          {pendingAssignments.length === 0 ? (
                            <p className="job-board-empty">No hay trabajos esperando al empleado.</p>
                          ) : (
                            <div className="job-board-list">
                              {pendingAssignments.map((assignment: any) => renderAssignedJob(assignment))}
                            </div>
                          )}
                        </section>
                        <section className="job-board-section is-ready">
                          <h4 className="job-board-section-title">Empleado confirmó</h4>
                          {readyAssignments.length === 0 ? (
                            <p className="job-board-empty">Nadie ha terminado el checklist todavía.</p>
                          ) : (
                            <div className="job-board-list">
                              {readyAssignments.map((assignment: any) => renderAssignedJob(assignment, true))}
                            </div>
                          )}
                        </section>
                      </>
                    )}
                  </div>

                  {/* Formulario para agregar/editar tarea (solo manager/owner) */}
                  {(user.role === 'owner' || user.role === 'manager' || user.role === 'dueno') && (
                    <div className="modal-assignment-form" style={{marginBottom: '2rem'}} ref={checklistFormRef}>
                      <h3>➕ {editingChecklistTemplateId ? 'Editar Tarea del Template' : 'Agregar Tarea al Template'}</h3>
                      <form onSubmit={async (e) => {
                        e.preventDefault();
                        const selectedHouse = houses[allowedHouseIdx]?.name || 'EPIC D1';

                        if (!newChecklistTemplate.task.trim() || !newChecklistTemplate.zone.trim()) return;

                        const maxOrder = checklistTemplates.reduce((max, item) => {
                          const val = Number(item.order_num || 0);
                          return val > max ? val : max;
                        }, 0);

                        if (editingChecklistTemplateId) {
                          if (checklistTemplatesSource === 'checklist') {
                            const updated = await realtimeService.updateChecklistTemplateLegacy(editingChecklistTemplateId, {
                              room: newChecklistTemplate.zone.trim(),
                              item: newChecklistTemplate.task.trim(),
                              assigned_to: newChecklistTemplate.task_type
                            });
                            if (updated) {
                              setChecklistTemplates(prev => prev.map(t => t.id === updated.id ? updated : t));
                            } else {
                              alert('No se pudo actualizar. Revisa permisos en Supabase.');
                            }
                          } else {
                            const updated = await realtimeService.updateChecklistTemplate(editingChecklistTemplateId, {
                              zone: newChecklistTemplate.zone.trim(),
                              task: newChecklistTemplate.task.trim(),
                              task_type: newChecklistTemplate.task_type
                            });
                            if (updated) {
                              setChecklistTemplates(prev => prev.map(t => t.id === updated.id ? updated : t));
                            } else {
                              alert('No se pudo actualizar. Revisa permisos en Supabase.');
                            }
                          }
                          setEditingChecklistTemplateId(null);
                        } else {
                          if (checklistTemplatesSource === 'checklist') {
                            const created = await realtimeService.createChecklistTemplateLegacy({
                              house: selectedHouse,
                              room: newChecklistTemplate.zone.trim(),
                              item: newChecklistTemplate.task.trim(),
                              assigned_to: newChecklistTemplate.task_type
                            });
                            if (created) {
                              setChecklistTemplates(prev => [...prev, created]);
                            } else {
                              alert('No se pudo crear. Revisa permisos en Supabase.');
                            }
                          } else {
                            const created = await realtimeService.createChecklistTemplate({
                              house: selectedHouse,
                              task_type: newChecklistTemplate.task_type,
                              zone: newChecklistTemplate.zone.trim(),
                              task: newChecklistTemplate.task.trim(),
                              order_num: maxOrder + 1,
                              active: true
                            });
                            if (created) {
                              setChecklistTemplates(prev => [...prev, created]);
                            } else {
                              alert('No se pudo crear. Revisa permisos en Supabase.');
                            }
                          }
                        }

                        setNewChecklistTemplate({ zone: '', task: '', task_type: 'Limpieza regular' });
                      }}>
                        <div className="assignment-form-grid">
                          <div className="form-group">
                            <label>🏷️ Tipo</label>
                            <select
                              value={newChecklistTemplate.task_type}
                              onChange={(e) => setNewChecklistTemplate({ ...newChecklistTemplate, task_type: e.target.value })}
                              required
                              title="Tipo de checklist"
                            >
                              <option value="Limpieza regular">🧹 Limpieza Regular</option>
                              <option value="Limpieza profunda">🏠 Limpieza Profunda</option>
                              <option value="Mantenimiento">🔧 Mantenimiento</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label>📍 Zona</label>
                            <input
                              id="checklist-template-zone"
                              type="text"
                              list="checklist-template-zone-options"
                              value={newChecklistTemplate.zone}
                              onChange={(e) => setNewChecklistTemplate({ ...newChecklistTemplate, zone: e.target.value })}
                              required
                              placeholder="Ej: COCINA"
                              title="Zona"
                            />
                            <datalist id="checklist-template-zone-options">
                              {Array.from(new Set([
                                ...CHECKLIST_TEMPLATE_ROOM_ORDER,
                                ...checklistTemplates.map((t: any) => String(t.zone || t.room || '').trim()).filter(Boolean),
                              ])).map((zoneName) => (
                                <option key={zoneName} value={zoneName} />
                              ))}
                            </datalist>
                          </div>
                          <div className="form-group">
                            <label>📋 Tarea</label>
                            <input
                              id="checklist-template-task"
                              type="text"
                              value={newChecklistTemplate.task}
                              onChange={(e) => setNewChecklistTemplate({ ...newChecklistTemplate, task: e.target.value })}
                              required
                              placeholder="Ej: Limpiar estufa"
                              title="Tarea"
                            />
                          </div>
                        </div>
                        <div style={{display: 'flex', gap: '1rem'}}>
                          <button type="submit" className="dashboard-btn main" style={{flex: 1}}>
                            {editingChecklistTemplateId ? '✏️ Actualizar' : '➕ Agregar Tarea'}
                          </button>
                          {editingChecklistTemplateId && (
                            <button 
                              type="button" 
                              className="dashboard-btn danger" 
                              onClick={() => {
                                setEditingChecklistTemplateId(null);
                                setNewChecklistTemplate({ zone: '', task: '', task_type: 'Limpieza regular' });
                              }}
                            >
                              ❌ Cancelar
                            </button>
                          )}
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Estadísticas + filtros */}
                  {(() => {
                    const filteredTemplates = checklistTemplates.filter((item: any) => {
                      if (checklistTemplateTypeFilter === 'all') return true;
                      const type = inferChecklistTemplateType(item);
                      return type === checklistTemplateTypeFilter;
                    });
                    const zoneCount = new Set(filteredTemplates.map((t: any) => t.zone || t.room || 'SIN ZONA')).size;
                    return (
                      <div className="modal-stats" style={{marginBottom: '1rem'}}>
                        <div className="stat-box">
                          <p className="stat-box-number">{filteredTemplates.length}</p>
                          <p className="stat-box-label">Tareas visibles</p>
                        </div>
                        <div className="stat-box">
                          <p className="stat-box-number">{zoneCount}</p>
                          <p className="stat-box-label">Zonas</p>
                        </div>
                        <div className="stat-box">
                          <p className="stat-box-number">{houses[allowedHouseIdx]?.name || 'EPIC D1'}</p>
                          <p className="stat-box-label">Casa</p>
                        </div>
                      </div>
                    );
                  })()}
                  {checklistTemplatesError && checklistTemplatesSource === 'checklist_templates' && (
                    <div style={{textAlign: 'center', marginBottom: '1rem', color: '#dc2626'}}>
                      {checklistTemplatesError}
                      {String(checklistTemplatesError).includes('checklist_templates') && (
                        <div style={{marginTop: '0.5rem', color: '#b91c1c'}}>
                          Ejecuta el SQL en &quot;create-checklist-templates-table.sql&quot; para crear la tabla en Supabase.
                        </div>
                      )}
                    </div>
                  )}

                  <div className="cl-admin-type-tabs">
                    {[
                      { id: 'Limpieza regular', label: 'Limpieza' },
                      { id: 'Limpieza profunda', label: 'Profunda' },
                      { id: 'Mantenimiento', label: 'Mantenimiento' },
                      { id: 'all', label: 'Todo' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        className={checklistTemplateTypeFilter === tab.id ? 'on' : ''}
                        onClick={() => {
                          setChecklistTemplateTypeFilter(tab.id);
                          setOpenChecklistTemplateZone(null);
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Zonas con tareas (acordeón compacto) */}
                  <div className="cl-admin-zones">
                    {loadingChecklistTemplates ? (
                      <div className="modal-body-empty">
                        <p>Cargando template...</p>
                      </div>
                    ) : checklistTemplates.length > 0 ? (
                      (() => {
                        const filtered = checklistTemplates.filter((item: any) => {
                          if (checklistTemplateTypeFilter === 'all') return true;
                          const type = inferChecklistTemplateType(item);
                          return type === checklistTemplateTypeFilter;
                        });

                        const zones = new Map<string, any[]>();
                        filtered.forEach((item: any) => {
                          const zoneName = String(item.zone || item.room || 'SIN ZONA').trim() || 'SIN ZONA';
                          if (!zones.has(zoneName)) zones.set(zoneName, []);
                          zones.get(zoneName)!.push(item);
                        });

                        const sortedZones = Array.from(zones.entries()).sort((a, b) => {
                          const ai = CHECKLIST_TEMPLATE_ROOM_ORDER.indexOf(a[0].toUpperCase());
                          const bi = CHECKLIST_TEMPLATE_ROOM_ORDER.indexOf(b[0].toUpperCase());
                          return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
                        });

                        if (!sortedZones.length) {
                          return (
                            <div className="modal-body-empty">
                              <p>No hay tareas en este tipo para esta casa.</p>
                              <p style={{marginTop:'0.4rem',color:'#64748b'}}>Usa el filtro (Limpieza / Profunda / Mantenimiento) o agrega una tarea con su zona.</p>
                            </div>
                          );
                        }

                        const activeZone = openChecklistTemplateZone && sortedZones.some(([z]) => z === openChecklistTemplateZone)
                          ? openChecklistTemplateZone
                          : sortedZones[0][0];

                        return (
                          <>
                            {sortedZones.map(([zone, items]) => {
                              const open = activeZone === zone;
                              return (
                                <section key={zone} className={`cl-admin-zone${open ? ' open' : ''}`}>
                                  <button
                                    type="button"
                                    className="cl-admin-zone-btn"
                                    aria-expanded={open}
                                    onClick={() => setOpenChecklistTemplateZone(open ? null : zone)}
                                  >
                                    <span>{zone}</span>
                                    <span className="cl-admin-zone-count">{items.length} tareas</span>
                                  </button>
                                  {open && (
                                    <div className="cl-admin-task-list">
                                      {items.map((item: any) => (
                                        <div key={item.id} className="cl-admin-task-row">
                                          <div className="cl-admin-task-text">
                                            <strong>{item.task || item.item}</strong>
                                            {checklistTemplateTypeFilter === 'all' && (
                                              <span className="cl-admin-task-meta">{inferChecklistTemplateType(item)}</span>
                                            )}
                                          </div>
                                          {(user.role === 'owner' || user.role === 'manager' || user.role === 'dueno') && (
                                            <div className="cl-admin-task-actions">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setEditingChecklistTemplateId(item.id);
                                                  setNewChecklistTemplate({
                                                    zone: item.zone || item.room || '',
                                                    task: item.task || item.item || '',
                                                    task_type: item.task_type || item.assigned_to || 'Limpieza regular'
                                                  });
                                                  requestAnimationFrame(() => {
                                                    checklistFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                    const input = document.getElementById('checklist-template-task') as HTMLInputElement | null;
                                                    input?.focus();
                                                  });
                                                }}
                                              >
                                                Editar
                                              </button>
                                              <button
                                                type="button"
                                                className="danger"
                                                onClick={async () => {
                                                  const label = item.task || item.item || 'tarea';
                                                  if (!confirm(`¿Eliminar "${label}" del template?`)) return;
                                                  const itemId = item.id;
                                                  // Optimistic remove (rollback if persist fails)
                                                  setChecklistTemplates(prev => prev.filter(t => String(t.id) !== String(itemId)));
                                                  let ok = false;
                                                  if (checklistTemplatesSource === 'checklist') {
                                                    ok = await realtimeService.deleteChecklistTemplateLegacy(itemId);
                                                  } else {
                                                    ok = await realtimeService.deleteChecklistTemplate(itemId);
                                                    if (!ok) {
                                                      ok = await realtimeService.deleteChecklistTemplateLegacy(itemId);
                                                    }
                                                  }
                                                  if (!ok) {
                                                    setChecklistTemplates(prev => dedupeChecklistTemplates([...prev, item]));
                                                    alert('No se pudo eliminar. Revisa sesión/permisos en Supabase (owner/manager de esta casa).');
                                                  }
                                                }}
                                              >
                                                Eliminar
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </section>
                              );
                            })}
                          </>
                        );
                      })()
                    ) : (
                      <div className="modal-body-empty">
                        <p>🏠 Casa vacía: mismo panel que EPIC D1 (zonas en acordeón), sin tareas aún.</p>
                        <p style={{marginTop:'0.5rem',color:'#64748b'}}>El manager agrega zonas y tareas desde cero. No se copian de otras casas.</p>
                      </div>
                    )}
                  </div>
                </>
              )}
              {selectedTaskMaintenance && (
                <div className="modal-overlay" onClick={() => setSelectedTaskMaintenance(null)}>
                  <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    {backRow}
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
                <Inventory
                  user={user}
                  houseName={
                    user.house && user.house !== 'all'
                      ? user.house
                      : (houses[selectedHouseIdx]?.houseName || houses[selectedHouseIdx]?.name || houses[allowedHouseIdx]?.name || 'EPIC D1')
                  }
                />
              )}
              {false && selectedModalCard === 'inventory' && (
                <>
                  {/* ============ VISTA EMPLEADO: completo/incompleto ============ */}
                  {user.role === 'empleado' && (
                    <div>
                      {/* Barra de progreso visual */}
                      {(() => {
                        const total = inventoryList.length;
                        const done = inventoryList.filter(i => i.complete).length;
                        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                        return (
                          <div style={{marginBottom: '1.5rem', background: '#f8fafc', borderRadius: '1rem', padding: '1.25rem 1.5rem', border: '1px solid #e2e8f0'}}>
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem'}}>
                              <span style={{fontWeight: 700, color: '#0f172a', fontSize: '1rem'}}>📦 Progreso del Inventario</span>
                              <span style={{fontWeight: 800, fontSize: '1.1rem', color: pct === 100 ? '#10b981' : '#2563eb'}}>{done}/{total} completos</span>
                            </div>
                            <div style={{background: '#e2e8f0', borderRadius: '1rem', height: '12px', overflow: 'hidden'}}>
                              <div style={{height: '100%', borderRadius: '1rem', width: `${pct}%`, background: pct === 100 ? 'linear-gradient(90deg,#10b981,#059669)' : 'linear-gradient(90deg,#2563eb,#0ea5e9)', transition: 'width 0.4s ease'}} />
                            </div>
                            <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.85rem'}}>
                              <span style={{color: '#10b981', fontWeight: 600}}>✅ {done} completos</span>
                              <span style={{color: '#f59e0b', fontWeight: 600}}>⏳ {total - done} pendientes</span>
                              <span style={{color: pct === 100 ? '#10b981' : '#2563eb', fontWeight: 700}}>{pct}%</span>
                            </div>
                          </div>
                        );
                      })()}

                      {loadingInventory ? (
                        <div className="modal-body-empty"><p>Cargando inventario...</p></div>
                      ) : inventoryList.length === 0 ? (
                        <div className="modal-body-empty"><p>📭 No hay items en el inventario de esta casa.</p></div>
                      ) : (
                        (() => {
                          const grouped = new Map<string, any[]>();
                          inventoryList.forEach(item => {
                            const key = item.location || item.category || 'General';
                            if (!grouped.has(key)) grouped.set(key, []);
                            grouped.get(key)!.push(item);
                          });
                          return (
                            <div style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
                              {Array.from(grouped.entries()).map(([group, groupItems]) => {
                                const groupDone = groupItems.filter(i => i.complete).length;
                                return (
                                  <div key={group}>
                                    {/* Header de grupo */}
                                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', padding: '0.75rem 1rem', background: 'linear-gradient(135deg,#1e40af,#2563eb)', borderRadius: '0.75rem', color: 'white'}}>
                                      <span style={{fontWeight: 800, fontSize: '1.05rem'}}>📍 {group}</span>
                                      <span style={{background: groupDone === groupItems.length ? '#10b981' : 'rgba(255,255,255,0.25)', padding: '0.3rem 0.75rem', borderRadius: '1rem', fontSize: '0.9rem', fontWeight: 700}}>
                                        {groupDone}/{groupItems.length}
                                      </span>
                                    </div>
                                    {/* Tarjetas del grupo */}
                                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem'}}>
                                      {groupItems.map((item: any) => (
                                        <div key={item.id} style={{
                                          background: item.complete ? 'linear-gradient(135deg,#f0fdf4,#dcfce7)' : 'linear-gradient(135deg,#fffbeb,#fef3c7)',
                                          border: item.complete ? '2px solid #86efac' : '2px solid #fcd34d',
                                          borderRadius: '1rem',
                                          overflow: 'hidden',
                                          boxShadow: item.complete ? '0 2px 8px rgba(16,185,129,0.15)' : '0 2px 8px rgba(245,158,11,0.15)',
                                          transition: 'all 0.3s ease'
                                        }}>
                                          {/* Banda superior de estado */}
                                          <div style={{background: item.complete ? '#10b981' : '#f59e0b', padding: '0.4rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                                            <span style={{fontSize: '1.1rem'}}>{item.complete ? '✅' : '📦'}</span>
                                            <span style={{color: 'white', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.05em', textTransform: 'uppercase'}}>
                                              {item.complete ? 'Completo' : 'Pendiente'}
                                            </span>
                                          </div>
                                          {/* Contenido */}
                                          <div style={{padding: '1rem 1.25rem'}}>
                                            <h3 style={{margin: '0 0 0.75rem', fontSize: '1.1rem', fontWeight: 800, color: item.complete ? '#166534' : '#92400e', lineHeight: '1.3'}}>
                                              {item.name}
                                            </h3>
                                            <div style={{display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: item.notes ? '0.75rem' : '1rem'}}>
                                              <span style={{background: item.complete ? '#dcfce7' : '#fef3c7', border: item.complete ? '1px solid #86efac' : '1px solid #fcd34d', borderRadius: '0.5rem', padding: '0.3rem 0.6rem', fontSize: '0.9rem', fontWeight: 600, color: item.complete ? '#166534' : '#92400e'}}>
                                                🔢 Cantidad: {item.quantity}
                                              </span>
                                            </div>
                                            {item.notes && (
                                              <div style={{background: 'rgba(0,0,0,0.04)', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.85rem', color: '#4b5563', marginBottom: '1rem'}}>
                                                📝 {item.notes}
                                              </div>
                                            )}
                                            {/* Botón de toggle */}
                                            <button
                                              type="button"
                                              onClick={async () => {
                                                const newVal = !item.complete;
                                                setInventoryList(prev => prev.map(i => i.id === item.id ? {...i, complete: newVal} : i));
                                                await (supabase as any).from('inventory').update({ complete: newVal, updated_at: new Date().toISOString() }).eq('id', item.id);
                                              }}
                                              style={{
                                                width: '100%',
                                                padding: '0.75rem 1rem',
                                                background: item.complete ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#10b981,#059669)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '0.75rem',
                                                fontWeight: 800,
                                                fontSize: '1rem',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.5rem',
                                                boxShadow: item.complete ? '0 3px 8px rgba(239,68,68,0.35)' : '0 3px 8px rgba(16,185,129,0.35)',
                                                transition: 'all 0.2s ease',
                                                letterSpacing: '0.02em'
                                              }}
                                            >
                                              {item.complete ? '↩ Marcar como Pendiente' : '✔ Marcar como Completo'}
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()
                      )}
                    </div>
                  )}

                  {/* ============ VISTA ADMIN/MANAGER/JONATHAN ============ */}
                  {(user.role === 'owner' || user.role === 'manager' || user.role === 'dueno') && (
                    <>
                      {/* Selector de casa (solo owner o jonathan) */}
                      {(user.role === 'owner' || (user.role === 'manager' && isJonathanUser)) && (
                        <div className="modal-assignment-form" style={{marginBottom: '1.5rem'}}>
                          <h3>🏠 Casa</h3>
                          <div className="assignment-form-grid">
                            <div className="form-group" style={{gridColumn: '1 / -1'}}>
                              <label>Seleccionar casa</label>
                              <select
                                value={selectedHouseIdx}
                                onChange={(e) => setSelectedHouseIdx(parseInt(e.target.value, 10))}
                                title="Seleccionar casa"
                              >
                                {houses.map((house, idx) => (
                                  <option key={house.id || idx} value={idx}>
                                    {house.houseName || house.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Estado del inventario en tiempo real */}
                      <div style={{marginBottom:'1.5rem'}}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.5rem', marginBottom:'1rem'}}>
                          <h3 style={{margin:0, color:'#166534'}}>📊 Estado del Inventario (Tiempo Real)</h3>
                          <span style={{background: inventoryList.filter(i => i.complete).length === inventoryList.length && inventoryList.length > 0 ? '#10b981' : '#f59e0b', color:'white', padding:'0.35rem 0.85rem', borderRadius:'1rem', fontWeight:700, fontSize:'0.9rem'}}>
                            {inventoryList.filter(i => i.complete).length}/{inventoryList.length} completos
                          </span>
                        </div>
                        {inventoryList.length > 0 && (
                          <>
                            <div className="modal-stats" style={{marginBottom:'1rem'}}>
                              <div className="stat-box">
                                <p className="stat-box-number">{inventoryList.length}</p>
                                <p className="stat-box-label">Total Items</p>
                              </div>
                              <div className="stat-box">
                                <p className="stat-box-number" style={{color:'#10b981'}}>{inventoryList.filter(i => i.complete).length}</p>
                                <p className="stat-box-label">Completos</p>
                              </div>
                              <div className="stat-box">
                                <p className="stat-box-number" style={{color:'#f59e0b'}}>{inventoryList.filter(i => !i.complete).length}</p>
                                <p className="stat-box-label">Pendientes</p>
                              </div>
                            </div>
                            {(() => {
                              const grouped = new Map<string, any[]>();
                              inventoryList.forEach((item: any) => {
                                const key = item.location || item.category || 'General';
                                if (!grouped.has(key)) grouped.set(key, []);
                                grouped.get(key)!.push(item);
                              });
                              return (
                                <div>
                                  {Array.from(grouped.entries()).map(([group, groupItems]) => (
                                    <div key={group} style={{marginBottom:'1.5rem'}}>
                                      <h3 style={{marginBottom:'0.75rem', color:'#2563eb'}}>{group} ({groupItems.length} items)</h3>
                                      <div className="subcards-grid">
                                        {groupItems.map((item: any) => (
                                          <div key={item.id} className="subcard" style={{borderTop: item.complete ? '4px solid #10b981' : '4px solid #f59e0b'}}>
                                            <div className="subcard-header">
                                              <div className="subcard-icon">{item.complete ? '✅' : '⏳'}</div>
                                              <h3 style={{color: item.complete ? '#166534' : '#92400e'}}>{item.name}</h3>
                                            </div>
                                            <div className="subcard-content">
                                              <p><strong>🔢 Cantidad:</strong> {item.quantity}</p>
                                              {item.location && <p><strong>📍 Área:</strong> {item.location}</p>}
                                              <p><strong>📊 Estado:</strong> <span style={{color: item.complete ? '#10b981' : '#f59e0b', fontWeight:700}}>{item.complete ? 'Completo' : 'Pendiente'}</span></p>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}
                            <button
                              onClick={async () => {
                                if (!confirm('¿Reiniciar inventario? Todos los items volverán a estar pendientes.')) return;
                                const ids = inventoryList.map(i => i.id).filter(Boolean);
                                if (ids.length === 0) return;
                                await (supabase as any).from('inventory').update({ complete: false }).in('id', ids);
                                setInventoryList(prev => prev.map(i => ({...i, complete: false})));
                              }}
                              style={{marginTop:'0.75rem', width:'100%', padding:'0.75rem 1rem', background:'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color:'white', border:'none', borderRadius:'0.5rem', fontWeight:700, fontSize:'0.95rem', cursor:'pointer'}}
                            >
                              🔄 Reiniciar Inventario para Próxima Revisión
                            </button>
                          </>
                        )}
                        {inventoryList.length === 0 && !loadingInventory && (
                          <div className="modal-body-empty"><p>📭 No hay items registrados en el inventario de esta casa.</p></div>
                        )}
                      </div>

                      {/* Gestión directa del inventario (sin template) */}
                      <div className="modal-assignment-form" ref={inventoryFormRef}>
                        <h3>📦 {editingInventoryIdx ? 'Editar Item del Inventario' : 'Agregar Item al Inventario'}</h3>
                        <form onSubmit={async (e) => {
                          e.preventDefault();

                          const selectedHouse = houses[allowedHouseIdx]?.name || 'EPIC D1';
                          const normalizedName = newInventoryItem.name.trim();
                          const normalizedRoom = newInventoryItem.location.trim() || 'General';
                          const parsedQuantity = Number.parseInt(newInventoryItem.quantity, 10);
                          const safeQuantity = Number.isNaN(parsedQuantity) ? 1 : Math.max(parsedQuantity, 1);

                          if (!normalizedName) {
                            alert('Ingresa un nombre válido para el artículo.');
                            return;
                          }

                          if (editingInventoryIdx) {
                            const { data: updatedItem } = await (supabase as any)
                              .from('inventory')
                              .update({
                                name: normalizedName,
                                quantity: safeQuantity,
                                location: normalizedRoom,
                                updated_at: new Date().toISOString()
                              })
                              .eq('id', editingInventoryIdx)
                              .select()
                              .single();
                            if (updatedItem) {
                              setInventoryList(prev => prev.map(i => i.id === editingInventoryIdx ? updatedItem : i));
                            }
                          } else {
                            const { data: newItem } = await (supabase as any)
                              .from('inventory')
                              .insert([{
                                name: normalizedName,
                                quantity: safeQuantity,
                                location: normalizedRoom,
                                complete: false,
                                house: selectedHouse,
                                created_at: new Date().toISOString()
                              }])
                              .select()
                              .single();
                            if (newItem) {
                              setInventoryList(prev => [...prev, newItem]);
                            }
                          }

                          setEditingInventoryIdx(null);
                          setInventoryAreaCustom(false);
                          setNewInventoryItem({
                            name: '',
                            quantity: '',
                            location: '',
                            complete: false,
                            notes: '',
                          });
                        }}>
                          <div className="assignment-form-grid">
                            <div className="form-group">
                              <label>📝 Nombre del artículo</label>
                              <input
                                type="text"
                                value={newInventoryItem.name}
                                onChange={(e) => setNewInventoryItem({ ...newInventoryItem, name: e.target.value })}
                                required
                                placeholder="Ej: Tenedores"
                              />
                            </div>
                            <div className="form-group">
                              <label>🔢 Cantidad</label>
                              <input
                                type="number"
                                min="1"
                                value={newInventoryItem.quantity}
                                onChange={(e) => setNewInventoryItem({ ...newInventoryItem, quantity: e.target.value })}
                                required
                                placeholder="Ej: 10"
                              />
                            </div>
                            <div className="form-group">
                              <label>📍 Área</label>
                              {(() => {
                                const predefinedAreas = ['Cocina', 'Sala', 'Baños', 'Habitación', 'Cuarto de lavado', 'Terraza'];
                                const selectVal = inventoryAreaCustom ? 'Otras' : (predefinedAreas.includes(newInventoryItem.location) ? newInventoryItem.location : '');
                                return (
                                  <>
                                    <select
                                      value={selectVal}
                                      onChange={(e) => {
                                        if (e.target.value === 'Otras') {
                                          setInventoryAreaCustom(true);
                                          setNewInventoryItem({ ...newInventoryItem, location: '' });
                                        } else {
                                          setInventoryAreaCustom(false);
                                          setNewInventoryItem({ ...newInventoryItem, location: e.target.value });
                                        }
                                      }}
                                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #ddd', fontSize: '0.95rem' }}
                                    >
                                      <option value="">-- Seleccionar área --</option>
                                      <option value="Cocina">🍳 Cocina</option>
                                      <option value="Sala">🛋️ Sala</option>
                                      <option value="Baños">🚿 Baños</option>
                                      <option value="Habitación">🛏️ Habitación</option>
                                      <option value="Cuarto de lavado">🧺 Cuarto de lavado</option>
                                      <option value="Terraza">🌿 Terraza</option>
                                      <option value="Otras">📦 Otras</option>
                                    </select>
                                    {inventoryAreaCustom && (
                                      <input
                                        type="text"
                                        value={newInventoryItem.location}
                                        onChange={(e) => setNewInventoryItem({ ...newInventoryItem, location: e.target.value })}
                                        placeholder="Especificar área..."
                                        autoFocus
                                        style={{ marginTop: '0.4rem', width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #ddd', fontSize: '0.95rem', boxSizing: 'border-box' }}
                                      />
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '1rem' }}>
                            <button type="submit" className="dashboard-btn main" style={{ flex: 1 }}>
                              {editingInventoryIdx ? '✏️ Actualizar Item' : '➕ Agregar Item'}
                            </button>
                            {editingInventoryIdx && (
                              <button
                                type="button"
                                className="dashboard-btn danger"
                                onClick={() => {
                                  setEditingInventoryIdx(null);
                                  setInventoryAreaCustom(false);
                                  setNewInventoryItem({
                                    name: '',
                                    quantity: '',
                                    location: '',
                                    complete: false,
                                    notes: '',
                                  });
                                }}
                              >
                                ❌ Cancelar
                              </button>
                            )}
                          </div>
                        </form>
                      </div>

                      <div className="subcards-grid">
                        {loadingInventory ? (
                          <div className="modal-body-empty">
                            <p>Cargando inventario...</p>
                          </div>
                        ) : inventoryList.length > 0 ? (
                          inventoryList.map((item: any) => (
                            <div key={item.id} className="subcard" style={{ borderTop: item.complete ? '4px solid #10b981' : '4px solid #f59e0b' }}>
                              <div className="subcard-header">
                                <div className="subcard-icon">{item.complete ? '✅' : '📦'}</div>
                                <h3>{item.name}</h3>
                              </div>
                              <div className="subcard-content">
                                <p><strong>🔢 Cantidad:</strong> {item.quantity}</p>
                                <p><strong>📍 Área:</strong> {item.location || 'General'}</p>
                                <p><strong>📊 Estado empleado:</strong> {item.complete ? 'Completo' : 'Pendiente'}</p>
                              </div>
                              <div className="subcard-actions">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingInventoryIdx(item.id);
                                    const predefined = ['Cocina', 'Sala', 'Baños', 'Habitación', 'Cuarto de lavado', 'Terraza'];
                                    const loc = item.location || '';
                                    setInventoryAreaCustom(!predefined.includes(loc) && loc !== '');
                                    setNewInventoryItem({
                                      name: item.name || '',
                                      quantity: String(item.quantity || ''),
                                      location: item.location || '',
                                      complete: !!item.complete,
                                      notes: item.notes || '',
                                    });
                                    requestAnimationFrame(() => {
                                      inventoryFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    });
                                  }}
                                >
                                  ✏️ Editar
                                </button>
                                <button
                                  type="button"
                                  className="danger"
                                  onClick={async () => {
                                    if (!confirm(`¿Eliminar "${item.name}" del inventario?`)) return;
                                    await (supabase as any).from('inventory').delete().eq('id', item.id);
                                    setInventoryList(prev => prev.filter(i => i.id !== item.id));
                                  }}
                                >
                                  🗑️ Eliminar
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="modal-body-empty">
                            <p>📭 No hay items en el inventario</p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
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
                          const existing = tasksList[editingTaskIdx];
                          const updated = await realtimeService.updateTask(existing.id, {
                            title: newTask.title,
                            description: newTask.description,
                            assignedTo: newTask.assignedTo,
                            type: newTask.type
                          });
                          if (!updated) {
                            alert('No se pudo actualizar la tarea. Intenta de nuevo.');
                            return;
                          }
                          setTasksList(prev => prev.map((t: any) => t.id === existing.id ? { ...t, ...updated } : t));
                          setEditingTaskIdx(-1);
                          if (isExtraTask(updated)) setSelectedModalCard('extraTasks');
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
                          if (!result) {
                            alert('No se pudo crear la tarea. Intenta de nuevo.');
                            return;
                          }
                          setTasksList(prev => {
                            const list = Array.isArray(prev) ? prev : [];
                            if (list.some((t: any) => t.id === result.id)) return list;
                            return [result, ...list];
                          });
                          // La tarea vive en Tareas Extra, no queda en esta lista.
                          setSelectedModalCard('extraTasks');
                        }
                        setNewTask({ title: '', description: '', assignedTo: '', type: 'Tarea extra' });
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
                              {assignableEmployees.length > 0 ? (
                                assignableEmployees.map((u, idx) => (
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
                                setNewTask({ title: '', description: '', assignedTo: '', type: 'Tarea extra' });
                              }}
                            >
                              ❌ Cancelar
                            </button>
                          )}
                        </div>
                      </form>
                    </div>
                  )}
                  
                  {/* Lista de tareas. Las extras no se quedan aquí: se completan en Tareas Extra. */}
                  <div className="subcards-grid">
                    {loadingTasks ? (
                      <div className="modal-body-empty"><p>Cargando tareas...</p></div>
                    ) : tasksVisibleToViewer.filter((t: any) => !isExtraTask(t)).length > 0 ? (
                      <>
                        <div className="modal-stats">
                          <div className="stat-box">
                            <p className="stat-box-number">{tasksVisibleToViewer.filter((t: any) => !isExtraTask(t)).length}</p>
                            <p className="stat-box-label">Tareas totales</p>
                          </div>
                          <div className="stat-box">
                            <p className="stat-box-number">
                              {tasksVisibleToViewer.filter((t: any) => !isExtraTask(t) && t.completed).length}
                            </p>
                            <p className="stat-box-label">Completadas</p>
                          </div>
                          <div className="stat-box">
                            <p className="stat-box-number">
                              {tasksVisibleToViewer.filter((t: any) => !isExtraTask(t) && !t.completed).length}
                            </p>
                            <p className="stat-box-label">Pendientes</p>
                          </div>
                        </div>
                        
                        {tasksVisibleToViewer.filter((t: any) => !isExtraTask(t)).map((task: any, idx: number) => (
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
                              {task.completed && (
                                <p><strong>Completada por:</strong> {taskCompletedBy(task) || taskAssignee(task) || 'Sin registro'}</p>
                              )}
                              {task.completed && formatExtraTaskWhen(taskCompletedAt(task)) && (
                                <p><strong>Cuándo:</strong> {formatExtraTaskWhen(taskCompletedAt(task))}</p>
                              )}
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
                                        type: 'Tarea extra'
                                      });
                                      setEditingTaskIdx(tasksList.findIndex((t: any) => t.id === task.id));
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
                        <p>Las tareas extra se asignan aquí y se completan en Tareas Extra. Esta lista no guarda ese trabajo.</p>
                      </div>
                    )}
                  </div>
                </>
              )}
              
              {selectedModalCard === 'extraTasks' && (
                <div className="extra-task-panel">
                  <div className="extra-task-summary">
                    <p className="extra-task-summary-house">
                      Casa: {houses[selectedHouseIdx]?.houseName || houses[selectedHouseIdx]?.name || houses[allowedHouseIdx]?.name || 'Esta casa'}
                    </p>
                    <p className="extra-task-summary-counts">
                      <span>{extraTasksAwaitingEmployee.length} por confirmar</span>
                      <span>{extraTasksAwaitingClose.length} por cerrar</span>
                    </p>
                  </div>
                  {extraTasksOpen.length === 0 ? (
                    <p className="extra-task-empty">
                      {isEmployeeViewer
                        ? 'No tienes tareas extra abiertas.'
                        : 'No hay tareas extra abiertas. Las cerradas están en Trabajos completados.'}
                    </p>
                  ) : (
                    <>
                      <section className="extra-task-section">
                        <h3 className="extra-task-section-title">Por confirmar</h3>
                        {extraTasksAwaitingEmployee.length === 0 ? (
                          <p className="extra-task-empty">No hay tareas esperando al empleado.</p>
                        ) : (
                          <div className="extra-task-list">
                            {extraTasksAwaitingEmployee.map((task: any) => {
                              const houseLabel = task.house || houses[selectedHouseIdx]?.houseName || houses[selectedHouseIdx]?.name || '';
                              const canConfirm = isEmployeeViewer && nameBelongsToEmployee(taskAssignee(task), user);
                              return (
                                <article key={task.id} className="extra-task-card is-pending">
                                  <header className="extra-task-card-head">
                                    <h3 className="extra-task-title">{task.title || 'Sin título'}</h3>
                                    <span className="extra-task-status is-pending">Por confirmar</span>
                                  </header>
                                  <p className="extra-task-desc">{task.description || 'Sin descripción'}</p>
                                  <dl className="extra-task-meta">
                                    <div><dt>Casa</dt><dd>{houseLabel || 'Esta casa'}</dd></div>
                                    <div><dt>Asignada a</dt><dd>{taskAssignee(task) || 'Sin asignar'}</dd></div>
                                    <div><dt>Asignada por</dt><dd>{task.createdBy || task.created_by || 'Manager'}</dd></div>
                                  </dl>
                                  {canConfirm ? (
                                    <button
                                      type="button"
                                      className="extra-task-complete"
                                      onClick={async () => {
                                        const result = await confirmExtraTaskByEmployee(task, user);
                                        if (!result.ok) {
                                          alert(result.error || 'No se pudo confirmar la tarea. Intenta de nuevo.');
                                          return;
                                        }
                                        setTasksList(prev => prev.map(t =>
                                          t.id === task.id ? { ...t, ...result.task, completed: false } : t
                                        ));
                                      }}
                                    >
                                      Confirmar
                                    </button>
                                  ) : (
                                    <p className="extra-task-empty">Falta la confirmación del empleado. Todavía no se puede cerrar.</p>
                                  )}
                                </article>
                              );
                            })}
                          </div>
                        )}
                      </section>
                      <section className="extra-task-section">
                        <h3 className="extra-task-section-title">Por cerrar</h3>
                        {extraTasksAwaitingClose.length === 0 ? (
                          <p className="extra-task-empty">Nadie ha confirmado una tarea extra todavía.</p>
                        ) : (
                          <div className="extra-task-list">
                            {extraTasksAwaitingClose.map((task: any) => {
                              const houseLabel = task.house || houses[selectedHouseIdx]?.houseName || houses[selectedHouseIdx]?.name || houses[allowedHouseIdx]?.name || '';
                              const taskWithHouse = { ...task, house: houseLabel };
                              const when = formatExtraTaskWhen(taskEmployeeConfirmedAt(task));
                              const canClose = canCloseExtraTask(user, taskWithHouse);
                              return (
                                <article key={task.id} className="extra-task-card is-waiting">
                                  <header className="extra-task-card-head">
                                    <h3 className="extra-task-title">{task.title || 'Sin título'}</h3>
                                    <span className="extra-task-status is-waiting">Esperando cierre</span>
                                  </header>
                                  <p className="extra-task-desc">{task.description || 'Sin descripción'}</p>
                                  <dl className="extra-task-meta">
                                    <div><dt>Casa</dt><dd>{houseLabel || 'Esta casa'}</dd></div>
                                    <div><dt>Asignada a</dt><dd>{taskAssignee(task) || 'Sin asignar'}</dd></div>
                                    <div><dt>Empleado</dt><dd>{taskEmployeeConfirmedBy(task) || taskAssignee(task) || 'Sin registro'}</dd></div>
                                    {when && <div><dt>Confirmó</dt><dd>{when}</dd></div>}
                                  </dl>
                                  {canClose ? (
                                    <button
                                      type="button"
                                      className="extra-task-complete"
                                      onClick={async () => {
                                        const result = await closeExtraTaskByAdmin(taskWithHouse, user);
                                        if (!result.ok) {
                                          alert(result.error || 'No se pudo cerrar la tarea. Intenta de nuevo.');
                                          return;
                                        }
                                        setTasksList(prev => prev.map(t =>
                                          t.id === task.id ? { ...t, ...result.task, completed: true } : t
                                        ));
                                      }}
                                    >
                                      Cerrar y pasar a completadas
                                    </button>
                                  ) : (
                                    <p className="extra-task-empty">Esperando que Jonathan o el manager de la casa la cierren.</p>
                                  )}
                                </article>
                              );
                            })}
                          </div>
                        )}
                      </section>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Modal para el checklist de una sola asignación */}
      {selectedAssignmentForChecklist && (
        <div className="modal-overlay" onClick={() => {
          setSelectedAssignmentForChecklist(null);
          setCurrentAssignmentType(null);
        }}>
          <div className="modal-content large-modal job-sheet-modal" onClick={e => e.stopPropagation()}>
            {backRow}
            <div className="modal-header">
              <h2>Checklist</h2>
              <button className="modal-close" onClick={() => {
                setSelectedAssignmentForChecklist(null);
                setCurrentAssignmentType(null);
              }}>✕</button>
            </div>
            <div className="modal-body">
              <Checklist
                user={user}
                assignmentId={selectedAssignmentForChecklist}
                onAssignmentClosed={() => {
                  const now = new Date().toISOString();
                  setCalendarAssignments(prev => prev.map((a: any) =>
                    String(a.id) === String(selectedAssignmentForChecklist)
                      ? { ...a, completed: true, completed_at: a.completed_at || now, completed_by: user.username }
                      : a
                  ));
                  setSelectedAssignmentForChecklist(null);
                  setCurrentAssignmentType(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal para Inventario Sincronizado */}
      {selectedAssignmentForInventory && (
        <div className="modal-overlay" onClick={() => setSelectedAssignmentForInventory(null)}>
          <div className="modal-content large-modal" onClick={e => e.stopPropagation()}>
            {backRow}
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
                                          console.log('🔄 Estado local inventario actualizado:', item.id);
                                          return newMap;
                                        });
                                        
                                        // Luego actualizar en Supabase
                                        try {
                                          const result = await realtimeService.updateAssignmentInventoryItem(
                                            item.id,
                                            newCheckedState,
                                            item.notes,
                                            user.username
                                          );
                                          if (result) {
                                            console.log('✅ Item inventario actualizado en BD:', result);
                                          } else {
                                            console.error('❌ updateAssignmentInventoryItem retornó null');
                                          }
                                        } catch (err) {
                                          console.error('❌ Error actualizando inventario:', err);
                                        }
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

      {/* Modal de Progreso del Empleado */}
      {selectedEmployeeForProgress && (
        <div className="modal-overlay" onClick={() => setSelectedEmployeeForProgress(null)}>
          <div className="dashboard-modal ultra-modal" onClick={e => e.stopPropagation()} style={{maxWidth: '800px', maxHeight: '90vh', overflow: 'auto'}}>
            {backRow}
            <div className="modal-header">
              <h2 style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                👤 Progreso de {selectedEmployeeForProgress.employee}
              </h2>
              <button className="modal-close" onClick={() => setSelectedEmployeeForProgress(null)}>✕</button>
            </div>
            <div className="modal-body">
              {loadingEmployeeProgress ? (
                <div style={{textAlign: 'center', padding: '2rem', color: '#64748b'}}>
                  <p>Cargando progreso...</p>
                </div>
              ) : (
                <>
                  {/* Info de la tarea */}
                  <div style={{background: '#f0f9ff', borderRadius: '1rem', padding: '1rem', marginBottom: '1.5rem', border: '1px solid #0284c7'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap'}}>
                      <span style={{fontSize: '1.5rem'}}>
                        {selectedEmployeeForProgress.type === 'Limpieza profunda' ? '🧹' : 
                         selectedEmployeeForProgress.type === 'Limpieza regular' ? '✨' : '🔧'}
                      </span>
                      <div>
                        <h3 style={{margin: 0, color: '#0284c7'}}>{selectedEmployeeForProgress.type}</h3>
                        <p style={{margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.9rem'}}>
                          📅 {new Date(selectedEmployeeForProgress.assignment.date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                          {selectedEmployeeForProgress.assignment.time && ` • 🕐 ${selectedEmployeeForProgress.assignment.time}`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Sección de Inventario */}
                  <div style={{marginBottom: '2rem'}}>
                    <h3 style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a', marginBottom: '1rem'}}>
                      📦 Inventario
                      <span style={{background: '#10b981', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.8rem', fontWeight: 700}}>
                        {employeeInventoryProgress.filter(i => i.is_complete).length}/{employeeInventoryProgress.length}
                      </span>
                    </h3>
                    {employeeInventoryProgress.length === 0 ? (
                      <p style={{color: '#64748b', textAlign: 'center'}}>No hay items en el inventario</p>
                    ) : (
                      <div style={{display: 'grid', gap: '0.5rem'}}>
                        {employeeInventoryProgress.map((item: any) => (
                          <div key={item.id} style={{
                            padding: '0.75rem 1rem',
                            background: item.is_complete ? '#f0fdf4' : '#fef2f2',
                            borderRadius: '0.75rem',
                            border: item.is_complete ? '1px solid #86efac' : '1px solid #fecaca'
                          }}>
                            <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                              <span style={{fontSize: '1.2rem'}}>{item.is_complete ? '✅' : '⏳'}</span>
                              <span style={{flex: 1, fontWeight: 600, color: item.is_complete ? '#166534' : '#991b1b'}}>
                                {item.item_name || item.name}
                              </span>
                              <span style={{color: '#64748b', fontSize: '0.9rem'}}>x{item.quantity}</span>
                              {item.category && <span style={{color: '#94a3b8', fontSize: '0.85rem'}}>({item.category})</span>}
                            </div>
                            {item.is_complete && item.checked_by && (
                              <div style={{marginTop: '0.5rem', fontSize: '0.85rem', color: '#166534'}}>
                                ✓ Verificado por {item.checked_by}
                              </div>
                            )}
                            {item.notes && (
                              <div style={{marginTop: '0.5rem', padding: '0.5rem', background: '#f1f5f9', borderRadius: '0.375rem', fontSize: '0.85rem', color: '#475569'}}>
                                📝 {item.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Botón de Reinicio de Inventario */}
                    {employeeInventoryProgress.length > 0 && (
                      <button
                        onClick={async () => {
                          const houseName = selectedEmployeeForProgress.assignment.house || user.house;
                          console.log('🔄 [Reset] House:', houseName);
                          console.log('📋 [Reset] Assignment:', selectedEmployeeForProgress.assignment);
                          
                          if (confirm('¿Reiniciar el inventario para la próxima visita? Todos los items volverán a estar pendientes.')) {
                            try {
                              console.log('🔄 Reiniciando inventario de casa:', houseName);

                              const items = await realtimeService.getInventoryItems(houseName);
                              const itemsToReset = (items || []).filter((it: any) => it.complete || it.is_complete);

                              for (const item of itemsToReset) {
                                await realtimeService.updateInventoryItem(String(item.id), { complete: false });
                              }

                              const refreshed = await realtimeService.getInventoryItems(houseName);
                              setEmployeeInventoryProgress(refreshed || []);
                              alert(`✅ Inventario reiniciado. ${itemsToReset.length} items actualizados.`);
                            } catch (err) {
                              console.error('❌ Error:', err);
                              alert('Error al reiniciar el inventario');
                            }
                          }
                        }}
                        style={{
                          marginTop: '1rem',
                          width: '100%',
                          padding: '0.75rem 1.5rem',
                          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.75rem',
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
                          (e.target as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(245, 158, 11, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
                          (e.target as HTMLButtonElement).style.boxShadow = '0 4px 15px rgba(245, 158, 11, 0.3)';
                        }}
                      >
                        🔄 Reiniciar Inventario para Próxima Visita
                      </button>
                    )}
                  </div>

                  {/* Sección de Checklist */}
                  <div>
                    <h3 style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a', marginBottom: '1rem'}}>
                      ✅ Checklist de Limpieza
                      <span style={{background: '#10b981', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.8rem', fontWeight: 700}}>
                        {employeeChecklistProgress.filter(i => i.completed).length}/{employeeChecklistProgress.length}
                      </span>
                    </h3>
                    {employeeChecklistProgress.length === 0 ? (
                      <p style={{color: '#64748b', textAlign: 'center'}}>No hay tareas en el checklist</p>
                    ) : (
                      <div style={{display: 'grid', gap: '0.5rem'}}>
                        {employeeChecklistProgress.map((task: any, idx: number) => (
                          <div key={task.id || idx} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.75rem 1rem',
                            background: task.completed ? '#f0fdf4' : '#fef2f2',
                            borderRadius: '0.75rem',
                            border: task.completed ? '1px solid #86efac' : '1px solid #fecaca'
                          }}>
                            <span style={{fontSize: '1.2rem'}}>{task.completed ? '✅' : '⏳'}</span>
                            <span style={{flex: 1, fontWeight: 600, color: task.completed ? '#166534' : '#991b1b'}}>
                              {task.task_name || task.name || task.title}
                            </span>
                            {task.zone && <span style={{color: '#64748b', fontSize: '0.85rem', background: '#e2e8f0', padding: '0.2rem 0.5rem', borderRadius: '0.375rem'}}>{task.zone}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      

    </div>
  );
};

export default Dashboard;


