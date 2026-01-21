const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceKey);
(async ()=>{
  const { data, error } = await supabase.from('inventory').select('id,name,house').order('house');
  if(error) {console.error(error); return;}
  console.log(data.slice(0,20));
})();
