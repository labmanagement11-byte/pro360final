const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hecvlywrahigujakkguw.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlY3ZseXdyYWhpZ3VqYWtrZ3V3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjcyMzg2NCwiZXhwIjoyMDgyMjk5ODY0fQ.ZgmvGtXXCSNJ51RsHBe0vBONP6TaZ_pAW5fcRJchSCA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugHyntiba2() {
  console.log('🔍 DEBUGGING HYNTIBA2 CHECKLIST\n');
  console.log('═════════════════════════════════');

  try {
    // Verificar tabla legacy 'checklist'
    console.log('\n📋 TABLA LEGACY (checklist):');
    const { data: legacyData, error: legacyError } = await supabase
      .from('checklist')
      .select('*')
      .eq('house', 'HYNTIBA2 APTO 406')
      .limit(50);

    if (legacyError) {
      console.log('❌ Error:', legacyError);
    } else {
      console.log(`  Total registros: ${legacyData.length}`);
      console.log(`  Items con complete=true: ${legacyData.filter(i => i.complete).length}`);
      console.log(`  Items con complete=false: ${legacyData.filter(i => !i.complete).length}`);
      legacyData.slice(0, 5).forEach(item => {
        console.log(`    - ${item.item?.substring(0, 50)} | complete: ${item.complete}`);
      });
    }

    // Verificar tabla moderna 'cleaning_checklist'
    console.log('\n📋 TABLA MODERNA (cleaning_checklist):');
    const { data: modernData, error: modernError } = await supabase
      .from('cleaning_checklist')
      .select('*')
      .eq('house', 'HYNTIBA2 APTO 406')
      .limit(50);

    if (modernError) {
      console.log('❌ Error:', modernError);
    } else {
      console.log(`  Total registros: ${modernData.length}`);
      console.log(`  Items con completed=true: ${modernData.filter(i => i.completed).length}`);
      console.log(`  Items con completed=false: ${modernData.filter(i => !i.completed).length}`);
      modernData.slice(0, 5).forEach(item => {
        console.log(`    - ${item.task?.substring(0, 50)} | completed: ${item.completed}`);
      });
    }

    console.log('\n✅ Debug completado');
  } catch (err) {
    console.error('Error:', err);
  }
}

debugHyntiba2();
