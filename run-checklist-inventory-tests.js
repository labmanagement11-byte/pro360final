require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  try {
    console.log('Creating maintenance assignment (no inventory expected)');
    const { data: mAssign, error: mErr } = await supabase.from('calendar_assignments').insert([{
      employee: 'victor',
      date: new Date().toISOString().split('T')[0],
      time: '10:00',
      type: 'Mantenimiento',
      house: 'EPIC D1',
      created_at: new Date().toISOString()
    }]).select();

    if (mErr) throw mErr;
    const mId = mAssign[0].id;
    console.log('Maintenance assignment id:', mId);

    // Insert cleaning_checklist items linked by bigint column
    const maintenanceItems = [
      { calendar_assignment_id_bigint: mId, employee: 'victor', house: 'EPIC D1', zone: 'SISTEMAS ELÉCTRICOS', task: 'Revisar generador', completed: false, order_num: 1 },
      { calendar_assignment_id_bigint: mId, employee: 'victor', house: 'EPIC D1', zone: 'PISCINA Y AGUA', task: 'Revisar bomba', completed: false, order_num: 2 }
    ];

    let insertMaintRes;
    try {
      insertMaintRes = await supabase.from('cleaning_checklist').insert(maintenanceItems).select();
      if (insertMaintRes.error) throw insertMaintRes.error;
      console.log('Inserted maintenance checklist items (with bigint):', insertMaintRes.data.length);
    } catch (err) {
      console.warn('Insert with bigint failed, falling back to insert without bigint column:', err.message || err);
      // remove the bigint field and insert by employee+house
      const maintenanceItemsFallback = maintenanceItems.map(({ calendar_assignment_id_bigint, ...rest }) => rest);
      const { data: fallData, error: fallErr } = await supabase.from('cleaning_checklist').insert(maintenanceItemsFallback).select();
      if (fallErr) {
        throw fallErr;
      }
      console.log('Inserted maintenance checklist items (fallback):', fallData.length);
    }

    const { data: mInv, error: mInvErr } = await supabase.from('assignment_inventory').select('*').eq('calendar_assignment_id', mId);
    if (mInvErr) throw mInvErr;
    console.log('Assignment inventory for maintenance (should be 0):', mInv.length);

    console.log('\nCreating cleaning assignment (inventory expected)');
    const { data: cAssign, error: cErr } = await supabase.from('calendar_assignments').insert([{
      employee: 'victor',
      date: new Date(Date.now()+24*60*60*1000).toISOString().split('T')[0],
      time: '11:00',
      type: 'Limpieza regular',
      house: 'EPIC D1',
      created_at: new Date().toISOString()
    }]).select();

    if (cErr) throw cErr;
    const cId = cAssign[0].id;
    console.log('Cleaning assignment id:', cId);

    const cleaningItems = [
      { calendar_assignment_id_bigint: cId, employee: 'victor', house: 'EPIC D1', zone: 'COCINA', task: 'Limpiar microondas', completed: false, order_num: 1 },
      { calendar_assignment_id_bigint: cId, employee: 'victor', house: 'EPIC D1', zone: 'BAÑOS', task: 'Limpiar ducha', completed: false, order_num: 2 }
    ];

    let insertCleanRes;
    try {
      insertCleanRes = await supabase.from('cleaning_checklist').insert(cleaningItems).select();
      if (insertCleanRes.error) throw insertCleanRes.error;
      console.log('Inserted cleaning checklist items (with bigint):', insertCleanRes.data.length);
    } catch (err) {
      console.warn('Insert with bigint failed, falling back to insert without bigint column:', err.message || err);
      const cleaningItemsFallback = cleaningItems.map(({ calendar_assignment_id_bigint, ...rest }) => rest);
      const { data: fallClean, error: fallCleanErr } = await supabase.from('cleaning_checklist').insert(cleaningItemsFallback).select();
      if (fallCleanErr) throw fallCleanErr;
      console.log('Inserted cleaning checklist items (fallback):', fallClean.length);
    }

    // Create some assignment_inventory items for cleaning assignment (simulate template copy)
    const invItems = [
      { calendar_assignment_id: cId, employee: 'victor', house: 'EPIC D1', item_name: 'Almohadas', quantity: 4, category: 'Habitaciones', is_complete: false },
      { calendar_assignment_id: cId, employee: 'victor', house: 'EPIC D1', item_name: 'Toallas', quantity: 6, category: 'Baños', is_complete: false }
    ];

    const { data: aiData, error: aiErr } = await supabase.from('assignment_inventory').insert(invItems).select();
    if (aiErr) throw aiErr;
    console.log('Inserted assignment inventory items for cleaning assignment:', aiData.length);

    // Verify reading
    const { data: checkM } = await supabase.from('cleaning_checklist').select('*').eq('calendar_assignment_id_bigint', mId);
    console.log('Maintenance checklist rows by bigint:', checkM.length);
    const { data: checkC } = await supabase.from('cleaning_checklist').select('*').eq('calendar_assignment_id_bigint', cId);
    console.log('Cleaning checklist rows by bigint:', checkC.length);

    const { data: invC } = await supabase.from('assignment_inventory').select('*').eq('calendar_assignment_id', cId);
    console.log('Assignment inventory rows for cleaning assignment:', invC.length);

    console.log('\nTest complete.');
  } catch (err) {
    console.error('Test error:', err);
  }
  process.exit(0);
})();