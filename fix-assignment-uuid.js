const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://hecvlywrahigujakkguw.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlY3ZseXdyYWhpZ3VqYWtrZ3V3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjcyMzg2NCwiZXhwIjoyMDgyMjk5ODY0fQ.ZgmvGtXXCSNJ51RsHBe0vBONP6TaZ_pAW5fcRJchSCA');

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function fixAssignmentID() {
  const assignmentUUID = generateUUID();
  console.log(`Generated UUID for assignment 125: ${assignmentUUID}\n`);

  const items = [
    { zone: 'LIMPIEZA GENERAL', task: 'Barrer y trapear toda la casa.', orderNum: 0 },
    { zone: 'LIMPIEZA GENERAL', task: 'Quitar el polvo de todas las superficies y decoración usando un trapo húmedo.', orderNum: 1 },
    { zone: 'SALA', task: 'Limpiar todas las superficies.', orderNum: 2 },
    { zone: 'COMEDOR', task: 'Limpiar mesa, sillas y superficies.', orderNum: 3 },
    { zone: 'COCINA', task: 'Limpiar superficies, gabinetes por fuera y por dentro.', orderNum: 4 },
    { zone: 'BAÑOS', task: 'Limpiar ducha (pisos y paredes).', orderNum: 5 },
    { zone: 'HABITACIONES', task: 'Lavar sábanas y hacer las camas correctamente.', orderNum: 6 }
  ];

  const checklistItems = items.map(item => ({
    calendar_assignment_id: assignmentUUID,
    employee: 'chava',
    house: 'HYNTIBA2 APTO 406',
    zone: item.zone,
    task: item.task,
    completed: false,
    completed_by: null,
    completed_at: null,
    order_num: item.orderNum
  }));

  const { data, error } = await supabase
    .from('cleaning_checklist')
    .insert(checklistItems)
    .select();

  if (error) {
    console.log('❌ Error inserting items:', error);
  } else {
    console.log(`✅ Created ${data?.length || 0} items for assignment 125`);
    console.log(`\n📝 Items are now accessible via UUID: ${assignmentUUID}\n`);
    console.log('However, the Checklist component uses numeric ID 125 from calendar_assignments.');
    console.log('\n🔧 Solution: Update the component to:');
    console.log('1. Store the UUID along with numeric ID when creating assignments');
    console.log('2. Or modify calendar_assignments table structure to use UUID as primary key');
  }
}

fixAssignmentID();
