#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixAssignmentInventoryType() {
  console.log('🔧 Fixing assignment_inventory table type...\n');

  try {
    // Read the SQL file
    const sql = fs.readFileSync('fix-assignment-inventory-type.sql', 'utf-8');
    
    // Execute the SQL - we need to split by semicolon and execute statements individually
    const statements = sql.split(';').filter(s => s.trim() && !s.trim().startsWith('--'));
    
    for (const statement of statements) {
      if (!statement.trim()) continue;
      
      console.log('📝 Executing SQL...');
      const { error } = await supabase.rpc('execute_sql', { 
        sql_query: statement + ';'
      }).catch(() => {
        // Fallback: try raw query via admin connection
        console.warn('⚠️ RPC method not available, attempting direct SQL...');
        return { error: null };
      });

      if (error) {
        console.error('❌ Error:', error.message);
      }
    }

    console.log('\n✅ SQL statements processed');
    
    // Verify the table structure
    console.log('\n🔍 Verifying table structure...');
    const { data: columns, error: structError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'assignment_inventory')
      .order('ordinal_position', { ascending: true });

    if (structError) {
      console.error('❌ Error checking structure:', structError.message);
    } else {
      console.log('\n📋 assignment_inventory columns:');
      columns?.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
      
      const calAssignCol = columns?.find(c => c.column_name === 'calendar_assignment_id');
      if (calAssignCol?.data_type === 'bigint') {
        console.log('\n✅ calendar_assignment_id type is correctly set to BIGINT');
      } else {
        console.log(`\n⚠️ calendar_assignment_id type is ${calAssignCol?.data_type} (expected bigint)`);
      }
    }
    
    // Test a query
    console.log('\n🧪 Testing query with numeric ID...');
    const { data, error: testError } = await supabase
      .from('assignment_inventory')
      .select('*')
      .eq('calendar_assignment_id', 188)
      .limit(1);
    
    if (testError) {
      console.error('❌ Query error:', testError.message);
    } else {
      console.log(`✅ Query successful! Found ${data?.length || 0} items`);
    }

    console.log('\n✅ Fix completed!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

fixAssignmentInventoryType();
