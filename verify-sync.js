const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://hecvlywrahigujakkguw.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlY3ZseXdyYWhpZ3VqYWtrZ3V3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjcyMzg2NCwiZXhwIjoyMDgyMjk5ODY0fQ.ZgmvGtXXCSNJ51RsHBe0vBONP6TaZ_pAW5fcRJchSCA');

async function verify() {
  console.log('📋 VERIFICANDO ESTADO\n');
  
  // 1. Obtener todos los assignments
  const { data: assignments } = await supabase
    .from('calendar_assignments')
    .select('id, employee, house, type, date, created_at')
    .order('id', { ascending: false })
    .limit(5);

  console.log('📌 ÚLTIMOS 5 ASSIGNMENTS:');
  assignments.forEach(a => {
    console.log(`  ID: ${a.id} | ${a.employee} | ${a.house} | ${a.type} | ${a.date}`);
  });
  
  console.log('\n');
  
  // 2. Obtener perfil de Victor
  const { data: victor } = await supabase
    .from('users')
    .select('username, house, house_id, role')
    .eq('username', 'Victor')
    .single();
  
  if (victor) {
    console.log('👤 PERFIL DE VICTOR:');
    console.log(`  username: ${victor.username}`);
    console.log(`  house: ${victor.house}`);
    console.log(`  house_id: ${victor.house_id}`);
    console.log(`  role: ${victor.role}`);
  }
  
  console.log('\n');
  
  // 3. Obtener perfil de Jonathan
  const { data: jonathan } = await supabase
    .from('users')
    .select('username, house, house_id, role')
    .eq('username', 'Jonathan')
    .single();
  
  if (jonathan) {
    console.log('👤 PERFIL DE JONATHAN:');
    console.log(`  username: ${jonathan.username}`);
    console.log(`  house: ${jonathan.house}`);
    console.log(`  house_id: ${jonathan.house_id}`);
    console.log(`  role: ${jonathan.role}`);
  }
  
  console.log('\n');
  
  // 4. Verificar si hay assignments para Victor en EPIC D1
  if (victor) {
    const { data: victorsAssignments } = await supabase
      .from('calendar_assignments')
      .select('id, employee, house, type, date')
      .eq('employee', 'Victor')
      .eq('house', victor.house);
    
    console.log(`✅ ASSIGNMENTS PARA VICTOR EN ${victor.house}:`);
    if (victorsAssignments && victorsAssignments.length > 0) {
      victorsAssignments.forEach(a => {
        console.log(`  ID: ${a.id} | ${a.type} | ${a.date}`);
      });
    } else {
      console.log('  ❌ NINGUNO');
    }
  }
}

verify();
