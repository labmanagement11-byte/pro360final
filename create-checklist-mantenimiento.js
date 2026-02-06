import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createMantenimientoChecklist() {
  const mantenimientoId = 'a6ccf287-7dc4-440f-bc08-80d78d5de447';
  
  console.log(`📋 Creando checklist para Mantenimiento...\n`);
  
  const checklistItems = [
    // SISTEMAS ELÉCTRICOS
    { task: 'Chequear que el generador eléctrico funcione correctamente', zone: 'SISTEMAS ELÉCTRICOS', calendar_assignment_id: mantenimientoId, employee: 'Victor' },
    { task: 'Verificar que el sistema eléctrico esté en buen estado', zone: 'SISTEMAS ELÉCTRICOS', calendar_assignment_id: mantenimientoId, employee: 'Victor' },
    { task: 'Inspeccionar los interruptores y contactos', zone: 'SISTEMAS ELÉCTRICOS', calendar_assignment_id: mantenimientoId, employee: 'Victor' },
    
    // TUBERÍAS Y AGUA
    { task: 'Revisar tuberías por fugas', zone: 'TUBERÍAS Y AGUA', calendar_assignment_id: mantenimientoId, employee: 'Victor' },
    { task: 'Verificar presión de agua en duchas y grifos', zone: 'TUBERÍAS Y AGUA', calendar_assignment_id: mantenimientoId, employee: 'Victor' },
    { task: 'Limpiar filtros de agua', zone: 'TUBERÍAS Y AGUA', calendar_assignment_id: mantenimientoId, employee: 'Victor' },
    { task: 'Revisar tanque de agua', zone: 'TUBERÍAS Y AGUA', calendar_assignment_id: mantenimientoId, employee: 'Victor' },
    
    // AIRE ACONDICIONADO Y CLIMATIZACIÓN
    { task: 'Limpiar filtros de aire acondicionado', zone: 'AIRE ACONDICIONADO', calendar_assignment_id: mantenimientoId, employee: 'Victor' },
    { task: 'Verificar funcionamiento del aire acondicionado', zone: 'AIRE ACONDICIONADO', calendar_assignment_id: mantenimientoId, employee: 'Victor' },
    { task: 'Revisar refrigerante de AC', zone: 'AIRE ACONDICIONADO', calendar_assignment_id: mantenimientoId, employee: 'Victor' },
    
    // ÁREAS EXTERIORES
    { task: 'Cortar el césped', zone: 'ÁREAS VERDES', calendar_assignment_id: mantenimientoId, employee: 'Victor' },
    { task: 'Limpiar restos de césped', zone: 'ÁREAS VERDES', calendar_assignment_id: mantenimientoId, employee: 'Victor' },
    { task: 'Podar arbustos y plantas', zone: 'ÁREAS VERDES', calendar_assignment_id: mantenimientoId, employee: 'Victor' },
    { task: 'Regar plantas', zone: 'ÁREAS VERDES', calendar_assignment_id: mantenimientoId, employee: 'Victor' },
    
    // PUERTA Y ACCESOS
    { task: 'Revisar cerraduras de puertas', zone: 'PUERTAS Y ACCESOS', calendar_assignment_id: mantenimientoId, employee: 'Victor' },
    { task: 'Lubricar bisagras de puertas', zone: 'PUERTAS Y ACCESOS', calendar_assignment_id: mantenimientoId, employee: 'Victor' },
    { task: 'Verificar funcionamiento de puertas de emergencia', zone: 'PUERTAS Y ACCESOS', calendar_assignment_id: mantenimientoId, employee: 'Victor' },
    
    // ELECTRODOMÉSTICOS
    { task: 'Revisar refrigerador', zone: 'ELECTRODOMÉSTICOS', calendar_assignment_id: mantenimientoId, employee: 'Victor' },
    { task: 'Limpiar interno del horno', zone: 'ELECTRODOMÉSTICOS', calendar_assignment_id: mantenimientoId, employee: 'Victor' },
    { task: 'Verificar funcionamiento de lavadora', zone: 'ELECTRODOMÉSTICOS', calendar_assignment_id: mantenimientoId, employee: 'Victor' },
    { task: 'Revisar funcionamiento de microondas', zone: 'ELECTRODOMÉSTICOS', calendar_assignment_id: mantenimientoId, employee: 'Victor' },
    
    // PINTURA Y PAREDES
    { task: 'Inspeccionar paredes por grietas o daños', zone: 'PINTURA Y PAREDES', calendar_assignment_id: mantenimientoId, employee: 'Victor' },
    { task: 'Retocar pintura si es necesario', zone: 'PINTURA Y PAREDES', calendar_assignment_id: mantenimientoId, employee: 'Victor' },
    
    // SEGURIDAD
    { task: 'Revisar sistemas de seguridad', zone: 'SEGURIDAD', calendar_assignment_id: mantenimientoId, employee: 'Victor' },
    { task: 'Verificar cámaras de vigilancia', zone: 'SEGURIDAD', calendar_assignment_id: mantenimientoId, employee: 'Victor' },
    { task: 'Probar alarmas', zone: 'SEGURIDAD', calendar_assignment_id: mantenimientoId, employee: 'Victor' }
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
    
    console.log(`✅ ${data?.length || 0} items de mantenimiento creados\n`);
    
    // Agrupar por zona
    const byZone = data?.reduce((acc, item) => {
      if (!acc[item.zone]) acc[item.zone] = [];
      acc[item.zone].push(item);
      return acc;
    }, {});
    
    Object.entries(byZone || {}).forEach(([zone, items]) => {
      console.log(`\n🔧 ${zone}:`);
      items.forEach(item => {
        console.log(`  ✓ ${item.task}`);
      });
    });
    
    console.log('\n✅ Checklist de Mantenimiento listo para Victor');
    
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

createMantenimientoChecklist();
