const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://hecvlywrahigujakkguw.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlY3ZseXdyYWhpZ3VqYWtrZ3V3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjcyMzg2NCwiZXhwIjoyMDgyMjk5ODY0fQ.ZgmvGtXXCSNJ51RsHBe0vBONP6TaZ_pAW5fcRJchSCA');

async function main() {
  console.log('🔧 Setup Script for Calendar Assignments\n');
  console.log('=' .repeat(50) + '\n');
  
  // Step 1: Try to update with checklist_uuid (will fail if column doesn't exist)
  console.log('📝 Step 1: Attempting to update assignment 125...');
  
  const checklistUUID = 'bd068b93-8489-402b-ba2b-f702da285795';
  const { error: updateError } = await supabase
    .from('calendar_assignments')
    .update({ checklist_uuid: checklistUUID })
    .eq('id', 125);
  
  if (updateError && updateError.message.includes('checklist_uuid')) {
    console.log('⚠️  Column missing. Running migration...\n');
    
    // The column doesn't exist - we need to create it
    console.log('📋 MIGRATION REQUIRED:');
    console.log('Please run this SQL in your Supabase SQL Editor:');
    console.log('\n---');
    console.log('ALTER TABLE calendar_assignments');
    console.log('ADD COLUMN checklist_uuid UUID;');
    console.log('---\n');
    console.log('Once complete, run this script again.\n');
    process.exit(0);
  } else if (updateError) {
    console.log('❌ Other error:', updateError);
    process.exit(1);
  } else {
    console.log('✅ Successfully updated!\n');
  }
  
  // Step 2: Verify the items exist
  console.log('Step 2: Verifying checklist items exist...');
  const { data: items, error: itemsError } = await supabase
    .from('cleaning_checklist')
    .select('id, zone, task')
    .eq('calendar_assignment_id', checklistUUID);
  
  if (itemsError) {
    console.log('⚠️  Error fetching items:', itemsError.message);
  } else {
    console.log(`✅ Found ${items?.length || 0} checklist items\n`);
    
    if (items && items.length > 0) {
      console.log('📋 Sample items:');
      items.slice(0, 3).forEach(item => {
        console.log(`  - ${item.zone}: ${item.task}`);
      });
      if (items.length > 3) {
        console.log(`  ... and ${items.length - 3} more`);
      }
    }
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('✨ Setup complete! Checklist should now be visible to employees.');
}

main();
