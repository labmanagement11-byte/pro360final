const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const HOUSE_NAME = 'YNTIBA 2 406';

async function createChecklistItems() {
  try {
    console.log(`\n📋 Creando checklist items para: ${HOUSE_NAME}\n`);

    // 1. Obtener las tareas de YNTIBA 2 406
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, title')
      .eq('house', HOUSE_NAME)
      .order('created_at');

    if (tasksError) {
      console.error('❌ Error obteniendo tareas:', tasksError);
      return;
    }

    if (!tasks || tasks.length === 0) {
      console.error('❌ No se encontraron tareas para', HOUSE_NAME);
      return;
    }

    console.log(`✅ ${tasks.length} tareas encontradas:`, tasks.map(t => `${t.id}: ${t.title}`).join(', '));

    // 2. Crear checklist items usando los taskIds reales
    const checklistItems = [
      { task_id: tasks[0]?.id, zona: 'Sala', text: 'Barrer pisos', completed: false, house: HOUSE_NAME, type: 'regular' },
      { task_id: tasks[0]?.id, zona: 'Sala', text: 'Limpiar sofá', completed: false, house: HOUSE_NAME, type: 'regular' },
      { task_id: tasks[0]?.id, zona: 'Comedor', text: 'Limpiar mesas', completed: false, house: HOUSE_NAME, type: 'regular' },
      { task_id: tasks[1]?.id, zona: 'Habitación 1', text: 'Limpiar piso', completed: false, house: HOUSE_NAME, type: 'regular' },
      { task_id: tasks[1]?.id, zona: 'Habitación 2', text: 'Cambiar sábanas', completed: false, house: HOUSE_NAME, type: 'regular' },
      { task_id: tasks[2]?.id, zona: 'Baño Principal', text: 'Limpiar sanitario', completed: false, house: HOUSE_NAME, type: 'regular' },
      { task_id: tasks[2]?.id, zona: 'Baño Principal', text: 'Limpiar espejo', completed: false, house: HOUSE_NAME, type: 'regular' },
      { task_id: tasks[2]?.id, zona: 'Baño Secundario', text: 'Limpiar ducha', completed: false, house: HOUSE_NAME, type: 'regular' },
      { task_id: tasks[3]?.id, zona: 'Cocina', text: 'Limpiar encimeras', completed: false, house: HOUSE_NAME, type: 'regular' },
      { task_id: tasks[3]?.id, zona: 'Cocina', text: 'Limpiar estufa', completed: false, house: HOUSE_NAME, type: 'regular' },
      { task_id: tasks[4]?.id, zona: 'Lavandería', text: 'Limpiar lavadora', completed: false, house: HOUSE_NAME, type: 'regular' },
    ];

    const { data: checklistData, error: checklistError } = await supabase
      .from('checklist_items')
      .insert(checklistItems)
      .select();

    if (checklistError) {
      console.error('❌ Error creando checklist items:', checklistError);
      return;
    }

    console.log(`✅ ${checklistItems.length} checklist items creados exitosamente`);
    console.log('📊 Datos insertados:', checklistData);

  } catch (error) {
    console.error('❌ Error general:', error.message);
    process.exit(1);
  }
}

createChecklistItems();
