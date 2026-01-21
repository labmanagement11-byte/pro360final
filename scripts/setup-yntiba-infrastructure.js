const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const HOUSE_NAME = 'YNTIBA 2 406';

async function createYntibaInfrastructure() {
  try {
    console.log(`\n🏠 Creando infraestructura para: ${HOUSE_NAME}\n`);

    // 1. Crear tareas de limpieza
    const cleaningTasks = [
      {
        title: 'Limpieza Regular - Sala y Comedor',
        description: 'Barrer, trapear, limpiar sofás y mesas',
        type: 'regular',
        house: HOUSE_NAME,
        assigned_to: 'Por asignar',
        created_by: 'admin',
        completed: false,
      },
      {
        title: 'Limpieza Regular - Habitaciones',
        description: 'Limpiar pisos, cambiar sábanas, organizar espacios',
        type: 'regular',
        house: HOUSE_NAME,
        assigned_to: 'Por asignar',
        created_by: 'admin',
        completed: false,
      },
      {
        title: 'Limpieza Regular - Baños',
        description: 'Limpiar sanitarios, espejos, pisos y duchas',
        type: 'regular',
        house: HOUSE_NAME,
        assigned_to: 'Por asignar',
        created_by: 'admin',
        completed: false,
      },
      {
        title: 'Limpieza Regular - Cocina',
        description: 'Limpiar encimeras, estufa, refrigerador y pisos',
        type: 'regular',
        house: HOUSE_NAME,
        assigned_to: 'Por asignar',
        created_by: 'admin',
        completed: false,
      },
      {
        title: 'Limpieza Regular - Zona de Lavandería',
        description: 'Limpiar lavadora, secadora, estantes y pisos',
        type: 'regular',
        house: HOUSE_NAME,
        assigned_to: 'Por asignar',
        created_by: 'admin',
        completed: false,
      },
      {
        title: 'Limpieza Profunda - Paredes y Techos',
        description: 'Limpiar paredes, techos, esquinas y eliminar telarañas en toda la casa',
        type: 'profunda',
        house: HOUSE_NAME,
        assigned_to: 'Por asignar',
        created_by: 'admin',
        completed: false,
      },
      {
        title: 'Limpieza Profunda - Refrigerador',
        description: 'Descongelar, limpiar bandejas y estantes del refrigerador',
        type: 'profunda',
        house: HOUSE_NAME,
        assigned_to: 'Por asignar',
        created_by: 'admin',
        completed: false,
      },
      {
        title: 'Limpieza Profunda - Horno y Microondas',
        description: 'Limpiar horno, microondas y todos los electrodomésticos de cocina',
        type: 'profunda',
        house: HOUSE_NAME,
        assigned_to: 'Por asignar',
        created_by: 'admin',
        completed: false,
      },
      {
        title: 'Limpieza Profunda - Ventanas',
        description: 'Limpiar ventanas interiores, exteriores y marcos',
        type: 'profunda',
        house: HOUSE_NAME,
        assigned_to: 'Por asignar',
        created_by: 'admin',
        completed: false,
      },
      {
        title: 'Limpieza Profunda - Cortinas y Tapetes',
        description: 'Lavar cortinas, tapetes y limpiar pisos profundamente',
        type: 'profunda',
        house: HOUSE_NAME,
        assigned_to: 'Por asignar',
        created_by: 'admin',
        completed: false,
      },
    ];

    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .insert(cleaningTasks)
      .select();

    if (tasksError) {
      console.error('❌ Error creando tareas:', tasksError);
      return;
    }

    console.log(`✅ ${cleaningTasks.length} tareas de limpieza creadas`);

    // 2. Crear inventario para 4 personas
    const inventoryItems = [
      { name: 'Almohadas', quantity: 8, location: 'Habitaciones', complete: true, house: HOUSE_NAME, notes: 'Set de 8 para 2 habitaciones (4 c/u)' },
      { name: 'Sábanas (juegos)', quantity: 12, location: 'Habitaciones', complete: true, house: HOUSE_NAME, notes: 'Juegos completos' },
      { name: 'Cobijas', quantity: 8, location: 'Habitaciones', complete: true, house: HOUSE_NAME, notes: '' },
      { name: 'Toallas de Baño', quantity: 16, location: 'Baños', complete: true, house: HOUSE_NAME, notes: '' },
      { name: 'Toallas de Mano', quantity: 16, location: 'Baños', complete: true, house: HOUSE_NAME, notes: '' },
      { name: 'Tapetes de Baño', quantity: 3, location: 'Baños', complete: true, house: HOUSE_NAME, notes: '1 principal, 1 secundario, 1 extra' },
      { name: 'Cortinas', quantity: 5, location: 'Ventanas', complete: true, house: HOUSE_NAME, notes: 'Para todas las ventanas' },
      { name: 'Sofá', quantity: 1, location: 'Sala', complete: true, house: HOUSE_NAME, notes: 'Sofá modular' },
      { name: 'Mesas de Centro', quantity: 2, location: 'Sala', complete: true, house: HOUSE_NAME, notes: '' },
      { name: 'Sillas de Comedor', quantity: 6, location: 'Comedor', complete: true, house: HOUSE_NAME, notes: 'Para 6 personas' },
      { name: 'Mesa de Comedor', quantity: 1, location: 'Comedor', complete: true, house: HOUSE_NAME, notes: 'Grande, extensible' },
      { name: 'Platos (juegos)', quantity: 4, location: 'Cocina', complete: true, house: HOUSE_NAME, notes: 'Juegos completos para 4' },
      { name: 'Vasos', quantity: 16, location: 'Cocina', complete: true, house: HOUSE_NAME, notes: '4 c/u para 4 personas' },
      { name: 'Cubiertos (juegos)', quantity: 4, location: 'Cocina', complete: true, house: HOUSE_NAME, notes: 'Juegos completos' },
      { name: 'Ollas', quantity: 5, location: 'Cocina', complete: true, house: HOUSE_NAME, notes: 'Diferentes tamaños' },
      { name: 'Sartenes', quantity: 4, location: 'Cocina', complete: true, house: HOUSE_NAME, notes: '' },
      { name: 'Cuchillos', quantity: 8, location: 'Cocina', complete: true, house: HOUSE_NAME, notes: 'Variedad de tamaños' },
      { name: 'Tabla de Corte', quantity: 2, location: 'Cocina', complete: true, house: HOUSE_NAME, notes: '' },
      { name: 'Jarras', quantity: 4, location: 'Cocina', complete: true, house: HOUSE_NAME, notes: 'Para agua y jugos' },
      { name: 'Basuras', quantity: 5, location: 'General', complete: true, house: HOUSE_NAME, notes: 'Ubicadas en diferentes áreas' },
      { name: 'Escobas', quantity: 3, location: 'General', complete: true, house: HOUSE_NAME, notes: '' },
      { name: 'Trapeadores', quantity: 2, location: 'General', complete: true, house: HOUSE_NAME, notes: '' },
      { name: 'Paños de Limpieza', quantity: 12, location: 'General', complete: true, house: HOUSE_NAME, notes: 'Microfibra y algodón' },
      { name: 'Desinfectante', quantity: 4, location: 'General', complete: true, house: HOUSE_NAME, notes: 'Botellas spray' },
      { name: 'Jabón Líquido', quantity: 4, location: 'General', complete: true, house: HOUSE_NAME, notes: 'Para manos y uso general' },
      { name: 'Papel Higiénico', quantity: 24, location: 'Baños', complete: true, house: HOUSE_NAME, notes: 'Rollos' },
      { name: 'Jabón de Baño', quantity: 8, location: 'Baños', complete: true, house: HOUSE_NAME, notes: '' },
      { name: 'Champú', quantity: 4, location: 'Baños', complete: true, house: HOUSE_NAME, notes: 'Botellas' },
      { name: 'Detergente para Ropa', quantity: 4, location: 'Lavandería', complete: true, house: HOUSE_NAME, notes: 'Botellas' },
      { name: 'Suavizante', quantity: 2, location: 'Lavandería', complete: true, house: HOUSE_NAME, notes: 'Botellas' },
    ];

    const { data: inventoryData, error: inventoryError } = await supabase
      .from('inventory')
      .insert(inventoryItems)
      .select();

    if (inventoryError) {
      console.error('❌ Error creando inventario:', inventoryError);
      return;
    }

    console.log(`✅ ${inventoryItems.length} items de inventario creados`);

    // 3. Crear checklist items (opcional si la tabla existe)
    const checklistItems = [
      { taskId: tasksData[0].id, zona: 'Sala', text: 'Barrer pisos', completed: false, house: HOUSE_NAME, type: 'regular' },
      { taskId: tasksData[0].id, zona: 'Sala', text: 'Limpiar sofá', completed: false, house: HOUSE_NAME, type: 'regular' },
      { taskId: tasksData[0].id, zona: 'Comedor', text: 'Limpiar mesas', completed: false, house: HOUSE_NAME, type: 'regular' },
      { taskId: tasksData[1].id, zona: 'Habitación 1', text: 'Limpiar piso', completed: false, house: HOUSE_NAME, type: 'regular' },
      { taskId: tasksData[1].id, zona: 'Habitación 2', text: 'Cambiar sábanas', completed: false, house: HOUSE_NAME, type: 'regular' },
      { taskId: tasksData[2].id, zona: 'Baño Principal', text: 'Limpiar sanitario', completed: false, house: HOUSE_NAME, type: 'regular' },
      { taskId: tasksData[2].id, zona: 'Baño Principal', text: 'Limpiar espejo', completed: false, house: HOUSE_NAME, type: 'regular' },
      { taskId: tasksData[2].id, zona: 'Baño Secundario', text: 'Limpiar ducha', completed: false, house: HOUSE_NAME, type: 'regular' },
      { taskId: tasksData[3].id, zona: 'Cocina', text: 'Limpiar encimeras', completed: false, house: HOUSE_NAME, type: 'regular' },
      { taskId: tasksData[3].id, zona: 'Cocina', text: 'Limpiar estufa', completed: false, house: HOUSE_NAME, type: 'regular' },
      { taskId: tasksData[4].id, zona: 'Lavandería', text: 'Limpiar lavadora', completed: false, house: HOUSE_NAME, type: 'regular' },
    ];

    try {
      const { data: checklistData, error: checklistError } = await supabase
        .from('checklist_items')
        .insert(checklistItems)
        .select();

      if (!checklistError) {
        console.log(`✅ ${checklistItems.length} items de checklist creados`);
      } else {
        console.log(`⚠️  Checklist no se creó (tabla puede no existir): ${checklistError.message}`);
      }
    } catch (error) {
      console.log(`⚠️  Checklist omitido por ahora`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅✅✅ Casa YNTIBA 2 406 completamente configurada');
    console.log('='.repeat(70));
    console.log('\n📊 Infraestructura creada:');
    console.log(`   🏠 Casa: ${HOUSE_NAME}`);
    console.log(`   📋 Tareas de limpieza: ${cleaningTasks.length}`);
    console.log(`      - Limpieza Regular: ${cleaningTasks.filter(t => t.type === 'regular').length} tareas`);
    console.log(`      - Limpieza Profunda: ${cleaningTasks.filter(t => t.type === 'profunda').length} tareas`);
    console.log(`   📦 Items de inventario: ${inventoryItems.length}`);
    console.log(`      - Textiles: ${inventoryItems.filter(i => i.type === 'textiles').length}`);
    console.log(`      - Muebles: ${inventoryItems.filter(i => i.type === 'muebles').length}`);
    console.log(`      - Utensilios: ${inventoryItems.filter(i => i.type === 'utensilios').length}`);
    console.log(`      - Limpieza: ${inventoryItems.filter(i => i.type === 'limpieza').length}`);
    console.log(`      - Consumibles: ${inventoryItems.filter(i => i.type === 'consumibles').length}`);
    console.log(`   ✓ Items de checklist: ${checklistItems.length}`);
    console.log('\n📝 Siguiente paso: Crear usuarios para YNTIBA 2 406');
    console.log('='.repeat(70));
    console.log('\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error general:', error);
    process.exit(1);
  }
}

createYntibaInfrastructure();
