const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://hecvlywrahigujakkguw.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlY3ZseXdyYWhpZ3VqYWtrZ3V3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjcyMzg2NCwiZXhwIjoyMDgyMjk5ODY0fQ.ZgmvGtXXCSNJ51RsHBe0vBONP6TaZ_pAW5fcRJchSCA');

async function checkAssignment127() {
  console.log('🔍 VERIFICANDO ASIGNACIÓN 127 EN DETALLE\n');
  
  console.log('1️⃣  Verificando items del checklist con UUID:\n');
  
  const uuids = [
    '36e92ee9-bb56-482a-9620-5070e0946471', // El que generamos para 127
    'bd068b93-8489-402b-ba2b-f702da285795', // Assignment 125
  ];

  for (const uuid of uuids) {
    const { data: items, error } = await supabase
      .from('cleaning_checklist')
      .select('id, zone, task, calendar_assignment_id')
      .eq('calendar_assignment_id', uuid);

    if (items && items.length > 0) {
      console.log(`✅ UUID ${uuid.substring(0, 20)}...`);
      console.log(`   ${items.length} items encontrados:`);
      items.forEach(item => {
        console.log(`   - ${item.zone}: ${item.task.substring(0, 40)}...`);
      });
      console.log('');
    }
  }

  // Verificar qué asignaciones de chava existen
  console.log('\n2️⃣  Todas las asignaciones de CHAVA:\n');
  const { data: chavaAssignments } = await supabase
    .from('calendar_assignments')
    .select('id, date, type, house, checklist_uuid')
    .eq('employee', 'chava')
    .order('id', { ascending: false })
    .limit(5);

  chavaAssignments?.forEach(a => {
    console.log(`ID: ${a.id} | ${a.type} | ${a.date}`);
    console.log(`   House: ${a.house}`);
    console.log(`   UUID: ${a.checklist_uuid || 'NONE'}\n`);
  });
}

checkAssignment127();
