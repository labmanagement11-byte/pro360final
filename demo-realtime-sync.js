const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('📡 DEMOSTRACIÓN DE SINCRONIZACIÓN EN TIEMPO REAL\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

async function demonstrateRealtime() {
  const houseName = 'EPIC D1';
  
  console.log(`🏠 Configurando suscripción para casa: ${houseName}\n`);
  
  // Suscribirse a cambios en tareas
  console.log('🔔 Suscribiéndose a cambios en tareas...');
  const tasksChannel = supabase
    .channel(`demo-tasks-${houseName}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'tasks',
      filter: `house=eq.${houseName}`
    }, (payload) => {
      console.log('\n⚡ EVENTO RECIBIDO EN TAREAS:');
      console.log(`   Tipo: ${payload.eventType}`);
      if (payload.eventType === 'INSERT') {
        console.log(`   ➕ Nueva tarea: ${payload.new.title}`);
        console.log(`   📝 Asignada a: ${payload.new.assignedTo || 'No asignado'}`);
      } else if (payload.eventType === 'UPDATE') {
        console.log(`   ✏️ Tarea actualizada: ${payload.new.title}`);
        console.log(`   ✅ Completada: ${payload.new.completed ? 'Sí' : 'No'}`);
      } else if (payload.eventType === 'DELETE') {
        console.log(`   🗑️ Tarea eliminada: ${payload.old.title}`);
      }
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Suscrito a cambios de tareas\n');
      }
    });
  
  // Suscribirse a cambios en inventario
  console.log('🔔 Suscribiéndose a cambios en inventario...');
  const inventoryChannel = supabase
    .channel(`demo-inventory-${houseName}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'inventory',
      filter: `house=eq.${houseName}`
    }, (payload) => {
      console.log('\n⚡ EVENTO RECIBIDO EN INVENTARIO:');
      console.log(`   Tipo: ${payload.eventType}`);
      if (payload.eventType === 'INSERT') {
        console.log(`   ➕ Nuevo item: ${payload.new.item}`);
        console.log(`   📦 Cantidad: ${payload.new.quantity || 0}`);
      } else if (payload.eventType === 'UPDATE') {
        console.log(`   ✏️ Item actualizado: ${payload.new.item}`);
        console.log(`   📦 Nueva cantidad: ${payload.new.quantity || 0}`);
      } else if (payload.eventType === 'DELETE') {
        console.log(`   🗑️ Item eliminado: ${payload.old.item}`);
      }
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Suscrito a cambios de inventario\n');
      }
    });
  
  // Suscribirse a cambios en lista de compras
  console.log('🔔 Suscribiéndose a cambios en lista de compras...');
  const shoppingChannel = supabase
    .channel(`demo-shopping-${houseName}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'shopping_list',
      filter: `house=eq.${houseName}`
    }, (payload) => {
      console.log('\n⚡ EVENTO RECIBIDO EN LISTA DE COMPRAS:');
      console.log(`   Tipo: ${payload.eventType}`);
      if (payload.eventType === 'INSERT') {
        console.log(`   ➕ Nuevo item: ${payload.new.item_name}`);
        console.log(`   📦 Cantidad: ${payload.new.quantity}`);
      } else if (payload.eventType === 'UPDATE') {
        console.log(`   ✏️ Item actualizado: ${payload.new.item_name}`);
        console.log(`   ✅ Comprado: ${payload.new.is_purchased ? 'Sí' : 'No'}`);
      } else if (payload.eventType === 'DELETE') {
        console.log(`   🗑️ Item eliminado: ${payload.old.item_name}`);
      }
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Suscrito a cambios de lista de compras\n');
      }
    });
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📡 SINCRONIZACIÓN ACTIVA');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('🎯 Este script está escuchando cambios en tiempo real.');
  console.log('📱 Abre la aplicación en un navegador y realiza cambios.');
  console.log('⚡ Los cambios aparecerán aquí instantáneamente.\n');
  console.log('Presiona Ctrl+C para detener...\n');
  
  // Mantener el script corriendo
  process.stdin.resume();
}

demonstrateRealtime();
