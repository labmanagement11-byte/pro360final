import { getSupabaseClient } from './supabaseClient';

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
      house: task.house || 'EPIC D1',
      completed: false,
      created_by: task.createdBy,
      created_at: new Date().toISOString()
    }])
    .select();
  
  if (error) {
    console.error('Error creating task:', error);
    return null;
  }
  return data?.[0] || null;
}

export async function getTasks(house: string = 'EPIC D1') {
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
    return data || [];
  } catch (error) {
    console.error('Exception fetching tasks:', error);
    return [];
  }
}

export async function updateTask(taskId: string, updates: any) {
  const supabase = getSupabaseClient();
  const { data, error } = await (supabase
    .from('tasks') as any)
    .update(updates)
    .eq('id', taskId)
    .select();
  
  if (error) {
    console.error('Error updating task:', error);
    return null;
  }
  return data?.[0] || null;
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

export function subscribeToTasks(house: string = 'EPIC D1', callback: (data: any) => void) {
  try {
    console.log('🔔 [Realtime Service] Iniciando suscripción a tasks para house:', house);
    const supabase = getSupabaseClient();
    
    const channel = supabase
      .channel('tasks-changes')
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
            new: payload.new,
            old: payload.old
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
      house: item.house || 'EPIC D1',
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
      house: item.house || 'EPIC D1',
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

export async function getInventoryItems(house: string = 'EPIC D1') {
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

export function subscribeToInventory(house: string = 'EPIC D1', callback: (data: any) => void) {
  try {
    const supabase = getSupabaseClient();
    
    const channel = supabase
      .channel('inventory-changes')
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
      house: assignment.house || 'EPIC D1',
      created_at: new Date().toISOString()
    }])
    .select();
  
  if (error) {
    console.error('Error creating calendar assignment:', error);
    return null;
  }
  return data?.[0] || null;
}

export async function getCalendarAssignments(house: string = 'EPIC D1', employee?: string) {
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

export function subscribeToCalendarAssignments(house: string = 'EPIC D1', callback: (data: any) => void, employee?: string) {
  try {
    console.log('🔔 [Calendar Service] Iniciando suscripción:', { house, employee });
    const supabase = getSupabaseClient();
    
    let filter = `house=eq.${house}`;
    if (employee) {
      filter += `,employee=eq.${employee}`;
    }
    
    console.log('🔍 [Calendar Service] Filtro aplicado:', filter);
    
    const channel = supabase
      .channel('calendar-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calendar_assignments',
          filter: filter
        },
        (payload: any) => {
          console.log('⚡ [Calendar Service] Evento recibido:', payload);
          
          const mappedPayload = {
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old
          };
          
          console.log('✅ [Calendar Service] Enviando a callback:', mappedPayload);
          callback(mappedPayload);
        }
      )
      .subscribe((status: any) => {
        console.log('📡 [Calendar Service] Estado de suscripción:', status);
      });
    
    console.log('✅ [Calendar Service] Canal creado:', channel);
    return channel;
  } catch (error) {
    console.error('❌ [Calendar Service] Error subscribing to calendar assignments:', error);
    return null;
  }
}

// ==================== SHOPPING LIST ====================
export async function getShoppingList(house: string = 'EPIC D1') {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('shopping_list') as any)
      .select('*')
      .eq('house', house)
      .eq('completed', false)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching shopping list:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Exception fetching shopping list:', error);
    return [];
  }
}

export function subscribeToShoppingList(house: string = 'EPIC D1', callback: (data: any) => void) {
  try {
    const supabase = getSupabaseClient();
    
    const channel = supabase
      .channel('shopping-changes')
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

// ==================== CLEANING CHECKLIST ====================
export async function createCleaningChecklistItems(assignmentId: string, employee: string, assignmentType: string, house: string = 'EPIC D1') {
  const supabase = getSupabaseClient();
  
  console.log('🧹 [Checklist] Iniciando creación de items para asignación:', assignmentId, 'Tipo:', assignmentType);
  
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
        order: index + 1
      });
    });
  });

  console.log('📋 [Checklist] Items a insertar:', checklistItems.length);

  const itemsToInsert = checklistItems.map(item => ({
    calendar_assignment_id: assignmentId,
    employee: employee,
    house: house,
    zone: item.zone,
    task: item.task,
    completed: false,
    order_num: item.order
  }));

  console.log('📝 [Checklist] Items formateados para insertar:', itemsToInsert);

  const { data, error } = await (supabase
    .from('cleaning_checklist') as any)
    .insert(itemsToInsert)
    .select();

  if (error) {
    console.error('❌ [Checklist] Error creating checklist items:', error);
    return [];
  }
  
  console.log('✅ [Checklist] Items creados exitosamente:', data?.length, 'items');
  return data || [];
}

export async function getCleaningChecklistItems(assignmentId: string) {
  try {
    console.log('🧹 [Checklist] Solicitando items para asignación:', assignmentId);
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('cleaning_checklist') as any)
      .select('*')
      .eq('calendar_assignment_id', assignmentId)
      .order('zone', { ascending: true })
      .order('order_num', { ascending: true });

    if (error) {
      console.error('❌ [Checklist] Error fetching checklist items:', error);
      return [];
    }
    console.log('✅ [Checklist] Items obtenidos:', data?.length, 'items');
    console.log('📋 [Checklist] Items:', data);
    return data || [];
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
      completed_at: completed ? new Date().toISOString() : null,
      completed_by: completed ? completedBy : null,
      updated_at: new Date().toISOString()
    })
    .eq('id', itemId)
    .select();

  if (error) {
    console.error('Error updating checklist item:', error);
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
          table: 'cleaning_checklist',
          filter: `calendar_assignment_id=eq.${assignmentId}`
        },
        (payload: any) => {
          console.log('⚡ [Checklist Service] Evento recibido:', payload);
          
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

// ==================== Unsubscribe Helper ====================
export function unsubscribeFromAll(subscriptions: any[]) {
  subscriptions.forEach(sub => {
    if (sub) {
      sub?.unsubscribe?.();
    }
  });
}
