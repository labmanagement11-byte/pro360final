#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
const https = require('https');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing SUPABASE credentials');
  process.exit(1);
}

console.log('🔧 Fixing assignment_inventory table type...\n');

// First, let's just verify the current state by trying a simple query
const makeRequest = (method, path, body = null) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: supabaseUrl.replace('https://', '').replace('http://', ''),
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ 
            status: res.statusCode,
            data: data ? JSON.parse(data) : null,
            headers: res.headers
          });
        } catch (e) {
          resolve({ 
            status: res.statusCode,
            data: data,
            headers: res.headers
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
};

(async () => {
  try {
    // Test: Try to query assignment_inventory with numeric ID
    console.log('📝 Testing current assignment_inventory structure...\n');
    
    const testQuery = `/rest/v1/assignment_inventory?calendar_assignment_id=eq.188&limit=1`;
    const response = await makeRequest('GET', testQuery);
    
    if (response.status === 400) {
      console.log('❌ Query error (HTTP 400):', response.data);
      console.log('\n✅ This confirms calendar_assignment_id expects UUID, not BIGINT');
      console.log('We need to recreate the table with BIGINT type.');
      console.log('\n📌 Please manually execute this SQL in Supabase SQL Editor:\n');
      
      const fs = require('fs');
      const sql = fs.readFileSync('fix-assignment-inventory-type.sql', 'utf-8');
      console.log(sql);
      
      console.log('\n✅ After running the SQL:');
      console.log('1. The assignment_inventory table will be recreated');
      console.log('2. calendar_assignment_id will be BIGINT type');
      console.log('3. The app will be able to insert/query with numeric IDs like 188\n');
      
    } else if (response.status === 200) {
      console.log('✅ Query successful - table may already be correct');
      console.log('Found:', response.data?.length, 'items');
    } else {
      console.log('Status:', response.status);
      console.log('Response:', response.data);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
