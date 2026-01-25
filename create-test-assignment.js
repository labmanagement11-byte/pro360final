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

    // Crear checklist items en la tabla moderna cleaning_checklist usando la columna bigint
    console.log('Creando checklist items en cleaning_checklist para la asignación (Mantenimiento)');
    const cleaningItems = [
      { calendar_assignment_id_bigint: assignmentId, employee: 'victor', house: 'EPIC D1', zone: 'SISTEMAS ELÉCTRICOS', task: 'Revisar generador', completed: false, order_num: 1 },
      { calendar_assignment_id_bigint: assignmentId, employee: 'victor', house: 'EPIC D1', zone: 'PISCINA Y AGUA', task: 'Inspeccionar piscina', completed: false, order_num: 2 }
    ];

    let ccData = null;
    try {
      const { data, error } = await supabase.from('cleaning_checklist').insert(cleaningItems).select();
      if (error) throw error;
      ccData = data;
      console.log('Cleaning_checklist items insertados:', ccData.length);
    } catch (err) {
      console.warn('Error insertando cleaning_checklist items con bigint. Intentando fallback por employee+house:', err?.message || err);

      // Fallback: insertar sin calendar_assignment_id_bigint (usar employee + house)
      const fallbackItems = cleaningItems.map((it, i) => ({
        calendar_assignment_id: assignmentId, // legacy column fallback (ensure assignment id present)
        employee: it.employee,
        house: it.house,
        zone: it.zone,
        task: it.task,
        completed: it.completed,
        order_num: it.order_num
      }));

      const { data: fbData, error: fbErr } = await supabase.from('cleaning_checklist').insert(fallbackItems).select();
      if (fbErr) {
        console.error('Fallback failed inserting cleaning_checklist items:', fbErr);
      } else {
        ccData = fbData;
        console.log('Fallback: cleaning_checklist items insertados por employee+house:', ccData.length);
      }
    }

    // No crear inventario para mantenimiento

    const { data: assignments } = await supabase.from('calendar_assignments').select('*').eq('house','EPIC D1');
    console.log('Asignaciones EPIC D1 ahora:', assignments.length);

    // Consultar cleaning_checklist por calendar_assignment_id_bigint
    const { data: checklist } = await supabase.from('cleaning_checklist').select('*').eq('calendar_assignment_id_bigint', assignmentId).order('order_num', { ascending: true });
    console.log('Checklist items for assignment:', (checklist || []).length);

  } catch (err) {
    console.error(err);
  }
})();