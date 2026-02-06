const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://hecvlywrahigujakkguw.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlY3ZseXdyYWhpZ3VqYWtrZ3V3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjcyMzg2NCwiZXhwIjoyMDgyMjk5ODY0fQ.ZgmvGtXXCSNJ51RsHBe0vBONP6TaZ_pAW5fcRJchSCA');

async function checkAllAssignments() {
  console.log('📋 TODOS LOS ASSIGNMENTS:\n');
  
  const { data: assignments, error } = await supabase
    .from('calendar_assignments')
    .select('id, employee, house, type, date')
    .order('id', { ascending: false });

  if (error) {
    console.log('❌ Error:', error.message);
    return;
  }

  if (!assignments || assignments.length === 0) {
    console.log('⚠️ No hay assignments en la BD\n');
    return;
  }

  console.log(`Total: ${assignments.length} assignments\n`);
  
  assignments.forEach(a => {
    console.log(`ID: ${a.id} | ${a.employee} | ${a.type}`);
    console.log(`   House: ${a.house} | Date: ${a.date}\n`);
  });
}

checkAllAssignments();
