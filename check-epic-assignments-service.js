import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkEPICAssignments() {
  console.log('📅 Verificando asignaciones de EPIC D1...\n');
  
  const { data, error } = await supabase
    .from('calendar_assignments')
    .select('*')
    .eq('house', 'EPIC D1')
    .order('date', { ascending: true });
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log(`Total: ${data?.length || 0} asignaciones\n`);
  
  data?.forEach(a => {
    console.log(`ID: ${a.id}`);
    console.log(`Tipo: ${a.type}`);
    console.log(`Empleado: ${a.employee}`);
    console.log(`Casa: ${a.house}`);
    console.log(`Fecha: ${a.date}`);
    console.log('---');
  });
}

checkEPICAssignments();
