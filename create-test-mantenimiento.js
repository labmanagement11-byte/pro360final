require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const today = new Date().toISOString().split('T')[0];
  // Limpiar asignaciones previas de Victor de hoy
  await s.from('calendar_assignments').delete().eq('employee', 'Victor').eq('date', today);
  // Crear nueva tarea de Mantenimiento
  const { data, error } = await s.from('calendar_assignments')
    .insert({ employee: 'Victor', house: 'EPIC D1', type: 'Mantenimiento', date: today, time: '09:00:00', completed: false, notes: null })
    .select();
  if (error) { console.error('Error:', error); process.exit(1); }
  console.log('✅ Creado Mantenimiento ID:', data[0].id);
  console.log(JSON.stringify(data[0], null, 2));
})();
