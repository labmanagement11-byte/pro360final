import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function createInventoryForEPICDay1() {
  console.log('🏗️  Creando items de inventario para EPIC D1...\n');
  
  const inventoryItems = [
    {
      house: 'EPIC D1',
      name: 'Baños limpiados y desinfectados',
      location: 'Baños',
      quantity: 1,
      complete: false,
      notes: 'Inodoros, lavamanos, pisos'
    },
    {
      house: 'EPIC D1',
      name: 'Pisos barridos y trapeados',
      location: 'Todas las áreas',
      quantity: 1,
      complete: false,
      notes: 'Sala, comedor, cocina, cuartos'
    },
    {
      house: 'EPIC D1',
      name: 'Cocina limpia y organizada',
      location: 'Cocina',
      quantity: 1,
      complete: false,
      notes: 'Estufa, encimera, fregadero'
    },
    {
      house: 'EPIC D1',
      name: 'Polvo en muebles y superficies',
      location: 'Sala, Cuartos',
      quantity: 1,
      complete: false,
      notes: 'Repisas, mesas, escritorios'
    },
    {
      house: 'EPIC D1',
      name: 'Basura recolectada y depositada',
      location: 'Todas las áreas',
      quantity: 1,
      complete: false,
      notes: 'En contendor exterior'
    },
    {
      house: 'EPIC D1',
      name: 'Ropa lavada y doblada',
      location: 'Cuartos',
      quantity: 1,
      complete: false,
      notes: 'Sábanas y toallas'
    },
    {
      house: 'EPIC D1',
      name: 'Ventanas limpias',
      location: 'Ventanas',
      quantity: 6,
      complete: false,
      notes: 'Interiores y exteriores'
    },
    {
      house: 'EPIC D1',
      name: 'Trastes lavados y organizados',
      location: 'Cocina',
      quantity: 1,
      complete: false,
      notes: 'En alacena'
    },
    {
      house: 'EPIC D1',
      name: 'Camas tendidas',
      location: 'Cuartos',
      quantity: 2,
      complete: false,
      notes: 'Con sábanas limpias'
    },
    {
      house: 'EPIC D1',
      name: 'Puertas y marcos limpios',
      location: 'Puertas',
      quantity: 1,
      complete: false,
      notes: 'Todas las puertas principales'
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
    
    console.log(`✅ ${data?.length || 0} items creados exitosamente\n`);
    
    // Verificar
    const { data: verify, error: verifyError } = await supabase
      .from('inventory')
      .select('*')
      .eq('house', 'EPIC D1');
    
    if (verifyError) {
      console.error('❌ Error verificando:', verifyError);
      return;
    }
    
    console.log(`📊 Total items en EPIC D1: ${verify?.length || 0}`);
    verify?.forEach(item => {
      console.log(`  ✓ ${item.name} [${item.category}]`);
    });
    
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

createInventoryForEPICDay1();
