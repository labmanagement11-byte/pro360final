const {createClient} = require('@supabase/supabase-js');
require('dotenv').config({path: '.env.local'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

(async () => {
  console.log('🔍 Buscando CUALQUIER valor con YNTIBA...');
  let found = false;
  const tables = ['users', 'tasks', 'inventory', 'reminders', 'shopping_list', 'calendar_assignments', 'cleaning_checklist', 'houses'];
  
  for(const table of tables) {
    const {data, error} = await supabase.from(table).select('*');
    if(!error && data) {
      const rows = data.filter((r) => JSON.stringify(r).includes('YNTIBA'));
      if(rows.length > 0) {
        console.log(`\n❌ ${table}: encontrado ${rows.length} registros`);
        console.log(JSON.stringify(rows, null, 2));
        found = true;
      }
    }
  }
  
  if(!found) console.log('\n✅ No hay registros con YNTIBA en ninguna tabla');
})();
