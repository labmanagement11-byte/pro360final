require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const tables = ['calendar_assignments','cleaning_checklist','inventory','checklist','profiles'];
  for (const t of tables) {
    try {
      const { data, error } = await supabase.from(t).select('house').limit(10000);
      if (error) {
        console.error(`Error fetching ${t}:`, error.message);
        continue;
      }
      const counts = {};
      (data || []).forEach(r => {
        const h = r.house || '(null)';
        counts[h] = (counts[h] || 0) + 1;
      });
      console.log(`\n-- ${t} by house --`);
      console.table(Object.entries(counts).map(([house, count]) => ({ table: t, house, count })));
    } catch (e) {
      console.error(e);
    }
  }
})();