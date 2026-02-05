const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hecvlywrahigujakkguw.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlY3ZseXdyYWhpZ3VqYWtrZ3V3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjcyMzg2NCwiZXhwIjoyMDgyMjk5ODY0fQ.ZgmvGtXXCSNJ51RsHBe0vBONP6TaZ_pAW5fcRJchSCA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixAssignments() {
  console.log('🔧 FIXING ASSIGNMENTS WITHOUT CHECKLIST ITEMS\n');
  console.log('═════════════════════════════════');

  try {
    // 1. Get all assignments
    const { data: assignments } = await supabase
      .from('calendar_assignments')
      .select('id, employee, house, type')
      .order('created_at', { ascending: false });

    console.log(`\n📋 Total assignments: ${assignments?.length || 0}`);

    if (!assignments || assignments.length === 0) return;

    for (const assignment of assignments) {
      const assignmentIdStr = String(assignment.id);
      
      // Check if this assignment has items
      const { data: existingItems, error: checkError } = await supabase
        .from('cleaning_checklist')
        .select('id')
        .eq('calendar_assignment_id', assignmentIdStr)
        .limit(1);

      if (checkError) {
        console.log(`⚠️  Error checking ${assignment.id}:`, checkError.message);
        continue;
      }

      if (existingItems && existingItems.length > 0) {
        console.log(`✅ Assignment ${assignment.id} (${assignment.employee}) - ${existingItems.length} items exist`);
      } else {
        console.log(`🔴 Assignment ${assignment.id} (${assignment.employee}) - NO ITEMS, need to create`);
        
        // Create items for this assignment
        const items = generateChecklistItems(assignmentIdStr, assignment.employee, assignment.type, assignment.house);
        
        const { data: inserted, error: insertError } = await supabase
          .from('cleaning_checklist')
          .insert(items)
          .select('id');
        
        if (insertError) {
          console.log(`❌ Error inserting items for ${assignment.id}:`, insertError.message);
        } else {
          console.log(`✅ Created ${inserted?.length || 0} items for assignment ${assignment.id}`);
        }
      }
    }

    console.log('\n✅ Fix completed');
  } catch (err) {
    console.error('Error:', err);
  }
}

function generateChecklistItems(assignmentId, employee, type, house) {
  const LIMPIEZA_REGULAR = {
    'LIMPIEZA GENERAL': [
      'Barrer y trapear toda la casa.',
      'Quitar el polvo de todas las superficies y decoración usando un trapo húmedo.',
      'Limpiar los televisores cuidadosamente sin dejar marcas en la pantalla.',
      'Revisar zócalos y esquinas para asegurarse de que estén limpios.',
      'Limpiar telaraña'
    ],
    'SALA': [
      'Limpiar todas las superficies.',
      'Mover los cojines del sofá y verificar que no haya suciedad ni hormigas debajo.',
      'Organizar cojines y dejar la sala ordenada.'
    ],
    'COMEDOR': [
      'Limpiar mesa, sillas y superficies.',
      'Asegurarse de que el área quede limpia y ordenada.'
    ],
    'COCINA': [
      'Limpiar superficies, gabinetes por fuera y por dentro.',
      'Verificar que los gabinetes estén limpios y organizados y funcionales.',
      'Limpiar la cafetera y su filtro.',
      'Verificar que el dispensador de jabón de loza esté lleno.',
      'Dejar toallas de cocina limpias y disponibles para los visitantes.',
      'Limpiar microondas por dentro y por fuera.',
      'Limpiar el filtro de agua.',
      'Limpiar la nevera por dentro y por fuera (no dejar alimentos).',
      'Lavar las canecas de basura y colocar bolsas nuevas.'
    ],
    'BAÑOS': [
      'Limpiar ducha (pisos y paredes).',
      'Limpiar divisiones de vidrio y asegurarse de que no queden marcas.',
      'Limpiar espejo, sanitario y lavamanos con Clorox.',
      'Lavar las canecas de basura y colocar bolsas nuevas.',
      'Verificar disponibilidad de toallas (Máximo 10 toallas blancas de cuerpo en toda la casa, Máximo 4 toallas de mano en total).',
      'Dejar un rollo de papel higiénico nuevo instalado en cada baño.',
      'Dejar un rollo extra en el cuarto de lavado.',
      'Lavar y volver a colocar los tapetes de baño.'
    ],
    'HABITACIONES': [
      'Revisar que no haya objetos dentro de los cajones.',
      'Lavar sábanas y hacer las camas correctamente.',
      'Limpiar el polvo de todas las superficies.',
      'Lavar los tapetes de la habitación y volver a colocarlos limpios.'
    ],
    'ZONA DE LAVADO': [
      'Limpiar el filtro de la lavadora en cada lavada.',
      'Limpiar el gabinete debajo del lavadero.',
      'Dejar ganchos de ropa disponibles.',
      'Dejar toallas disponibles para la piscina.'
    ],
    'ÁREA DE BBQ': [
      'Barrer y trapear el área.',
      'Limpiar mesa y superficies.',
      'Limpiar la mini nevera y no dejar ningún alimento dentro.',
      'Limpiar la parrilla con el cepillo (no usar agua).',
      'Retirar las cenizas del carbón.',
      'Dejar toda el área limpia y ordenada.'
    ],
    'ÁREA DE PISCINA': [
      'Barrer y trapear el área.',
      'Organizar los muebles alrededor de la piscina.'
    ],
    'TERRAZA': [
      'Limpiar el piso de la terraza.',
      'Limpiar superficies.',
      'Organizar los cojines de la sala exterior.'
    ]
  };

  const LIMPIEZA_PROFUNDA = {
    'LIMPIEZA PROFUNDA': [
      'Lavar los forros de los muebles (sofás, sillas y cojines).',
      'Limpiar todas las ventanas y ventanales de la casa, por dentro y por fuera.',
      'Limpiar con hidrolavadora el piso exterior, incluyendo escaleras, terraza y placas vehiculares.',
      'Lavar la caneca grande de basura ubicada debajo de la escalera.',
      'Limpiar las paredes y los guardaescobas de toda la casa.'
    ]
  };

  const MANTENIMIENTO = {
    'PISCINA Y AGUA': [
      'Mantener la piscina limpia y en funcionamiento.',
      'Revisar constantemente el cuarto de máquinas para verificar su funcionamiento y detectar posibles filtraciones de agua.'
    ],
    'SISTEMAS ELÉCTRICOS': [
      'Chequear que el generador eléctrico funcione correctamente y tenga diesel suficiente.',
      'Encender la planta eléctrica al menos 2 veces al mes durante mínimo media hora.'
    ],
    'ÁREAS VERDES': [
      'Cortar el césped cada mes y medio a dos meses, y limpiar restos de césped.',
      'Mantenimiento de palmeras: remover hojas secas.',
      'Mantener la matera de la terraza libre de maleza y deshierbar regularmente.',
      'Regar las plantas vivas según necesidad.'
    ]
  };

  let template = {};
  if (type === 'Limpieza regular') {
    template = LIMPIEZA_REGULAR;
  } else if (type === 'Limpieza profunda') {
    template = LIMPIEZA_PROFUNDA;
  } else if (type === 'Mantenimiento') {
    template = MANTENIMIENTO;
  }

  const items = [];
  let orderNum = 0;
  Object.entries(template).forEach(([zone, tasks]) => {
    tasks.forEach((task) => {
      items.push({
        calendar_assignment_id: assignmentId,
        employee: employee,
        house: house,
        zone: zone,
        task: task,
        completed: false,
        completed_by: null,
        completed_at: null,
        order_num: orderNum
      });
      orderNum++;
    });
  });
  
  return items;
}

fixAssignments();
