const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hecvlywrahigujakkguw.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlY3ZseXdyYWhpZ3VqYWtrZ3V3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjcyMzg2NCwiZXhwIjoyMDgyMjk5ODY0fQ.ZgmvGtXXCSNJ51RsHBe0vBONP6TaZ_pAW5fcRJchSCA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debug() {
  console.log('🔍 CHECKING ASSIGNMENT ID TYPES\n');

  try {
    // Get latest assignment
    const { data: assignments } = await supabase
      .from('calendar_assignments')
      .select('id, employee, house, type, created_at')
      .order('created_at', { ascending: false })
      .limit(1);

    if (assignments && assignments.length > 0) {
      const a = assignments[0];
      console.log('Latest assignment:');
      console.log(`  ID: ${a.id} (type: ${typeof a.id})`);
      console.log(`  Employee: ${a.employee}`);
      console.log(`  Type: ${a.type}`);

      // Now check cleaning_checklist for this ID
      console.log(`\n🔍 Searching for items with assignment ID = ${a.id}:`);
      const { data: items, error } = await supabase
        .from('cleaning_checklist')
        .select('id, task, calendar_assignment_id')
        .eq('calendar_assignment_id', a.id)
        .limit(5);

      if (error) {
        console.log('Error:', error.message);
      } else {
        console.log(`Items found: ${items?.length || 0}`);
        items?.forEach(item => {
          console.log(`  - ${item.task?.substring(0, 50)} | Assignment ID: ${item.calendar_assignment_id}`);
        });
      }
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

debug();
