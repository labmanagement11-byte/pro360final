import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createLimpiezaProfundaChecklist() {
  const profundaId = 'a611a7e6-0e94-4516-ba73-5a9c8097c7f4';
  
  console.log(`📋 Creando checklist para Limpieza Profunda...\n`);
  
  const checklistItems = [
    // COCINA - PROFUNDA
    { task: 'Limpiar interior del horno a fondo', zone: 'COCINA PROFUNDA', calendar_assignment_id: profundaId, employee: 'Victor' },
    { task: 'Desinfectar y limpiar interior del refrigerador', zone: 'COCINA PROFUNDA', calendar_assignment_id: profundaId, employee: 'Victor' },
    { task: 'Limpiar y desengrasra estufa completamente', zone: 'COCINA PROFUNDA', calendar_assignment_id: profundaId, employee: 'Victor' },
    { task: 'Limpiar campana de extracción', zone: 'COCINA PROFUNDA', calendar_assignment_id: profundaId, employee: 'Victor' },
    { task: 'Limpiar detrás de electrodomésticos', zone: 'COCINA PROFUNDA', calendar_assignment_id: profundaId, employee: 'Victor' },
    
    // BAÑOS - PROFUNDA
    { task: 'Limpiar a fondo azulejos y lechada', zone: 'BAÑOS PROFUNDA', calendar_assignment_id: profundaId, employee: 'Victor' },
    { task: 'Desinfectar inodoro por dentro y fuera', zone: 'BAÑOS PROFUNDA', calendar_assignment_id: profundaId, employee: 'Victor' },
    { task: 'Limpiar profundamente ducha/bañera', zone: 'BAÑOS PROFUNDA', calendar_assignment_id: profundaId, employee: 'Victor' },
    { task: 'Limpiar ventilador de baño', zone: 'BAÑOS PROFUNDA', calendar_assignment_id: profundaId, employee: 'Victor' },
    { task: 'Desinfectar accesorios de baño', zone: 'BAÑOS PROFUNDA', calendar_assignment_id: profundaId, employee: 'Victor' },
    
    // HABITACIONES - PROFUNDA
    { task: 'Limpiar bajo y atrás de muebles', zone: 'HABITACIONES PROFUNDA', calendar_assignment_id: profundaId, employee: 'Victor' },
    { task: 'Limpiar interior de closets', zone: 'HABITACIONES PROFUNDA', calendar_assignment_id: profundaId, employee: 'Victor' },
    { task: 'Aspirar bajo la cama y mobiliario', zone: 'HABITACIONES PROFUNDA', calendar_assignment_id: profundaId, employee: 'Victor' },
    { task: 'Limpiar molduras y esquinas', zone: 'HABITACIONES PROFUNDA', calendar_assignment_id: profundaId, employee: 'Victor' },
    
    // SALA - PROFUNDA
    { task: 'Lavar los forros de muebles', zone: 'SALA PROFUNDA', calendar_assignment_id: profundaId, employee: 'Victor' },
    { task: 'Limpiar bajo y detrás de sofás', zone: 'SALA PROFUNDA', calendar_assignment_id: profundaId, employee: 'Victor' },
    { task: 'Limpiar lámparas y pantallas', zone: 'SALA PROFUNDA', calendar_assignment_id: profundaId, employee: 'Victor' },
    { task: 'Desinfectar control remoto y accesorios', zone: 'SALA PROFUNDA', calendar_assignment_id: profundaId, employee: 'Victor' },
    
    // VENTANAS Y CRISTALES - PROFUNDA
    { task: 'Limpiar todas las ventanas por dentro y fuera', zone: 'VENTANAS', calendar_assignment_id: profundaId, employee: 'Victor' },
    { task: 'Limpiar marcos de ventanas', zone: 'VENTANAS', calendar_assignment_id: profundaId, employee: 'Victor' },
    { task: 'Limpiar espejos completamente', zone: 'VENTANAS', calendar_assignment_id: profundaId, employee: 'Victor' },
    
    // ÁREAS EXTERIORES - PROFUNDA
    { task: 'Limpiar con hidrolavadora el piso exterior', zone: 'EXTERIORES', calendar_assignment_id: profundaId, employee: 'Victor' },
    { task: 'Limpiar escaleras y entradas', zone: 'EXTERIORES', calendar_assignment_id: profundaId, employee: 'Victor' },
    { task: 'Limpiar placas vehiculares', zone: 'EXTERIORES', calendar_assignment_id: profundaId, employee: 'Victor' },
    { task: 'Limpiar canales de drenaje', zone: 'EXTERIORES', calendar_assignment_id: profundaId, employee: 'Victor' },
    
    // GENERALIDADES - PROFUNDA
    { task: 'Lavar basureros internos y externos', zone: 'GENERALIDADES', calendar_assignment_id: profundaId, employee: 'Victor' },
    { task: 'Desinfectar todos los interruptores y manijas', zone: 'GENERALIDADES', calendar_assignment_id: profundaId, employee: 'Victor' },
    { task: 'Limpiar profundamente puertas y marcos', zone: 'GENERALIDADES', calendar_assignment_id: profundaId, employee: 'Victor' },
    { task: 'Lavar alfombras y tapetes', zone: 'GENERALIDADES', calendar_assignment_id: profundaId, employee: 'Victor' }
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
    
    console.log(`✅ ${data?.length || 0} items de limpieza profunda creados\n`);
    
    // Agrupar por zona
    const byZone = data?.reduce((acc, item) => {
      if (!acc[item.zone]) acc[item.zone] = [];
      acc[item.zone].push(item);
      return acc;
    }, {});
    
    Object.entries(byZone || {}).forEach(([zone, items]) => {
      console.log(`\n🧹 ${zone}:`);
      items.forEach(item => {
        console.log(`  ✓ ${item.task}`);
      });
    });
    
    console.log('\n✅ Checklist de Limpieza Profunda listo para Victor');
    
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

createLimpiezaProfundaChecklist();
