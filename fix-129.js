const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://hecvlywrahigujakkguw.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlY3ZseXdyYWhpZ3VqYWtrZ3V3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjcyMzg2NCwiZXhwIjoyMDgyMjk5ODY0fQ.ZgmvGtXXCSNJ51RsHBe0vBONP6TaZ_pAW5fcRJchSCA');

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const LIMPIEZA_PROFUNDA = {
  'LIMPIEZA PROFUNDA': [
    'Lavar los forros de los muebles (sofás, sillas y cojines).',
    'Limpiar todas las ventanas y ventanales de la casa, por dentro y por fuera.',
    'Limpiar con hidrolavadora el piso exterior, incluyendo escaleras, terraza y placas vehiculares.',
    'Lavar la caneca grande de basura ubicada debajo de la escalera.',
    'Limpiar las paredes y los guardaescobas de toda la casa.'
  ]
};

async function fixAssignment129() {
  console.log('🔧 REPARANDO ASIGNACIÓN 129\n');
  console.log('═════════════════════════════════════════\n');

  const uuid = generateUUID();
  console.log(`✨ UUID generado: ${uuid}\n`);

  // Create checklist items
  const items = [];
  let orderNum = 0;

  Object.entries(LIMPIEZA_PROFUNDA).forEach(([zone, tasks]) => {
    tasks.forEach(task => {
      items.push({
        calendar_assignment_id: uuid,
        employee: 'chava',
        house: 'HYNTIBA2 APTO 406',
        zone: zone,
        task: task,
        completed: false,
        order_num: orderNum++
      });
    });
  });

  console.log(`📝 Creando ${items.length} items del checklist...\n`);

  const { data: inserted, error } = await supabase
    .from('cleaning_checklist')
    .insert(items)
    .select();

  if (error) {
    console.log('❌ Error:', error.message);
    return;
  }

  console.log(`✅ ${inserted.length} items creados:\n`);
  inserted.forEach(item => {
    console.log(`   [○] ${item.task.substring(0, 60)}...`);
  });

  console.log('\n═════════════════════════════════════════');
  console.log('\n📝 EJECUTA ESTE SQL EN SUPABASE:\n');
  console.log(`UPDATE calendar_assignments SET checklist_uuid = '${uuid}' WHERE id = 129;\n`);
  console.log('═════════════════════════════════════════\n');
}

fixAssignment129();
