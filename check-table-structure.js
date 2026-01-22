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

async function getTableStructure() {
  console.log('\n📋 Obteniendo estructura de tabla checklist...\n');

  // Consultar tabla información_schema
  const { data, error } = await supabase
    .rpc('get_table_structure', { table_name: 'checklist' })
    .catch(() => null);

  if (data) {
    console.log('✅ Estructura de tabla:');
    console.log(data);
    return;
  }

  // Alternativa: intentar insertar sin columna 'type'
  console.log('Intentando descubrir columnas probando inserción...\n');
  
  const testCases = [
    {
      name: 'sin type',
      data: {
        house: 'TEST',
        item: 'test',
        room: 'test',
        complete: false,
        assigned_to: null
      }
    },
    {
      name: 'con category en lugar de type',
      data: {
        house: 'TEST',
        item: 'test',
        room: 'test',
        category: 'regular',
        complete: false,
        assigned_to: null
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`Probando: ${testCase.name}`);
    const { error: err } = await supabase
      .from('checklist')
      .insert([testCase.data]);
    
    if (!err) {
      console.log('  ✅ Éxito! Columnas correctas son:', Object.keys(testCase.data));
      // Limpiar
      await supabase
        .from('checklist')
        .delete()
        .eq('house', 'TEST');
      return;
    } else {
      console.log(`  ❌ Error: ${err.message}`);
    }
  }

  console.log('\n❌ No pude determinar la estructura. Por favor revisa Supabase manualmente.');
}

getTableStructure();
