const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const HOUSE_NAME = 'YNTIBA 2 406';
const HOUSE_DESCRIPTION = 'Apartamento de 2 habitaciones, 3 baños, sala, comedor, cocina y zona de lavandería para 4 personas';

async function createYntibaHouse() {
  try {
    console.log('🏠 Creando casa:', HOUSE_NAME);

    // 1. Crear la casa
    const { data: houseData, error: houseError } = await supabase
      .from('houses')
      .insert([{ name: HOUSE_NAME, created_at: new Date().toISOString() }])
      .select();

    if (houseError) {
      console.error('❌ Error creando casa:', houseError);
      return;
    }

    const houseId = houseData[0].id;
    console.log('✅ Casa creada:', houseId);

    // 2. Crear tareas de limpieza
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

    // 3. Crear inventario para 4 personas
    const inventoryItems = [
      { item: 'Almohadas', quantity: 8, house: HOUSE_NAME, zone: 'Habitaciones', type: 'textiles' },
      { item: 'Sábanas (juegos)', quantity: 12, house: HOUSE_NAME, zone: 'Habitaciones', type: 'textiles' },
      { item: 'Cobijas', quantity: 8, house: HOUSE_NAME, zone: 'Habitaciones', type: 'textiles' },
      { item: 'Toallas de Baño', quantity: 16, house: HOUSE_NAME, zone: 'Baños', type: 'textiles' },
      { item: 'Toallas de Mano', quantity: 16, house: HOUSE_NAME, zone: 'Baños', type: 'textiles' },
      { item: 'Tapetes de Baño', quantity: 3, house: HOUSE_NAME, zone: 'Baños', type: 'textiles' },
      { item: 'Cortinas', quantity: 5, house: HOUSE_NAME, zone: 'Ventanas', type: 'textiles' },
      { item: 'Sofá', quantity: 1, house: HOUSE_NAME, zone: 'Sala', type: 'muebles' },
      { item: 'Mesas de Centro', quantity: 2, house: HOUSE_NAME, zone: 'Sala', type: 'muebles' },
      { item: 'Sillas de Comedor', quantity: 6, house: HOUSE_NAME, zone: 'Comedor', type: 'muebles' },
      { item: 'Mesa de Comedor', quantity: 1, house: HOUSE_NAME, zone: 'Comedor', type: 'muebles' },
      { item: 'Platos (juegos)', quantity: 4, house: HOUSE_NAME, zone: 'Cocina', type: 'utensilios' },
      { item: 'Vasos', quantity: 16, house: HOUSE_NAME, zone: 'Cocina', type: 'utensilios' },
      { item: 'Cubiertos (juegos)', quantity: 4, house: HOUSE_NAME, zone: 'Cocina', type: 'utensilios' },
      { item: 'Ollas', quantity: 5, house: HOUSE_NAME, zone: 'Cocina', type: 'utensilios' },
      { item: 'Sartenes', quantity: 4, house: HOUSE_NAME, zone: 'Cocina', type: 'utensilios' },
      { item: 'Cuchillos', quantity: 8, house: HOUSE_NAME, zone: 'Cocina', type: 'utensilios' },
      { item: 'Tabla de Corte', quantity: 2, house: HOUSE_NAME, zone: 'Cocina', type: 'utensilios' },
      { item: 'Jarras', quantity: 4, house: HOUSE_NAME, zone: 'Cocina', type: 'utensilios' },
      { item: 'Basuras', quantity: 5, house: HOUSE_NAME, zone: 'General', type: 'utensilios' },
      { item: 'Escobas', quantity: 3, house: HOUSE_NAME, zone: 'General', type: 'limpieza' },
      { item: 'Trapeadores', quantity: 2, house: HOUSE_NAME, zone: 'General', type: 'limpieza' },
      { item: 'Paños de Limpieza', quantity: 12, house: HOUSE_NAME, zone: 'General', type: 'limpieza' },
      { item: 'Desinfectante', quantity: 4, house: HOUSE_NAME, zone: 'General', type: 'limpieza' },
      { item: 'Jabón Líquido', quantity: 4, house: HOUSE_NAME, zone: 'General', type: 'limpieza' },
      { item: 'Papel Higiénico', quantity: 24, house: HOUSE_NAME, zone: 'Baños', type: 'consumibles' },
      { item: 'Jabón de Baño', quantity: 8, house: HOUSE_NAME, zone: 'Baños', type: 'consumibles' },
      { item: 'Champú', quantity: 4, house: HOUSE_NAME, zone: 'Baños', type: 'consumibles' },
      { item: 'Detergente para Ropa', quantity: 4, house: HOUSE_NAME, zone: 'Lavandería', type: 'consumibles' },
      { item: 'Suavizante', quantity: 2, house: HOUSE_NAME, zone: 'Lavandería', type: 'consumibles' },
    ];

    const { data: inventoryData, error: inventoryError } = await supabase
      .from('inventory_items')
      .insert(inventoryItems)
      .select();

    if (inventoryError) {
      console.error('❌ Error creando inventario:', inventoryError);
      return;
    }

    console.log(`✅ ${inventoryItems.length} items de inventario creados`);

    // 4. Crear zonas de limpieza para checklist
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

    const { data: checklistData, error: checklistError } = await supabase
      .from('checklist_items')
      .insert(checklistItems)
      .select();

    if (checklistError) {
      console.error('❌ Error creando checklist:', checklistError);
      return;
    }

    console.log(`✅ ${checklistItems.length} items de checklist creados`);

    console.log('\n' + '='.repeat(60));
    console.log('✅✅✅ Casa YNTIBA 2 406 creada exitosamente');
    console.log('='.repeat(60));
    console.log('\nInfraestructura creada:');
    console.log(`   🏠 Casa: ${HOUSE_NAME}`);
    console.log(`   📋 Tareas de limpieza: ${cleaningTasks.length} (${cleaningTasks.filter(t => t.type === 'regular').length} regulares + ${cleaningTasks.filter(t => t.type === 'profunda').length} profundas)`);
    console.log(`   📦 Items de inventario: ${inventoryItems.length}`);
    console.log(`   ✓ Items de checklist: ${checklistItems.length}`);
    console.log('\n📝 Próximo paso: Crear los usuarios para esta casa');
    console.log('='.repeat(60));
    process.exit(0);
  } catch (error) {
    console.error('❌ Error general:', error);
    process.exit(1);
  }
}

createYntibaHouse();
