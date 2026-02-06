const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://hecvlywrahigujakkguw.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlY3ZseXdyYWhpZ3VqYWtrZ3V3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjcyMzg2NCwiZXhwIjoyMDgyMjk5ODY0fQ.ZgmvGtXXCSNJ51RsHBe0vBONP6TaZ_pAW5fcRJchSCA');

async function findCurrentAssignments() {
  console.log('🔍 BUSCANDO ASIGNACIONES ACTIVAS\n');
  console.log('═════════════════════════════════════════\n');

  // Get ALL assignments (any employee)
  const { data: allAssignments } = await supabase
    .from('calendar_assignments')
    .select('*')
    .order('id', { ascending: false })
    .limit(20);

  console.log('📋 Últimas 20 asignaciones en la BD:\n');
  allAssignments?.forEach(a => {
    console.log(`ID: ${a.id} | ${a.employee} | ${a.house}`);
    console.log(`   Type: ${a.type} | Date: ${a.date}`);
    console.log(`   UUID: ${a.checklist_uuid || '❌ NONE'}\n`);
  });

  // Check for chava specifically
  console.log('\n═════════════════════════════════════════');
  console.log('\n🔍 Asignaciones de CHAVA:\n');
  
  const chavaAssignments = allAssignments?.filter(a => a.employee === 'chava');
  
  if (chavaAssignments && chavaAssignments.length > 0) {
    chavaAssignments.forEach(a => {
      console.log(`ID: ${a.id} | ${a.type} | ${a.date}`);
      console.log(`   House: ${a.house}`);
      console.log(`   UUID: ${a.checklist_uuid || '❌ NO UUID'}\n`);
    });
  } else {
    console.log('⚠️ No hay asignaciones activas para chava\n');
  }

  // Check which assignments have no UUID
  const noUUID = allAssignments?.filter(a => !a.checklist_uuid);
  
  if (noUUID && noUUID.length > 0) {
    console.log('\n⚠️ Asignaciones SIN UUID (necesitan reparación):\n');
    noUUID.forEach(a => {
      console.log(`ID: ${a.id} | ${a.employee} | ${a.type} | ${a.date}`);
    });
    console.log('');
  }
}

findCurrentAssignments();
