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
    console.log('Querying recent calendar_assignments (last 7 days)...');
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data: assignments, error: aErr } = await supabase
      .from('calendar_assignments')
      .select('id, employee, house, type, date, created_at')
      .gte('date', sevenDaysAgo)
      .order('date', { ascending: false })
      .limit(50);

    if (aErr) {
      console.error('Error fetching assignments:', aErr);
      process.exit(1);
    }

    if (!assignments || assignments.length === 0) {
      console.log('No recent assignments found. Exiting.');
      process.exit(0);
    }

    for (const a of assignments) {
      console.log('\n--- Assignment:', a.id, a.type, a.house, a.employee, a.date);

      const { data: ccByBigint, error: cbErr } = await supabase
        .from('cleaning_checklist')
        .select('*')
        .eq('calendar_assignment_id_bigint', a.id)
        .order('order_num', { ascending: true });

      if (cbErr) console.error('Error querying cleaning_checklist by bigint:', cbErr);
      console.log('cleaning_checklist rows by bigint:', (ccByBigint || []).length);
      if (ccByBigint && ccByBigint.length > 0) console.log('Sample:', ccByBigint.slice(0,3));

      const { data: ccByEmployee, error: ceErr } = await supabase
        .from('cleaning_checklist')
        .select('*')
        .eq('employee', a.employee)
        .eq('house', a.house)
        .order('order_num', { ascending: true })
        .limit(20);

      if (ceErr) console.error('Error querying cleaning_checklist by employee+house:', ceErr);
      console.log('cleaning_checklist rows by employee+house:', (ccByEmployee || []).length);
      if (ccByEmployee && ccByEmployee.length > 0) console.log('Sample:', ccByEmployee.slice(0,3));

      const { data: ai, error: aiErr } = await supabase
        .from('assignment_inventory')
        .select('*')
        .eq('calendar_assignment_id', a.id)
        .limit(50);

      if (aiErr) console.error('Error querying assignment_inventory:', aiErr);
      console.log('assignment_inventory rows:', (ai || []).length);
      if (ai && ai.length > 0) console.log('Sample:', ai.slice(0,3));
    }

    console.log('\nDone.');
    process.exit(0);
  } catch (err) {
    console.error('Exception in script:', err);
    process.exit(1);
  }
}

main();