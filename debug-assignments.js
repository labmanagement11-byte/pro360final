const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://hecvlywrahigujakkguw.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlY3ZseXdyYWhpZ3VqYWtrZ3V3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjcyMzg2NCwiZXhwIjoyMDgyMjk5ODY0fQ.ZgmvGtXXCSNJ51RsHBe0vBONP6TaZ_pAW5fcRJchSCA');

async function debugAssignments() {
  console.log('🔍 DIAGNÓSTICO DE ASIGNACIONES\n');
  console.log('═════════════════════════════════════════\n');

  // 1. Check all recent assignments
  console.log('1️⃣  Últimas asignaciones en calendar_assignments:\n');
  const { data: assignments } = await supabase
    .from('calendar_assignments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  assignments?.forEach(a => {
    console.log(`ID: ${a.id} | Employee: ${a.employee} | House: ${a.house} | Type: ${a.type}`);
    console.log(`   UUID: ${a.checklist_uuid || 'NO UUID'} | Date: ${a.date}\n`);
  });

  // 2. Check which assignments have checklist items
  console.log('\n2️⃣  Asignaciones con items de checklist:\n');
  const { data: itemGroups } = await supabase
    .from('cleaning_checklist')
    .select('calendar_assignment_id, employee, house, zone')
    .order('calendar_assignment_id', { ascending: false })
    .limit(50);

  const grouped = {};
  itemGroups?.forEach(item => {
    const key = item.calendar_assignment_id;
    if (!grouped[key]) {
      grouped[key] = { uuid: key, employee: item.employee, house: item.house, count: 0 };
    }
    grouped[key].count++;
  });

  Object.values(grouped).forEach(g => {
    console.log(`UUID: ${g.uuid.substring(0, 20)}... | ${g.house} | ${g.employee} | ${g.count} items`);
  });

  // 3. Check assignments by house
  console.log('\n\n3️⃣  Asignaciones por casa:\n');
  
  // EPIC D1
  const { data: epicAssignments } = await supabase
    .from('calendar_assignments')
    .select('id, employee, type, date, checklist_uuid')
    .eq('house', 'EPIC D1')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('EPIC D1:');
  epicAssignments?.forEach(a => {
    console.log(`  ID: ${a.id} | ${a.employee} | UUID: ${a.checklist_uuid || 'NONE'}`);
  });

  // HYNTIBA2
  const { data: hyntibaAssignments } = await supabase
    .from('calendar_assignments')
    .select('id, employee, type, date, checklist_uuid')
    .eq('house', 'HYNTIBA2 APTO 406')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('\nHYNTIBA2 APTO 406:');
  hyntibaAssignments?.forEach(a => {
    console.log(`  ID: ${a.id} | ${a.employee} | UUID: ${a.checklist_uuid || 'NONE'}`);
  });

  // 4. Check inventory assignments
  console.log('\n\n4️⃣  Assignment Inventory:\n');
  const { data: inventoryAssignments } = await supabase
    .from('assignment_inventory')
    .select('assignment_id, employee, house')
    .order('assignment_id', { ascending: false })
    .limit(10);

  inventoryAssignments?.forEach(inv => {
    console.log(`  Assignment: ${inv.assignment_id} | ${inv.employee} | ${inv.house}`);
  });

  console.log('\n═════════════════════════════════════════');
}

debugAssignments();
