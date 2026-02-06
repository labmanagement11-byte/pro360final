import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkCalendarAssignmentsStructure() {
  console.log('📋 Verificando estructura de calendar_assignments...\n');
  
  // Intentar obtener una fila para ver las columnas
  const { data, error } = await supabase
    .from('calendar_assignments')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  if (data && data.length > 0) {
    console.log('Columnas disponibles:');
    Object.keys(data[0]).forEach(key => {
      console.log(`  - ${key}`);
    });
  } else {
    console.log('⚠️  Tabla vacía, intentando insertar registro de prueba...');
    
    const testRecord = {
      house: 'TEST',
      employee: 'TEST',
      type: 'Limpieza regular',
      date: '2026-02-05'
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('calendar_assignments')
      .insert([testRecord])
      .select();
    
    if (insertError) {
      console.error('❌ Error insertando:', insertError);
      
      // Intentar sin 'date'
      console.log('\nIntentando solo con house, employee, type...');
      const { data: data2, error: error2 } = await supabase
        .from('calendar_assignments')
        .insert([{ house: 'TEST', employee: 'TEST', type: 'Limpieza regular' }])
        .select();
      
      if (error2) {
        console.error('❌ Error:', error2);
      } else if (data2 && data2.length > 0) {
        console.log('\n✅ Registro insertado. Columnas:');
        Object.keys(data2[0]).forEach(key => {
          console.log(`  - ${key}`);
        });
        
        // Eliminar registro de prueba
        await supabase
          .from('calendar_assignments')
          .delete()
          .eq('house', 'TEST');
        console.log('\n✅ Registro de prueba eliminado');
      }
    } else if (insertData && insertData.length > 0) {
      console.log('\n✅ Registro insertado. Columnas:');
      Object.keys(insertData[0]).forEach(key => {
        console.log(`  - ${key}`);
      });
      
      // Eliminar registro de prueba
      await supabase
        .from('calendar_assignments')
        .delete()
        .eq('house', 'TEST');
      console.log('\n✅ Registro de prueba eliminado');
    }
  }
}

checkCalendarAssignmentsStructure();
