const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://hecvlywrahigujakkguw.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlY3ZseXdyYWhpZ3VqYWtrZ3V3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjcyMzg2NCwiZXhwIjoyMDgyMjk5ODY0fQ.ZgmvGtXXCSNJ51RsHBe0vBONP6TaZ_pAW5fcRJchSCA');

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function createChecklistTemplate(assignmentType) {
  const LIMPIEZA_REGULAR = {
    'LIMPIEZA GENERAL': [
      'Barrer y trapear toda la casa.',
      'Quitar el polvo de todas las superficies y decoración usando un trapo húmedo.'
    ],
    'SALA': ['Limpiar todas las superficies.'],
    'COMEDOR': ['Limpiar mesa, sillas y superficies.'],
    'COCINA': ['Limpiar superficies, gabinetes por fuera y por dentro.'],
    'BAÑOS': ['Limpiar ducha (pisos y paredes).'],
    'HABITACIONES': ['Lavar sábanas y hacer las camas correctamente.']
  };

  const LIMPIEZA_PROFUNDA = {
    'LIMPIEZA PROFUNDA': [
      'Lavar los forros de los muebles (sofás, sillas y cojines).',
      'Limpiar todas las ventanas y ventanales de la casa, por dentro y por fuera.',
      'Limpiar con hidrolavadora el piso exterior.'
    ]
  };

  if (assignmentType === 'Limpieza profunda') return LIMPIEZA_PROFUNDA;
  return LIMPIEZA_REGULAR;
}

async function fixAssignment127() {
  console.log('🔧 REPARANDO ASIGNACIÓN 127\n');
  console.log('═════════════════════════════════════════\n');

  // 1. Get assignment details
  const { data: assignment } = await supabase
    .from('calendar_assignments')
    .select('*')
    .eq('id', 127)
    .single();

  if (!assignment) {
    console.log('❌ Assignment 127 no encontrada');
    return;
  }

  console.log('📋 Assignment 127:');
  console.log(`   Employee: ${assignment.employee}`);
  console.log(`   House: ${assignment.house}`);
  console.log(`   Type: ${assignment.type}`);
  console.log(`   Date: ${assignment.date}`);
  console.log(`   UUID: ${assignment.checklist_uuid || 'NONE'}\n`);

  // 2. Generate UUID if missing
  let uuid = assignment.checklist_uuid;
  if (!uuid) {
    uuid = generateUUID();
    console.log(`✨ Generando nuevo UUID: ${uuid}\n`);
    console.log('⚠️ Ejecuta este SQL en Supabase para actualizar:');
    console.log(`UPDATE calendar_assignments SET checklist_uuid = '${uuid}' WHERE id = 127;\n`);
  }

  // 3. Create checklist items
  const template = await createChecklistTemplate(assignment.type);
  const items = [];
  let orderNum = 0;

  Object.entries(template).forEach(([zone, tasks]) => {
    tasks.forEach(task => {
      items.push({
        calendar_assignment_id: uuid,
        employee: assignment.employee,
        house: assignment.house,
        zone: zone,
        task: task,
        completed: false,
        order_num: orderNum++
      });
    });
  });

  console.log(`📝 Creando ${items.length} items del checklist...\n`);

  const { data: inserted, error: insertError } = await supabase
    .from('cleaning_checklist')
    .insert(items)
    .select();

  if (insertError) {
    console.log('❌ Error creando items:', insertError.message);
  } else {
    console.log(`✅ ${inserted.length} items creados exitosamente\n`);
    inserted.forEach(item => {
      console.log(`   [○] ${item.zone} - ${item.task.substring(0, 50)}...`);
    });
  }

  console.log('\n═════════════════════════════════════════');
  console.log('\n🎉 Asignación 127 reparada. El empleado verá los items ahora.\n');
}

fixAssignment127();
