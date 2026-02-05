const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://hecvlywrahigujakkguw.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlY3ZseXdyYWhpZ3VqYWtrZ3V3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjcyMzg2NCwiZXhwIjoyMDgyMjk5ODY0fQ.ZgmvGtXXCSNJ51RsHBe0vBONP6TaZ_pAW5fcRJchSCA');

async function addColumn() {
  console.log('🔧 Executing SQL to add checklist_uuid column...\n');
  
  const { data, error } = await supabase
    .rpc('exec_sql_string', { 
      sql_string: 'ALTER TABLE calendar_assignments ADD COLUMN IF NOT EXISTS checklist_uuid UUID;'
    })
    .then(result => ({ data: result.data, error: result.error }))
    .catch(err => {
      console.log('RPC not available, trying alternative...');
      return { data: null, error: err };
    });
  
  if (error) {
    console.log('⚠️ RPC method not available');
    console.log('\n📝 Please manually add the column in Supabase SQL Editor:');
    console.log('ALTER TABLE calendar_assignments ADD COLUMN checklist_uuid UUID;');
    console.log('\nThen run this script again.');
  } else {
    console.log('✅ Column added or already exists');
  }
}

addColumn();
