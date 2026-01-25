require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function run() {
  console.log('📋 Buscando calendar_assignments for EPIC D1');
  const { data: assignments, error: aErr } = await supabase
    .from('calendar_assignments')
    .select('*')
    .eq('house', 'EPIC D1')
    .order('date', { ascending: true });

  if (aErr) {
    console.error('Error fetching assignments:', aErr);
  } else {
    console.log('Asignaciones encontradas:', assignments.length);
    console.table((assignments || []).map(a => ({ id: a.id, employee: a.employee, type: a.type, date: a.date, house: a.house })));
  }

  console.log('\n📦 Buscando inventory for EPIC D1');
  const { data: inventory, error: iErr } = await supabase
    .from('inventory')
    .select('*')
    .eq('house', 'EPIC D1')
    .order('location', { ascending: true });

  if (iErr) console.error('Error fetching inventory:', iErr);
  else console.log('Inventory items:', inventory.length);

  console.log('\n🧹 Buscando checklist items for EPIC D1');
  const { data: checklist, error: cErr } = await supabase
    .from('checklist')
    .select('*')
    .eq('house', 'EPIC D1')
    .order('room', { ascending: true });

  if (cErr) console.error('Error fetching checklist:', cErr);
  else console.log('Checklist items:', checklist.length);

  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });