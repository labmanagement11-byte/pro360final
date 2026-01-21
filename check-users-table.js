const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsersTable() {
  try {
    console.log('\n📊 Verificando estructura de tabla users...\n');

    // Intentar obtener un usuario para ver qué campos tiene
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    if (data && data.length > 0) {
      console.log('✅ Campos encontrados en tabla users:');
      Object.keys(data[0]).forEach((field) => {
        console.log(`   - ${field}: ${typeof data[0][field]}`);
      });
      console.log('\n📋 Ejemplo de usuario:');
      console.log(JSON.stringify(data[0], null, 2));
    } else {
      console.log('⚠️ La tabla users está vacía. Verificando esquema...');
      
      // Intentar insertar con campos básicos
      const { error: insertError } = await supabase
        .from('users')
        .insert([{
          username: 'test',
          password: 'test123',
          role: 'empleado',
          house: 'TEST'
        }])
        .select();

      if (insertError) {
        console.error('❌ Error al insertar:', insertError);
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkUsersTable();
