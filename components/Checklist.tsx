import React, { useState, useEffect } from 'react';
import { supabase, getSupabaseClient, checklistTable } from '../utils/supabaseClient';
import type { User } from './Dashboard';
import type { Database } from '../utils/supabaseClient';

const cleaningTasks = [
  'Barrer y trapear toda la casa.',
  'Quitar el polvo de todas las superficies y decoración usando un trapo húmedo.',
  'Limpiar los televisores cuidadosamente sin dejar marcas en la pantalla.',
  'Revisar zócalos y esquinas para asegurarse de que estén limpios.',
  'Limpiar telaraña.',
  'Limpiar todas las superficies de la sala.',
  'Mover los cojines del sofá y verificar que no haya suciedad ni hormigas debajo.',
  'Organizar cojines y dejar la sala ordenada.',
  'Limpiar mesa, sillas y superficies del comedor.',
  'Asegurarse de que el área del comedor quede limpia y ordenada.',
  'Limpiar superficies, gabinetes por fuera y por dentro de la cocina.',
  'Verificar que los gabinetes estén limpios, organizados y funcionales.',
  'Limpiar la cafetera y su filtro.',
  'Verificar que el dispensador de jabón de loza esté lleno.',
  'Dejar toallas de cocina limpias y disponibles para los visitantes.',
  'Limpiar microondas por dentro y por fuera.',
  'Limpiar el filtro de agua.',
  'Limpiar la nevera por dentro y por fuera (no dejar alimentos).',
  'Lavar las canecas de basura y colocar bolsas nuevas.',
  'Limpiar ducha (pisos y paredes) de los baños.',
  'Limpiar divisiones de vidrio y asegurarse de que no queden marcas.',
  'Limpiar espejo, sanitario y lavamanos con Clorox.',
  'Lavar las canecas de basura y colocar bolsas nuevas en los baños.',
  'Verificar disponibilidad de toallas: máximo 10 toallas blancas de cuerpo en toda la casa, máximo 4 toallas de mano en total (1 por baño).',
  'Dejar un rollo de papel higiénico nuevo instalado en cada baño.',
  'Dejar un rollo extra en el cuarto de lavado.',
  'Lavar y volver a colocar los tapetes de baño.',
  'Revisar que no haya objetos dentro de los cajones de las habitaciones.',
  'Lavar sábanas y hacer las camas correctamente.',
  'Limpiar el polvo de todas las superficies de las habitaciones.',
  'Lavar los tapetes de la habitación y volver a colocarlos limpios.',
  'Limpiar el filtro de la lavadora en cada lavada.',
  'Limpiar el gabinete debajo del lavadero.',
  'Dejar ganchos de ropa disponibles.',
  'Dejar toallas disponibles para la piscina.',
  'Barrer y trapear el área de BBQ.',
  'Limpiar mesa y superficies del área de BBQ.',
  'Limpiar la mini nevera y no dejar ningún alimento dentro.',
  'Limpiar la parrilla con el cepillo (no usar agua).',
  'Retirar las cenizas del carbón.',
  'Dejar toda el área de BBQ limpia y ordenada.',
  'Barrer y trapear el área de piscina.',
  'Organizar los muebles alrededor de la piscina.',
  'Limpiar el piso de la terraza.',
  'Limpiar superficies de la terraza.',
  'Organizar los cojines de la sala exterior.'
];

const maintenanceTasks = [
  'Mantener la piscina limpia y en funcionamiento.',
  'Revisar constantemente el cuarto de máquinas para verificar su funcionamiento y detectar posibles filtraciones de agua.',
  'Chequear que el generador eléctrico funcione correctamente y tenga diesel suficiente.',
  'Encender la planta eléctrica al menos 2 veces al mes durante mínimo media hora.',
  'Cortar el césped cada mes y medio a dos meses, y limpiar restos de césped.',
  'Mantenimiento de palmeras: remover hojas secas.',
  'Mantener la matera de la terraza libre de maleza y deshierbar regularmente.',
  'Regar las plantas vivas según necesidad.'
];


const CHECKLIST_KEY = 'dashboard_checklist'; // legacy, no longer usado

// Definir tipo para los items del checklist
interface ChecklistItem {
  id: number;
  house: string;
  item: string;
  complete: boolean;
  room?: string;
  assigned_to?: string | null;
  due_date?: string | null;
  created_at?: string;
}

// Recibe también la lista de usuarios para asignar tareas
interface ChecklistProps {
  user: User;
  users?: User[];
  assignmentId?: number | string;
}
const Checklist = ({ user, users = [], assignmentId }: ChecklistProps) => {
    // Estado para formulario de tarea manual
    const [taskForm, setTaskForm] = useState({ item: '', room: '', assigned_to: '', tipo: 'LIMPIEZA' });
    const [editIdx, setEditIdx] = useState<number | null>(null);
    const [editForm, setEditForm] = useState({ item: '', room: '', assigned_to: '', tipo: 'LIMPIEZA' });
    const [cleaning, setCleaning] = useState<ChecklistItem[]>([]);
    const [maintenance, setMaintenance] = useState<ChecklistItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [assignmentType, setAssignmentType] = useState<string | null>(null);
    // Nuevo: tipo de asignación activa para el empleado
    const [activeAssignmentType, setActiveAssignmentType] = useState<string | null>(null);
    // Confirmación visual al completar tarea
    const [showCompleteMsg, setShowCompleteMsg] = useState(false);
    // Confirmación visual para manager
    const [showManagerConfirmMsg, setShowManagerConfirmMsg] = useState(false);

    // Guardar plantilla predefinida al agregar/editar/eliminar (solo HYNTIBA2)
    useEffect(() => {
      if (user.house === 'HYNTIBA2 APTO 406') {
        const plantilla = { cleaning, maintenance };
        localStorage.setItem('plantilla_checklist_hyntiba2', JSON.stringify(plantilla));
      }
    }, [cleaning, maintenance, user.house]);

    // Si es empleado, buscar su asignación activa y guardar el tipo (limpieza regular, profunda, mantenimiento)
    useEffect(() => {
      const fetchAssignmentType = async () => {
        if (user.role !== 'empleado') return;
        // Buscar la asignación activa más reciente para el usuario en la casa actual
        const { data, error } = await (supabase as any)
          .from('calendar_assignments')
          .select('type')
          .eq('employee', user.username)
          .eq('house', user.house)
          .order('date', { ascending: false })
          .limit(1);
        if (!error && data && data.length > 0) {
          setActiveAssignmentType(data[0].type);
        } else {
          setActiveAssignmentType(null);
        }
      };
      fetchAssignmentType();
    }, [user.username, user.house, user.role]);

  // Cargar checklist por assignmentId si está presente, si no, por casa/usuario
  const fetchChecklist = async () => {
    if (assignmentId) {
      setLoading(true);
      // Usar servicio realtime para obtener checklist específico
      const { getCleaningChecklistItems } = await import('../utils/supabaseRealtimeService');
      let items = await getCleaningChecklistItems(String(assignmentId));
      // Normalizar: priorizar 'completed' (campo moderno) sobre 'complete' (legacy)
      items = items.map((i: any) => ({
        ...i,
        complete: typeof i.completed === 'boolean' ? i.completed : (typeof i.complete === 'boolean' ? i.complete : false)
      }));
      // Separar limpieza y mantenimiento por tipo/zona
      setCleaning(items.filter((i: any) => i.task && (!i.zone || !i.zone.toLowerCase().includes('mantenimiento'))));
      setMaintenance(items.filter((i: any) => i.task && i.zone && i.zone.toLowerCase().includes('mantenimiento')));
      setAssignmentType(items.length > 0 && items[0].assignment_type ? items[0].assignment_type : null);
      setLoading(false);
      return;
    }
    let selectedHouse = user.house === 'all' ? 'EPIC D1' : (user.house || 'EPIC D1');
    // Si hay plantilla local y no hay datos en Supabase, cargar plantilla
    if (selectedHouse === 'HYNTIBA2 APTO 406') {
      const { data, error } = await checklistTable().select('*').eq('house', selectedHouse);
      if ((!error && data && data.length === 0)) {
        const plantilla = localStorage.getItem('plantilla_checklist_hyntiba2');
        if (plantilla) {
          const { cleaning: plantillaCleaning, maintenance: plantillaMaintenance } = JSON.parse(plantilla);
          setCleaning(plantillaCleaning || []);
          setMaintenance(plantillaMaintenance || []);
          setLoading(false);
          return;
        }
      }
    }
    setLoading(true);
    if (selectedHouse === 'HYNTIBA2 APTO 406') {
      // Para HYNTIBA2, solo mostrar lo que esté en la base (sin predefinidos)
      const { data, error } = await checklistTable().select('*').eq('house', selectedHouse);
      const items = data as ChecklistItem[];
      if (!error && items) {
        setCleaning(items.filter(i => !i.room || i.room === '' || i.room === 'LIMPIEZA'));
        setMaintenance(items.filter(i => i.room && i.room !== '' && i.room !== 'LIMPIEZA'));
      } else {
        setCleaning([]);
        setMaintenance([]);
      }
      setLoading(false);
      return;
    }
    // Para otras casas, mantener lógica anterior
    console.log('📋 [Checklist] Cargando checklist para casa:', selectedHouse, 'usuario:', user.username);
    let query = checklistTable().select('*').eq('house', selectedHouse);
    if (user.role === 'empleado') {
      query = query.in('assigned_to', [user.username, null]);
    }
    const { data, error } = await query;
    if (!error && data) {
      const items = data as ChecklistItem[];
      const maintenanceRooms = ['PISCINA Y AGUA', 'SISTEMAS ELÉCTRICOS', 'ÁREAS VERDES'];
      const deepCleaningRooms = ['LIMPIEZA PROFUNDA'];
      setCleaning(items.filter(i => 
        !maintenanceRooms.includes(i.room || '') && !deepCleaningRooms.includes(i.room || '')
      ));
      setMaintenance(items.filter(i => 
        maintenanceRooms.includes(i.room || '') || deepCleaningRooms.includes(i.room || '')
      ));
      console.log('✅ [Checklist] Cargados:', items.length, 'items para', selectedHouse, 
        '(Limpieza:', items.filter(i => !maintenanceRooms.includes(i.room || '') && !deepCleaningRooms.includes(i.room || '')).length,
        'Mantenimiento:', items.filter(i => maintenanceRooms.includes(i.room || '') || deepCleaningRooms.includes(i.room || '')).length + ')');
    } else {
      setCleaning([]);
      setMaintenance([]);
      console.error('❌ [Checklist] Error cargando:', error);
    }
    setLoading(false);
  };

  // Cargar checklist al montar y suscribirse a cambios en tiempo real
  useEffect(() => {
    fetchChecklist();

    if (!supabase) return;

    // Si hay assignmentId, suscribirse a cambios solo de esa asignación
    if (assignmentId) {
      const channel = supabase
        .channel(`checklist-changes-assignment-${assignmentId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'cleaning_checklist',
          filter: `calendar_assignment_id_bigint=eq.${assignmentId}`
        }, (payload: any) => {
          console.log('⚡ [Checklist] Cambio realtime en asignación:', assignmentId, payload);
          fetchChecklist();
        })
        .subscribe((status) => {
          console.log('📡 [Checklist] Estado de suscripción assignment:', status);
        });
      return () => {
        channel.unsubscribe();
      };
    }

    // Si no, mantener suscripción por casa (flujo anterior)
    const selectedHouse = user.house === 'all' ? 'EPIC D1' : (user.house || 'EPIC D1');
    const channel = supabase
      .channel(`checklist-changes-${selectedHouse}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'checklist',
        filter: `house=eq.${selectedHouse}`
      }, (payload: any) => {
        console.log('⚡ [Checklist] Cambio en tiempo real recibido:', {
          event: payload.eventType,
          item: payload.new?.item || payload.old?.item,
          house: payload.new?.house || payload.old?.house,
          usuario: user.username
        });
        fetchChecklist();
      })
      .subscribe((status) => {
        console.log('📡 [Checklist] Estado de suscripción:', status);
      });
    return () => {
      channel.unsubscribe();
    };
  }, [user, assignmentId]);

  // Asignar tarea a usuario (manager/owner)
  const handleAssign = async (taskId: number, assignedTo: string) => {
    setLoading(true);
    await (checklistTable() as any).update({ assigned_to: assignedTo }).eq('id', taskId);
    // Ya no es necesario refrescar manualmente, el realtime lo hará
    setLoading(false);
  };

  // Agrupar tareas de limpieza por zona
  const cleaningZones = [
    { key: 'habitaciones', label: 'Habitaciones' },
    { key: 'cocina', label: 'Cocina' },
    { key: 'banos', label: 'Baños' },
    { key: 'sala', label: 'Sala' },
    { key: 'comedor', label: 'Comedor' },
    { key: 'terraza', label: 'Terraza' },
    { key: 'bbq', label: 'Área BBQ' },
    { key: 'piscina', label: 'Piscina' },
    { key: 'lavanderia', label: 'Lavandería' },
    { key: 'otros', label: 'Otros' },
  ];

  // Mapear cada tarea a una zona (esto puede mejorarse si tienes el campo room en la base de datos)
  const getZone = (item: string) => {
    if (/habita/i.test(item) || /cama/i.test(item) || /tapete/i.test(item) || /cajon/i.test(item)) return 'habitaciones';
    if (/cocina|microondas|nevera|filtro de agua|gabinete|cafetera|jab[oó]n|toalla de cocina/i.test(item)) return 'cocina';
    if (/ba.n|sanitario|lavamanos|papel hig[ií]enico|toalla de mano|ducha|espejo|tapete de ba.n/i.test(item)) return 'banos';
    if (/sala|coj[ií]n/i.test(item)) return 'sala';
    if (/comedor/i.test(item)) return 'comedor';
    if (/terraza/i.test(item)) return 'terraza';
    if (/bbq|parrilla|carb[oó]n|mini nevera/i.test(item)) return 'bbq';
    if (/piscina/i.test(item)) return 'piscina';
    if (/lavadora|lavadero|ganchos|cuarto de lavado/i.test(item)) return 'lavanderia';
    return 'otros';
  };

  const cleaningByZone: Record<string, typeof cleaning> = {};
  cleaningZones.forEach(z => { cleaningByZone[z.key] = []; });
  cleaning.forEach(i => {
    const zone = getZone(i.item);
    cleaningByZone[zone].push(i);
  });

  // Agregar nueva tarea (solo HYNTIBA2)
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.item.trim()) return;
    
    try {
      setLoading(true);
      const newTask = {
        house: 'HYNTIBA2 APTO 406',
        item: taskForm.item,
        room: taskForm.room || 'LIMPIEZA',
        assigned_to: taskForm.assigned_to || null,
        complete: false
      };
      
      const { data, error } = await (checklistTable() as any)
        .insert([newTask])
        .select();
      
      if (!error && data) {
        setCleaning([...cleaning, data[0]]);
        setTaskForm({ item: '', room: '', assigned_to: '', tipo: 'LIMPIEZA' });
        console.log('✅ Tarea agregada:', taskForm.item);
      } else {
        console.error('Error agregando tarea:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  // Eliminar tarea (solo HYNTIBA2)
  const handleDeleteTask = async (taskId: number) => {
    if (!confirm('¿Eliminar esta tarea?')) return;
    
    try {
      setLoading(true);
      const { error } = await (checklistTable() as any)
        .delete()
        .eq('id', taskId);
      
      if (!error) {
        setCleaning(cleaning.filter(t => t.id !== taskId));
        console.log('✅ Tarea eliminada');
      } else {
        console.error('Error eliminando tarea:', error);
      }
    } finally {
      setLoading(false);
    }
  };
    const item = cleaning[idx];
    if (!item || !item.id) return;
    console.log('✏️ [Checklist] Actualizando item:', item.item, 'completada:', !item.complete, 'usuario:', user.username);
    const { data, error } = await (checklistTable() as any)
      .update({ complete: !item.complete })
      .eq('id', item.id)
      .select();
    if (!error && data && data.length > 0) {
      setCleaning(cleaning.map((i, iidx) => iidx === idx ? data[0] : i));
      setShowCompleteMsg(true);
      setTimeout(() => setShowCompleteMsg(false), 1500);
    } else {
      console.error('❌ [Checklist] Error actualizando:', error);
    }
  };
  // Marcar/desmarcar ítem de mantenimiento
  const toggleMaintenance = async (idx: number) => {
    const item = maintenance[idx];
    if (!item || !item.id) return;
    console.log('✏️ [Checklist] Actualizando mantenimiento:', item.item, 'completada:', !item.complete, 'usuario:', user.username);
    const { data, error } = await (checklistTable() as any)
      .update({ complete: !item.complete })
      .eq('id', item.id)
      .select();
    if (!error && data && data.length > 0) {
      setMaintenance(maintenance.map((i, iidx) => iidx === idx ? data[0] : i));
      setShowCompleteMsg(true);
      setTimeout(() => setShowCompleteMsg(false), 1500);
    } else {
      console.error('❌ [Checklist] Error actualizando mantenimiento:', error);
    }
  };

  // Reiniciar checklist (manager/owner)
  const resetChecklist = async () => {
    try {
      setLoading(true);
      const supabase = getSupabaseClient();
      
      // Para HYNTIBA2: usar tabla legacy, para otros: tabla moderna
      const isHyntiba = user.house === 'HYNTIBA2 APTO 406';
      
      if (isHyntiba) {
        // HYNTIBA2 usa tabla legacy 'checklist'
        console.log('🔄 [HYNTIBA2] Reiniciando items de tabla legacy...');
        
        // Reiniciar todos los items de HYNTIBA2 en la tabla legacy
        const { error } = await (checklistTable() as any)
          .update({ complete: false })
          .eq('house', 'HYNTIBA2 APTO 406');
        
        console.log('🔄 [HYNTIBA2] Reset completado:', error ? `Error: ${error}` : 'OK');
      } else if (assignmentId) {
        // Para otras casas: tabla moderna cleaning_checklist
        // Primero obtener la asignación para tener datos del employee y house
        const { data: assignment } = await (supabase
          .from('calendar_assignments') as any)
          .select('employee, house')
          .eq('id', assignmentId)
          .single();
        
        // UPDATE 1: Reiniciar por ID de asignación (si está disponible)
        const updateByAssignmentId = await (supabase
          .from('cleaning_checklist') as any)
          .update({ completed: false, completed_by: null, completed_at: null })
          .eq('calendar_assignment_id_bigint', assignmentId);
        
        console.log('🔄 Reset por assignment ID:', assignmentId, 'Resultado:', updateByAssignmentId);
        
        // UPDATE 2: Reiniciar por employee + house (para items orfanos)
        if (assignment) {
          const updateByEmployeeHouse = await (supabase
            .from('cleaning_checklist') as any)
            .update({ completed: false, completed_by: null, completed_at: null })
            .eq('employee', assignment.employee)
            .eq('house', assignment.house);
          
          console.log('🔄 Reset por employee+house (orfanos):', assignment.employee, assignment.house, 'Resultado:', updateByEmployeeHouse);
        }
        
        // UPDATE 3: Reiniciar por house solamente (fallback adicional)
        const updateByHouseOnly = await (supabase
          .from('cleaning_checklist') as any)
          .update({ completed: false, completed_by: null, completed_at: null })
          .eq('house', user.house);
        
        console.log('🔄 Reset por house solamente:', user.house, 'Resultado:', updateByHouseOnly);
      }
      
      // Limpiar el estado local primero para mostrar indicador de carga
      setCleaning(cleaning.map(i => ({ ...i, complete: false })));
      setMaintenance(maintenance.map(i => ({ ...i, complete: false })));
      
      // Limpiar localStorage para evitar datos cacheados
      if (user.house === 'HYNTIBA2 APTO 406') {
        localStorage.removeItem('plantilla_checklist_hyntiba2');
      }
      localStorage.removeItem('dashboard_checklist');
      localStorage.removeItem(CHECKLIST_KEY);
      
      // Pequeño delay para asegurar que la BD haya actualizado
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Recargar los datos desde la base de datos
      await fetchChecklist();
      console.log('✅ Checklist reiniciado correctamente');
    } catch (error) {
      console.error('Error al reiniciar checklist:', error);
    } finally {
      setLoading(false);
    }
  };

  // Confirmar checklist completo (manager)
  const confirmAllCompleted = async () => {
    // Marcar la asignación como completada y reiniciar checklist e inventario
    if (!assignmentId) return;
    try {
      setLoading(true);
      const supabase = getSupabaseClient();
      
      const isHyntiba = user.house === 'HYNTIBA2 APTO 406';
      
      // 0. Obtener datos de la asignación
      const { data: assignment } = await (supabase
        .from('calendar_assignments') as any)
        .select('employee, house')
        .eq('id', assignmentId)
        .single();
      
      // 1. Marcar la asignación como completada
      await supabase
        .from('calendar_assignments')
        // @ts-ignore
        .update({ completed: true })
        .eq('id', assignmentId);

      // 2. Reiniciar checklist de limpieza/mantenimiento
      if (isHyntiba) {
        // HYNTIBA2 usa tabla legacy
        await (checklistTable() as any)
          .update({ complete: false })
          .eq('house', 'HYNTIBA2 APTO 406');
      } else {
        // UPDATE 1: Por assignment ID
        await (supabase
          .from('cleaning_checklist') as any)
          .update({ completed: false, completed_by: null, completed_at: null })
          .eq('calendar_assignment_id_bigint', assignmentId);
        
        // UPDATE 2: Por employee + house (orfanos)
        if (assignment) {
          await (supabase
            .from('cleaning_checklist') as any)
            .update({ completed: false, completed_by: null, completed_at: null })
            .eq('employee', assignment.employee)
            .eq('house', assignment.house);
        }
        
        // UPDATE 3: Por house solamente (fallback adicional)
        await (supabase
          .from('cleaning_checklist') as any)
          .update({ completed: false, completed_by: null, completed_at: null })
          .eq('house', user.house);
      }

      // 3. Reiniciar inventario de la asignación
      await (supabase
        .from('assignment_inventory') as any)
        .update({ is_complete: false, checked_by: null, checked_at: null })
        .eq('calendar_assignment_id', assignmentId);
      
      // Limpiar localStorage
      if (user.house === 'HYNTIBA2 APTO 406') {
        localStorage.removeItem('plantilla_checklist_hyntiba2');
      }
      localStorage.removeItem('dashboard_checklist');
      localStorage.removeItem(CHECKLIST_KEY);
      
      // Pequeño delay para asegurar que la BD haya actualizado
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 4. Recargar datos desde la base de datos
      await fetchChecklist();
      
      setShowManagerConfirmMsg(true);
      setTimeout(() => setShowManagerConfirmMsg(false), 2000);
    } catch (error) {
      console.error('Error al confirmar checklist:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="checklist-list ultra-checklist">
      <h2 className="ultra-checklist-title">Checklist {user.house}</h2>
      {loading && <p className="ultra-task-text ultra-task-loading">Cargando checklist...</p>}

      {/* Formulario para agregar/editar tareas solo para managers de HYNTIBA2 */}
      {!loading && user.house === 'HYNTIBA2 APTO 406' && (user.role === 'manager' || user.role === 'owner') && (
        <div style={{background:'#f0f9ff',padding:'15px',borderRadius:'8px',marginBottom:'15px',border:'1px solid #bfdbfe'}}>
          <h3 style={{marginTop:0,color:'#1e40af'}}>➕ Agregar Nueva Tarea</h3>
          <form onSubmit={handleAddTask} style={{display:'grid',gap:'10px'}}>
            <div>
              <input
                type="text"
                placeholder="Descripción de la tarea"
                value={taskForm.item}
                onChange={(e) => setTaskForm({...taskForm, item: e.target.value})}
                style={{width:'100%',padding:'8px',borderRadius:'4px',border:'1px solid #cbd5e1'}}
              />
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
              <select
                value={taskForm.room}
                onChange={(e) => setTaskForm({...taskForm, room: e.target.value})}
                style={{padding:'8px',borderRadius:'4px',border:'1px solid #cbd5e1'}}
              >
                <option value="">- Seleccionar zona -</option>
                <option value="LIMPIEZA">Limpieza</option>
                <option value="MANTENIMIENTO">Mantenimiento</option>
                <option value="Habitaciones">Habitaciones</option>
                <option value="Cocina">Cocina</option>
                <option value="Baños">Baños</option>
                <option value="Sala">Sala</option>
                <option value="Terraza">Terraza</option>
              </select>
              <button 
                type="submit" 
                disabled={loading || !taskForm.item.trim()}
                style={{padding:'8px',background:'#2563eb',color:'white',border:'none',borderRadius:'4px',cursor:'pointer',opacity: loading || !taskForm.item.trim() ? 0.5 : 1}}
              >
                Agregar Tarea
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Mostrar solo lo que corresponde según tipo de asignación activa para empleados */}
      {!loading && user.role === 'empleado' && (
        <>
          {showCompleteMsg && (
            <div style={{background:'#d1fae5',color:'#065f46',padding:'8px',borderRadius:'8px',marginBottom:'10px',textAlign:'center'}}>¡Tarea marcada como completada!</div>
          )}
          {activeAssignmentType && (activeAssignmentType.toLowerCase().includes('mantenimiento')) ? (
            // Solo mantenimiento
            <div className="ultra-checklist-section">
              <h3 className="ultra-section-title">Mantenimiento</h3>
              <div className="ultra-tasks-grid">
                {maintenance.map((i, idx) => (
                  <div key={i.id || idx} className={`ultra-task-card${i.complete ? ' done' : ''}`}> 
                    <label className="ultra-checkbox">
                      <input type="checkbox" checked={!!i.complete} onChange={() => toggleMaintenance(idx)} disabled={user.role !== 'empleado'} title={i.item} />
                      <span className="ultra-task-icon">{i.complete ? '🔧' : '🛠️'}</span>
                      <span className="ultra-task-text">{i.item}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Limpieza (regular/profunda): mostrar limpieza y (opcionalmente) inventario
            <>
              <div className="ultra-checklist-section">
                <h3 className="ultra-section-title">Limpieza</h3>
                <div className="ultra-tasks-grid">
                  {cleaning.map((i, idx) => (
                    <div key={i.id || idx} className={`ultra-task-card${i.complete ? ' done' : ''}`}> 
                      <label className="ultra-checkbox">
                        <input type="checkbox" checked={!!i.complete} onChange={() => toggleCleaning(cleaning.findIndex(c => c.id === i.id))} disabled={user.role !== 'empleado'} title={i.item} />
                        <span className="ultra-task-icon">{i.complete ? '✔️' : '🧹'}</span>
                        <span className="ultra-task-text">{i.item}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              {/* Aquí puedes incluir el componente de Inventario si aplica */}
            </>
          )}
        </>
      )}

      {/* Para managers/owners, mostrar ambas secciones y botón de reinicio y confirmación */}
      {!loading && (user.role === 'owner' || user.role === 'manager') && (
        <>
          {/* ...existing code para managers/owners... */}
          <button onClick={resetChecklist} className="ultra-reset-btn">Reiniciar Checklist</button>
          {/* Botón para confirmar checklist completo si todas las tareas están completas */}
          {cleaning.length > 0 && cleaning.every(i => i.complete) && maintenance.every(i => i.complete) && (
            <button onClick={confirmAllCompleted} className="ultra-confirm-btn" style={{marginLeft:'1rem',background:'#2563eb',color:'#fff',padding:'8px 16px',borderRadius:'8px'}}>Confirmar trabajo completado</button>
          )}
          {showManagerConfirmMsg && (
            <div style={{background:'#dbeafe',color:'#1e40af',padding:'8px',borderRadius:'8px',marginTop:'10px',textAlign:'center'}}>¡Checklist confirmado como completado!</div>
          )}
        </>
      )}
    </div>
  );
};

export default Checklist;
