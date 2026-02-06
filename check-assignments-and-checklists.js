import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkData() {
  console.log('📅 Revisando asignaciones...\n');
  
  const { data: assignments, error: assignError } = await supabase
    .from('calendar_assignments')
    .select('*')
    .order('date', { ascending: true });
  
  if (assignError) {
    console.error('❌ Error:', assignError);
    return;
  }
  
  console.log(`Total asignaciones: ${assignments?.length || 0}\n`);
  
  assignments?.forEach(a => {
    console.log(`ID: ${a.id} | Tipo: ${a.type} | Empleado: ${a.employee} | Casa: ${a.house}`);
  });
  
  console.log('\n\n🧹 Revisando checklist items...\n');
  
  const { data: checklistItems, error: checkError } = await supabase
    .from('cleaning_checklist')
    .select('*')
    .order('calendar_assignment_id', { ascending: true });
  
  if (checkError) {
    console.error('❌ Error:', checkError);
    return;
  }
  
  console.log(`Total items de checklist: ${checklistItems?.length || 0}\n`);
  
  // Agrupar por asignación
  const byAssignment = checklistItems?.reduce((acc, item) => {
    const assignId = item.calendar_assignment_id;
    if (!acc[assignId]) acc[assignId] = [];
    acc[assignId].push(item);
    return acc;
  }, {});
  
  if (byAssignment) {
    Object.entries(byAssignment).forEach(([assignId, items]) => {
      console.log(`\nAsignación ${assignId}: ${items.length} items`);
      items.slice(0, 3).forEach(item => {
        console.log(`  - ${item.task} (${item.zone})`);
      });
      if (items.length > 3) {
        console.log(`  ... y ${items.length - 3} más`);
      }
    });
  } else {
    console.log('⚠️  No hay items en cleaning_checklist');
  }
}

checkData();
