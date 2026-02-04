const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testJonathanLogin() {
  console.log('🔐 PROBANDO LOGIN COMPLETO PARA JONATHAN\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const email = 'jonathan@360pro.com';
  const password = 'admin123';
  
  console.log('📝 Credenciales:');
  console.log(`   Email: ${email}`);
  console.log(`   Password: ${password}\n`);
  
  // Paso 1: Autenticación con Supabase Auth
  console.log('🔍 Paso 1: Autenticación...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (authError || !authData.user) {
    console.error('❌ Error en autenticación:', authError?.message || 'Usuario no encontrado');
    return;
  }
  
  console.log('✅ Autenticación exitosa');
  console.log(`   User ID: ${authData.user.id}\n`);
  
  // Paso 2: Buscar perfil
  const localPart = email.split('@')[0].toLowerCase();
  console.log('🔍 Paso 2: Buscando perfil...');
  console.log(`   Local part: ${localPart}`);
  
  let record = null;
  
  // Buscar en tabla profiles por username
  try {
    const { data: p } = await supabase.from('profiles').select('*').ilike('username', localPart).single();
    if (p) {
      record = p;
      console.log('✅ Perfil encontrado en tabla profiles (por username)\n');
    }
  } catch (e) {
    console.log('⚠️ No encontrado en profiles por username');
  }
  
  // Si no se encontró, buscar por ID
  if (!record) {
    try {
      const { data: p2 } = await supabase.from('profiles').select('*').eq('id', authData.user.id).single();
      if (p2) {
        record = p2;
        console.log('✅ Perfil encontrado en tabla profiles (por ID)\n');
      }
    } catch (e) {
      console.log('❌ No encontrado en profiles por ID');
    }
  }
  
  if (!record) {
    console.error('❌ Usuario no encontrado en base de datos');
    return;
  }
  
  // Paso 3: Construir objeto User
  console.log('🔍 Paso 3: Construyendo objeto User...');
  console.log('   Datos del perfil:');
  console.log(`   - username: ${record.username}`);
  console.log(`   - role: ${record.role}`);
  console.log(`   - house: ${record.house}\n`);
  
  // Normalizar rol 'dueno' a 'owner'
  let userRole = record.role || 'empleado';
  if (userRole === 'dueno') {
    console.log('🔄 Normalizando rol "dueno" a "owner"...');
    userRole = 'owner';
  }
  
  const user = {
    username: record.username || record.full_name || localPart,
    password: '',
    role: userRole,
    house: record.house || 'EPIC D1',
  };
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ LOGIN EXITOSO - OBJETO USER FINAL:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(JSON.stringify(user, null, 2));
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('✅ Jonathan puede ahora:');
  console.log('   - Iniciar sesión con jonathan@360pro.com / admin123');
  console.log('   - Acceder al dashboard como owner');
  console.log('   - Gestionar todas las funcionalidades del sistema\n');
  
  // Limpiar sesión
  await supabase.auth.signOut();
}

testJonathanLogin();
