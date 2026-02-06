const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://hecvlywrahigujakkguw.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlY3ZseXdyYWhpZ3VqYWtrZ3V3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjcyMzg2NCwiZXhwIjoyMDgyMjk5ODY0fQ.ZgmvGtXXCSNJ51RsHBe0vBONP6TaZ_pAW5fcRJchSCA');

async function verify() {
  console.log('🔍 VERIFICANDO ASSIGNMENT 129\n');
  
  // 1. Verificar assignment 129
  const { data: assignment, error: err1 } = await supabase
    .from('calendar_assignments')
    .select('id, employee, house, type, checklist_uuid')
    .eq('id', 129)
    .single();

  if (err1) {
    console.log('❌ Error fetching assignment:', err1.message);
    return;
  }

  console.log('📋 ASSIGNMENT 129:');
  console.log(`   ID: ${assignment.id}`);
  console.log(`   Employee: ${assignment.employee}`);
  console.log(`   House: ${assignment.house}`);
  console.log(`   Type: ${assignment.type}`);
  console.log(`   UUID: ${assignment.checklist_uuid || 'NULL ❌'}\n`);

  if (!assignment.checklist_uuid) {
    console.log('❌ El assignment NO tiene UUID');
    console.log('   Necesita ejecutar el SQL UPDATE en Supabase\n');
    return;
  }

  // 2. Verificar items del checklist
  const { data: items, error: err2 } = await supabase
    .from('cleaning_checklist')
    .select('*')
    .eq('calendar_assignment_id', assignment.checklist_uuid);

  if (err2) {
    console.log('❌ Error fetching items:', err2.message);
    return;
  }

  console.log(`✅ Items encontrados: ${items.length}\n`);
  
  items.forEach((item, idx) => {
    console.log(`${idx + 1}. [${item.completed ? '✓' : '○'}] ${item.task}`);
  });

  if (items.length === 0) {
    console.log('⚠️ No hay items. Verificando si existen en la BD...\n');
    
    const { data: allItems } = await supabase
      .from('cleaning_checklist')
      .select('calendar_assignment_id, task')
      .limit(10);
    
    console.log('Items en la BD:');
    allItems.forEach(item => {
      console.log(`  UUID: ${item.calendar_assignment_id} | Task: ${item.task}`);
    });
  }
}

verify();
