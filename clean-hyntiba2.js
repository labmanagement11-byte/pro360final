const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hecvlywrahigujakkguw.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlY3ZseXdyYWhpZ3VqYWtrZ3V3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjcyMzg2NCwiZXhwIjoyMDgyMjk5ODY0fQ.ZgmvGtXXCSNJ51RsHBe0vBONP6TaZ_pAW5fcRJchSCA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanHyntiba2() {
  console.log('🗑️  LIMPIANDO DATOS DE HYNTIBA2\n');
  console.log('═════════════════════════════════');

  try {
    // 1. Borrar de tabla legacy
    console.log('\n🗑️  Borrando de tabla legacy (checklist)...');
    const { data: deleted1, error: error1 } = await supabase
      .from('checklist')
      .delete()
      .eq('house', 'HYNTIBA2 APTO 406');

    if (error1) {
      console.log('❌ Error:', error1.message);
    } else {
      console.log('✅ Borrados items de tabla legacy');
    }

    // 2. Borrar de tabla moderna
    console.log('\n🗑️  Borrando de tabla moderna (cleaning_checklist)...');
    const { data: deleted2, error: error2 } = await supabase
      .from('cleaning_checklist')
      .delete()
      .eq('house', 'HYNTIBA2 APTO 406');

    if (error2) {
      console.log('❌ Error:', error2.message);
    } else {
      console.log('✅ Borrados items de tabla moderna');
    }

    // 3. Verificar que está vacío
    console.log('\n📋 Verificando...');
    const { data: legacy, error: e1 } = await supabase
      .from('checklist')
      .select('*')
      .eq('house', 'HYNTIBA2 APTO 406');

    const { data: modern, error: e2 } = await supabase
      .from('cleaning_checklist')
      .select('*')
      .eq('house', 'HYNTIBA2 APTO 406');

    console.log(`  Tabla legacy: ${legacy?.length || 0} items`);
    console.log(`  Tabla moderna: ${modern?.length || 0} items`);

    if ((legacy?.length || 0) === 0 && (modern?.length || 0) === 0) {
      console.log('\n✅ ¡HYNTIBA2 limpiada! Lista vacía. Ahora agrega items desde la app.');
    }

  } catch (err) {
    console.error('Error:', err);
  }
}

cleanHyntiba2();
