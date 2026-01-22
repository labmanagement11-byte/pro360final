#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyChecklistTable() {
  console.log('\n🔍 Verificando tabla checklist...\n');

  // 1. Intentar leer desde la tabla
  console.log('1️⃣  Intentando leer desde tabla checklist...');
  const { data, error } = await supabase
    .from('checklist')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Error al leer tabla checklist:', error.message);
    console.log('\n📋 Posibles soluciones:');
    console.log('1. La tabla "checklist" no existe en Supabase');
    console.log('2. No tienes permisos para leer la tabla');
    console.log('3. Falta configurar Row Level Security (RLS)\n');
    return false;
  }

  console.log('✅ Tabla checklist existe y es legible');
  console.log(`   Encontrados ${data?.length || 0} registros\n`);

  // 2. Intentar insertar un registro de prueba
  console.log('2️⃣  Intentando insertar un registro de prueba...');
  const testRecord = {
    house: 'TEST_HOUSE',
    item: 'Tarea de prueba',
    room: 'TEST_ZONA',
    type: 'regular',
    complete: false,
    assigned_to: null
  };

  const { data: insertedData, error: insertError } = await supabase
    .from('checklist')
    .insert([testRecord])
    .select();

  if (insertError) {
    console.error('❌ Error al insertar en tabla checklist:', insertError.message);
    console.log('\n📋 Detalles del error:');
    console.log('  Código:', insertError.code);
    console.log('  Mensaje:', insertError.message);
    if (insertError.details) console.log('  Detalles:', insertError.details);
    if (insertError.hint) console.log('  Pista:', insertError.hint);
    console.log('\n📋 Posibles soluciones:');
    console.log('1. Falta alguna columna requerida (columns shown above)');
    console.log('2. Los permisos RLS no permiten INSERT');
    console.log('3. El usuario no tiene credenciales suficientes\n');
    return false;
  }

  console.log('✅ Inserción exitosa');
  console.log('   ID:', insertedData[0]?.id);
  console.log('   Datos guardados:', insertedData[0], '\n');

  // 3. Limpiar: eliminar el registro de prueba
  console.log('3️⃣  Limpiando registro de prueba...');
  const { error: deleteError } = await supabase
    .from('checklist')
    .delete()
    .eq('house', 'TEST_HOUSE')
    .eq('item', 'Tarea de prueba');

  if (deleteError) {
    console.warn('⚠️  No se pudo limpiar registro de prueba:', deleteError.message);
  } else {
    console.log('✅ Registro de prueba eliminado\n');
  }

  console.log('✅ ¡Tabla checklist configurada correctamente!\n');
  return true;
}

verifyChecklistTable().then(success => {
  process.exit(success ? 0 : 1);
});
