const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno no configuradas');
  process.exit(1);
}

// Usar service role key si está disponible para tener permisos de admin
const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseKey);
const HOUSE_NAME = 'YNTIBA 2 406';

const users = [
  {
    username: 'sandra',
    password: 'manager123',
    role: 'manager',
    email: 'sandra@360pro.com', // para referencia
  },
  {
    username: 'chava',
    password: 'empleado123',
    role: 'empleado',
    email: 'chava@360pro.com', // para referencia
  },
];

async function createUsers() {
  try {
    console.log(`\n👥 Creando usuarios para ${HOUSE_NAME}...\n`);

    for (const user of users) {
      try {
        console.log(`📝 Creando usuario: ${user.username} (${user.email}) - Rol: ${user.role}...`);

        // Insertar usuario en users
        const { data: userData, error: userError } = await supabase
          .from('users')
          .insert([
            {
              username: user.username,
              password: user.password,
              role: user.role,
              house: HOUSE_NAME,
            },
          ])
          .select();

        if (userError) {
          console.error(`❌ Error creando ${user.username}:`, userError);
          continue;
        }

        console.log(`✅ ${user.username} creado exitosamente`);
        console.log(`   - Email: ${user.email}`);
        console.log(`   - Rol: ${user.role}`);
        console.log(`   - Casa: ${HOUSE_NAME}`);
        console.log(`   - ID: ${userData[0].id}\n`);
      } catch (error) {
        console.error(`❌ Error procesando ${user.username}:`, error.message);
      }
    }

    // Verificar usuarios creados
    const { data: allUsers, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('house', HOUSE_NAME)
      .order('username');

    if (fetchError) {
      console.error('❌ Error verificando usuarios:', fetchError);
      return;
    }

    console.log(`\n📊 Usuarios para ${HOUSE_NAME}:`);
    console.log('=' .repeat(80));
    allUsers.forEach((u) => {
      console.log(`✓ ${u.username} (${u.email}) - Rol: ${u.role}`);
    });
    console.log('=' .repeat(80));
  } catch (error) {
    console.error('❌ Error general:', error.message);
    process.exit(1);
  }
}

createUsers();
