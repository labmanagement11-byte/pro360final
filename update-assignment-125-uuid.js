const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://hecvlywrahigujakkguw.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlY3ZseXdyYWhpZ3VqYWtrZ3V3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjcyMzg2NCwiZXhwIjoyMDgyMjk5ODY0fQ.ZgmvGtXXCSNJ51RsHBe0vBONP6TaZ_pAW5fcRJchSCA');

async function updateAssignment() {
  // This is the UUID we generated when creating the items
  const checklistUUID = 'bd068b93-8489-402b-ba2b-f702da285795';
  
  console.log(`📝 Updating assignment 125 with checklist_uuid: ${checklistUUID}\n`);
  
  const { data, error } = await supabase
    .from('calendar_assignments')
    .update({ checklist_uuid: checklistUUID })
    .eq('id', 125)
    .select();
  
  if (error) {
    console.log('⚠️ Error:', error);
    console.log('\n🔧 If checklist_uuid column doesn\'t exist, run this SQL in Supabase:');
    console.log(`ALTER TABLE calendar_assignments ADD COLUMN checklist_uuid UUID;`);
  } else {
    console.log(`✅ Updated! Assignment 125 now linked to checklist UUID: ${checklistUUID}`);
    console.log('\n📋 Checklist items for this UUID should now be visible.');
  }
}

updateAssignment();
