const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createEpicD1() {
  try {
    console.log('\n🏠 Creando casa EPIC D1...\n');

    const { data: houses, error: createError } = await supabase
      .from('houses')
      .insert([{ name: 'EPIC D1', description: 'Casa principal EPIC D1' }])
      .select();

    if (createError) {
      console.error('❌ Error creando EPIC D1:', createError);
      return;
    }

    console.log('✅ EPIC D1 creada exitosamente');
    console.log('📊 Detalles:', houses[0]);

    // Verificar que ahora hay 2 casas
    const { data: allHouses } = await supabase
      .from('houses')
      .select('*')
      .order('name', { ascending: true });

    console.log(`\n✅ Total de casas en Supabase: ${allHouses.length}`);
    console.log('Casas:');
    allHouses.forEach((h, i) => {
      console.log(`   ${i + 1}. ${h.name} (ID: ${h.id})`);
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createEpicD1();
