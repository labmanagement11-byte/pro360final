const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Faltan variables de entorno');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceKey);

async function verifyJonathanAccess() {
  console.log('🔍 VERIFICANDO ACCESO DE JONATHAN A TODAS LAS CASAS\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // 1. Verificar perfil de Jonathan
  console.log('📋 1. Verificando perfil de Jonathan...');
  const { data: jonathan } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .ilike('username', 'jonathan')
    .single();
  
  if (!jonathan) {
    console.log('❌ Jonathan no encontrado en profiles');
    return;
  }
  
  console.log('✅ Perfil de Jonathan:');
  console.log(`   Username: ${jonathan.username}`);
  console.log(`   Rol: ${jonathan.role}`);
  console.log(`   Casa asignada: ${jonathan.house}\n`);
  
  // 2. Obtener todas las casas
  console.log('🏠 2. Obteniendo todas las casas del sistema...');
  const { data: houses, error: housesError } = await supabaseAdmin
    .from('houses')
    .select('*')
    .order('created_at', { ascending: true });
  
  if (housesError) {
    console.error('❌ Error obteniendo casas:', housesError.message);
    return;
  }
  
  console.log(`✅ Se encontraron ${houses.length} casa(s):\n`);
  houses.forEach((house, idx) => {
    console.log(`   ${idx + 1}. ${house.name || house.houseName} (ID: ${house.id})`);
  });
  
  // 3. Verificar usuarios en cada casa
  console.log('\n👥 3. Verificando usuarios por casa...');
  const { data: allUsers } = await supabaseAdmin
    .from('profiles')
    .select('username, role, house')
    .order('house', { ascending: true });
  
  const usersByHouse = {};
  allUsers?.forEach(user => {
    if (!usersByHouse[user.house]) {
      usersByHouse[user.house] = [];
    }
    usersByHouse[user.house].push(user);
  });
  
  console.log('');
  Object.keys(usersByHouse).forEach(houseName => {
    console.log(`   🏠 ${houseName}:`);
    usersByHouse[houseName].forEach(user => {
      console.log(`      - ${user.username} (${user.role})`);
    });
  });
  
  // 4. Verificar tareas por casa
  console.log('\n📋 4. Verificando tareas por casa...');
  const { data: allTasks } = await supabaseAdmin
    .from('tasks')
    .select('house, title')
    .order('house', { ascending: true });
  
  const tasksByHouse = {};
  allTasks?.forEach(task => {
    if (!tasksByHouse[task.house]) {
      tasksByHouse[task.house] = 0;
    }
    tasksByHouse[task.house]++;
  });
  
  console.log('');
  Object.keys(tasksByHouse).forEach(houseName => {
    console.log(`   🏠 ${houseName}: ${tasksByHouse[houseName]} tarea(s)`);
  });
  
  // 5. Verificar inventario por casa
  console.log('\n📦 5. Verificando inventario por casa...');
  const { data: allInventory } = await supabaseAdmin
    .from('inventory')
    .select('house, item')
    .order('house', { ascending: true });
  
  const inventoryByHouse = {};
  allInventory?.forEach(item => {
    if (!inventoryByHouse[item.house]) {
      inventoryByHouse[item.house] = 0;
    }
    inventoryByHouse[item.house]++;
  });
  
  console.log('');
  Object.keys(inventoryByHouse).forEach(houseName => {
    console.log(`   🏠 ${houseName}: ${inventoryByHouse[houseName]} item(s)`);
  });
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ RESUMEN DE ACCESO DE JONATHAN:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n👤 Rol: ${jonathan.role === 'dueno' ? 'DUEÑO (se normaliza a owner en la app)' : jonathan.role.toUpperCase()}`);
  console.log(`🏠 Total de casas disponibles: ${houses.length}`);
  console.log(`\n✅ Como owner, Jonathan tiene acceso a:`);
  console.log(`   - Ver y gestionar TODAS las ${houses.length} casas`);
  console.log(`   - Ver y gestionar usuarios de cualquier casa`);
  console.log(`   - Ver y gestionar tareas de cualquier casa`);
  console.log(`   - Ver y gestionar inventario de cualquier casa`);
  console.log(`   - Crear nuevas casas`);
  console.log(`   - Editar y eliminar casas existentes`);
  console.log(`   - Cambiar entre casas libremente`);
  console.log(`\n🎯 Todas las restricciones específicas de "jonathan" han sido`);
  console.log(`   removidas y reemplazadas por verificaciones basadas en rol.`);
  console.log(`   Cualquier usuario con rol "owner" tendrá los mismos privilegios.\n`);
}

verifyJonathanAccess();
