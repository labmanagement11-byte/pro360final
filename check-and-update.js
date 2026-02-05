const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://hecvlywrahigujakkguw.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlY3ZseXdyYWhpZ3VqYWtrZ3V3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjcyMzg2NCwiZXhwIjoyMDgyMjk5ODY0fQ.ZgmvGtXXCSNJ51RsHBe0vBONP6TaZ_pAW5fcRJchSCA');

async function testQuery() {
  console.log('🔍 Checking if calendar_assignments has checklist_uuid column...\n');
  
  // Try to fetch and see the structure
  const { data, error } = await supabase
    .from('calendar_assignments')
    .select('*')
    .limit(1);
  
  if (error) {
    console.log('❌ Error:', error);
  } else {
    console.log('✅ Query succeeded');
    console.log('Columns in calendar_assignments:');
    console.log(data && data.length > 0 ? Object.keys(data[0]) : 'No data');
    
    // If checklist_uuid exists, update assignment 125
    if (data && data.length > 0 && 'checklist_uuid' in data[0]) {
      console.log('\n✅ checklist_uuid column exists!\n');
      
      const checklistUUID = 'bd068b93-8489-402b-ba2b-f702da285795';
      const { data: updated, error: updateError } = await supabase
        .from('calendar_assignments')
        .update({ checklist_uuid: checklistUUID })
        .eq('id', 125)
        .select();
      
      if (updateError) {
        console.log('❌ Update error:', updateError);
      } else {
        console.log(`✅ Updated assignment 125 with UUID: ${checklistUUID}`);
      }
    } else {
      console.log('\n⚠️ checklist_uuid column NOT found');
      console.log('Run this in Supabase SQL Editor:');
      console.log('ALTER TABLE calendar_assignments ADD COLUMN checklist_uuid UUID;');
    }
  }
}

testQuery();
