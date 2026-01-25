require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://hecvlywrahigujakkguw.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlY3ZseXdyYWhpZ3VqYWtrZ3V3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjcyMzg2NCwiZXhwIjoyMDgyMjk5ODY0fQ.ZgmvGtXXCSNJ51RsHBe0vBONP6TaZ_pAW5fcRJchSCA';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function resetEpicUsers() {
  const users = [
    { email: 'alejandra@360pro.com', password: 'manager123', username: 'Alejandra', role: 'manager', house: 'EPIC D1' },
    { email: 'victor@360pro.com', password: 'empleado123', username: 'Victor', role: 'empleado', house: 'EPIC D1' },
    { email: 'carlina@360pro.com', password: 'empleado123', username: 'Carlina', role: 'empleado', house: 'EPIC D1' }
  ];

  for (const user of users) {
    console.log(`\n🔍 Verificando ${user.email}...`);
    
    // Obtener usuario actual
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const existing = authUsers.users.find(u => u.email === user.email);
    
    if (existing) {
      console.log(`   ✓ Usuario existe: ${existing.id}`);
      console.log(`   Email confirmado: ${existing.email_confirmed_at ? 'SÍ' : 'NO'}`);
      
      // Resetear contraseña
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existing.id,
        { 
          password: user.password,
          email_confirm: true
        }
      );
      
      if (updateError) {
        console.log(`   ❌ Error actualizando contraseña:`, updateError.message);
      } else {
        console.log(`   ✓ Contraseña actualizada a: ${user.password}`);
      }
      
      // Verificar/actualizar perfil
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', existing.id)
        .single();
      
      if (profile) {
        console.log(`   ✓ Perfil existe - Username: ${profile.username}, Role: ${profile.role}, House: ${profile.house}`);
        
        // Actualizar perfil si no coincide
        if (profile.house !== user.house || profile.role !== user.role || profile.username !== user.username) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ 
              username: user.username, 
              role: user.role, 
              house: user.house 
            })
            .eq('id', existing.id);
          
          if (profileError) {
            console.log(`   ❌ Error actualizando perfil:`, profileError.message);
          } else {
            console.log(`   ✓ Perfil actualizado`);
          }
        }
      } else {
        console.log(`   ⚠️ Perfil no existe, creando...`);
        const { error: createProfileError } = await supabase
          .from('profiles')
          .insert({ 
            id: existing.id,
            username: user.username, 
            role: user.role, 
            house: user.house 
          });
        
        if (createProfileError) {
          console.log(`   ❌ Error creando perfil:`, createProfileError.message);
        } else {
          console.log(`   ✓ Perfil creado`);
        }
      }
    } else {
      console.log(`   ⚠️ Usuario NO existe, creando...`);
      
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: { 
          username: user.username, 
          role: user.role 
        }
      });
      
      if (createError) {
        console.log(`   ❌ Error creando usuario:`, createError.message);
      } else {
        console.log(`   ✓ Usuario creado: ${newUser.user.id}`);
        
        // Crear perfil
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({ 
            id: newUser.user.id,
            username: user.username, 
            role: user.role, 
            house: user.house 
          });
        
        if (profileError) {
          console.log(`   ❌ Error creando perfil:`, profileError.message);
        } else {
          console.log(`   ✓ Perfil creado`);
        }
      }
    }
  }
  
  console.log('\n✅ Proceso completado');
  console.log('\n📋 CREDENCIALES FINALES:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Alejandra: alejandra@360pro.com / manager123');
  console.log('Victor:    victor@360pro.com / empleado123');
  console.log('Carlina:   carlina@360pro.com / empleado123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

resetEpicUsers().catch(console.error);
