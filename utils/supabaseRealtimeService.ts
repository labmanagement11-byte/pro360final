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
export async function createCleaningChecklistItems(assignmentId: string, employee: string, house: string = 'EPIC D1') {
  const supabase = getSupabaseClient();
  
  // Items predeterminados del checklist por zona
  const checklistItems = [
    { zone: 'Cocina', task: 'Limpiar mostrador', order: 1 },
    { zone: 'Cocina', task: 'Limpiar estufa', order: 2 },
    { zone: 'Cocina', task: 'Limpiar refrigerador', order: 3 },
    { zone: 'Cocina', task: 'Barrer y trapear piso', order: 4 },
    
    { zone: 'Baños', task: 'Limpiar espejo', order: 1 },
    { zone: 'Baños', task: 'Limpiar inodoro y urinario', order: 2 },
    { zone: 'Baños', task: 'Limpiar ducha/tina', order: 3 },
    { zone: 'Baños', task: 'Trapear piso', order: 4 },
    
    { zone: 'Salas', task: 'Limpiar muebles', order: 1 },
    { zone: 'Salas', task: 'Vaciar basura', order: 2 },
    { zone: 'Salas', task: 'Trapear piso', order: 3 },
    { zone: 'Salas', task: 'Desempolvar', order: 4 },
    
    { zone: 'Dormitorios', task: 'Cambiar sábanas', order: 1 },
    { zone: 'Dormitorios', task: 'Desempolvar', order: 2 },
    { zone: 'Dormitorios', task: 'Pasar aspiradora', order: 3 },
    { zone: 'Dormitorios', task: 'Limpiar espejos', order: 4 }
  ];

  const itemsToInsert = checklistItems.map(item => ({
    calendar_assignment_id: assignmentId,
    employee: employee,
    house: house,
    zone: item.zone,
    task: item.task,
    completed: false,
    order_num: item.order
  }));

  const { data, error } = await (supabase
    .from('cleaning_checklist') as any)
    .insert(itemsToInsert)
    .select();

  if (error) {
    console.error('Error creating checklist items:', error);
    return [];
  }
  return data || [];
}

export async function getCleaningChecklistItems(assignmentId: string) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('cleaning_checklist') as any)
      .select('*')
      .eq('calendar_assignment_id', assignmentId)
      .order('zone', { ascending: true })
      .order('order_num', { ascending: true });

    if (error) {
      console.error('Error fetching checklist items:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Exception fetching checklist items:', error);
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
