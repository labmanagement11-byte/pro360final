const { createClient } = require('@supabase/supabase-js');

// Usar credenciales directamente (ya que estamos en un script)
const supabase = createClient(
  'https://yvowykxomuwqkvpkwhsx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2b3d5a3hvbXV3cWt2cGt3aHN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAwMDM5NjgsImV4cCI6MjA0NTU3OTk2OH0.hVNqCh8zr3pGfLxApNiJYxOQ9u0V-AZtfBl8w4-eqgQ'
);

async function inspectData() {
  try {
    // Obtener 3 items de ejemplo para ver estructura
    const { data: sample, error: sampleError } = await supabase
      .from('cleaning_checklist')
      .select('*')
      .limit(3);

    if (sampleError) {
      console.error('❌ Error fetching sample:', sampleError);
      return;
    }

    console.log('📊 Sample de cleaning_checklist:');
    console.log(JSON.stringify(sample, null, 2));
    
    if (sample && sample.length > 0) {
      console.log('\n📝 Campos disponibles:');
      console.log(Object.keys(sample[0]));
    }

    // Obtener estadísticas
    const { data: stats, error: statsError } = await supabase
      .from('cleaning_checklist')
      .select('employee, house, COUNT(*) as count', { count: 'exact' })
      .limit(1000);

    console.log('\n📈 Total items:', sample ? 'fetching...' : 0);

    // Intentar contar por tabla directamente
    const { count } = await supabase
      .from('cleaning_checklist')
      .select('*', { count: 'exact', head: true });

    console.log(`\n📊 Total items en tabla: ${count}`);

  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

inspectData();
