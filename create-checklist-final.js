import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createChecklist() {
  const regularId = 'a03bbb3e-8750-4ced-9742-dc689fec0889';
  
  console.log(`📋 Creando checklist para Limpieza Regular...\n`);
  
  const checklistItems = [
    // LIMPIEZA GENERAL
    { task: 'Barrer toda la casa', zone: 'LIMPIEZA GENERAL', calendar_assignment_id: regularId, employee: 'Victor' },
    { task: 'Trapear toda la casa', zone: 'LIMPIEZA GENERAL', calendar_assignment_id: regularId, employee: 'Victor' },
    { task: 'Quitar el polvo de superficies', zone: 'LIMPIEZA GENERAL', calendar_assignment_id: regularId, employee: 'Victor' },
    { task: 'Vaciar basureros', zone: 'LIMPIEZA GENERAL', calendar_assignment_id: regularId, employee: 'Victor' },
    
    // COCINA
    { task: 'Limpiar tope de cocina', zone: 'COCINA', calendar_assignment_id: regularId, employee: 'Victor' },
    { task: 'Lavar platos y cubiertos', zone: 'COCINA', calendar_assignment_id: regularId, employee: 'Victor' },
    { task: 'Limpiar estufa', zone: 'COCINA', calendar_assignment_id: regularId, employee: 'Victor' },
    { task: 'Limpiar microondas', zone: 'COCINA', calendar_assignment_id: regularId, employee: 'Victor' },
    { task: 'Barrer y trapear cocina', zone: 'COCINA', calendar_assignment_id: regularId, employee: 'Victor' },
    
    // BAÑOS
    { task: 'Limpiar y desinfectar inodoro', zone: 'BAÑOS', calendar_assignment_id: regularId, employee: 'Victor' },
    { task: 'Limpiar lavamanos', zone: 'BAÑOS', calendar_assignment_id: regularId, employee: 'Victor' },
    { task: 'Limpiar ducha/bañera', zone: 'BAÑOS', calendar_assignment_id: regularId, employee: 'Victor' },
    { task: 'Limpiar espejos', zone: 'BAÑOS', calendar_assignment_id: regularId, employee: 'Victor' },
    { task: 'Barrer y trapear baños', zone: 'BAÑOS', calendar_assignment_id: regularId, employee: 'Victor' },
    
    // HABITACIONES
    { task: 'Tender camas', zone: 'HABITACIONES', calendar_assignment_id: regularId, employee: 'Victor' },
    { task: 'Organizar ropa', zone: 'HABITACIONES', calendar_assignment_id: regularId, employee: 'Victor' },
    { task: 'Quitar polvo de muebles', zone: 'HABITACIONES', calendar_assignment_id: regularId, employee: 'Victor' },
    { task: 'Barrer habitaciones', zone: 'HABITACIONES', calendar_assignment_id: regularId, employee: 'Victor' },
    
    // SALA
    { task: 'Organizar muebles y cojines', zone: 'SALA', calendar_assignment_id: regularId, employee: 'Victor' },
    { task: 'Quitar polvo de decoración', zone: 'SALA', calendar_assignment_id: regularId, employee: 'Victor' },
    { task: 'Limpiar televisor', zone: 'SALA', calendar_assignment_id: regularId, employee: 'Victor' },
    { task: 'Barrer y trapear sala', zone: 'SALA', calendar_assignment_id: regularId, employee: 'Victor' }
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
    
    console.log(`✅ ${data?.length || 0} items de checklist creados\n`);
    
    // Agrupar por zona
    const byZone = data?.reduce((acc, item) => {
      if (!acc[item.zone]) acc[item.zone] = [];
      acc[item.zone].push(item);
      return acc;
    }, {});
    
    Object.entries(byZone || {}).forEach(([zone, items]) => {
      console.log(`\n📍 ${zone}:`);
      items.forEach(item => {
        console.log(`  ✓ ${item.task}`);
      });
    });
    
    console.log('\n✅ Checklist de Limpieza Regular listo para Victor');
    
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

createChecklist();
