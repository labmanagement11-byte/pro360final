require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  try {
    console.log('Creating calendar assignment...');
    const { data: assignmentData, error: assignmentError } = await supabase
      .from('calendar_assignments')
      .insert([{
        employee: 'realtime-tester',
        date: new Date().toISOString().split('T')[0],
        time: '09:00',
        type: 'Limpieza regular',
        house: 'HYNTIBA2 APTO 406',
        created_at: new Date().toISOString()
      }])
      .select();

    if (assignmentError) {
      console.error('Error creating assignment:', assignmentError);
      process.exit(1);
    }

    const assignment = assignmentData[0];
    console.log('Created assignment id:', assignment.id);

    const assignmentId = assignment.id;

    // Subscribe to cleaning_checklist events
    console.log('Subscribing to cleaning_checklist changes...');

    const channel = supabase
      .channel(`test-cleaning-checklist-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cleaning_checklist' }, (payload) => {
        console.log('Realtime event received:', JSON.stringify(payload));
      })
      .subscribe();

    // Wait a moment for subscription to establish
    await new Promise(r => setTimeout(r, 1500));

    console.log('Inserting checklist items pointing to calendar_assignment_id_bigint =', assignmentId);

    const items = [
      {
        calendar_assignment_id_bigint: assignmentId,
        employee: 'realtime-tester',
        house: assignment.house,
        zone: 'SALA',
        task: 'Test task 1',
        completed: false,
        order_num: 1
      },
      {
        calendar_assignment_id_bigint: assignmentId,
        employee: 'realtime-tester',
        house: assignment.house,
        zone: 'COCINA',
        task: 'Test task 2',
        completed: false,
        order_num: 2
      }
    ];

    const { data: checklistData, error: checklistError } = await supabase
      .from('cleaning_checklist')
      .insert(items)
      .select();

    if (checklistError) {
      console.error('Error inserting checklist items:', checklistError);
    } else {
      console.log('Inserted checklist items:', checklistData.length);
    }

    // Give some time to receive realtime events
    console.log('Waiting 5s for realtime events...');
    await new Promise(r => setTimeout(r, 5000));

    // Query back the inserted rows
    console.log('Querying cleaning_checklist by calendar_assignment_id_bigint...');
    const { data: rows, error: queryError } = await supabase
      .from('cleaning_checklist')
      .select('*')
      .eq('calendar_assignment_id_bigint', assignmentId)
      .order('order_num', { ascending: true });

    if (queryError) {
      console.error('Error querying inserted checklist:', queryError);
    } else {
      console.log('Queried rows count:', rows.length);
      rows.forEach(r => console.log('Row:', r));
    }

    console.log('Cleaning up: deleting test rows and assignment...');

    await supabase.from('cleaning_checklist').delete().eq('calendar_assignment_id_bigint', assignmentId);
    await supabase.from('calendar_assignments').delete().eq('id', assignmentId);

    console.log('Done. Closing subscription.');
    channel.unsubscribe();

    process.exit(0);
  } catch (err) {
    console.error('Exception in test script:', err);
    process.exit(1);
  }
}

main();
