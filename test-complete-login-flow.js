const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLoginFlow() {
  console.log('🧪 SIMULACIÓN COMPLETA DE LOGIN (como en el navegador)\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const email = 'jonathan@360pro.com';
  const password = 'admin123';
  
  console.log(`📝 Intentando login con: ${email}\n`);
  
  // Paso 1: Autenticación (igual que Login.tsx)
  console.log('🔐 Paso 1: Autenticación con Supabase Auth...');
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
  
  // Paso 2: Buscar perfil (exactamente como Login.tsx después del cambio)
  console.log('🔍 Paso 2: Buscando perfil...');
  const localPart = email.split('@')[0].toLowerCase();
  const userId = authData.user.id;
  let record = null;
  
  // 1) PRIMERO: Buscar en profiles por ID de usuario
  try {
    const { data: profileById } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (profileById) {
      record = profileById;
      console.log('✅ Perfil encontrado por ID en profiles');
      console.log(`   Username: ${record.username}`);
      console.log(`   Role: ${record.role}`);
      console.log(`   House: ${record.house}\n`);
    }
  } catch (e) {
    console.log('⚠️ No encontrado por ID en profiles:', e.message);
  }
  
  // 2) Si no existe, buscar en tabla users por ID
  if (!record) {
    try {
      const { data: userById } = await supabase.from('users').select('*').eq('id', userId).single();
      if (userById) {
        record = userById;
        console.log('✅ Perfil encontrado por ID en users');
      }
    } catch (e) {
      console.log('⚠️ No encontrado por ID en users:', e.message);
    }
  }
  
  // 3) Si no existe, buscar en profiles por username
  if (!record) {
    try {
      const { data: p } = await supabase.from('profiles').select('*').ilike('username', localPart).single();
      if (p) {
        record = p;
        console.log('✅ Perfil encontrado por username en profiles');
      }
    } catch (e) {
      console.log('⚠️ No encontrado por username en profiles:', e.message);
    }
  }
  
  // 4) Si no existe, buscar en tabla users por username
  if (!record) {
    try {
      const { data: u } = await supabase.from('users').select('*').ilike('username', localPart).single();
      if (u) {
        record = u;
        console.log('✅ Perfil encontrado por username en users');
      }
    } catch (e) {
      console.log('⚠️ No encontrado por username en users:', e.message);
    }
  }
  
  if (!record) {
    console.error('❌ Usuario no encontrado en base de datos');
    console.error('   User ID:', userId);
    console.error('   Email:', email);
    console.error('   Local part:', localPart);
    return;
  }
  
  // Paso 3: Construir objeto User (igual que Login.tsx)
  console.log('🔨 Paso 3: Construyendo objeto User...');
  
  let userRole = record.role || (record.user_metadata && record.user_metadata.role) || 'empleado';
  if (userRole === 'dueno') {
    console.log('🔄 Normalizando rol "dueno" → "owner"');
    userRole = 'owner';
  }
  
  const user = {
    username: record.username || record.full_name || localPart,
    password: '',
    role: userRole,
    house: record.house || 'EPIC D1',
  };
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ LOGIN EXITOSO');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(JSON.stringify(user, null, 2));
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('✅ El usuario puede:');
  console.log('   - Acceder al dashboard');
  console.log('   - Ver todas las funcionalidades según su rol\n');
  
  // Limpiar sesión
  await supabase.auth.signOut();
  console.log('🔓 Sesión cerrada\n');
}

testLoginFlow();
