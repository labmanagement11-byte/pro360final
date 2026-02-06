import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Usar service role key para bypasear RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTestAssignments() {
  console.log('📅 Creando asignaciones de prueba para EPIC D1...\n');
  
  // Primero eliminar asignaciones antiguas
  const { error: deleteError } = await supabase
    .from('calendar_assignments')
    .delete()
    .eq('house', 'EPIC D1');
    
  if (deleteError) {
    console.error('❌ Error eliminando:', deleteError);
  } else {
    console.log('✅ Asignaciones anteriores eliminadas\n');
  }
  
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  
  const assignments = [
    {
      house: 'EPIC D1',
      employee: 'Victor',
      type: 'Limpieza regular',
      date: today.toISOString().split('T')[0],
      notes: 'Limpieza diaria regular'
    },
    {
      house: 'EPIC D1',
      employee: 'Victor',
      type: 'Limpieza profunda',
      date: tomorrow.toISOString().split('T')[0],
      notes: 'Inventario completo de la casa'
    },
    {
      house: 'EPIC D1',
      employee: 'Victor',
      type: 'Mantenimiento',
      date: nextWeek.toISOString().split('T')[0],
      notes: 'Mantenimiento mensual'
    }
  ];
  
  try {
    const { data, error } = await supabase
      .from('calendar_assignments')
      .insert(assignments)
      .select();
    
    if (error) {
      console.error('❌ Error insertando:', error);
      return;
    }
    
    console.log(`✅ ${data?.length || 0} asignaciones creadas\n`);
    
    data?.forEach((a, i) => {
      console.log(`${i + 1}. ${a.type}`);
      console.log(`   ID: ${a.id}`);
      console.log(`   Empleado: ${a.employee}`);
      console.log(`   Casa: ${a.house}`);
      console.log(`   Fecha: ${a.date}`);
      console.log('');
    });
    
    console.log('\n📋 Resumen:');
    console.log(`✨ Limpieza Regular: Muestra checklist de tareas diarias`);
    console.log(`🧹 Limpieza Profunda: Muestra inventario de objetos (${data?.find(a => a.type === 'Limpieza profunda')?.id})`);
    console.log(`🔧 Mantenimiento: Muestra checklist de tareas de mantenimiento`);
    
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

createTestAssignments();
