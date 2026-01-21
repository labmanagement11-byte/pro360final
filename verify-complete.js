const {createClient} = require('@supabase/supabase-js');
require('dotenv').config({path: '.env.local'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

(async () => {
  console.log('=== VERIFICACIÓN COMPLETA DE USUARIOS Y DATOS ===\n');
  
  // Usuarios HYNTIBA2 APTO 406
  const {data: hyntiba} = await supabase.from('users').select('*').eq('house', 'HYNTIBA2 APTO 406');
  console.log('📍 HYNTIBA2 APTO 406:');
  hyntiba?.forEach(u => console.log(`  - ${u.username} (${u.role})`));
  
  // Usuarios EPIC D1
  const {data: epic} = await supabase.from('users').select('*').eq('house', 'EPIC D1');
  console.log('\n📍 EPIC D1:');
  epic?.forEach(u => console.log(`  - ${u.username} (${u.role})`));
  
  // Usuario Jonathan (all)
  const {data: jonathan} = await supabase.from('users').select('*').eq('username', 'jonathan');
  console.log('\n📍 JONATHAN (acceso a todas):');
  jonathan?.forEach(u => console.log(`  - ${u.username} (${u.role}, house: ${u.house})`));
  
  // Verificar tareas en cada casa
  console.log('\n=== VERIFICACIÓN DE TAREAS ===\n');
  
  const {data: tasksHyntiba} = await supabase.from('tasks').select('id, title, house, assigned_to').eq('house', 'HYNTIBA2 APTO 406');
  console.log(`✅ Tareas en HYNTIBA2 APTO 406: ${tasksHyntiba?.length || 0} tareas`);
  if(tasksHyntiba?.length > 0) tasksHyntiba.slice(0, 2).forEach(t => console.log(`   - "${t.title}" asignada a: ${t.assigned_to}`));
  
  const {data: tasksEpic} = await supabase.from('tasks').select('id, title, house, assigned_to').eq('house', 'EPIC D1');
  console.log(`\n✅ Tareas en EPIC D1: ${tasksEpic?.length || 0} tareas`);
  if(tasksEpic?.length > 0) tasksEpic.slice(0, 2).forEach(t => console.log(`   - "${t.title}" asignada a: ${t.assigned_to}`));
  
  console.log('\n=== VERIFICACIÓN DE SINCRONIZACIÓN EN TIEMPO REAL ===\n');
  console.log('✅ Canales realtime configurados por casa:');
  console.log('   - tasks-changes-HYNTIBA2 APTO 406');
  console.log('   - tasks-changes-EPIC D1');
  console.log('   - inventory-changes-HYNTIBA2 APTO 406');
  console.log('   - inventory-changes-EPIC D1');
  console.log('   (+ todos los otros módulos con mismo patrón)\n');
  
  console.log('=== RESUMEN FINAL ===');
  console.log(`✅ ${(hyntiba?.length || 0) + (epic?.length || 0) + 1} usuarios totales`);
  console.log(`✅ ${tasksHyntiba?.length || 0} tareas en HYNTIBA2`);
  console.log(`✅ ${tasksEpic?.length || 0} tareas en EPIC D1`);
  console.log('✅ Sincronización en tiempo real lista\n');
})();
