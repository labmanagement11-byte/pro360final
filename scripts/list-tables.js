const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
  try {
    // Intentar listar tablas
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (error) {
      console.log('❌ Error:', error);
      
      // Intentar listar usando una query directa
      console.log('\n📊 Intentando listar tablas disponibles...\n');
      
      // Probar crear la casa directamente
      const { data, error: insertError } = await supabase
        .from('houses')
        .insert([{ name: 'YNTIBA 2 406', created_at: new Date().toISOString() }])
        .select();
      
      if (insertError) {
        console.log('❌ Error insertando en houses:', insertError);
      } else {
        console.log('✅ Casa creada:', data);
      }
    } else {
      console.log('📊 Tablas disponibles:');
      tables.forEach(t => console.log('  -', t.table_name));
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

listTables();
