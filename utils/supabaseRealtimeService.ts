// ==================== CALENDAR ASSIGNMENTS REALTIME POR CASA ====================
export function subscribeToCalendarAssignmentsByHouse(house: string, callback: (data: any) => void) {
  try {
    console.log('🔔 [Realtime Service] Iniciando suscripción a calendar_assignments para casa:', house);
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`calendar-assignments-changes-houseid-${house}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calendar_assignments',
          filter: `house_id=eq.${house}`
        },
        (payload: any) => {
          console.log('⚡ [Realtime Service] Evento recibido (por house_id):', payload);
          const mappedPayload = {
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old
          };
          callback(mappedPayload);
        }
      )
      .subscribe((status: any) => {
        console.log('📡 [Realtime Service] Estado de suscripción (por house_id):', status);
      });
    console.log('✅ [Realtime Service] Canal creado (por house_id):', channel);
    return channel;
  } catch (error) {
    console.error('❌ [Realtime Service] Error al suscribirse (por casa):', error);
    return null;
  }
}
// ==================== CALENDAR ASSIGNMENTS REALTIME ====================
export function subscribeToCalendarAssignments(employeeId: string, callback: (data: any) => void) {
  try {
    console.log('🔔 [Realtime Service] Iniciando suscripción a calendar_assignments para empleado:', employeeId);
    const supabase = getSupabaseClient();
    // Suscribirse por employee_id
    const channelId = supabase
      .channel(`calendar-assignments-changes-id-${employeeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calendar_assignments',
          filter: `employee_id=eq.${employeeId}`
        },
        (payload: any) => {
          console.log('⚡ [Realtime Service] Evento recibido (employee_id):', payload);
          callback({
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old
          });
        }
      )
      .subscribe((status: any) => {
        console.log('📡 [Realtime Service] Estado de suscripción (employee_id):', status);
      });

    // Suscribirse por employee (username)
    const channelUsername = supabase
      .channel(`calendar-assignments-changes-username-${employeeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calendar_assignments',
          filter: `employee=eq.${employeeId}`
        },
        (payload: any) => {
          console.log('⚡ [Realtime Service] Evento recibido (employee):', payload);
          callback({
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old
          });
        }
      )
      .subscribe((status: any) => {
        console.log('📡 [Realtime Service] Estado de suscripción (employee):', status);
      });

    // Retornar ambos canales para poder limpiar después
    return [channelId, channelUsername];
  } catch (error) {
    console.error('❌ [Realtime Service] Error al suscribirse:', error);
    return null;
  }
}

// ==================== CALENDAR ASSIGNMENTS REALTIME - SIMPLE (SIN FILTROS) ====================
export function subscribeToAllCalendarAssignmentsByHouse(house: string, callback: (data: any) => void) {
  try {
    console.log('🔔 [Realtime Service] Suscripción A TODOS los cambios en calendar_assignments');
    const supabase = getSupabaseClient();
    
    // Subscribe sin NINGUN filtro - recibir TODOS los cambios en la tabla
    const channel = supabase
      .channel(`calendar-assignments-all-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calendar_assignments'
        },
        (payload: any) => {
          // Log de TODOS los cambios
          console.log('⚡ [Realtime] CAMBIO DETECTADO:', {
            event: payload.eventType,
            id: payload.new?.id || payload.old?.id,
            house: payload.new?.house || payload.old?.house,
            employee: payload.new?.employee || payload.old?.employee
          });
          
          // Llamar callback sin filtros - dejar que el componente decida
          callback({
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old
          });
        }
      )
      .subscribe((status: any) => {
        console.log('📡 [Realtime] Estado de suscripción:', status);
      });
    
    console.log('✅ [Realtime] Canal creado - escuchando TODOS los cambios');
    return channel;
  } catch (error) {
    console.error('❌ [Realtime] Error al suscribirse:', error);
    return null;
  }
}
import { getSupabaseClient } from './supabaseClient';

// Helper para normalizar campos snake_case -> camelCase
function normalizeTask(row: any) {
  if (!row) return row;
  return {
    ...row,
    assignedTo: row.assigned_to ?? row.assignedTo ?? '',
    createdBy: row.created_by ?? row.createdBy ?? '',
  };
}

// ==================== TAREAS ====================
export async function createTask(task: any) {
  const supabase = getSupabaseClient();
  const { data, error } = await (supabase
    .from('tasks') as any)
    .insert([{
      title: task.title,
      description: task.description,
      assigned_to: task.assignedTo,
      type: task.type,
      house: task.house || 'HYNTIBA2 APTO 406',
      completed: false,
      created_by: task.createdBy,
      created_at: new Date().toISOString()
    }])
    .select();
  
  if (error) {
    console.error('Error creating task:', error);
    return null;
  }
  return data?.[0] ? normalizeTask(data[0]) : null;
}

export async function getTasks(house: string = 'HYNTIBA2 APTO 406') {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('tasks') as any)
      .select('*')
      .eq('house', house)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching tasks:', error);
      return [];
    }
    return (data || []).map(normalizeTask);
  } catch (error) {
    console.error('Exception fetching tasks:', error);
    return [];
  }
}

export async function updateTask(taskId: string, updates: any) {
  const supabase = getSupabaseClient();
  const mappedUpdates: any = { ...updates };
  
  // Map camelCase to snake_case
  if ('assignedTo' in mappedUpdates) {
    mappedUpdates.assigned_to = mappedUpdates.assignedTo;
    delete mappedUpdates.assignedTo;
  }
  if ('createdBy' in mappedUpdates) {
    mappedUpdates.created_by = mappedUpdates.createdBy;
    delete mappedUpdates.createdBy;
  }
  
  const { data, error } = await (supabase
    .from('tasks') as any)
    .update(mappedUpdates)
    .eq('id', taskId)
    .select();
  
  if (error) {
    console.error('Error updating task:', error);
    return null;
  }
  return data?.[0] ? normalizeTask(data[0]) : null;
}

export async function deleteTask(taskId: string) {
  const supabase = getSupabaseClient();
  const { error } = await (supabase
    .from('tasks') as any)
    .delete()
    .eq('id', taskId);
  
  if (error) {
    console.error('Error deleting task:', error);
    return false;
  }
  return true;
}

export function subscribeToTasks(house: string = 'HYNTIBA2 APTO 406', callback: (data: any) => void) {
  try {
    console.log('🔔 [Realtime Service] Iniciando suscripción a tasks para house:', house);
    const supabase = getSupabaseClient();
    
    const channel = supabase
      .channel(`tasks-changes-${house}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `house=eq.${house}`
        },
        (payload: any) => {
          console.log('⚡ [Realtime Service] Evento recibido:', payload);
          
          // Mapear el evento al formato esperado
          const mappedPayload = {
            eventType: payload.eventType,
            new: normalizeTask(payload.new),
            old: normalizeTask(payload.old)
          };
          
          console.log('✅ [Realtime Service] Ejecutando callback con:', mappedPayload);
          callback(mappedPayload);
        }
      )
      .subscribe((status: any) => {
        console.log('📡 [Realtime Service] Estado de suscripción:', status);
      });
    
    console.log('✅ [Realtime Service] Canal creado:', channel);
    return channel;
  } catch (error) {
    console.error('❌ [Realtime Service] Error al suscribirse:', error);
    return null;
  }
}

// ==================== CHECKLIST ITEMS ====================
export async function createChecklistItem(item: any) {
  const supabase = getSupabaseClient();
  const { data, error } = await (supabase
    .from('checklist_items') as any)
    .insert([{
      taskId: item.taskId,
      zona: item.zona,
      text: item.text,
      completed: false,
      house: item.house || 'HYNTIBA2 APTO 406',
      type: item.type,
      completedBy: null,
      completedAt: null
    }])
    .select();
  
  if (error) {
    console.error('Error creating checklist item:', error);
    return null;
  }
  return data?.[0] || null;
}

export async function updateChecklistItem(itemId: string, completed: boolean, completedBy?: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await (supabase
    .from('checklist_items') as any)
    .update({
      completed,
      completedBy: completed ? completedBy : null,
      completedAt: completed ? new Date().toISOString() : null
    })
    .eq('id', itemId)
    .select();
  
  if (error) {
    console.error('Error updating checklist item:', error);
    return null;
  }
  return data?.[0] || null;
}

export async function getChecklistItems(taskId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await (supabase
    .from('checklist_items') as any)
    .select('*')
    .eq('taskId', taskId);
  
  if (error) {
    console.error('Error fetching checklist items:', error);
    return [];
  }
  return data || [];
}

export function subscribeToChecklistItems(taskId: string, callback: (data: any) => void) {
  const supabase = getSupabaseClient();
  const subscription = (supabase
    .from('checklist_items') as any)
    .on('*', (payload: any) => {
      if (payload?.new?.taskId === taskId || payload?.old?.taskId === taskId) {
        callback(payload);
      }
    })
    .subscribe();
  
  return subscription;
}

// ==================== INVENTARIO ====================
export async function createInventoryItem(item: any) {
  const supabase = getSupabaseClient();
  const { data, error } = await (supabase
    .from('inventory') as any)
    .insert([{
      name: item.name,
      quantity: item.quantity,
      location: item.location,
      complete: true,
      notes: '',
      house: item.house || 'HYNTIBA2 APTO 406',
      created_at: new Date().toISOString()
    }])
    .select();
  
  if (error) {
    console.error('Error creating inventory item:', error);
    return null;
  }
  return data?.[0] || null;
}

export async function updateInventoryItem(itemId: string, updates: any) {
  const supabase = getSupabaseClient();
  const { data, error } = await (supabase
    .from('inventory') as any)
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', itemId)
    .select();
  
  if (error) {
    console.error('Error updating inventory item:', error);
    return null;
  }
  return data?.[0] || null;
}

export async function getInventoryItems(house: string = 'HYNTIBA2 APTO 406') {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('inventory') as any)
      .select('*')
      .eq('house', house);
    
    if (error) {
      console.error('Error fetching inventory:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Exception fetching inventory:', error);
    return [];
  }
}

export async function deleteInventoryItem(itemId: string) {
  const supabase = getSupabaseClient();
  const { error } = await (supabase
    .from('inventory') as any)
    .delete()
    .eq('id', itemId);
  
  if (error) {
    console.error('Error deleting inventory item:', error);
    return false;
  }
  return true;
}

export function subscribeToInventory(house: string = 'HYNTIBA2 APTO 406', callback: (data: any) => void) {
  try {
    const supabase = getSupabaseClient();
    
    const channel = supabase
      .channel(`inventory-changes-${house}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory',
          filter: `house=eq.${house}`
        },
        (payload: any) => {
          const mappedPayload = {
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old
          };
          callback(mappedPayload);
        }
      )
      .subscribe();
    
    return channel;
  } catch (error) {
    console.error('Error subscribing to inventory:', error);
    return null;
  }
}

// ==================== CALENDAR ASSIGNMENTS ====================
export async function createCalendarAssignment(assignment: any) {
  const supabase = getSupabaseClient();
  
  // Generate UUID for this assignment
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };
  
  const assignmentUUID = generateUUID();
  
  console.log('🔄 [Assignment] Creando asignación con UUID:', {
    uuid: assignmentUUID,
    employee: assignment.employee,
    house: assignment.house || 'HYNTIBA2 APTO 406',
    type: assignment.type,
    date: assignment.date
  });
  
  // Try to insert with calendar_assignment_uuid column
  let { data, error } = await (supabase
    .from('calendar_assignments') as any)
    .insert([{
      calendar_assignment_uuid: assignmentUUID,
      employee: assignment.employee,
      date: assignment.date,
      time: assignment.time,
      type: assignment.type,
      house: assignment.house || 'HYNTIBA2 APTO 406',
      created_at: new Date().toISOString()
    }])
    .select();
  
  // If column doesn't exist, try without it
  if (error && error.message.includes('calendar_assignment_uuid')) {
    console.log('⚠️ [Assignment] Column calendar_assignment_uuid not found, inserting without it');
    const { data: data2, error: error2 } = await (supabase
      .from('calendar_assignments') as any)
      .insert([{
        employee: assignment.employee,
        date: assignment.date,
        time: assignment.time,
        type: assignment.type,
        house: assignment.house || 'HYNTIBA2 APTO 406',
        created_at: new Date().toISOString()
      }])
      .select();
    
    if (error2) {
      console.error('❌ [Assignment] Error creating:', error2);
      return null;
    }
    
    data = data2;
    
    // Store UUID in localStorage for later use
    if (data && data[0]) {
      localStorage.setItem(`assignment_${data[0].id}_uuid`, assignmentUUID);
      console.log(`💾 [Assignment] UUID stored in localStorage for ID ${data[0].id}`);
    }
  } else if (error) {
    console.error('❌ [Assignment] Error creating:', error);
    return null;
  }
  
  if (!data || data.length === 0) {
    console.error('❌ [Assignment] Insert returned no data');
    return null;
  }
  
  const result = data[0];
  // Store the UUID in the result for immediate use
  result.calendar_assignment_uuid = assignmentUUID;
  console.log(`✅ [Assignment] Creado: ID=${result.id}, UUID=${assignmentUUID}`);
  return result;
}

export async function getCalendarAssignments(house: string = 'HYNTIBA2 APTO 406', employee?: string) {
  try {
    const supabase = getSupabaseClient();
    console.log('🔍 [getCalendarAssignments] Buscando en house:', house, 'employee:', employee);
    
    let query = (supabase
      .from('calendar_assignments') as any)
      .select('*')
      .eq('house', house);
    
    if (employee) {
      query = query.eq('employee', employee);
      console.log('👤 [getCalendarAssignments] Filtrando por employee:', employee);
    }
    
    const { data, error } = await query.order('date', { ascending: true });
    
    if (error) {
      console.error('❌ [getCalendarAssignments] Error:', error);
      return [];
    }
    
    console.log('✅ [getCalendarAssignments] Resultados:', data?.length || 0, 'items');
    if (data && data.length > 0) {
      data.forEach((a: any) => {
        console.log(`   - ID:${a.id} | UUID:${a.calendar_assignment_uuid || 'N/A'} | Employee:${a.employee} | Type:${a.type} | Date:${a.date}`);
      });
    }
    
    return data || [];
  } catch (error) {
    console.error('❌ Exception fetching calendar assignments:', error);
    return [];
  }
}

export async function updateCalendarAssignment(assignmentId: string, updates: any) {
  const supabase = getSupabaseClient();
  const { data, error } = await (supabase
    .from('calendar_assignments') as any)
    .update(updates)
    .eq('id', assignmentId)
    .select();
  
  if (error) {
    console.error('Error updating calendar assignment:', error);
    return null;
  }
  return data?.[0] || null;
}

export async function deleteCalendarAssignment(assignmentId: string) {
  const supabase = getSupabaseClient();
  
  // Primero obtener la casa de la asignación para reiniciar el inventario
  try {
    const { data: assignmentData } = await (supabase
      .from('calendar_assignments') as any)
      .select('house')
      .eq('id', assignmentId)
      .single();
    
    if (assignmentData?.house) {
      console.log('🏠 Reiniciando inventario de la casa:', assignmentData.house);
      
      // Reiniciar el inventario de la casa (complete: false, missing: 0, reason: null)
      const { error: resetError } = await (supabase
        .from('inventory') as any)
        .update({ complete: false, missing: 0, reason: null })
        .eq('house', assignmentData.house);
      
      if (resetError) {
        console.error('Error reiniciando inventario:', resetError);
      } else {
        console.log('✅ Inventario reiniciado exitosamente');
      }
    }
  } catch (error) {
    console.error('Error obteniendo casa de la asignación:', error);
  }
  
  const { error } = await (supabase
    .from('calendar_assignments') as any)
    .delete()
    .eq('id', assignmentId);
  
  if (error) {
    console.error('Error deleting calendar assignment:', error);
    return false;
  }
  return true;
}

export async function deleteCalendarAssignmentCascade(assignmentId: string) {
  const supabase = getSupabaseClient();
  const assignmentIdStr = String(assignmentId);
  const isNumericId = /^\d+$/.test(assignmentIdStr);

  // Primero obtener la casa de la asignación para reiniciar el inventario
  let houseName: string | null = null;
  try {
    const { data: assignmentData } = await (supabase
      .from('calendar_assignments') as any)
      .select('house')
      .eq('id', assignmentIdStr)
      .single();
    
    if (assignmentData?.house) {
      houseName = assignmentData.house;
      console.log('🏠 Reiniciando inventario de la casa:', houseName);
      
      // Reiniciar el inventario de la casa (complete: false, missing: 0, reason: null)
      const { error: resetError } = await (supabase
        .from('inventory') as any)
        .update({ complete: false, missing: 0, reason: null })
        .eq('house', houseName);
      
      if (resetError) {
        console.error('Error reiniciando inventario:', resetError);
      } else {
        console.log('✅ Inventario reiniciado exitosamente');
      }
    }
  } catch (error) {
    console.error('Error obteniendo casa de la asignación:', error);
  }

  // Eliminar checklist asociado
  try {
    const checklistFilter = isNumericId
      ? `calendar_assignment_id.eq.${assignmentIdStr},calendar_assignment_id_bigint.eq.${assignmentIdStr}`
      : `calendar_assignment_id.eq.${assignmentIdStr}`;

    const { error: checklistError } = await (supabase
      .from('cleaning_checklist') as any)
      .delete()
      .or(checklistFilter);

    if (checklistError) {
      console.error('Error deleting cleaning checklist items:', checklistError);
    }
  } catch (error) {
    console.error('Error deleting cleaning checklist items:', error);
  }

  // Eliminar inventario asociado
  try {
    const { error: inventoryError } = await (supabase
      .from('assignment_inventory') as any)
      .delete()
      .eq('calendar_assignment_id', assignmentIdStr);

    if (inventoryError) {
      console.error('Error deleting assignment inventory items:', inventoryError);
    }
  } catch (error) {
    console.error('Error deleting assignment inventory items:', error);
  }

  // Eliminar la asignación del calendario
  const { error: assignmentError } = await (supabase
    .from('calendar_assignments') as any)
    .delete()
    .eq('id', assignmentIdStr);

  if (assignmentError) {
    console.error('Error deleting calendar assignment:', assignmentError);
    return false;
  }

  return true;
}


// ==================== CLEANING CHECKLIST ====================
// ==================== CLEANING CHECKLIST ====================
export async function createCleaningChecklistItems(
  assignmentId: string | number, 
  employee: string, 
  assignmentType: string, 
  house: string = 'HYNTIBA2 APTO 406'
) {
  console.log('🧹 [Checklist] Creando desde plantillas:', { assignmentId, employee, assignmentType, house });
  
  // Usar la nueva función de plantillas que consulta checklist_templates
  const result = await createChecklistFromTemplate(
    String(assignmentId),
    assignmentType,
    employee,
    house
  );
  
  if (result.success) {
    console.log(`✅ ${result.count} items creados desde plantillas`);
    return result.items || [];
  } else {
    console.error('❌ Error creando desde plantillas:', result.error);
    return [];
  }
}

export async function getCleaningChecklistItems(assignmentId: string) {
  try {
    // Asegurar que assignmentId es un string
    const assignmentIdStr = String(assignmentId);
    
    console.log('🧹 [Checklist] Solicitando items para asignación:', assignmentIdStr);
    const supabase = getSupabaseClient();
    // Obtener asignación para conocer tipo y casa
    const { data: assignment, error: assignmentError } = await (supabase
      .from('calendar_assignments') as any)
      .select('house, employee, type')
      .eq('id', assignmentIdStr)
      .single();

    if (assignmentError || !assignment) {
      console.error('❌ [Checklist] Error obteniendo asignación:', assignmentError);
      return [];
    }

    // PASO 1: Buscar items por calendar_assignment_id (datos nuevos)
    const { data, error } = await (supabase
      .from('cleaning_checklist') as any)
      .select('*')
      .eq('calendar_assignment_id', assignmentIdStr)
      .order('order_num', { ascending: true });

    if (!error && data && data.length > 0) {
      console.log('✅ [Checklist] Items obtenidos por assignment_id:', data.length, 'items para', assignment.type);
      return data;
    }

    // PASO 2: Búsqueda inteligente por employee + house, luego filtrar por tipo
    console.log('🔍 [Checklist] Buscando items existentes por employee+house para tipo:', assignment.type);
    
    const { data: existingItems, error: existingError } = await (supabase
      .from('cleaning_checklist') as any)
      .select('*')
      .eq('employee', assignment.employee)
      .eq('house', assignment.house)
      .order('order_num', { ascending: true });

    if (!existingError && existingItems && existingItems.length > 0) {
      console.log(`📊 [Checklist] ${existingItems.length} items encontrados para ${assignment.employee} en ${assignment.house}`);
      
      // Filtrar por tipo basado en el contenido de la zona/tarea
      const filteredItems = filterItemsByType(existingItems, assignment.type);
      
      if (filteredItems.length > 0) {
        console.log('✅ [Checklist] Items filtrados por tipo:', filteredItems.length);
        
        // Actualizar con assignment_id (migración lenta)
        for (const item of filteredItems) {
          if (!item.calendar_assignment_id || item.calendar_assignment_id === '') {
            await (supabase
              .from('cleaning_checklist') as any)
              .update({ calendar_assignment_id: assignmentIdStr })
              .eq('id', item.id)
              .catch((err: any) => console.warn('⚠️ [Checklist] No se pudo actualizar item:', item.id));
          }
        }
        
        return filteredItems;
      }
    }

    // PASO 3: Si no hay items en ninguna forma, crear desde plantillas específicas
    console.log('⚠️ [Checklist] No items found; creando desde plantillas para', assignment.type, assignment.house);
    const created = await createChecklistFromTemplate(
      assignmentIdStr,
      assignment.type,
      assignment.employee,
      assignment.house
    );
    return created.items || [];
  } catch (error) {
    console.error('❌ [Checklist] Exception fetching checklist items:', error);
    return [];
  }
}

// Helper: Filtrar items por tipo basándose en el contenido de zona/tarea
function filterItemsByType(items: any[], assignmentType: string): any[] {
  const type = assignmentType.toLowerCase();
  
  // Palabras clave para identificar cada tipo
  const regularPatterns = [
    'cocina', 'baño', 'habitaciones', 'sala', 'lavadero', 'limpieza general',
    'barrer', 'trapear', 'polvo', 'limpiar', 'lavar platos', 'tender camas'
  ];
  
  const profundaPatterns = [
    'profunda', 'lavar forros', 'ventanas', 'nevera completa', 'desinfectar'
  ];
  
  const mantenimientoPatterns = [
    'eléctrico', 'plomería', 'electrodomésticos', 'revisar', 'funcionamiento',
    'enchufes', 'bombillas', 'fugas', 'sanitario', 'lavadora', 'puertas', 'ventanas'
  ];
  
  return items.filter((item: any) => {
    const zone = (item.zone || '').toLowerCase();
    const task = (item.task || '').toLowerCase();
    const content = `${zone} ${task}`;
    
    if (type.includes('regular') || type.includes('limpieza regular')) {
      return regularPatterns.some(p => content.includes(p));
    } else if (type.includes('profunda')) {
      return profundaPatterns.some(p => content.includes(p));
    } else if (type.includes('mantenimiento')) {
      return mantenimientoPatterns.some(p => content.includes(p));
    }
    
    return false;
  });
}

export async function updateCleaningChecklistItem(itemId: string, completed: boolean, completedBy?: string) {
  try {
    console.log('🔄 [updateCleaningChecklistItem] Actualizando:', {
      itemId,
      completed,
      completedBy,
      timestamp: new Date().toISOString()
    });
    
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('cleaning_checklist') as any)
      .update({
        completed: completed,
        completed_by: completed ? completedBy || null : null,
        completed_at: completed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId)
      .select();

    if (error) {
      console.error('❌ [updateCleaningChecklistItem] Error:', {
        error: error.message,
        itemId,
        code: error.code
      });
      return null;
    }
    
    console.log('✅ [updateCleaningChecklistItem] Actualizado exitosamente:', {
      itemId,
      completed,
      dataLength: data?.length,
      updated_by: completedBy
    });
    
    return data?.[0] || null;
  } catch (error) {
    console.error('❌ [updateCleaningChecklistItem] Exception:', error);
    return null;
  }
}

export function subscribeToChecklist(assignmentId: string, callback: (data: any) => void) {
  try {
    console.log('🧹 [Checklist Service] Iniciando suscripción para assignment:', assignmentId);
    const supabase = getSupabaseClient();

    const channel = supabase
      .channel(`checklist-${assignmentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cleaning_checklist'
        },
        (payload: any) => {
          console.log('⚡ [Checklist Service] Evento recibido:', payload);

          // Determinar si el evento corresponde a esta asignación (soporta legacy calendar_assignment_id y calendar_assignment_id_bigint)
          const newId = payload?.new?.calendar_assignment_id_bigint ?? payload?.new?.calendar_assignment_id;
          const oldId = payload?.old?.calendar_assignment_id_bigint ?? payload?.old?.calendar_assignment_id;
          if (String(newId) !== String(assignmentId) && String(oldId) !== String(assignmentId)) {
            // No es para esta asignación
            return;
          }

          const mappedPayload = {
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old
          };

          callback(mappedPayload);
        }
      )
      .subscribe((status: any) => {
        console.log('📡 [Checklist Service] Estado de suscripción:', status);
      });

    console.log('✅ [Checklist Service] Canal creado');
    return channel;
  } catch (error) {
    console.error('❌ [Checklist Service] Error subscribing:', error);
    return null;
  }
}

// Suscribirse a cambios del checklist de limpieza por CASA
// Esto permite que todos los managers y empleados de una casa vean los cambios en tiempo real
export function subscribeToCleaningChecklistByHouse(house: string, callback: (data: any) => void) {
  try {
    console.log('🧹 [Checklist House Service] Iniciando suscripción para casa:', house);
    const supabase = getSupabaseClient();

    const channel = supabase
      .channel(`cleaning-checklist-changes-${house}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cleaning_checklist',
          filter: `house=eq.${house}`
        },
        (payload: any) => {
          console.log('⚡ [Checklist House Service] Evento recibido para casa:', house, payload);

          const mappedPayload = {
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old
          };

          callback(mappedPayload);
        }
      )
      .subscribe((status: any) => {
        console.log('📡 [Checklist House Service] Estado de suscripción:', status);
      });

    console.log('✅ [Checklist House Service] Canal creado para casa:', house);
    return channel;
  } catch (error) {
    console.error('❌ [Checklist House Service] Error subscribing:', error);
    return null;
  }
}

// ==================== ASSIGNMENT INVENTORY (Inventario por Asignación) ====================

function normalizeAssignmentId(assignmentId: string | number) {
  const rawId = String(assignmentId ?? '').trim();
  if (!rawId) return null;
  if (/^\d+$/.test(rawId)) {
    return Number(rawId);
  }
  return rawId;
}

// Obtener template de inventario
const DEFAULT_INVENTORY_TEMPLATE = [
  // 1. Cocina
  { category: 'Cocina', item_name: 'Platos llanos', quantity: 12 },
  { category: 'Cocina', item_name: 'Platos hondos', quantity: 12 },
  { category: 'Cocina', item_name: 'Vasos altos (agua/jugo)', quantity: 15 },
  { category: 'Cocina', item_name: 'Vasos para cerveza', quantity: 10 },
  { category: 'Cocina', item_name: 'Copas para vino', quantity: 10 },
  { category: 'Cocina', item_name: 'Tazas para café/té', quantity: 12 },
  { category: 'Cocina', item_name: 'Cubiertos (tenedores)', quantity: 12 },
  { category: 'Cocina', item_name: 'Cubiertos (cucharas soperas)', quantity: 12 },
  { category: 'Cocina', item_name: 'Cubiertos (cucharas de postre)', quantity: 12 },
  { category: 'Cocina', item_name: 'Cubiertos (cuchillos de mesa)', quantity: 12 },
  { category: 'Cocina', item_name: 'Cuchillos de cocina (set)', quantity: 5 },
  { category: 'Cocina', item_name: 'Tablas de picar', quantity: 3 },
  { category: 'Cocina', item_name: 'Ollas medianas/grandes', quantity: 5 },
  { category: 'Cocina', item_name: 'Sartenes (incluyendo antiadherente grande)', quantity: 4 },
  { category: 'Cocina', item_name: 'Licuadora', quantity: 1 },
  { category: 'Cocina', item_name: 'Cafetera eléctrica', quantity: 1 },
  { category: 'Cocina', item_name: 'Hervidor eléctrico', quantity: 1 },
  { category: 'Cocina', item_name: 'Microondas', quantity: 1 },
  { category: 'Cocina', item_name: 'Toallas de cocina', quantity: 10 },
  { category: 'Cocina', item_name: 'Trapos de cocina', quantity: 8 },
  { category: 'Cocina', item_name: 'Detergente para platos', quantity: 2 },
  { category: 'Cocina', item_name: 'Esponjas', quantity: 6 },
  { category: 'Cocina', item_name: 'Bolsas de basura (paquete inicial)', quantity: 50 },
  { category: 'Cocina', item_name: 'Papel aluminio', quantity: 2 },
  { category: 'Cocina', item_name: 'Film plástico', quantity: 2 },
  { category: 'Cocina', item_name: 'Servilletas de papel (paquetes grandes)', quantity: 2 },
  { category: 'Cocina', item_name: 'Sal', quantity: 1 },
  { category: 'Cocina', item_name: 'Azúcar', quantity: 1 },
  { category: 'Cocina', item_name: 'Aceite', quantity: 1 },

  // 2. Sala-Comedor
  { category: 'Sala-Comedor', item_name: 'Controles remoto (TV + A/C o ventilador)', quantity: 2 },
  { category: 'Sala-Comedor', item_name: 'Pilas extras', quantity: 1 },
  { category: 'Sala-Comedor', item_name: 'Cojines para sofá', quantity: 10 },
  { category: 'Sala-Comedor', item_name: 'Mantas ligeras', quantity: 4 },
  { category: 'Sala-Comedor', item_name: 'Sillas comedor', quantity: 10 },
  { category: 'Sala-Comedor', item_name: 'Sillas plegables', quantity: 2 },
  { category: 'Sala-Comedor', item_name: 'Posavasos', quantity: 12 },

  // 3. Dormitorios
  { category: 'Dormitorios', item_name: 'Sets de sábanas completos', quantity: 12 },
  { category: 'Dormitorios', item_name: 'Almohadas', quantity: 20 },
  { category: 'Dormitorios', item_name: 'Fundas de almohada', quantity: 24 },
  { category: 'Dormitorios', item_name: 'Cobijas o edredones', quantity: 10 },
  { category: 'Dormitorios', item_name: 'Perchas', quantity: 60 },
  { category: 'Dormitorios', item_name: 'Lámparas de mesa de noche', quantity: 1 },

  // 4. Baños
  { category: 'Baños', item_name: 'Toallas grandes (baño)', quantity: 16 },
  { category: 'Baños', item_name: 'Toallas medianas (mano)', quantity: 12 },
  { category: 'Baños', item_name: 'Toallas pequeñas (cara)', quantity: 10 },
  { category: 'Baños', item_name: 'Tapetes de baño', quantity: 4 },
  { category: 'Baños', item_name: 'Jabón líquido manos/baño (dispensadores)', quantity: 4 },
  { category: 'Baños', item_name: 'Papel higiénico (rollos)', quantity: 24 },
  { category: 'Baños', item_name: 'Secador de pelo', quantity: 3 },
  { category: 'Baños', item_name: 'Basureros con tapa', quantity: 4 },

  // 5. Zona de lavado
  { category: 'Zona de lavado', item_name: 'Detergente para ropa', quantity: 2 },
  { category: 'Zona de lavado', item_name: 'Suavizante', quantity: 1 },
  { category: 'Zona de lavado', item_name: 'Cesto ropa sucia', quantity: 2 },
  { category: 'Zona de lavado', item_name: 'Plancha', quantity: 1 },
  { category: 'Zona de lavado', item_name: 'Tabla de planchar', quantity: 1 },

  // 6. Piscina y Jacuzzi
  { category: 'Piscina y Jacuzzi', item_name: 'Toallas para piscina/exterior', quantity: 15 },
  { category: 'Piscina y Jacuzzi', item_name: 'Flotadores/inflables', quantity: 6 },
  { category: 'Piscina y Jacuzzi', item_name: 'Sillas o tumbonas exteriores', quantity: 10 },
  { category: 'Piscina y Jacuzzi', item_name: 'Sombrillas o toldos', quantity: 3 },
  { category: 'Piscina y Jacuzzi', item_name: 'Red recogehojas piscina', quantity: 1 },
  { category: 'Piscina y Jacuzzi', item_name: 'Cepillo/barredor piscina', quantity: 1 },

  // 7. Zona BBQ y Terraza
  { category: 'Zona BBQ y Terraza', item_name: 'Parrilla/gas o carbón', quantity: 1 },
  { category: 'Zona BBQ y Terraza', item_name: 'Pinzas/utensilios BBQ (set 4 piezas)', quantity: 1 },
  { category: 'Zona BBQ y Terraza', item_name: 'Mesa exterior + sillas (puestos)', quantity: 10 },
  { category: 'Zona BBQ y Terraza', item_name: 'Basurero exterior con tapa', quantity: 2 },
  { category: 'Zona BBQ y Terraza', item_name: 'Cenicero (exterior)', quantity: 2 },

  // 8. Seguridad y General
  { category: 'Seguridad y General', item_name: 'Botiquín primeros auxilios', quantity: 1 },
  { category: 'Seguridad y General', item_name: 'Extintor', quantity: 1 },
  { category: 'Seguridad y General', item_name: 'Linterna', quantity: 2 },
  { category: 'Seguridad y General', item_name: 'Manual casa + wifi contraseña', quantity: 1 },
  { category: 'Seguridad y General', item_name: 'Repelente mosquitos', quantity: 2 },
];

export async function getInventoryTemplate(house: string = 'HYNTIBA2 APTO 406') {
  try {
    console.log('📦 [Inventory Template] Obteniendo template para:', house);
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('inventory_template') as any)
      .select('*')
      .eq('house', house)
      .order('category', { ascending: true })
      .order('item_name', { ascending: true });

    if (error) {
      console.error('❌ [Inventory Template] Error:', error);
      return [];
    }
    if (!data || data.length === 0) {
      console.warn('⚠️ [Inventory Template] Sin template en DB, usando plantilla por defecto. Casa:', house);
      return DEFAULT_INVENTORY_TEMPLATE.map(item => ({
        ...item,
        house
      }));
    }
    console.log('✅ [Inventory Template] Items obtenidos:', data?.length);
    return data || [];
  } catch (error) {
    console.error('❌ [Inventory Template] Exception:', error);
    return [];
  }
}

// Crear inventario para una asignación (copia del template)
export async function createAssignmentInventory(assignmentId: string | number, employee: string, house: string = 'HYNTIBA2 APTO 406') {
  const supabase = getSupabaseClient();
  const id = String(assignmentId ?? '').trim();
  const normalizedId = normalizeAssignmentId(assignmentId);

  console.log('📦 [Assignment Inventory] Creando inventario para asignación:', id, 'Empleado:', employee, 'Casa:', house);

  // Validación básica
  if (!normalizedId) {
    console.error('❌ [Assignment Inventory] Assignment ID vacío');
    return [];
  }

  // Eliminar inventario previo de la asignación (si existe)
  try {
    await (supabase
      .from('assignment_inventory') as any)
      .delete()
      .eq('calendar_assignment_id', normalizedId);
  } catch (err) {
    console.error('❌ [Assignment Inventory] Error eliminando inventario previo:', err);
  }

  // Obtener template
  const template = await getInventoryTemplate(house);

  if (template.length === 0) {
    console.warn('⚠️ [Assignment Inventory] No hay template de inventario');
    return [];
  }

  console.log('📝 [Assignment Inventory] Usando template con', template.length, 'items');

  // Crear items basados en el template, nunca incluir 'id'
  const now = new Date().toISOString();
  const itemsToInsert = template.map((item: any) => ({
    calendar_assignment_id: normalizedId,
    employee: employee,
    house: house,
    item_name: item.item_name,
    quantity: item.quantity,
    category: item.category,
    is_complete: false,
    notes: null,
    checked_by: null,
    checked_at: null,
    created_at: now,
    updated_at: now
  }));

  console.log('📝 [Assignment Inventory] Insertando', itemsToInsert.length, 'items');

  const { data, error } = await (supabase
    .from('assignment_inventory') as any)
    .insert(itemsToInsert)
    .select();

  if (error) {
    console.error('❌ [Assignment Inventory] Error creating:', {
      message: error.message,
      code: error.code,
      details: error.details,
      assignmentId: id
    });
    return [];
  }
  
  console.log('✅ [Assignment Inventory] Items creados:', data?.length, 'para assignmentId:', id);
  return data || [];
}

// Obtener inventario de una asignación
export async function getAssignmentInventory(assignmentId: string | number) {
  try {
    const id = String(assignmentId ?? '').trim();
    const normalizedId = normalizeAssignmentId(assignmentId);
    console.log('📦 [Assignment Inventory] Obteniendo para asignación:', id);
    
    if (!normalizedId) {
      console.warn('⚠️ [Assignment Inventory] Assignment ID vacío');
      return [];
    }

    const supabase = getSupabaseClient();

    const { data, error } = await (supabase
      .from('assignment_inventory') as any)
      .select('*')
      .eq('calendar_assignment_id', normalizedId)
      .order('category', { ascending: true })
      .order('item_name', { ascending: true });

    if (error) {
      console.error('❌ [Assignment Inventory] Error fetching:', {
        message: error.message,
        code: error.code,
        details: error.details,
        assignmentId: id,
        hint: error.hint
      });
      return [];
    }
    
    console.log('✅ [Assignment Inventory] Items obtenidos:', data?.length || 0, 'para ID:', id);
    return data || [];
  } catch (error) {
    console.error('❌ [Assignment Inventory] Exception:', error);
    return [];
  }
}

// Actualizar item de inventario
export async function updateAssignmentInventoryItem(itemId: string, isComplete: boolean, notes?: string, checkedBy?: string) {
  try {
    console.log('🔄 [updateAssignmentInventoryItem] Actualizando:', {
      itemId,
      isComplete,
      checkedBy,
      timestamp: new Date().toISOString()
    });
    
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('assignment_inventory') as any)
      .update({
        is_complete: isComplete,
        notes: notes || null,
        checked_by: isComplete ? checkedBy || null : null,
        checked_at: isComplete ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId)
      .select();

    if (error) {
      console.error('❌ [updateAssignmentInventoryItem] Error:', {
        error: error.message,
        itemId,
        code: error.code
      });
      return null;
    }
    
    console.log('✅ [updateAssignmentInventoryItem] Actualizado exitosamente:', {
      itemId,
      isComplete,
      checked_by: checkedBy,
      dataLength: data?.length
    });
    
    return data?.[0] || null;
  } catch (error) {
    console.error('❌ [updateAssignmentInventoryItem] Exception:', error);
    return null;
  }
}

// Suscribirse a cambios en inventario de asignación
export function subscribeToAssignmentInventory(assignmentId: string | number, callback: (data: any) => void) {
  try {
    const normalizedId = normalizeAssignmentId(assignmentId);
    const rawId = String(assignmentId ?? '').trim();
    console.log('📦 [Assignment Inventory] Iniciando suscripción:', rawId);
    const supabase = getSupabaseClient();

    if (!normalizedId) {
      console.error('❌ [Assignment Inventory] Assignment ID vacío:', rawId);
      return null;
    }

    const channel = supabase
      .channel(`inventory-${String(normalizedId)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'assignment_inventory',
          filter: `calendar_assignment_id=eq.${normalizedId}`
        },
        (payload: any) => {
          console.log('⚡ [Assignment Inventory] Evento recibido:', payload);
          
          const mappedPayload = {
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old
          };
          
          callback(mappedPayload);
        }
      )
      .subscribe((status: any) => {
        console.log('📡 [Assignment Inventory] Estado:', status);
      });

    console.log('✅ [Assignment Inventory] Canal creado');
    return channel;
  } catch (error) {
    console.error('❌ [Assignment Inventory] Error subscribing:', error);
    return null;
  }
}

export async function resolveAssignmentIdFromTask(task: any) {
  try {
    console.log('🔍 [resolveAssignmentIdFromTask] Buscando con:', {
      employee: task.employee,
      house: task.house,
      date: task.date,
      time: task.time,
      type: task.type
    });

    const supabase = getSupabaseClient();
    const query = (supabase
      .from('calendar_assignments') as any)
      .select('id, calendar_assignment_uuid')
      .eq('employee', task.employee)
      .eq('house', task.house)
      .eq('date', task.date)
      .eq('time', task.time)
      .eq('type', task.type)
      .limit(1)
      .maybeSingle();
    
    const { data, error } = await query;
    
    if (error) {
      console.error('❌ [resolveAssignmentIdFromTask] Error:', error);
      return null;
    }
    
    // Preferir calendar_assignment_uuid si existe, si no usar id
    const resolvedId = data?.calendar_assignment_uuid || data?.id || null;
    console.log('✅ [resolveAssignmentIdFromTask] Encontrado:', {
      id: data?.id,
      uuid: data?.calendar_assignment_uuid,
      usando: resolvedId
    });
    return resolvedId;
  } catch (error) {
    console.error('❌ [resolveAssignmentIdFromTask] Exception:', error);
    return null;
  }
}

// CRUD para inventory_template (manager edita el template)
export async function createInventoryTemplateItem(item: any, house: string = 'HYNTIBA2 APTO 406') {
  const supabase = getSupabaseClient();
  const { data, error } = await (supabase
    .from('inventory_template') as any)
    .insert([{
      house: house,
      item_name: item.item_name,
      quantity: item.quantity,
      category: item.category,
      location: item.location || null,
      order_num: item.order_num || null,
      active: item.active !== undefined ? item.active : true
    }])
    .select();

  if (error) {
    console.error('Error creating inventory template item:', error);
    return null;
  }
  return data?.[0] || null;
}

export async function updateInventoryTemplateItem(itemId: string, updates: any) {
  const supabase = getSupabaseClient();
  const { data, error } = await (supabase
    .from('inventory_template') as any)
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', itemId)
    .select();

  if (error) {
    console.error('Error updating inventory template item:', error);
    return null;
  }
  return data?.[0] || null;
}

export async function deleteInventoryTemplateItem(itemId: string) {
  const supabase = getSupabaseClient();
  const { error } = await (supabase
    .from('inventory_template') as any)
    .delete()
    .eq('id', itemId);

  if (error) {
    console.error('Error deleting inventory template item:', error);
    return false;
  }
  return true;
}

export function subscribeToInventoryTemplate(house: string = 'HYNTIBA2 APTO 406', callback: (data: any) => void) {
  try {
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`inventory-template-changes-${house}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_template',
          filter: `house=eq.${house}`
        },
        (payload: any) => {
          const mappedPayload = {
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old
          };
          callback(mappedPayload);
        }
      )
      .subscribe();
    return channel;
  } catch (error) {
    console.error('Error subscribing to inventory template:', error);
    return null;
  }
}

// ==================== Unsubscribe Helper ====================
// ==================== SHOPPING LIST (Lista de Compras) ====================

// Obtener lista de compras
export async function getShoppingList(house: string = 'HYNTIBA2 APTO 406', includePurchased: boolean = false) {
  try {
    const supabase = getSupabaseClient();
    let query = (supabase
      .from('shopping_list') as any)
      .select('*')
      .eq('house', house)
      .order('created_at', { ascending: false });
    
    if (!includePurchased) {
      query = query.eq('is_purchased', false);
    }
    
    const { data, error } = await query;

    if (error) {
      console.error('❌ [Shopping List] Error:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('❌ [Shopping List] Exception:', error);
    return [];
  }
}

// Agregar item a la lista de compras
export async function addShoppingListItem(item: any, house: string = 'HYNTIBA2 APTO 406') {
  try {
    const supabase = getSupabaseClient();
    console.log('📝 Adding shopping item:', { item, house });
    
    const { data, error } = await (supabase
      .from('shopping_list') as any)
      .insert([{
        house: house,
        item_name: item.item_name,
        quantity: item.quantity || '',
        category: item.category || 'General',
        added_by: item.added_by,
        notes: item.notes || ''
      }])
      .select();

    if (error) {
      console.error('❌ Error adding shopping list item:', error);
      return null;
    }
    console.log('✅ Shopping item added:', data?.[0]);
    
    // Actualizar el item con el size después de insertarlo
    if (data?.[0]?.id && item.size) {
      await (supabase
        .from('shopping_list') as any)
        .update({ size: item.size })
        .eq('id', data[0].id);
    }
    
    return data?.[0] || null;
  } catch (err) {
    console.error('❌ Exception adding shopping item:', err);
    return null;
  }
}

// Actualizar item de la lista de compras
export async function updateShoppingListItem(itemId: string, updates: any) {
  const supabase = getSupabaseClient();
  const { data, error } = await (supabase
    .from('shopping_list') as any)
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', itemId)
    .select();

  if (error) {
    console.error('Error updating shopping list item:', error);
    return null;
  }
  return data?.[0] || null;
}

// Marcar item como comprado
export async function markAsPurchased(itemId: string, purchasedBy: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await (supabase
    .from('shopping_list') as any)
    .update({
      is_purchased: true,
      purchased_by: purchasedBy,
      purchased_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', itemId)
    .select();

  if (error) {
    console.error('Error marking as purchased:', error);
    return null;
  }
  return data?.[0] || null;
}

// Eliminar item de la lista de compras
export async function deleteShoppingListItem(itemId: string) {
  const supabase = getSupabaseClient();
  const { error } = await (supabase
    .from('shopping_list') as any)
    .delete()
    .eq('id', itemId);

  if (error) {
    console.error('Error deleting shopping list item:', error);
    return false;
  }
  return true;
}

// Suscribirse a cambios en la lista de compras
export function subscribeToShoppingList(house: string = 'HYNTIBA2 APTO 406', callback: (data: any) => void) {
  try {
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`shopping-list-changes-${house}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shopping_list',
          filter: `house=eq.${house}`
        },
        (payload: any) => {
          const mappedPayload = {
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old
          };
          callback(mappedPayload);
        }
      )
      .subscribe();
    return channel;
  } catch (error) {
    console.error('Error subscribing to shopping list:', error);
    return null;
  }
}

// ==================== RECORDATORIOS ====================
export async function createReminder(reminder: any) {
  const supabase = getSupabaseClient();
  const { data, error } = await (supabase
    .from('reminders') as any)
    .insert([{
      name: reminder.name,
      due_date: reminder.due,
      bank: reminder.bank,
      account: reminder.account,
      invoice_number: reminder.invoiceNumber || null,
      house: reminder.house || 'HYNTIBA2 APTO 406',
      created_at: new Date().toISOString()
    }])
    .select();
  
  if (error) {
    console.error('Error creating reminder:', error);
    return null;
  }
  const result = data?.[0] || null;
  if (result) {
    result.due = result.due_date;
    result.invoiceNumber = result.invoice_number;
  }
  return result;
}

export async function getReminders(house: string = 'HYNTIBA2 APTO 406') {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.warn('Supabase client not available, using local reminders');
      return [];
    }
    
    const { data, error } = await (supabase
      .from('reminders') as any)
      .select('*')
      .eq('house', house)
      .order('due_date', { ascending: true });
    
    if (error) {
      console.warn('Reminders table might not exist, using fallback:', error?.message);
      return [];
    }
    // Mapear campos snake_case a camelCase
    return (data || []).map((r: any) => ({
      ...r,
      due: r.due_date,
      invoiceNumber: r.invoice_number
    }));
  } catch (error) {
    console.warn('Exception fetching reminders, using fallback:', error);
    return [];
  }
}

export async function updateReminder(reminderId: string, updates: any) {
  const supabase = getSupabaseClient();
  const mappedUpdates: any = { ...updates };
  
  // Map camelCase to snake_case
  if ('due' in mappedUpdates) {
    mappedUpdates.due_date = mappedUpdates.due;
    delete mappedUpdates.due;
  }
  if ('invoiceNumber' in mappedUpdates) {
    mappedUpdates.invoice_number = mappedUpdates.invoiceNumber;
    delete mappedUpdates.invoiceNumber;
  }
  
  const { data, error } = await (supabase
    .from('reminders') as any)
    .update(mappedUpdates)
    .eq('id', reminderId)
    .select();
  
  if (error) {
    console.error('Error updating reminder:', error);
    return null;
  }
  const result = data?.[0] || null;
  if (result) {
    result.due = result.due_date;
    result.invoiceNumber = result.invoice_number;
  }
  return result;
}

export async function deleteReminder(reminderId: string) {
  const supabase = getSupabaseClient();
  const { error } = await (supabase
    .from('reminders') as any)
    .delete()
    .eq('id', reminderId);
  
  if (error) {
    console.error('Error deleting reminder:', error);
    return false;
  }
  return true;
}

export function subscribeToReminders(house: string = 'HYNTIBA2 APTO 406', callback: (data: any) => void) {
  try {
    console.log('🔔 [Realtime Service] Iniciando suscripción a reminders para house:', house);
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`reminders-changes-${house}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reminders',
          filter: `house=eq.${house}`
        },
        (payload: any) => {
          console.log('📨 [Realtime Service] Cambio en reminders:', payload);
          const mappedPayload = {
            ...payload,
            new: payload.new ? { ...payload.new, due: payload.new.due_date, invoiceNumber: payload.new.invoice_number } : null,
            old: payload.old ? { ...payload.old, due: payload.old.due_date, invoiceNumber: payload.old.invoice_number } : null
          };
          callback(mappedPayload);
        }
      )
      .subscribe();
    return channel;
  } catch (error) {
    console.error('Error subscribing to reminders:', error);
    return null;
  }
}

// ==================== CASAS ====================
export async function getHouses() {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('houses') as any)
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      console.error('Error fetching houses:', error);
      return [];
    }
    // Mapear 'name' a 'houseName' para consistencia
    return (data || []).map((h: any) => ({ ...h, houseName: h.name }));
  } catch (error) {
    console.error('Exception fetching houses:', error);
    return [];
  }
}

export async function createHouse(house: any) {
  const supabase = getSupabaseClient();
  const houseName = house.houseName || house.name || '';
  const { data, error } = await (supabase
    .from('houses') as any)
    .insert([{
      name: houseName,
      created_at: new Date().toISOString()
    }])
    .select();
  
  if (error) {
    console.error('Error creating house:', error);
    return null;
  }
  return data?.[0] || null;
}

export async function updateHouse(houseId: string, updates: any) {
  const supabase = getSupabaseClient();
  const { data, error } = await (supabase
    .from('houses') as any)
    .update(updates)
    .eq('id', houseId)
    .select();
  
  if (error) {
    console.error('Error updating house:', error);
    return null;
  }
  return data?.[0] || null;
}

export async function deleteHouse(houseId: string) {
  const supabase = getSupabaseClient();
  const { error } = await (supabase
    .from('houses') as any)
    .delete()
    .eq('id', houseId);
  
  if (error) {
    console.error('Error deleting house:', error);
    return false;
  }
  return true;
}

export function subscribeToHouses(callback: (data: any) => void) {
  try {
    console.log('🔔 [Realtime Service] Iniciando suscripción a houses');
    const supabase = getSupabaseClient();
    
    // Primero cargar todas las casas
    getHouses().then(houses => {
      console.log('📨 [Realtime Service] Casas cargadas inicialmente:', houses);
      callback(houses);
    });
    
    const channel = supabase
      .channel('houses-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'houses'
        },
        (payload: any) => {
          console.log('📨 [Realtime Service] Cambio en houses:', payload);
          // Cuando hay un cambio, recargar todas las casas
          getHouses().then(houses => {
            callback(houses);
          });
        }
      )
      .subscribe();
    return channel;
  } catch (error) {
    console.error('Error subscribing to houses:', error);
    return null;
  }
}

// ==================== USUARIOS ====================
export async function getUsers() {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('users') as any)
      .select('id, correo, rol, property_id, created_at')
      .order('correo', { ascending: true });

    if (error) {
      console.error('Error fetching users:', error);
      return [];
    }
    return (data || []).map((u: any) => ({
      id: u.id,
      username: u.correo,
      role: u.rol,
      house: u.property_id,
      created_at: u.created_at
    }));
  } catch (error) {
    console.error('Exception fetching users:', error);
    return [];
  }
}

export async function createUser(user: any) {
  const supabase = getSupabaseClient();
  const { data, error } = await (supabase
    .from('app_users') as any)
    .insert([{
      username: user.username,
      password: user.password,
      role: user.role,
      house_name: user.house || null,
      created_at: new Date().toISOString()
    }])
    .select();
  
  if (error) {
    console.error('Error creating user:', error);
    return null;
  }
  const result = data?.[0] || null;
  if (result) {
    result.house = result.house_name;
  }
  return result;
}

export async function updateUser(userId: string, updates: any) {
  const supabase = getSupabaseClient();
  const mappedUpdates: any = { ...updates };
  
  if ('house' in mappedUpdates) {
    mappedUpdates.house_name = mappedUpdates.house;
    delete mappedUpdates.house;
  }
  
  const { data, error } = await (supabase
    .from('app_users') as any)
    .update(mappedUpdates)
    .eq('id', userId)
    .select();
  
  if (error) {
    console.error('Error updating user:', error);
    return null;
  }
  const result = data?.[0] || null;
  if (result) {
    result.house = result.house_name;
  }
  return result;
}

export async function deleteUser(userId: string) {
  const supabase = getSupabaseClient();
  const { error } = await (supabase
    .from('app_users') as any)
    .delete()
    .eq('id', userId);
  
  if (error) {
    console.error('Error deleting user:', error);
    return false;
  }
  return true;
}

export function subscribeToUsers(callback: (data: any) => void) {
  try {
    console.log('🔔 [Realtime Service] Iniciando suscripción a app_users');
    const supabase = getSupabaseClient();
    
    const channel = supabase
      .channel('users-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_users'
        },
        (payload: any) => {
          console.log('📨 [Realtime Service] Cambio en app_users:', payload);
          const mappedPayload = {
            ...payload,
            new: payload.new ? { ...payload.new, house: payload.new.house_name } : null,
            old: payload.old ? { ...payload.old, house: payload.old.house_name } : null
          };
          callback(mappedPayload);
        }
      )
      .subscribe();
    return channel;
  } catch (error) {
    console.error('Error subscribing to users:', error);
    return null;
  }
}

// ==================== Unsubscribe Helper ====================
export function unsubscribeFromAll(subscriptions: any[]) {
  subscriptions.forEach(sub => {
    if (sub) {
      sub?.unsubscribe?.();
    }
  });
}

// ==================== CHECKLIST TEMPLATES ====================
export async function createChecklistFromTemplate(assignmentId: string, taskType: string, employee: string, house: string) {
  try {
    console.log('📋 Creando checklist desde plantilla:', { assignmentId, taskType, employee, house });
    const supabase = getSupabaseClient();
    
    // Obtener plantillas activas para este tipo de tarea Y esta casa específica
    const { data: templates, error: templateError } = await (supabase
      .from('checklist_templates') as any)
      .select('*')
      .eq('task_type', taskType)
      .eq('house', house)
      .eq('active', true)
      .order('order_num', { ascending: true });
    
    if (templateError) {
      console.error('❌ Error obteniendo plantillas:', templateError);
      return { success: false, error: templateError };
    }
    
    if (!templates || templates.length === 0) {
      console.warn(`⚠️ No hay plantillas para ${taskType} en casa ${house}`);
      return { success: true, count: 0, items: [] };
    }
    
    console.log(`✅ ${templates.length} plantillas encontradas para ${taskType}`);
    
    // Crear items del checklist desde las plantillas
    const checklistItems = templates.map((template: any) => ({
      calendar_assignment_id: assignmentId,
      employee: employee,
      house: house,
      zone: template.zone,
      task: template.task,
      completed: false,
      order_num: template.order_num
    }));
    
    // Insertar en cleaning_checklist
    const { data, error } = await (supabase
      .from('cleaning_checklist') as any)
      .insert(checklistItems)
      .select();
    
    if (error) {
      console.error('❌ Error insertando checklist:', error);
      return { success: false, error };
    }
    
    console.log(`✅ ${data?.length || 0} items de checklist creados para asignación ${assignmentId}`);
    return { success: true, count: data?.length || 0, items: data };
    
  } catch (error) {
    console.error('❌ Exception en createChecklistFromTemplate:', error);
    return { success: false, error };
  }
}

// ==================== TEMPLATE MANAGEMENT (CRUD) ====================

// Checklist Templates
export async function getChecklistTemplates(house: string, taskType?: string) {
  try {
    const supabase = getSupabaseClient();
    let query = supabase.from('checklist_templates').select('*').eq('house', house);
    
    if (taskType) {
      query = query.eq('task_type', taskType);
    }
    
    const { data, error } = await query.order('order_num', { ascending: true });
    
    if (error) {
      console.error('❌ Error obteniendo templates de checklist:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('❌ Exception en getChecklistTemplates:', error);
    return [];
  }
}

export async function getChecklistTemplatesWithError(house: string, taskType?: string) {
  try {
    const supabase = getSupabaseClient();
    let query = supabase.from('checklist_templates').select('*').eq('house', house);

    if (taskType) {
      query = query.eq('task_type', taskType);
    }

    const { data, error } = await query.order('order_num', { ascending: true });

    if (error) {
      console.error('❌ Error obteniendo templates de checklist:', error);
      return { data: [], error };
    }

    return { data: data || [], error: null };
  } catch (error: any) {
    console.error('❌ Exception en getChecklistTemplatesWithError:', error);
    return { data: [], error };
  }
}

export function subscribeToChecklistTemplates(house: string, callback: (data: any) => void) {
  try {
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`checklist-templates-changes-${house}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checklist_templates',
          filter: `house=eq.${house}`
        },
        (payload: any) => {
          const mappedPayload = {
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old
          };
          callback(mappedPayload);
        }
      )
      .subscribe();
    return channel;
  } catch (error) {
    console.error('Error subscribing to checklist templates:', error);
    return null;
  }
}

export async function createChecklistTemplate(template: {
  house: string;
  task_type: string;
  zone: string;
  task: string;
  order_num?: number;
  active?: boolean;
}) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('checklist_templates') as any)
      .insert([template])
      .select();
    
    if (error) {
      console.error('❌ Error creando template de checklist:', error);
      return null;
    }
    
    return data?.[0] || null;
  } catch (error) {
    console.error('❌ Exception en createChecklistTemplate:', error);
    return null;
  }
}

export async function createChecklistTemplatesBulk(templates: Array<{
  house: string;
  task_type: string;
  zone: string;
  task: string;
  order_num?: number;
  active?: boolean;
}>) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('checklist_templates') as any)
      .insert(templates)
      .select();

    if (error) {
      console.error('❌ Error creando templates de checklist (bulk):', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ Exception en createChecklistTemplatesBulk:', error);
    return [];
  }
}

// Legacy checklist templates (tabla checklist)
export async function getChecklistTemplatesLegacy(house: string) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('checklist') as any)
      .select('*')
      .eq('house', house)
      .order('room', { ascending: true })
      .order('item', { ascending: true });

    if (error) {
      console.error('❌ Error obteniendo checklist legacy:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ Exception en getChecklistTemplatesLegacy:', error);
    return [];
  }
}

export async function createChecklistTemplateLegacy(item: { house: string; room?: string; item: string; assigned_to?: string | null }) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('checklist') as any)
      .insert([{
        house: item.house,
        room: item.room || null,
        item: item.item,
        complete: false,
        assigned_to: item.assigned_to || null
      }])
      .select();

    if (error) {
      console.error('❌ Error creando checklist legacy:', error);
      return null;
    }

    return data?.[0] || null;
  } catch (error) {
    console.error('❌ Exception en createChecklistTemplateLegacy:', error);
    return null;
  }
}

export async function createChecklistTemplatesLegacyBulk(items: Array<{ house: string; room?: string | null; item: string; assigned_to?: string | null }>) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('checklist') as any)
      .insert(items.map(i => ({
        house: i.house,
        room: i.room || null,
        item: i.item,
        complete: false,
        assigned_to: i.assigned_to || null
      })))
      .select();

    if (error) {
      console.error('❌ Error creando checklist legacy (bulk):', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ Exception en createChecklistTemplatesLegacyBulk:', error);
    return [];
  }
}

export async function updateChecklistTemplateLegacy(id: string, updates: any) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('checklist') as any)
      .update(updates)
      .eq('id', id)
      .select();

    if (error) {
      console.error('❌ Error actualizando checklist legacy:', error);
      return null;
    }

    return data?.[0] || null;
  } catch (error) {
    console.error('❌ Exception en updateChecklistTemplateLegacy:', error);
    return null;
  }
}

export async function deleteChecklistTemplateLegacy(id: string) {
  try {
    const supabase = getSupabaseClient();
    const { error } = await (supabase
      .from('checklist') as any)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Error eliminando checklist legacy:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ Exception en deleteChecklistTemplateLegacy:', error);
    return false;
  }
}

export function subscribeToChecklistLegacy(house: string, callback: (data: any) => void) {
  try {
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`checklist-legacy-changes-${house}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checklist',
          filter: `house=eq.${house}`
        },
        (payload: any) => {
          const mappedPayload = {
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old
          };
          callback(mappedPayload);
        }
      )
      .subscribe();
    return channel;
  } catch (error) {
    console.error('Error subscribing to checklist legacy:', error);
    return null;
  }
}


export async function updateChecklistTemplate(id: string, updates: any) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('checklist_templates') as any)
      .update(updates)
      .eq('id', id)
      .select();
    
    if (error) {
      console.error('❌ Error actualizando template de checklist:', error);
      return null;
    }
    
    return data?.[0] || null;
  } catch (error) {
    console.error('❌ Exception en updateChecklistTemplate:', error);
    return null;
  }
}

export async function deleteChecklistTemplate(id: string) {
  try {
    const supabase = getSupabaseClient();
    const { error } = await (supabase
      .from('checklist_templates') as any)
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('❌ Error eliminando template de checklist:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Exception en deleteChecklistTemplate:', error);
    return false;
  }
}

// Inventory Templates
export async function getInventoryTemplates(house: string) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('inventory_template') as any)
      .select('*')
      .eq('house', house)
      .order('order_num', { ascending: true });
    
    if (error) {
      console.error('❌ Error obteniendo templates de inventario:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('❌ Exception en getInventoryTemplates:', error);
    return [];
  }
}

export async function getInventoryTemplateLegacy(house: string) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('inventory_template') as any)
      .select('*')
      .eq('house', house)
      .order('category', { ascending: true })
      .order('item_name', { ascending: true });

    if (error) {
      console.error('❌ Error obteniendo templates legacy de inventario:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ Exception en getInventoryTemplateLegacy:', error);
    return [];
  }
}

export function subscribeToInventoryTemplates(house: string, callback: (data: any) => void) {
  try {
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`inventory-templates-changes-${house}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_template',
          filter: `house=eq.${house}`
        },
        (payload: any) => {
          const mappedPayload = {
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old
          };
          callback(mappedPayload);
        }
      )
      .subscribe();
    return channel;
  } catch (error) {
    console.error('Error subscribing to inventory templates:', error);
    return null;
  }
}

export async function createInventoryTemplate(template: {
  house: string;
  item_name: string;
  quantity: number;
  category: string;
  location?: string;
  order_num?: number;
  active?: boolean;
}) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('inventory_templates') as any)
      .insert([template])
      .select();
    
    if (error) {
      console.error('❌ Error creando template de inventario:', error);
      return null;
    }
    
    return data?.[0] || null;
  } catch (error) {
    console.error('❌ Exception en createInventoryTemplate:', error);
    return null;
  }
}

export async function createInventoryTemplatesBulk(templates: Array<{
  house: string;
  item_name: string;
  quantity: number;
  category: string;
  location?: string;
  order_num?: number;
  active?: boolean;
}>) {
  try {
    if (!templates || templates.length === 0) return [];
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('inventory_template') as any)
      .insert(templates)
      .select();

    if (error) {
      console.error('❌ Error creando templates de inventario (bulk):', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ Exception en createInventoryTemplatesBulk:', error);
    return [];
  }
}

export async function updateInventoryTemplate(id: string, updates: any) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('inventory_templates') as any)
      .update(updates)
      .eq('id', id)
      .select();
    
    if (error) {
      console.error('❌ Error actualizando template de inventario:', error);
      return null;
    }
    
    return data?.[0] || null;
  } catch (error) {
    console.error('❌ Exception en updateInventoryTemplate:', error);
    return null;
  }
}

export async function deleteInventoryTemplate(id: string) {
  try {
    const supabase = getSupabaseClient();
    const { error } = await (supabase
      .from('inventory_templates') as any)
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('❌ Error eliminando template de inventario:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Exception en deleteInventoryTemplate:', error);
    return false;
  }
}

// Crear inventario desde templates para una asignación
export async function createInventoryFromTemplate(assignmentId: string, employee: string, house: string) {
  try {
    console.log('📦 Creando inventario desde plantilla:', { assignmentId, employee, house });
    const supabase = getSupabaseClient();
    
    // Obtener templates activos para esta casa
    const { data: templates, error: templateError } = await (supabase
      .from('inventory_templates') as any)
      .select('*')
      .eq('house', house)
      .eq('active', true)
      .order('order_num', { ascending: true });
    
    if (templateError) {
      console.error('❌ Error obteniendo templates de inventario:', templateError);
      return { success: false, error: templateError };
    }
    
    if (!templates || templates.length === 0) {
      console.warn(`⚠️ No hay templates de inventario para casa ${house}`);
      return { success: true, count: 0, items: [] };
    }
    
    console.log(`✅ ${templates.length} templates de inventario encontrados para ${house}`);
    
    // Crear items de inventario desde templates
    const inventoryItems = templates.map((template: any) => ({
      calendar_assignment_id: assignmentId,
      employee: employee,
      house: house,
      item_name: template.item_name,
      quantity: template.quantity,
      category: template.category,
      location: template.location,
      complete: false,
      order_num: template.order_num
    }));
    
    // Insertar en assignment_inventory
    const { data, error } = await (supabase
      .from('assignment_inventory') as any)
      .insert(inventoryItems)
      .select();
    
    if (error) {
      console.error('❌ Error insertando inventario:', error);
      return { success: false, error };
    }
    
    console.log(`✅ ${data?.length || 0} items de inventario creados para asignación ${assignmentId}`);
    return { success: true, count: data?.length || 0, items: data };
    
  } catch (error) {
    console.error('❌ Exception en createInventoryFromTemplate:', error);
    return { success: false, error };
  }
}
