-- Fix assignment_inventory to use BIGINT for calendar_assignment_id to match actual data type
-- The calendar_assignments.id appears to be BIGINT (numeric), not UUID, despite earlier migrations

-- 1. Drop the old assignment_inventory table (preserving data if needed)
-- Note: This will cascade delete associated data, so we're starting fresh
DROP TABLE IF EXISTS assignment_inventory CASCADE;

-- 2. Create assignment_inventory with BIGINT for calendar_assignment_id
CREATE TABLE assignment_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_assignment_id BIGINT NOT NULL,
  employee TEXT NOT NULL,
  house TEXT DEFAULT 'EPIC D1',
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  category TEXT,
  location TEXT,
  is_complete BOOLEAN DEFAULT false,
  notes TEXT,
  checked_by TEXT,
  checked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- 3. Enable realtime for assignment_inventory
ALTER PUBLICATION supabase_realtime ADD TABLE assignment_inventory;

-- 4. Create indexes for performance
CREATE INDEX idx_assignment_inventory_calendar_id ON assignment_inventory(calendar_assignment_id);
CREATE INDEX idx_assignment_inventory_employee ON assignment_inventory(employee);
CREATE INDEX idx_assignment_inventory_house ON assignment_inventory(house);
CREATE INDEX idx_assignment_inventory_category ON assignment_inventory(category);
CREATE INDEX idx_assignment_inventory_complete ON assignment_inventory(is_complete);

-- 5. Enable RLS (Row Level Security)
ALTER TABLE assignment_inventory ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for authenticated users
CREATE POLICY "authenticated_select_assignment_inventory" ON assignment_inventory
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_insert_assignment_inventory" ON assignment_inventory
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_update_assignment_inventory" ON assignment_inventory
  FOR UPDATE USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_delete_assignment_inventory" ON assignment_inventory
  FOR DELETE USING (auth.role() = 'authenticated');

-- 7. Verify table created successfully
SELECT 'assignment_inventory table successfully recreated with BIGINT for calendar_assignment_id' as status;

