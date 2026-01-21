import { getSupabaseClient } from './supabaseClient';

// ==================== TAREAS ====================
export async function createTask(task: any) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('tasks')
    .insert([{
      title: task.title,
      description: task.description,
      assignedTo: task.assignedTo,
      type: task.type,
      house: task.house || 'EPIC D1',
      completed: false,
      createdBy: task.createdBy,
      createdAt: new Date().toISOString()
    }])
    .select();
  
  if (error) {
    console.error('Error creating task:', error);
    return null;
  }
  return data?.[0] || null;
}

export async function getTasks(house: string = 'EPIC D1') {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('house', house)
    .order('createdAt', { ascending: false });
  
  if (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }
  return data || [];
}

export async function updateTask(taskId: string, updates: any) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('tasks')
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
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);
  
  if (error) {
    console.error('Error deleting task:', error);
    return false;
  }
  return true;
}

export function subscribeToTasks(house: string = 'EPIC D1', callback: (data: any[]) => void) {
  const supabase = getSupabaseClient();
  const subscription = supabase
    .from('tasks')
    .on('*', (payload) => {
      if (payload.new?.house === house || payload.old?.house === house) {
        callback(payload);
      }
    })
    .subscribe();
  
  return subscription;
}

// ==================== CHECKLIST ITEMS ====================
export async function createChecklistItem(item: any) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('checklist_items')
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
  const { data, error } = await supabase
    .from('checklist_items')
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
  const { data, error } = await supabase
    .from('checklist_items')
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
  const subscription = supabase
    .from('checklist_items')
    .on('*', (payload) => {
      if (payload.new?.taskId === taskId || payload.old?.taskId === taskId) {
        callback(payload);
      }
    })
    .subscribe();
  
  return subscription;
}

// ==================== INVENTARIO ====================
export async function createInventoryItem(item: any) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('inventory')
    .insert([{
      name: item.name,
      quantity: item.quantity,
      location: item.location,
      complete: true,
      notes: '',
      house: item.house || 'EPIC D1',
      createdAt: new Date().toISOString()
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
  const { data, error } = await supabase
    .from('inventory')
    .update({
      ...updates,
      updatedAt: new Date().toISOString()
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
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .eq('house', house);
  
  if (error) {
    console.error('Error fetching inventory:', error);
    return [];
  }
  return data || [];
}

export async function deleteInventoryItem(itemId: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('inventory')
    .delete()
    .eq('id', itemId);
  
  if (error) {
    console.error('Error deleting inventory item:', error);
    return false;
  }
  return true;
}

export function subscribeToInventory(house: string = 'EPIC D1', callback: (data: any) => void) {
  const supabase = getSupabaseClient();
  const subscription = supabase
    .from('inventory')
    .on('*', (payload) => {
      if (payload.new?.house === house || payload.old?.house === house) {
        callback(payload);
      }
    })
    .subscribe();
  
  return subscription;
}

// ==================== CALENDAR ASSIGNMENTS ====================
export async function createCalendarAssignment(assignment: any) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('calendar_assignments')
    .insert([{
      employee: assignment.employee,
      date: assignment.date,
      time: assignment.time,
      type: assignment.type,
      house: assignment.house || 'EPIC D1',
      createdAt: new Date().toISOString()
    }])
    .select();
  
  if (error) {
    console.error('Error creating calendar assignment:', error);
    return null;
  }
  return data?.[0] || null;
}

export async function getCalendarAssignments(house: string = 'EPIC D1', employee?: string) {
  const supabase = getSupabaseClient();
  let query = supabase
    .from('calendar_assignments')
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
}

export async function updateCalendarAssignment(assignmentId: string, updates: any) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('calendar_assignments')
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
  const { error } = await supabase
    .from('calendar_assignments')
    .delete()
    .eq('id', assignmentId);
  
  if (error) {
    console.error('Error deleting calendar assignment:', error);
    return false;
  }
  return true;
}

export function subscribeToCalendarAssignments(house: string = 'EPIC D1', employee?: string, callback: (data: any) => void) {
  const supabase = getSupabaseClient();
  const subscription = supabase
    .from('calendar_assignments')
    .on('*', (payload) => {
      const newHouse = payload.new?.house === house;
      const oldHouse = payload.old?.house === house;
      const matchesEmployee = !employee || payload.new?.employee === employee || payload.old?.employee === employee;
      
      if ((newHouse || oldHouse) && matchesEmployee) {
        callback(payload);
      }
    })
    .subscribe();
  
  return subscription;
}

// ==================== SHOPPING LIST ====================
export async function getShoppingList(house: string = 'EPIC D1') {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('shopping_list')
    .select('*')
    .eq('house', house)
    .eq('completed', false)
    .order('createdAt', { ascending: false });
  
  if (error) {
    console.error('Error fetching shopping list:', error);
    return [];
  }
  return data || [];
}

export function subscribeToShoppingList(house: string = 'EPIC D1', callback: (data: any) => void) {
  const supabase = getSupabaseClient();
  const subscription = supabase
    .from('shopping_list')
    .on('*', (payload) => {
      if (payload.new?.house === house || payload.old?.house === house) {
        callback(payload);
      }
    })
    .subscribe();
  
  return subscription;
}

// ==================== Unsubscribe Helper ====================
export function unsubscribeFromAll(subscriptions: any[]) {
  subscriptions.forEach(sub => {
    if (sub) {
      sub?.unsubscribe?.();
    }
  });
}
