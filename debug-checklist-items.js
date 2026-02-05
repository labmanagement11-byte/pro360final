const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hecvlywrahigujakkguw.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlY3ZseXdyYWhpZ3VqYWtrZ3V3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjcyMzg2NCwiZXhwIjoyMDgyMjk5ODY0fQ.ZgmvGtXXCSNJ51RsHBe0vBONP6TaZ_pAW5fcRJchSCA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugChecklist() {
  console.log('🔍 DEBUGGING CHECKLIST ITEMS\n');
  console.log('═════════════════════════════════');

  try {
    // 1. Ver todas las asignaciones recientes
    console.log('\n📋 CALENDAR ASSIGNMENTS (últimas 10):');
    const { data: assignments, error: assignmentsError } = await supabase
      .from('calendar_assignments')
      .select('id, employee, house, type, date, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (assignmentsError) {
      console.log('❌ Error:', assignmentsError.message);
    } else {
      console.log(`Total: ${assignments?.length || 0}`);
      assignments?.slice(0, 5).forEach(a => {
        console.log(`  ID: ${a.id} | Employee: ${a.employee} | Type: ${a.type} | House: ${a.house}`);
      });
    }

    // 2. Ver items en cleaning_checklist
    console.log('\n🧹 CLEANING_CHECKLIST (últimos 20):');
    const { data: cleaningItems, error: cleaningError } = await supabase
      .from('cleaning_checklist')
      .select('id, task, zone, calendar_assignment_id_bigint, employee, house, completed')
      .order('created_at', { ascending: false })
      .limit(20);

    if (cleaningError) {
      console.log('❌ Error:', cleaningError.message);
    } else {
      console.log(`Total: ${cleaningItems?.length || 0}`);
      if (cleaningItems && cleaningItems.length > 0) {
        cleaningItems.slice(0, 5).forEach(item => {
          console.log(`  Task: ${item.task?.substring(0, 40)} | Assignment ID: ${item.calendar_assignment_id_bigint} | Employee: ${item.employee}`);
        });
      }
    }

    // 3. Si hay asignaciones recientes, verificar si tienen items
    if (assignments && assignments.length > 0) {
      const latestAssignment = assignments[0];
      console.log(`\n🔍 VERIFICANDO ITEMS PARA ASIGNACIÓN ${latestAssignment.id}:`);
      
      const { data: itemsForAssignment, error: itemsError } = await supabase
        .from('cleaning_checklist')
        .select('*')
        .eq('calendar_assignment_id_bigint', latestAssignment.id);
      
      if (itemsError) {
        console.log('❌ Error:', itemsError.message);
      } else {
        console.log(`Items encontrados: ${itemsForAssignment?.length || 0}`);
        if (itemsForAssignment && itemsForAssignment.length > 0) {
          console.log('✅ Los items SÍ existen en la BD');
          itemsForAssignment.slice(0, 3).forEach(item => {
            console.log(`  - ${item.task}`);
          });
        } else {
          console.log('⚠️ NO hay items para esta asignación en cleaning_checklist');
          
          // Fallback: buscar por employee + house
          const { data: fallbackItems, error: fallbackError } = await supabase
            .from('cleaning_checklist')
            .select('*')
            .eq('employee', latestAssignment.employee)
            .eq('house', latestAssignment.house);
          
          console.log(`\n  Fallback (employee+house): ${fallbackItems?.length || 0} items`);
        }
      }
    }

    console.log('\n✅ Debug completado');
  } catch (err) {
    console.error('Error:', err);
  }
}

debugChecklist();
