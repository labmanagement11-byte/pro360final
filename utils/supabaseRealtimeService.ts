// ==================== CALENDAR ASSIGNMENTS REALTIME ====================
export function subscribeToCalendarAssignments(employeeId: string, callback: (data: any) => void) {
  try {
    console.log('🔔 [Realtime Service] Iniciando suscripción a calendar_assignments para empleado:', employeeId);
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`calendar-assignments-changes-${employeeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calendar_assignments',
          filter: `employee_id=eq.${employeeId}`
        },
        (payload: any) => {
          console.log('⚡ [Realtime Service] Evento recibido:', payload);
          callback({
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old
          });
        }
      )
      .subscribe((status: any) => {
        console.log('📡 [Realtime Service] Estado de suscripción:', status);
      });
    return channel;
  } catch (error) {
    console.error('❌ [Realtime Service] Error al suscribirse:', error);
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
  const { data, error } = await (supabase
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
  
  if (error) {
    console.error('Error creating calendar assignment:', error);
    return null;
  }
  return data?.[0] || null;
}

export async function getCalendarAssignments(house: string = 'HYNTIBA2 APTO 406', employee?: string) {
  try {
    const supabase = getSupabaseClient();
    let query = (supabase
      .from('calendar_assignments') as any)
      .select('*')
      .eq('house', house);
    
    if (employee) {
      query = query.eq('employee', employee);
    }
    
    const { data, error } = await query.order('date', { ascending: true });
    
    if (error) {
      console.error('Error fetching calendar assignments:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Exception fetching calendar assignments:', error);
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


// ==================== CLEANING CHECKLIST ====================
export async function createCleaningChecklistItems(assignmentId: string, employee: string, assignmentType: string, house: string = 'HYNTIBA2 APTO 406') {
  const supabase = getSupabaseClient();
  
  console.log('🧹 [Checklist] Iniciando creación de items para asignación:', assignmentId, 'Tipo:', assignmentType, 'Empleado:', employee, 'Casa:', house);
  
  // Listas de limpieza por tipo
  const LIMPIEZA_REGULAR: Record<string, string[]> = {
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

  const LIMPIEZA_PROFUNDA: Record<string, string[]> = {
    'LIMPIEZA PROFUNDA': [
      'Lavar los forros de los muebles (sofás, sillas y cojines).',
      'Limpiar todas las ventanas y ventanales de la casa, por dentro y por fuera.',
      'Limpiar con hidrolavadora el piso exterior, incluyendo escaleras, terraza y placas vehiculares.',
      'Lavar la caneca grande de basura ubicada debajo de la escalera.',
      'Limpiar las paredes y los guardaescobas de toda la casa.'
    ]
  };

  const MANTENIMIENTO: Record<string, string[]> = {
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

  // Seleccionar la lista según el tipo de asignación
  let checklistTemplate: Record<string, string[]> = {};
  
  if (assignmentType === 'Limpieza regular') {
    checklistTemplate = LIMPIEZA_REGULAR;
  } else if (assignmentType === 'Limpieza profunda') {
    checklistTemplate = LIMPIEZA_PROFUNDA;
  } else if (assignmentType === 'Mantenimiento') {
    checklistTemplate = MANTENIMIENTO;
  }

  console.log('📋 [Checklist] Usando template:', Object.keys(checklistTemplate).length, 'zonas');

  // Convertir el template a items
  const checklistItems: { zone: string; task: string; order: number }[] = [];
  Object.entries(checklistTemplate).forEach(([zone, tasks]) => {
    tasks.forEach((task, index) => {
      checklistItems.push({
        zone: zone,
        task: task,
        order: index
      });
    });
  });
  if (!data || data.length === 0) {
    console.warn('⚠️ [Checklist] No se insertaron items en cleaning_checklist. assignmentId:', assignmentId, 'itemsToInsert:', itemsToInsert);
  }
  console.log('✅ [Checklist] Items creados exitosamente:', data?.length, 'items para assignmentId:', assignmentId);
  return data || [];
}

export async function getCleaningChecklistItems(assignmentId: string) {
  try {
    console.log('🧹 [Checklist] Solicitando items para asignación:', assignmentId);
    const supabase = getSupabaseClient();
    
    // Primero obtener la casa y el tipo de la asignación
    const { data: assignment, error: assignmentError } = await (supabase
      .from('calendar_assignments') as any)
      .select('house, employee, type')
      .eq('id', assignmentId)
      .single();
    
    if (assignmentError || !assignment) {
      console.error('❌ [Checklist] Error obteniendo asignación:', assignmentError);
      return [];
    }
    
    console.log('🏠 [Checklist] Casa:', assignment.house, 'Tipo:', assignment.type);
    
    // Obtener tareas desde la tabla cleaning_checklist vinculadas a la asignación
    // Primero buscar por calendar_assignment_id_bigint (nueva columna no destructiva)
    let { data, error } = await (supabase
      .from('cleaning_checklist') as any)
      .select('*')
      .eq('calendar_assignment_id_bigint', assignmentId)
      .order('order_num', { ascending: true });

    if (error) {
      console.error('❌ [Checklist] Error fetching cleaning_checklist items by bigint id:', error);
      return [];
    }

    // Si no hay resultados con la columna bigint, intentar fallback por employee + house
    if (!data || data.length === 0) {
      console.log('⚠️ [Checklist] No items found by bigint id, falling back to employee+house search');
      const assignmentEmployee = assignment.employee;
      const assignmentHouse = assignment.house;
      const fallbackQuery = (supabase
        .from('cleaning_checklist') as any)
        .select('*')
        .eq('employee', assignmentEmployee)
        .eq('house', assignmentHouse)
        .order('order_num', { ascending: true });

      const fallbackRes = await fallbackQuery;
      data = fallbackRes.data || [];
      if (fallbackRes.error) {
        console.error('❌ [Checklist] Error fetching fallback cleaning_checklist items:', fallbackRes.error);
        return [];
      }
    }

    // Mapear campos de cleaning_checklist a los campos que espera el Dashboard
    let mappedData = (data || []).map((item: any) => ({
      id: item.id,
      zone: item.zone || 'Sin zona',
      task: item.task,
      completed: item.completed || false,
      completed_by: item.completed_by || null,
      completed_at: item.completed_at || null,
      order_num: item.order_num || 0,
      // preferir calendar_assignment_id_bigint si existe
      calendar_assignment_id: item.calendar_assignment_id_bigint || item.calendar_assignment_id,
      house: item.house,
      assigned_to: item.employee
    }));

    // Si no encontramos items en cleaning_checklist, caer hacia la tabla "checklist" (compatibilidad)
    if (!mappedData || mappedData.length === 0) {
      console.log('⚠️ [Checklist] No items in cleaning_checklist; falling back to legacy checklist table for assignment type', assignment.type);

      let query = (supabase
        .from('checklist') as any)
        .select('*')
        .eq('house', assignment.house);

      // Filtrar por tipo de asignación
      if (assignment.type === 'Limpieza profunda') {
        query = query.eq('room', 'LIMPIEZA PROFUNDA');
      } else if (assignment.type === 'Limpieza regular') {
        query = query
          .neq('room', 'LIMPIEZA PROFUNDA')
          .notIn('room', ['PISCINA Y AGUA', 'SISTEMAS ELÉCTRICOS', 'ÁREAS VERDES']);
      } else if (assignment.type === 'Mantenimiento') {
        query = query.in('room', ['PISCINA Y AGUA', 'SISTEMAS ELÉCTRICOS', 'ÁREAS VERDES']);
      }

      const { data: legacyData, error: legacyError } = await query.order('room', { ascending: true });

      if (legacyError) {
        console.error('❌ [Checklist] Error fetching legacy checklist items:', legacyError);
        return [];
      }

      mappedData = (legacyData || []).map((item: any) => ({
        id: item.id,
        zone: item.room || 'Sin zona',
        task: item.item,
        completed: item.complete || false,
        completed_by: null,
        completed_at: null,
        order_num: 0,
        calendar_assignment_id: assignmentId,
        house: item.house,
        assigned_to: item.assigned_to
      }));

      console.log('✅ [Checklist] Fallback items obtained from checklist table:', mappedData.length);
    }

    // Si aún no hay items, construir una plantilla en memoria para mostrar al empleado (no destructiva)
    if (!mappedData || mappedData.length === 0) {
      console.log('⚠️ [Checklist] No items found anywhere; returning in-memory template for:', assignment.type);

      // Generar template en memoria usando la misma lógica que createCleaningChecklistItems
      function buildTemplate(type: string) {
        const LIMPIEZA_REGULAR: Record<string, string[]> = {
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

        const LIMPIEZA_PROFUNDA: Record<string, string[]> = {
          'LIMPIEZA PROFUNDA': [
            'Lavar los forros de los muebles (sofás, sillas y cojines).',
            'Limpiar todas las ventanas y ventanales de la casa, por dentro y por fuera.',
            'Limpiar con hidrolavadora el piso exterior, incluyendo escaleras, terraza y placas vehiculares.',
            'Lavar la caneca grande de basura ubicada debajo de la escalera.',
            'Limpiar las paredes y los guardaescobas de toda la casa.'
          ]
        };

        const MANTENIMIENTO: Record<string, string[]> = {
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

        if (type === 'Limpieza regular') return LIMPIEZA_REGULAR;
        if (type === 'Limpieza profunda') return LIMPIEZA_PROFUNDA;
        if (type === 'Mantenimiento') return MANTENIMIENTO;
        return LIMPIEZA_REGULAR;
      }

      const tpl = buildTemplate(assignment.type);
      const tmpItems: any[] = [];
      let order = 1;
      Object.entries(tpl).forEach(([zone, tasks]) => {
        tasks.forEach(task => {
          tmpItems.push({
            id: null,
            zone,
            task,
            completed: false,
            completed_by: null,
            completed_at: null,
            order_num: order++,
            calendar_assignment_id: assignmentId,
            house: assignment.house,
            assigned_to: assignment.employee,
            // Marcar que se trata de una plantilla generada en memoria (no viene de la BD)
            isTemplate: true
          });
        });
      });

      console.log('✅ [Checklist] Returning in-memory template items:', tmpItems.length);
      return tmpItems;
    }

    console.log('✅ [Checklist] Items obtenidos:', mappedData.length, 'items para', assignment.type);
    return mappedData;
  } catch (error) {
    console.error('❌ [Checklist] Exception fetching checklist items:', error);
    return [];
  }
}

export async function updateCleaningChecklistItem(itemId: string, completed: boolean, completedBy?: string) {
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
    console.error('❌ [Checklist] Error updating cleaning_checklist item:', error);
    return null;
  }
  return data?.[0] || null;
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

// Obtener template de inventario
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
    console.log('✅ [Inventory Template] Items obtenidos:', data?.length);
    return data || [];
  } catch (error) {
    console.error('❌ [Inventory Template] Exception:', error);
    return [];
  }
}

// Crear inventario para una asignación (copia del template)
export async function createAssignmentInventory(assignmentId: string, employee: string, house: string = 'HYNTIBA2 APTO 406') {
  const supabase = getSupabaseClient();
  
  console.log('📦 [Assignment Inventory] Creando inventario para asignación:', assignmentId, 'Empleado:', employee, 'Casa:', house);
  
  // Obtener template
  const template = await getInventoryTemplate(house);
  
  if (template.length === 0) {
    console.warn('⚠️ [Assignment Inventory] No hay template de inventario');
    return [];
  }

  // Crear items basados en el template, nunca incluir 'id'
  const now = new Date().toISOString();
  const itemsToInsert = template.map((item: any) => {
    const obj = {
      calendar_assignment_id: assignmentId,
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
    };
    if ('id' in obj) delete obj.id;
    return obj;
  });

  console.log('📝 [Assignment Inventory] Insertando', itemsToInsert.length, 'items');

  const { data, error } = await (supabase
    .from('assignment_inventory') as any)
    .insert(itemsToInsert)
    .select();

  if (error) {
    try {
      console.error('❌ [Assignment Inventory] Error creating:', JSON.stringify(error, null, 2), '\nassignmentId:', assignmentId, '\nitemsToInsert:', itemsToInsert);
    } catch (e) {
      console.error('❌ [Assignment Inventory] Error creating (raw):', error, '\nassignmentId:', assignmentId, '\nitemsToInsert:', itemsToInsert);
    }
    return [];
  }
  if (!data || data.length === 0) {
    console.warn('⚠️ [Assignment Inventory] No se insertaron items en assignment_inventory. assignmentId:', assignmentId, 'itemsToInsert:', itemsToInsert);
  }
  console.log('✅ [Assignment Inventory] Items creados:', data?.length, 'para assignmentId:', assignmentId);
  return data || [];
}

// Obtener inventario de una asignación
export async function getAssignmentInventory(assignmentId: string) {
  try {
    console.log('📦 [Assignment Inventory] Obteniendo para asignación:', assignmentId);
    const supabase = getSupabaseClient();
    
    // Primero obtener la casa de la asignación
    const { data: assignment, error: assignmentError } = await (supabase
      .from('calendar_assignments') as any)
      .select('house, employee')
      .eq('id', assignmentId)
      .single();
    
    if (assignmentError || !assignment) {
      console.error('❌ [Assignment Inventory] Error obteniendo asignación:', assignmentError);
      return [];
    }
    
    console.log('🏠 [Assignment Inventory] Casa:', assignment.house);
    
    // Obtener inventario de la casa desde la tabla inventory
    const { data, error } = await (supabase
      .from('inventory') as any)
      .select('*')
      .eq('house', assignment.house)
      .order('location', { ascending: true });

    if (error) {
      console.error('❌ [Assignment Inventory] Error:', error);
      return [];
    }
    
    // Mapear campos de inventory a los campos que espera el Dashboard
    const mappedData = (data || []).map((item: any) => ({
      id: item.id,
      item_name: item.name || item.item_name,
      category: item.category || item.location || 'Sin categoría',
      is_complete: item.complete || false,
      notes: item.notes || null,
      checked_by: null,
      checked_at: null,
      house: item.house,
      calendar_assignment_id: assignmentId
    }));
    
    console.log('✅ [Assignment Inventory] Items obtenidos:', mappedData.length);
    return mappedData;
  } catch (error) {
    console.error('❌ [Assignment Inventory] Exception:', error);
    return [];
  }
}

// Actualizar item de inventario
export async function updateAssignmentInventoryItem(itemId: string, isComplete: boolean, notes?: string, checkedBy?: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await (supabase
    .from('inventory') as any)
    .update({
      complete: isComplete,
      notes: notes || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', itemId)
    .select();

  if (error) {
    console.error('❌ [Assignment Inventory] Error updating:', error);
    return null;
  }
  return data?.[0] || null;
}

// Suscribirse a cambios en inventario de asignación
export function subscribeToAssignmentInventory(assignmentId: string, callback: (data: any) => void) {
  try {
    console.log('📦 [Assignment Inventory] Iniciando suscripción:', assignmentId);
    const supabase = getSupabaseClient();

    const channel = supabase
      .channel(`inventory-${assignmentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'assignment_inventory',
          filter: `calendar_assignment_id=eq.${assignmentId}`
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

// CRUD para inventory_template (manager edita el template)
export async function createInventoryTemplateItem(item: any, house: string = 'HYNTIBA2 APTO 406') {
  const supabase = getSupabaseClient();
  const { data, error } = await (supabase
    .from('inventory_template') as any)
    .insert([{
      house: house,
      item_name: item.item_name,
      quantity: item.quantity,
      category: item.category
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
  const supabase = getSupabaseClient();
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
    console.error('Error adding shopping list item:', error);
    return null;
  }
  return data?.[0] || null;
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
