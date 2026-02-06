import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkInventory() {
  console.log('🔍 Verificando tabla inventory...\n');
  
  // Obtener estructura
  const { data: structure, error: structError } = await supabase
    .from('inventory')
    .select('*')
    .limit(1);
  
  if (structError) {
    console.error('❌ Error consultando inventory:', structError);
    return;
  }
  
  console.log('✅ Tabla inventory existe');
  
  // Contar total de items
  const { count, error: countError } = await supabase
    .from('inventory')
    .select('*', { count: 'exact', head: true });
  
  console.log(`📊 Total de items: ${count || 0}\n`);
  
  // Obtener items para EPIC D1
  const { data: epicItems, error: epicError } = await supabase
    .from('inventory')
    .select('*')
    .eq('house', 'EPIC D1');
  
  if (epicError) {
    console.error('❌ Error consultando EPIC D1:', epicError);
    return;
  }
  
  console.log(`🏠 Items para EPIC D1: ${epicItems?.length || 0}`);
  if (epicItems && epicItems.length > 0) {
    console.log('\n📋 Estructura de columnas:');
    const firstItem = epicItems[0];
    Object.keys(firstItem).forEach(key => {
      console.log(`  - ${key}: ${typeof firstItem[key]} = ${firstItem[key]}`);
    });
    
    console.log('\n📋 Primeros items:');
    epicItems.slice(0, 5).forEach(item => {
      console.log(`  - ID: ${item.id}, Name: ${item.name}, Category: ${item.category}, Complete: ${item.complete}`);
    });
  } else {
    console.log('   ⚠️  No hay items para EPIC D1');
  }
  
  // Obtener todas las casas
  console.log('\n🏘️  Casas con inventario:');
  const { data: houses, error: housesError } = await supabase
    .from('inventory')
    .select('house', { distinct: true });
  
  if (housesError) {
    console.error('❌ Error:', housesError);
    return;
  }
  
  houses?.forEach(h => console.log(`   - ${h.house}`));
}

checkInventory();
