import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createLimpiezaProfundaChecklist() {
  const profundaId = 'a611a7e6-0e94-4516-ba73-5a9c8097c7f4';
  
  console.log(`🗑️  Eliminando 29 tareas anteriores...\n`);
  
  // Eliminar todas las tareas de Limpieza Profunda
  const { error: deleteError } = await supabase
    .from('cleaning_checklist')
    .delete()
    .eq('calendar_assignment_id', profundaId);
  
  if (deleteError) {
    console.error('❌ Error eliminando:', deleteError);
    return;
  }
  
  console.log('✅ Tareas anteriores eliminadas\n');
  console.log(`📋 Creando 5 tareas para Limpieza Profunda...\n`);
  
  const checklistItems = [
    { task: 'Lavar los forros de los muebles (sofás, sillas y cojines)', zone: 'LIMPIEZA PROFUNDA', calendar_assignment_id: profundaId, employee: 'Victor' },
    { task: 'Limpiar todas las ventanas y ventanales de la casa, por dentro y por fuera', zone: 'LIMPIEZA PROFUNDA', calendar_assignment_id: profundaId, employee: 'Victor' },
    { task: 'Limpiar con hidrolavadora el piso exterior, incluyendo escaleras, terraza y placas vehiculares', zone: 'LIMPIEZA PROFUNDA', calendar_assignment_id: profundaId, employee: 'Victor' },
    { task: 'Lavar la caneca grande de basura ubicada debajo de la escalera', zone: 'LIMPIEZA PROFUNDA', calendar_assignment_id: profundaId, employee: 'Victor' },
    { task: 'Desinfectar todas las superficies de alto contacto', zone: 'LIMPIEZA PROFUNDA', calendar_assignment_id: profundaId, employee: 'Victor' }
  ];
  
  try {
    const { data, error } = await supabase
      .from('cleaning_checklist')
      .insert(checklistItems)
      .select();
    
    if (error) {
      console.error('❌ Error insertando:', error);
      return;
    }
    
    console.log(`✅ ${data?.length || 0} tareas de limpieza profunda creadas\n`);
    
    data?.forEach((item, i) => {
      console.log(`${i + 1}. ${item.task}`);
    });
    
    console.log('\n✅ Limpieza Profunda lista para Victor (5 tareas)');
    
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

createLimpiezaProfundaChecklist();
