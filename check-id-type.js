import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkColumnType() {
  console.log('🔍 Verificando tipo de columna id en calendar_assignments...\n');
  
  // Consultar información de la tabla - específicamente EPIC D1
  const { data, error } = await supabase
    .from('calendar_assignments')
    .select('*')
    .eq('house', 'EPIC D1')
    .limit(1);
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  if (data && data.length > 0) {
    console.log('Primera fila:', data[0]);
    console.log('\nTipo de id:', typeof data[0].id);
    console.log('Valor de id:', data[0].id);
    console.log('Es UUID?:', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(data[0].id)));
  }
}

checkColumnType();
