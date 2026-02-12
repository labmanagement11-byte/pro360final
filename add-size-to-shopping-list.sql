-- Create shopping_list table if it doesn't exist
CREATE TABLE IF NOT EXISTS shopping_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity TEXT,
  category TEXT DEFAULT 'General',
  size TEXT DEFAULT 'Mediano',
  added_by TEXT,
  notes TEXT,
  is_purchased BOOLEAN DEFAULT false,
  purchased_by TEXT,
  purchased_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Enable realtime for shopping_list
ALTER PUBLICATION supabase_realtime ADD TABLE shopping_list;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_shopping_list_house ON shopping_list(house);
CREATE INDEX IF NOT EXISTS idx_shopping_list_is_purchased ON shopping_list(is_purchased);

-- Enable RLS (Row Level Security)
ALTER TABLE shopping_list ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users
DROP POLICY IF EXISTS "authenticated_select_shopping_list" ON shopping_list;
CREATE POLICY "authenticated_select_shopping_list" ON shopping_list
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "authenticated_insert_shopping_list" ON shopping_list;
CREATE POLICY "authenticated_insert_shopping_list" ON shopping_list
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "authenticated_update_shopping_list" ON shopping_list;
CREATE POLICY "authenticated_update_shopping_list" ON shopping_list
  FOR UPDATE USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "authenticated_delete_shopping_list" ON shopping_list;
CREATE POLICY "authenticated_delete_shopping_list" ON shopping_list
  FOR DELETE USING (auth.role() = 'authenticated');

-- Verify table created successfully
SELECT 'shopping_list table created successfully with size column' as status;

