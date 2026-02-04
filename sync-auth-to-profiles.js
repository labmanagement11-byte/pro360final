const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Faltan variables de entorno');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function syncAuthToProfiles() {
  console.log('🔄 SINCRONIZANDO AUTH USERS → PROFILES\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Obtener todos los usuarios de Auth
  const { data: authData } = await supabase.auth.admin.listUsers();
  const authUsers = authData.users;
  
  console.log(`📊 Total de usuarios en Auth: ${authUsers.length}\n`);
  
  // Obtener todos los perfiles
  const { data: profiles } = await supabase.from('profiles').select('*');
  const profileIds = new Set(profiles.map(p => p.id));
  
  console.log(`📋 Total de perfiles en Profiles: ${profiles.length}\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Verificar cada usuario
  for (const user of authUsers) {
    const email = user.email;
    const userId = user.id;
    
    if (profileIds.has(userId)) {
      const profile = profiles.find(p => p.id === userId);
      console.log(`✅ ${email}`);
      console.log(`   → Perfil: ${profile.username} (${profile.role}) - ${profile.house}`);
    } else {
      console.log(`❌ ${email}`);
      console.log(`   → SIN PERFIL - Creando...`);
      
      // Crear perfil automáticamente
      const username = email.split('@')[0];
      const capitalizedUsername = username.charAt(0).toUpperCase() + username.slice(1);
      
      const { error } = await supabase.from('profiles').insert({
        id: userId,
        username: capitalizedUsername,
        role: 'empleado', // Rol por defecto
        house: 'EPIC D1' // Casa por defecto
      });
      
      if (error) {
        console.log(`   ❌ Error creando perfil: ${error.message}`);
      } else {
        console.log(`   ✅ Perfil creado: ${capitalizedUsername} (empleado) - EPIC D1`);
      }
    }
    console.log('');
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ SINCRONIZACIÓN COMPLETADA');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

syncAuthToProfiles();
