require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

(async () => {
  try {
    console.log('Creando asignación de prueba para EPIC D1 -> victor (tipo Mantenimiento)');
    const { data: assignment, error: aErr } = await supabase
      .from('calendar_assignments')
      .insert([{
        employee: 'victor',
        date: new Date().toISOString().split('T')[0],
        time: '09:00',
        type: 'Mantenimiento',
        house: 'EPIC D1',
        created_at: new Date().toISOString()
      }])
      .select();

    if (aErr) {
      console.error('Error creando asignación:', aErr);
      return;
    }

    console.log('Asignación creada:', assignment[0]);

    const assignmentId = assignment[0].id;

    // Crear checklist items
    console.log('Creando checklist items para la asignación (Mantenimiento)');
    const checklistItems = [
      { house: 'EPIC D1', item: 'Revisar generador', room: 'SISTEMAS ELÉCTRICOS', complete: false, assigned_to: 'victor', calendar_assignment_id: assignmentId },
      { house: 'EPIC D1', item: 'Inspeccionar piscina', room: 'PISCINA Y AGUA', complete: false, assigned_to: 'victor', calendar_assignment_id: assignmentId }
    ];
    const { error: cErr } = await supabase.from('checklist').insert(checklistItems);
    if (cErr) console.error('Error insertando checklist items:', cErr);
    else console.log('Checklist items insertados');

    // No crear inventario para mantenimiento

    const { data: assignments } = await supabase.from('calendar_assignments').select('*').eq('house','EPIC D1');
    console.log('Asignaciones EPIC D1 ahora:', assignments.length);

    const { data: checklist } = await supabase.from('checklist').select('*').eq('calendar_assignment_id', assignmentId);
    console.log('Checklist items for assignment:', checklist.length);

  } catch (err) {
    console.error(err);
  }
})();