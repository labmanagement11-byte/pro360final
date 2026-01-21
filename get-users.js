require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://hecvlywrahigujakkguw.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlY3ZseXdyYWhpZ3VqYWtrZ3V3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjcyMzg2NCwiZXhwIjoyMDgyMjk5ODY0fQ.ZgmvGtXXCSNJ51RsHBe0vBONP6TaZ_pAW5fcRJchSCA';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function getUsers() {
  console.log('📋 Obteniendo usuarios de la aplicación...\n');
  
  // Obtener usuarios de auth
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.error('❌ Error obteniendo usuarios:', authError);
    return;
  }

  if (!authUsers || authUsers.users.length === 0) {
    console.log('⚠️ No hay usuarios en la base de datos');
    return;
  }

  console.log(`✓ Se encontraron ${authUsers.users.length} usuario(s):\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  for (const user of authUsers.users) {
    console.log(`📧 Email: ${user.email}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Creado: ${new Date(user.created_at).toLocaleString('es-ES')}`);
    
    // Obtener información adicional del perfil
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (!profileError && profile) {
      console.log(`   Username: ${profile.username}`);
      console.log(`   Rol: ${profile.role}`);
      console.log(`   House: ${profile.house}`);
    }
    
    console.log('─────────────────────────────────────────────────────');
  }
}

getUsers().catch(console.error);
