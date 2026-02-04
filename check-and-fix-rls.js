const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Faltan variables de entorno');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function fixProfilesRLS() {
  console.log('🔐 CONFIGURANDO ROW LEVEL SECURITY PARA PROFILES\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const policies = [
    {
      name: 'Usuarios autenticados pueden ver todos los perfiles',
      action: 'SELECT',
      check: null,
      using: 'true'
    },
    {
      name: 'Usuarios autenticados pueden insertar perfiles',
      action: 'INSERT',
      check: 'true',
      using: null
    },
    {
      name: 'Usuarios autenticados pueden actualizar perfiles',
      action: 'UPDATE',
      check: 'true',
      using: 'true'
    }
  ];
  
  console.log('📋 Políticas a crear:\n');
  policies.forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.name}`);
    console.log(`      Acción: ${p.action}`);
  });
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('⚠️ IMPORTANTE: Estas políticas deben aplicarse en Supabase SQL Editor\n');
  console.log('📝 INSTRUCCIONES:\n');
  console.log('1. Ve a tu proyecto en Supabase Dashboard');
  console.log('2. Navega a SQL Editor');
  console.log('3. Copia y pega el contenido de: fix-profiles-rls.sql');
  console.log('4. Ejecuta el SQL\n');
  
  console.log('🔍 Verificando estado actual...\n');
  
  // Probar con SERVICE KEY
  console.log('1️⃣ Probando con SERVICE KEY (admin):');
  const { data: serviceData, error: serviceError } = await supabase
    .from('profiles')
    .select('id, username, role')
    .limit(3);
  
  if (serviceError) {
    console.log('   ❌ Error:', serviceError.message);
  } else {
    console.log(`   ✅ Acceso exitoso: ${serviceData.length} registros`);
  }
  
  // Probar con ANON KEY
  console.log('\n2️⃣ Probando con ANON KEY (navegador):');
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const anonSupabase = createClient(supabaseUrl, anonKey);
  
  const { data: anonData, error: anonError } = await anonSupabase
    .from('profiles')
    .select('id, username, role')
    .limit(3);
  
  if (anonError) {
    console.log('   ❌ Error:', anonError.message);
    console.log('   ⚠️ Este es el problema en el navegador');
  } else {
    console.log(`   ✅ Acceso exitoso: ${anonData.length} registros`);
  }
  
  // Probar con usuario autenticado
  console.log('\n3️⃣ Probando con usuario autenticado (jonathan@360pro.com):');
  
  const { data: authData, error: authError } = await anonSupabase.auth.signInWithPassword({
    email: 'jonathan@360pro.com',
    password: 'admin123'
  });
  
  if (authError) {
    console.log('   ❌ Error en autenticación:', authError.message);
  } else {
    console.log('   ✅ Autenticación exitosa');
    
    const { data: authProfileData, error: authProfileError } = await anonSupabase
      .from('profiles')
      .select('id, username, role')
      .eq('id', authData.user.id)
      .single();
    
    if (authProfileError) {
      console.log('   ❌ Error obteniendo perfil:', authProfileError.message);
      console.log('   ⚠️ RLS ESTÁ BLOQUEANDO - Necesitas aplicar fix-profiles-rls.sql');
    } else {
      console.log('   ✅ Perfil obtenido:', authProfileData);
      console.log('   ✅ RLS configurado correctamente');
    }
    
    await anonSupabase.auth.signOut();
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 RESUMEN');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('Si ves errores arriba, sigue estos pasos:\n');
  console.log('1. Abre Supabase Dashboard → SQL Editor');
  console.log('2. Ejecuta el archivo: fix-profiles-rls.sql');
  console.log('3. Vuelve a ejecutar este script para verificar');
  console.log('4. Prueba el login en el navegador\n');
}

fixProfilesRLS();
