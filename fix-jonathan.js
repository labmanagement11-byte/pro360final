const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Faltan variables de entorno');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceKey);

async function fixJonathan() {
  console.log('🔍 Buscando usuario Jonathan en Auth...\n');
  
  // Obtener usuario de auth
  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
  const jonathan = authUsers.users.find(u => u.email === 'jonathan@360pro.com');
  
  if (!jonathan) {
    console.log('❌ Usuario jonathan@360pro.com no encontrado en Auth');
    return;
  }
  
  console.log('✅ Usuario encontrado en Auth:');
  console.log(`   ID: ${jonathan.id}`);
  console.log(`   Email: ${jonathan.email}`);
  console.log(`   Creado: ${new Date(jonathan.created_at).toLocaleString('es-ES')}\n`);
  
  // Verificar si existe en profiles
  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', jonathan.id)
    .single();
  
  if (existingProfile) {
    console.log('📋 Perfil actual en tabla profiles:');
    console.log(`   Username: ${existingProfile.username}`);
    console.log(`   Rol: ${existingProfile.role}`);
    console.log(`   House: ${existingProfile.house}\n`);
    
    // Actualizar rol a dueno
    console.log('🔧 Actualizando rol a "dueno"...');
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ role: 'dueno' })
      .eq('id', jonathan.id);
    
    if (updateError) {
      console.error('❌ Error actualizando:', updateError.message);
      return;
    }
    
    console.log('✅ Rol actualizado exitosamente\n');
  } else {
    console.log('⚠️ Perfil no existe en tabla profiles');
    console.log('🔧 Creando perfil...');
    
    const { error: insertError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: jonathan.id,
        username: 'Jonathan',
        role: 'dueno',
        house: 'EPIC D1'
      });
    
    if (insertError) {
      console.error('❌ Error creando perfil:', insertError.message);
      return;
    }
    
    console.log('✅ Perfil creado exitosamente\n');
  }
  
  // Verificar resultado final
  const { data: finalProfile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', jonathan.id)
    .single();
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 PERFIL FINAL:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Username: ${finalProfile.username}`);
  console.log(`Rol: ${finalProfile.role}`);
  console.log(`House: ${finalProfile.house}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n✅ Jonathan puede ahora ingresar con:');
  console.log('   Email: jonathan@360pro.com');
  console.log('   Password: admin123');
}

fixJonathan();
