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
      const items = await getCleaningChecklistItems(String(assignmentId));
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

  // Marcar/desmarcar ítem de limpieza
  const toggleCleaning = async (idx: number) => {
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
    const allIds = [...cleaning, ...maintenance].map(i => i.id).filter(Boolean);
    const { data, error } = await (checklistTable() as any)
      .update({ complete: false })
      .in('id', allIds);
    if (!error) {
      setCleaning(cleaning.map(i => ({ ...i, complete: false })));
      setMaintenance(maintenance.map(i => ({ ...i, complete: false })));
    }
  };

  // Confirmar checklist completo (manager)
  const confirmAllCompleted = async () => {
    // Aquí podrías actualizar el estado de la asignación en calendar_assignments (ej: completed=true)
    if (!assignmentId) return;
    const supabase = getSupabaseClient();
    // @ts-ignore
    await supabase
      .from('calendar_assignments')
      .update({ completed: true })
      .eq('id', assignmentId);
    setShowManagerConfirmMsg(true);
    setTimeout(() => setShowManagerConfirmMsg(false), 2000);
  };

  return (
    <div className="checklist-list ultra-checklist">
      <h2 className="ultra-checklist-title">Checklist {user.house}</h2>
      {loading && <p className="ultra-task-text ultra-task-loading">Cargando checklist...</p>}

      {/* Formulario para agregar/editar tareas solo para managers de HYNTIBA2 */}
      {!loading && user.house === 'HYNTIBA2 APTO 406' && (user.role === 'manager' || user.role === 'owner') && (
        <></>
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
