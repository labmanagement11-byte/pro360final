#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

(async () => {
  console.log('\n🧪 Testing inventory fixes...\n');

  // Test 1: Check if inventory_template table exists and has EPIC D1 data
  console.log('✅ Test 1: Checking inventory_template table for EPIC D1...');
  const { data: templates, error: templatesError } = await supabase
    .from('inventory_template')
    .select('count', { count: 'exact' })
    .eq('house', 'EPIC D1');
  
  if (templatesError) {
    console.error('❌ Error querying inventory_template:', templatesError.message);
  } else {
    console.log(`✅ Found inventory_template records for EPIC D1: ${templates?.length || 0}`);
    
    // Get first few records
    const { data: sample } = await supabase
      .from('inventory_template')
      .select('*')
      .eq('house', 'EPIC D1')
      .limit(3);
    console.log('📋 Sample items:', sample?.map(s => ({ item_name: s.item_name, category: s.category })));
  }

  // Test 2: Check if assignment_inventory has numeric calendar_assignment_id
  console.log('\n✅ Test 2: Checking assignment_inventory table structure...');
  const { data: info } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type')
    .eq('table_name', 'assignment_inventory');
  
  const calAssignCol = info?.find(col => col.column_name === 'calendar_assignment_id');
  if (calAssignCol) {
    console.log(`✅ calendar_assignment_id type: ${calAssignCol.data_type}`);
  }

  // Test 3: Try querying assignment_inventory with numeric ID (188)
  console.log('\n✅ Test 3: Querying assignment_inventory with numeric ID 188...');
  const { data: assignmentInv, error: assignError } = await supabase
    .from('assignment_inventory')
    .select('*')
    .eq('calendar_assignment_id', 188)
    .limit(5);
  
  if (assignError) {
    console.error('❌ Error:', assignError.message);
  } else {
    console.log(`✅ Query successful! Found ${assignmentInv?.length || 0} items for assignment 188`);
    if (assignmentInv?.length > 0) {
      console.log('📦 First item:', {
        item_name: assignmentInv[0].item_name,
        category: assignmentInv[0].category,
        is_complete: assignmentInv[0].is_complete
      });
    }
  }

  // Test 4: Check calendar_assignments table to see assignment 188
  console.log('\n✅ Test 4: Checking calendar_assignment 188...');
  const { data: assignment } = await supabase
    .from('calendar_assignments')
    .select('*')
    .eq('id', 188)
    .single();
  
  if (assignment) {
    console.log('✅ Assignment 188 found:', {
      id: assignment.id,
      employee: assignment.employee,
      house: assignment.house,
      type: assignment.type,
      date: assignment.assigned_date
    });
  }

  console.log('\n✅ All tests completed!\n');
  process.exit(0);
})();
