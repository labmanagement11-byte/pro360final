const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkHouses() {
  try {
    console.log('\n📊 Verificando casas en Supabase...\n');

    const { data: houses, error } = await supabase
      .from('houses')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    if (!houses || houses.length === 0) {
      console.log('⚠️  No hay casas en la base de datos');
      console.log('\n📝 Creando EPIC D1...');
      
      const { data: newHouse, error: createError } = await supabase
        .from('houses')
        .insert([{ name: 'EPIC D1', description: 'Casa principal EPIC D1' }])
        .select();

      if (createError) {
        console.error('❌ Error creando EPIC D1:', createError);
      } else {
        console.log('✅ EPIC D1 creada:', newHouse);
      }
    } else {
      console.log(`✅ ${houses.length} casas encontradas:\n`);
      houses.forEach((h, i) => {
        console.log(`   ${i + 1}. ${h.name} (ID: ${h.id})`);
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkHouses();
