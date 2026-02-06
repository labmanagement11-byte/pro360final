import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function fixInventoryForEPICDay1() {
  console.log('🗑️  Eliminando inventario incorrecto de EPIC D1...\n');
  
  // Eliminar inventario actual
  const { error: deleteError } = await supabase
    .from('inventory')
    .delete()
    .eq('house', 'EPIC D1');
  
  if (deleteError) {
    console.error('❌ Error eliminando:', deleteError);
    return;
  }
  
  console.log('✅ Inventario anterior eliminado\n');
  console.log('🏗️  Creando inventario correcto con OBJETOS de la casa...\n');
  
  const inventoryItems = [
    // Habitaciones
    {
      house: 'EPIC D1',
      name: 'Almohadas',
      location: 'Habitaciones',
      quantity: 8,
      complete: false,
      notes: 'Set de 8 para 2 habitaciones (4 c/u)'
    },
    {
      house: 'EPIC D1',
      name: 'Sábanas',
      location: 'Habitaciones',
      quantity: 4,
      complete: false,
      notes: 'Juego completo por cama'
    },
    {
      house: 'EPIC D1',
      name: 'Edredones',
      location: 'Habitaciones',
      quantity: 2,
      complete: false,
      notes: 'Uno por habitación'
    },
    
    // Baños
    {
      house: 'EPIC D1',
      name: 'Toallas grandes',
      location: 'Baños',
      quantity: 6,
      complete: false,
      notes: 'Toallas de cuerpo'
    },
    {
      house: 'EPIC D1',
      name: 'Toallas pequeñas',
      location: 'Baños',
      quantity: 6,
      complete: false,
      notes: 'Toallas de mano'
    },
    {
      house: 'EPIC D1',
      name: 'Papel higiénico',
      location: 'Baños',
      quantity: 12,
      complete: false,
      notes: 'Rollos de reserva'
    },
    
    // Cocina
    {
      house: 'EPIC D1',
      name: 'Platos',
      location: 'Cocina',
      quantity: 12,
      complete: false,
      notes: 'Platos hondos y planos'
    },
    {
      house: 'EPIC D1',
      name: 'Vasos',
      location: 'Cocina',
      quantity: 12,
      complete: false,
      notes: 'Vasos de vidrio'
    },
    {
      house: 'EPIC D1',
      name: 'Cubiertos',
      location: 'Cocina',
      quantity: 24,
      complete: false,
      notes: 'Juego completo (tenedores, cuchillos, cucharas)'
    },
    {
      house: 'EPIC D1',
      name: 'Ollas y sartenes',
      location: 'Cocina',
      quantity: 5,
      complete: false,
      notes: 'Set básico de cocina'
    },
    
    // Sala
    {
      house: 'EPIC D1',
      name: 'Cojines',
      location: 'Sala',
      quantity: 4,
      complete: false,
      notes: 'Cojines decorativos'
    },
    {
      house: 'EPIC D1',
      name: 'Mantas',
      location: 'Sala',
      quantity: 2,
      complete: false,
      notes: 'Mantas para sofá'
    },
    
    // Limpieza
    {
      house: 'EPIC D1',
      name: 'Productos de limpieza',
      location: 'Área de limpieza',
      quantity: 10,
      complete: false,
      notes: 'Detergentes, desinfectantes, etc.'
    },
    {
      house: 'EPIC D1',
      name: 'Escobas y trapeadores',
      location: 'Área de limpieza',
      quantity: 3,
      complete: false,
      notes: 'Set de limpieza'
    },
    {
      house: 'EPIC D1',
      name: 'Aspiradora',
      location: 'Área de limpieza',
      quantity: 1,
      complete: false,
      notes: 'Aspiradora principal'
    }
  ];
  
  try {
    const { data, error } = await supabase
      .from('inventory')
      .insert(inventoryItems)
      .select();
    
    if (error) {
      console.error('❌ Error insertando:', error);
      return;
    }
    
    console.log(`✅ ${data?.length || 0} items de inventario creados exitosamente\n`);
    
    // Verificar
    const { data: verify, error: verifyError } = await supabase
      .from('inventory')
      .select('*')
      .eq('house', 'EPIC D1')
      .order('location', { ascending: true });
    
    if (verifyError) {
      console.error('❌ Error verificando:', verifyError);
      return;
    }
    
    console.log(`📊 Total items en EPIC D1: ${verify?.length || 0}\n`);
    
    // Agrupar por ubicación
    const byLocation = verify?.reduce((acc, item) => {
      if (!acc[item.location]) acc[item.location] = [];
      acc[item.location].push(item);
      return acc;
    }, {});
    
    Object.entries(byLocation || {}).forEach(([location, items]) => {
      console.log(`\n📍 ${location}:`);
      items.forEach((item) => {
        console.log(`  ✓ ${item.name} (${item.quantity})`);
      });
    });
    
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

fixInventoryForEPICDay1();
