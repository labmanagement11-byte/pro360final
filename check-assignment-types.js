const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://hecvlywrahigujakkguw.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlY3ZseXdyYWhpZ3VqYWtrZ3V3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjcyMzg2NCwiZXhwIjoyMDgyMjk5ODY0fQ.ZgmvGtXXCSNJ51RsHBe0vBONP6TaZ_pAW5fcRJchSCA');

async function checkAssignments() {
  const { data } = await supabase
    .from('calendar_assignments')
    .select('*')
    .order('id', { ascending: false })
    .limit(5);
  
  console.log('📋 Recent assignments:');
  data?.forEach(a => {
    console.log(`  ID: ${a.id} | Type: ${typeof a.id} | Employee: ${a.employee}`);
  });
}

checkAssignments();
