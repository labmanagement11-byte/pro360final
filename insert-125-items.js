const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hecvlywrahigujakkguw.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlY3ZseXdyYWhpZ3VqYWtrZ3V3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjcyMzg2NCwiZXhwIjoyMDgyMjk5ODY0fQ.ZgmvGtXXCSNJ51RsHBe0vBONP6TaZ_pAW5fcRJchSCA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createItems() {
  console.log('🧹 Creating items for assignment 125\n');

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
    calendar_assignment_id: '125',
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
    console.log('❌ Error:', error);
  } else {
    console.log(`✅ Created ${data?.length || 0} items for assignment 125`);
  }
}

createItems();
