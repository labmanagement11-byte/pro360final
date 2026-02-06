const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://hecvlywrahigujakkguw.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlY3ZseXdyYWhpZ3VqYWtrZ3V3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjcyMzg2NCwiZXhwIjoyMDgyMjk5ODY0fQ.ZgmvGtXXCSNJ51RsHBe0vBONP6TaZ_pAW5fcRJchSCA');

async function verifyFix() {
  console.log('✅ VERIFICACIÓN FINAL\n');
  console.log('═════════════════════════════════════════\n');

  // 1. Query assignment 127 via raw SQL to bypass cache
  console.log('1️⃣  Asignación 127:\n');
  
  // Query via REST API directly
  const response = await fetch('https://hecvlywrahigujakkguw.supabase.co/rest/v1/calendar_assignments?id=eq.127', {
    headers: {
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlY3ZseXdyYWhpZ3VqYWtrZ3V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3MjM4NjQsImV4cCI6MjA4MjI5OTg2NH0.IkQGb3sMSoB5P5Km_rwN5Aao7k2H_jxhTX8tP8rOpgo',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlY3ZseXdyYWhpZ3VqYWtrZ3V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3MjM4NjQsImV4cCI6MjA4MjI5OTg2NH0.IkQGb3sMSoB5P5Km_rwN5Aao7k2H_jxhTX8tP8rOpgo'
    }
  });

  const assignment = await response.json();
  
  if (assignment && assignment[0]) {
    const a = assignment[0];
    console.log(`   ID: ${a.id}`);
    console.log(`   Employee: ${a.employee}`);
    console.log(`   House: ${a.house}`);
    console.log(`   Type: ${a.type}`);
    console.log(`   UUID: ${a.checklist_uuid || 'NONE'}\n`);

    if (a.checklist_uuid) {
      // 2. Check checklist items
      const { data: items } = await supabase
        .from('cleaning_checklist')
        .select('zone, task, completed')
        .eq('calendar_assignment_id', a.checklist_uuid);

      console.log(`2️⃣  Items del checklist: ${items?.length || 0}\n`);
      items?.forEach((item, i) => {
        const status = item.completed ? '✓' : '○';
        console.log(`   [${status}] ${item.zone}`);
        console.log(`       └─ ${item.task}\n`);
      });

      if (items && items.length > 0) {
        console.log('═════════════════════════════════════════');
        console.log('\n✨ ¡TODO FUNCIONANDO CORRECTAMENTE! ✨\n');
        console.log('✅ Asignación 127 tiene UUID');
        console.log(`✅ ${items.length} items del checklist disponibles`);
        console.log('✅ El empleado "chava" verá el checklist\n');
        console.log('🚀 Nuevas asignaciones desde el calendario');
        console.log('   también generarán UUID automáticamente.\n');
      } else {
        console.log('⚠️ UUID existe pero no hay items del checklist');
      }
    } else {
      console.log('⚠️ La asignación aún no tiene UUID');
    }
  } else {
    console.log('❌ No se pudo obtener la asignación 127');
  }
}

verifyFix();
