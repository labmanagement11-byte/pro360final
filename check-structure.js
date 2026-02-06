import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkStructure() {
  console.log('🔍 Verificando estructura de inventory...\n');
  
  // Obtener primer item para ver columnas
  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  if (data && data.length > 0) {
    console.log('📋 Columnas encontradas:');
    Object.keys(data[0]).forEach((col, idx) => {
      console.log(`  ${idx + 1}. ${col}`);
    });
    
    console.log('\n📋 Primer item de ejemplo:');
    const item = data[0];
    console.log(JSON.stringify(item, null, 2));
  }
}

checkStructure();
