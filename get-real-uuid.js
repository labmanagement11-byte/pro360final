import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getRealUUID() {
  console.log('🔍 Consultando UUID real de la asignación...\n');
  
  const { data, error } = await supabase
    .from('calendar_assignments')
    .select('id, type, employee')
    .eq('house', 'EPIC D1')
    .eq('type', 'Limpieza regular')
    .single();
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log('Data completa:', data);
  console.log('ID:', data.id);
  console.log('Tipo:', typeof data.id);
  console.log('Como string:', String(data.id));
  console.log('Cast a texto:', `${data.id}`);
  
  // Intentar con CAST en la consulta
  const { data: data2, error: error2 } = await supabase.rpc('exec', {
    query: "SELECT id::text as id_text, type FROM calendar_assignments WHERE house = 'EPIC D1' AND type = 'Limpieza regular' LIMIT 1"
  });
  
  if (error2) {
    console.log('\nNo se puede usar rpc exec');
  } else {
    console.log('\nCon CAST:', data2);
  }
}

getRealUUID();
