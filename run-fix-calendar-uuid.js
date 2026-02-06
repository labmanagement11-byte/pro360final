import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function executeSQLFile() {
  console.log('🔧 Ejecutando fix-calendar-assignments-uuid.sql...\n');
  
  const sql = fs.readFileSync('fix-calendar-assignments-uuid.sql', 'utf8');
  
  // Ejecutar SQL
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
  
  if (error) {
    console.error('❌ Error:', error);
    console.log('\n⚠️  La función exec_sql no existe. Ejecuta el SQL manualmente en Supabase SQL Editor.');
    console.log('\nO puedo ejecutar los comandos uno por uno...');
    
    // Ejecutar comando por comando
    const commands = [
      "ALTER TABLE cleaning_checklist DROP CONSTRAINT IF EXISTS cleaning_checklist_calendar_assignment_id_fkey",
      "DELETE FROM calendar_assignments WHERE house = 'EPIC D1'",
      "DROP TABLE IF EXISTS calendar_assignments CASCADE"
    ];
    
    for (const cmd of commands) {
      console.log(`\nEjecutando: ${cmd.substring(0, 50)}...`);
      const { error: cmdError } = await supabase.rpc('exec', { query: cmd });
      if (cmdError) {
        console.error('❌', cmdError.message);
      } else {
        console.log('✅ OK');
      }
    }
    
    return;
  }
  
  console.log('✅ SQL ejecutado correctamente');
  console.log(data);
}

executeSQLFile();
