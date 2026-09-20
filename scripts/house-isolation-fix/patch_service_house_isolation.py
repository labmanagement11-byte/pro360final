#!/usr/bin/env python3
"""
- createChecklistFromTemplate: fall back to public.checklist filtered by house
- createHouse: set name + nombre, never copy checklist/inventory
- getInventoryTemplate / createAssignmentInventory: empty house => empty (no default mix)
"""
from pathlib import Path

path = Path('utils/supabaseRealtimeService.ts')
text = path.read_text()

# --- createHouse: set both name and nombre ---
old_ch = '''export async function createHouse(house: any) {
  const supabase = getSupabaseClient();
  const houseName = house.houseName || house.name || '';
  const { data, error } = await (supabase
    .from('houses') as any)
    .insert([{
      nombre: houseName,
      created_at: new Date().toISOString()
    }])
    .select();
  
  if (error) {
    console.error('Error creating house:', error);
    return null;
  }
  return data?.[0] || null;
}'''

new_ch = '''export async function createHouse(house: any) {
  const supabase = getSupabaseClient();
  const houseName = String(house.houseName || house.name || '').trim();
  if (!houseName) {
    console.error('Error creating house: empty name');
    return null;
  }
  // New house starts EMPTY: do NOT copy checklist or inventory from other houses.
  const { data, error } = await (supabase
    .from('houses') as any)
    .insert([{
      name: houseName,
      nombre: houseName,
      created_at: new Date().toISOString()
    }])
    .select();
  
  if (error) {
    console.error('Error creating house:', error);
    return null;
  }
  const created = data?.[0] || null;
  if (created) {
    return { ...created, name: created.nombre || created.name || houseName, houseName: created.nombre || created.name || houseName };
  }
  return null;
}'''

if old_ch in text:
    text = text.replace(old_ch, new_ch, 1)
    print('createHouse patched')
elif 'New house starts EMPTY' in text:
    print('createHouse already patched')
else:
    raise SystemExit('createHouse block not found')

# --- createChecklistFromTemplate with legacy fallback ---
old_tmpl = '''export async function createChecklistFromTemplate(assignmentId: string, taskType: string, employee: string, house: string) {
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
}'''

new_tmpl = '''export async function createChecklistFromTemplate(assignmentId: string, taskType: string, employee: string, house: string) {
  try {
    console.log('📋 Creando checklist desde plantilla:', { assignmentId, taskType, employee, house });
    const supabase = getSupabaseClient();
    const houseName = String(house || '').trim();
    if (!houseName || houseName === 'all') {
      console.warn('⚠️ createChecklistFromTemplate: casa inválida, abortando para evitar mezcla');
      return { success: true, count: 0, items: [] };
    }

    const typeLower = String(taskType || '').toLowerCase();
    const matchType = (assigned: string, room: string) => {
      const a = String(assigned || '').toLowerCase();
      const r = String(room || '').toUpperCase();
      if (typeLower.includes('manten')) {
        return a.includes('manten') || r.includes('MANTEN') || ['ÁREAS VERDES','PISCINA Y AGUA','RUTINA DE MANTENIMIENTO','SISTEMAS ELÉCTRICOS'].includes(r);
      }
      if (typeLower.includes('profund')) {
        return a.includes('profund') || r.includes('PROFUNDA') || r === 'LIMPIEZA PROFUNDA';
      }
      // regular: exclude deep/maint rooms
      if (a.includes('manten') || a.includes('profund')) return false;
      if (r.includes('PROFUNDA') || r.includes('MANTEN') || ['ÁREAS VERDES','PISCINA Y AGUA','RUTINA DE MANTENIMIENTO','SISTEMAS ELÉCTRICOS','LIMPIEZA PROFUNDA'].includes(r)) return false;
      return true;
    };

    let templates: any[] = [];

    // 1) Preferred: checklist_templates for THIS house only
    const { data: modern, error: templateError } = await (supabase
      .from('checklist_templates') as any)
      .select('*')
      .eq('task_type', taskType)
      .eq('house', houseName)
      .eq('active', true)
      .order('order_num', { ascending: true });

    if (!templateError && modern && modern.length > 0) {
      templates = modern;
    } else {
      // 2) Legacy fallback: public.checklist filtered STRICTLY by house + type
      console.warn('⚠️ Usando checklist legacy por casa (checklist_templates ausente o vacío)', templateError?.message || '');
      const { data: legacy, error: legacyError } = await (supabase
        .from('checklist') as any)
        .select('*')
        .eq('house', houseName)
        .order('id', { ascending: true });

      if (legacyError) {
        console.error('❌ Error obteniendo checklist legacy:', legacyError);
        return { success: false, error: legacyError };
      }

      templates = (legacy || [])
        .filter((row: any) => String(row.house || '').trim() === houseName)
        .filter((row: any) => matchType(row.assigned_to || '', row.room || ''))
        .map((row: any, idx: number) => ({
          zone: row.room || 'GENERAL',
          task: row.item,
          order_num: idx + 1,
          house: houseName,
        }));
    }

    if (!templates || templates.length === 0) {
      console.warn(`⚠️ No hay plantillas para ${taskType} en casa ${houseName} (casa vacía = checklist vacío)`);
      return { success: true, count: 0, items: [] };
    }

    console.log(`✅ ${templates.length} plantillas encontradas para ${taskType} @ ${houseName}`);

    const checklistItems = templates.map((template: any) => ({
      calendar_assignment_id: assignmentId,
      employee: employee,
      house: houseName,
      zone: template.zone,
      task: template.task,
      completed: false,
      order_num: template.order_num
    }));

    const { data, error } = await (supabase
      .from('cleaning_checklist') as any)
      .insert(checklistItems)
      .select();

    if (error) {
      console.error('❌ Error insertando checklist:', error);
      return { success: false, error };
    }

    // Defense: only return rows for this house
    const items = (data || []).filter((row: any) => String(row.house || '').trim() === houseName);
    console.log(`✅ ${items.length} items de checklist creados para asignación ${assignmentId} @ ${houseName}`);
    return { success: true, count: items.length, items };

  } catch (error) {
    console.error('❌ Exception en createChecklistFromTemplate:', error);
    return { success: false, error };
  }
}'''

if old_tmpl in text:
    text = text.replace(old_tmpl, new_tmpl, 1)
    print('createChecklistFromTemplate patched')
elif 'Legacy fallback: public.checklist' in text:
    print('createChecklistFromTemplate already patched')
else:
    raise SystemExit('createChecklistFromTemplate not found')

# --- getInventoryTemplate: no default mix for empty houses ---
old_inv = '''    if (!data || data.length === 0) {
      console.warn('⚠️ [Inventory Template] Sin template en DB, usando plantilla por defecto. Casa:', house);
      return DEFAULT_INVENTORY_TEMPLATE.map(item => ({
        ...item,
        house
      }));
    }'''

new_inv = '''    if (!data || data.length === 0) {
      // New / empty house must stay empty — do NOT copy default or other houses.
      console.warn('⚠️ [Inventory Template] Sin template en DB para casa (vacío intencional):', house);
      return [];
    }'''

if old_inv in text:
    text = text.replace(old_inv, new_inv, 1)
    print('getInventoryTemplate empty-house patched')
elif 'vacío intencional' in text:
    print('getInventoryTemplate already patched')
else:
    print('WARN: getInventoryTemplate empty fallback not found')

# Harden getCleaningChecklistItems PASO 2: also require house match on returned rows
old_paso2_return = '''        return filteredItems;
      }
    }

    // PASO 3: Si no hay items en ninguna forma, crear desde plantillas específicas'''

new_paso2_return = '''        return filteredItems.filter((row: any) => String(row.house || '').trim() === String(assignment.house || '').trim());
      }
    }

    // PASO 3: Si no hay items en ninguna forma, crear desde plantillas específicas'''

if old_paso2_return in text:
    text = text.replace(old_paso2_return, new_paso2_return, 1)
    print('getCleaningChecklistItems house filter hardened')
else:
    print('WARN: PASO2 return not patched (maybe already)')

path.write_text(text)
print('supabaseRealtimeService patched OK', path.stat().st_size)
assert 'New house starts EMPTY' in path.read_text()
assert 'Legacy fallback: public.checklist' in path.read_text()
