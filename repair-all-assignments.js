const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://hecvlywrahigujakkguw.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlY3ZseXdyYWhpZ3VqYWtrZ3V3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjcyMzg2NCwiZXhwIjoyMDgyMjk5ODY0fQ.ZgmvGtXXCSNJ51RsHBe0vBONP6TaZ_pAW5fcRJchSCA');

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

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
    'Limpiar con hidrolavadora el piso exterior, incluyendo escaleras, terraza y placas vehiculares.',
    'Lavar la caneca grande de basura ubicada debajo de la escalera.',
    'Limpiar las paredes y los guardaescobas de toda la casa.'
  ]
};

async function repairAllAssignments() {
  console.log('🔧 REPARACIÓN AUTOMÁTICA DE ASIGNACIONES\n');
  console.log('═════════════════════════════════════════\n');

  // Get all assignments without UUID
  const { data: assignments, error: fetchError } = await supabase
    .from('calendar_assignments')
    .select('*');

  if (fetchError) {
    console.log('❌ Error fetching assignments:', fetchError.message);
    return;
  }

  // Filter manually for null/undefined checklist_uuid
  const assignmentsWithoutUUID = assignments.filter(a => !a.checklist_uuid);

  if (!assignmentsWithoutUUID || assignmentsWithoutUUID.length === 0) {
    console.log('✅ No hay asignaciones que reparar\n');
    return;
  }

  console.log(`📋 Encontradas ${assignmentsWithoutUUID.length} asignaciones sin UUID\n`);

  const sqlCommands = [];

  for (const assignment of assignmentsWithoutUUID) {
    const uuid = generateUUID();
    console.log(`\n🔧 Assignment ${assignment.id} (${assignment.employee}):`);
    console.log(`   Type: ${assignment.type}`);
    console.log(`   UUID: ${uuid}`);

    // Select template
    const template = assignment.type === 'Limpieza profunda' ? LIMPIEZA_PROFUNDA : LIMPIEZA_REGULAR;
    
    // Create items
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

    // Insert items
    const { data: inserted, error } = await supabase
      .from('cleaning_checklist')
      .insert(items)
      .select();

    if (error) {
      console.log(`   ❌ Error: ${error.message}`);
    } else {
      console.log(`   ✅ ${inserted.length} items creados`);
      sqlCommands.push(`UPDATE calendar_assignments SET checklist_uuid = '${uuid}' WHERE id = ${assignment.id};`);
    }
  }

  console.log('\n\n═════════════════════════════════════════');
  console.log('\n📝 EJECUTA ESTOS SQL EN SUPABASE:\n');
  sqlCommands.forEach(sql => console.log(sql));
  console.log('\n═════════════════════════════════════════\n');
}

repairAllAssignments();
