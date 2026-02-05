const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hecvlywrahigujakkguw.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlY3ZseXdyYWhpZ3VqYWtrZ3V3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjcyMzg2NCwiZXhwIjoyMDgyMjk5ODY0fQ.ZgmvGtXXCSNJ51RsHBe0vBONP6TaZ_pAW5fcRJchSCA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
  console.log('🔍 CHECKING CLEANING_CHECKLIST SCHEMA\n');

  try {
    // Get a single row to see what columns exist
    const { data, error } = await supabase
      .from('cleaning_checklist')
      .select('*')
      .limit(1);

    if (error) {
      console.log('Error:', error);
    } else if (data && data.length > 0) {
      console.log('Columnas en cleaning_checklist:');
      Object.keys(data[0]).forEach(key => {
        console.log(`  - ${key}: ${typeof data[0][key]}`);
      });
    } else {
      console.log('Tabla vacía. Usando información de schema...');
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

checkSchema();
