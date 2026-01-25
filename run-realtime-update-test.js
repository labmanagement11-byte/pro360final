require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  try {
    console.log('=== Realtime update test: creating assignment, items, subscribing, updating ===');

    // 1) Create cleaning assignment (should generate inventory)
    const { data: assignData, error: assignErr } = await supabase
      .from('calendar_assignments')
      .insert([{ employee: 'victor', date: new Date().toISOString().split('T')[0], time: '12:00', type: 'Limpieza regular', house: 'EPIC D1', created_at: new Date().toISOString() }])
      .select();
    if (assignErr) throw assignErr;
    const assignId = assignData[0].id;
    console.log('Assignment created id=', assignId);

    // 2) Insert checklist items with calendar_assignment_id_bigint (fallbacks included)
    let checklistItems = [
      { calendar_assignment_id_bigint: assignId, employee: 'victor', house: 'EPIC D1', zone: 'COCINA', task: 'Limpiar microondas', completed: false, order_num: 1 },
      { calendar_assignment_id_bigint: assignId, employee: 'victor', house: 'EPIC D1', zone: 'BAÑOS', task: 'Limpiar ducha', completed: false, order_num: 2 }
    ];

    let insertedChecklist;
    try {
      const res = await supabase.from('cleaning_checklist').insert(checklistItems).select();
      if (res.error) throw res.error;
      insertedChecklist = res.data;
      console.log('Inserted checklist items (bigint):', insertedChecklist.map(i => i.id));
    } catch (err) {
      console.warn('Insert with bigint failed, trying fallback insertion:', err.message || err);
      // Try inserting without bigint column, but set legacy calendar_assignment_id if exists
      try {
        // build fallback items removing bigint key and adding calendar_assignment_id if possible
        const fallbackItems = checklistItems.map(({ calendar_assignment_id_bigint, ...rest }) => ({ ...rest, calendar_assignment_id: assignId }));
        const res2 = await supabase.from('cleaning_checklist').insert(fallbackItems).select();
        if (res2.error) throw res2.error;
        insertedChecklist = res2.data;
        console.log('Inserted checklist items (fallback):', insertedChecklist.map(i => i.id));
      } catch (err2) {
        console.error('Fallback insert also failed:', err2.message || err2);
        throw err2;
      }
    }

    // 3) Insert assignment inventory items
    const invItems = [
      { calendar_assignment_id: assignId, employee: 'victor', house: 'EPIC D1', item_name: 'Almohadas', quantity: 4, category: 'Habitaciones', is_complete: false },
      { calendar_assignment_id: assignId, employee: 'victor', house: 'EPIC D1', item_name: 'Toallas', quantity: 6, category: 'Baños', is_complete: false }
    ];
    const { data: insertedInv, error: insertInvErr } = await supabase.from('assignment_inventory').insert(invItems).select();
    if (insertInvErr) throw insertInvErr;
    console.log('Inserted inventory items:', insertedInv.map(i=>i.id));

    // 4) Subscribe to realtime updates for these assignment
    console.log('Subscribing to cleaning_checklist updates for assignment id', assignId);
    const cleaningChannel = supabase
      .channel('realtime-cleaning-' + assignId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cleaning_checklist', filter: `calendar_assignment_id_bigint=eq.${assignId}` }, (payload) => {
        console.log('CLEANING PAYLOAD:', payload);
      })
      .subscribe((status) => {
        console.log('Cleaning channel status:', status);
      });

    console.log('Subscribing to assignment_inventory updates for assignment id', assignId);
    const invChannel = supabase
      .channel('realtime-inv-' + assignId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignment_inventory', filter: `calendar_assignment_id=eq.${assignId}` }, (payload) => {
        console.log('INVENTORY PAYLOAD:', payload);
      })
      .subscribe((status) => {
        console.log('Inventory channel status:', status);
      });

    // Wait a bit to ensure subscriptions are active
    await new Promise(r => setTimeout(r, 1500));

    // 5) Update a checklist item to completed = true
    const checklistId = insertedChecklist[0].id;
    console.log('Updating checklist item', checklistId, 'to completed=true');
    const { data: upc, error: upcErr } = await supabase.from('cleaning_checklist').update({ completed: true, completed_at: new Date().toISOString(), completed_by: 'victor' }).eq('id', checklistId).select();
    if (upcErr) throw upcErr;
    console.log('Checklist update result:', upc[0]);

    // 6) Update an inventory item to is_complete = true
    const invId = insertedInv[0].id;
    console.log('Updating inventory item', invId, 'to is_complete=true');
    const { data: upi, error: upiErr } = await supabase.from('assignment_inventory').update({ is_complete: true, checked_by: 'victor', checked_at: new Date().toISOString() }).eq('id', invId).select();
    if (upiErr) throw upiErr;
    console.log('Inventory update result:', upi[0]);

    // Wait to receive realtime events
    console.log('Waiting 3s for realtime events...');
    await new Promise(r => setTimeout(r, 3000));

    // Cleanup: unsubscribe
    try { supabase.removeChannel(cleaningChannel); supabase.removeChannel(invChannel); } catch (e) {}

    console.log('Test finished.');
  } catch (err) {
    console.error('Test error:', err);
  }
})();