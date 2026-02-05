const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://hecvlywrahigujakkguw.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlY3ZseXdyYWhpZ3VqYWtrZ3V3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjcyMzg2NCwiZXhwIjoyMDgyMjk5ODY0fQ.ZgmvGtXXCSNJ51RsHBe0vBONP6TaZ_pAW5fcRJchSCA');

async function addColumnAndUpdate() {
  console.log('🔧 Adding checklist_uuid column to calendar_assignments...\n');
  
  const { error: columnError } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE calendar_assignments ADD COLUMN checklist_uuid UUID;'
  }).catch(err => ({ error: err }));
  
  if (columnError) {
    console.log('⚠️ Column might already exist, attempting update anyway...\n');
  } else {
    console.log('✅ Column added!\n');
  }
  
  // Now update assignment 125
  const checklistUUID = 'bd068b93-8489-402b-ba2b-f702da285795';
  
  const { data, error } = await supabase
    .from('calendar_assignments')
    .update({ checklist_uuid: checklistUUID })
    .eq('id', 125)
    .select();
  
  if (error) {
    console.log('❌ Error updating:', error);
  } else {
    console.log(`✅ Updated! Assignment 125 now has checklist_uuid: ${checklistUUID}`);
    console.log('\n🎯 Employee "chava" should now see 7 checklist items when opening this assignment!');
  }
}

addColumnAndUpdate();
