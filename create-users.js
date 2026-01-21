require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Agrégala en .env.local

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function createUsers() {
  const users = [
    { email: 'jonathan@360pro.com', password: 'admin123', username: 'Jonathan', role: 'owner' },
    { email: 'alejandra@360pro.com', password: 'manager123', username: 'Alejandra', role: 'manager' },
    { email: 'victor@360pro.com', password: 'empleado123', username: 'Victor', role: 'empleado' },
    { email: 'carlina@360pro.com', password: 'empleado123', username: 'Carlina', role: 'empleado' }
  ];

  for (const user of users) {
    console.log(`Creando ${user.email}...`);
    
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true
    });

    if (authError) {
      console.error(`❌ Error creando ${user.email}:`, authError.message);
      continue;
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({ 
        id: authData.user.id, 
        username: user.username, 
        role: user.role, 
        house: 'EPIC D1' 
      });

    if (profileError) {
      console.error(`❌ Error perfil ${user.email}:`, profileError.message);
    } else {
      console.log(`✓ ${user.username} creado (${user.role})`);
    }
  }
  
  console.log('\n✓ Proceso completado');
}

createUsers();
