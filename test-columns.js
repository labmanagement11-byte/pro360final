#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('\n📋 Probando columnas para tabla checklist...\n');
  
  const testCases = [
    {
      name: 'Sin type',
      data: {
        house: 'TEST',
        item: 'test',
        room: 'test',
        complete: false,
        assigned_to: null
      }
    },
    {
      name: 'Con type',
      data: {
        house: 'TEST',
        item: 'test',
        room: 'test',
        type: 'regular',
        complete: false,
        assigned_to: null
      }
    }
  ];

  for (const tc of testCases) {
    const { error } = await supabase.from('checklist').insert([tc.data]);
    if (!error) {
      console.log('✅', tc.name, '→ Éxito!');
      await supabase.from('checklist').delete().eq('house', 'TEST');
    } else {
      console.log('❌', tc.name, '→', error.message);
    }
  }
}

test();
