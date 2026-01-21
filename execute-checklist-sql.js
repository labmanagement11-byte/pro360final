const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY no están configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const sqlQueries = [
  `CREATE TABLE IF NOT EXISTS public.checklist_items (
    id BIGSERIAL PRIMARY KEY,
    taskId BIGINT REFERENCES public.tasks(id) ON DELETE CASCADE,
    zona TEXT,
    text TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    house TEXT,
    type TEXT DEFAULT 'regular',
    completedBy TEXT,
    completedAt TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
  );`,
  
  `ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;`,
  
  `INSERT INTO public.checklist_items (taskId, zona, text, completed, house, type) VALUES
    (1, 'Sala', 'Barrer pisos', false, 'YNTIBA 2 406', 'regular'),
    (1, 'Sala', 'Limpiar sofá', false, 'YNTIBA 2 406', 'regular'),
    (1, 'Comedor', 'Limpiar mesas', false, 'YNTIBA 2 406', 'regular'),
    (2, 'Habitación 1', 'Limpiar piso', false, 'YNTIBA 2 406', 'regular'),
    (2, 'Habitación 2', 'Cambiar sábanas', false, 'YNTIBA 2 406', 'regular'),
    (3, 'Baño Principal', 'Limpiar sanitario', false, 'YNTIBA 2 406', 'regular'),
    (3, 'Baño Principal', 'Limpiar espejo', false, 'YNTIBA 2 406', 'regular'),
    (3, 'Baño Secundario', 'Limpiar ducha', false, 'YNTIBA 2 406', 'regular'),
    (4, 'Cocina', 'Limpiar encimeras', false, 'YNTIBA 2 406', 'regular'),
    (4, 'Cocina', 'Limpiar estufa', false, 'YNTIBA 2 406', 'regular'),
    (5, 'Lavandería', 'Limpiar lavadora', false, 'YNTIBA 2 406', 'regular')
  ON CONFLICT DO NOTHING;`
];

async function executeSql() {
  try {
    console.log('🔄 Ejecutando SQL queries en Supabase...');
    
    // Para ejecutar SQL crudo, usamos RPC o el admin API
    // La forma más fácil es usar el cliente de Supabase con rpc o directamente SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: sqlQueries.join('\n')
    });

    if (error) {
      // Si RPC no existe, intentamos otro método
      console.log('⚠️ RPC exec_sql no disponible, intentando alternativa...');
      
      // Alternativa: crear tabla con insert individual
      const createTableResult = await supabase.from('checklist_items').select('id').limit(1);
      if (createTableResult.error && createTableResult.error.code === 'PGRST116') {
        console.log('⚠️ Tabla no existe. Nota: Necesitas crear la tabla manualmente en SQL Editor');
        console.log('\n📋 Copia este SQL en tu dashboard de Supabase (SQL Editor):');
        console.log('=' .repeat(80));
        console.log(sqlQueries.join('\n\n'));
        console.log('=' .repeat(80));
        process.exit(1);
      }
    } else {
      console.log('✅ SQL ejecutado exitosamente');
      console.log('📊 Resultado:', data);
    }
  } catch (error) {
    console.error('❌ Error ejecutando SQL:', error.message);
    console.log('\n📋 Por favor, copia este SQL en tu dashboard de Supabase (SQL Editor):');
    console.log('=' .repeat(80));
    console.log(sqlQueries.join('\n\n'));
    console.log('=' .repeat(80));
    process.exit(1);
  }
}

executeSql();
