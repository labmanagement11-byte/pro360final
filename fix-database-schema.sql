-- Fix database schema: ensure tables exist with correct snake_case columns

-- 1. Drop and recreate tasks table with correct column names
DROP TABLE IF EXISTS tasks CASCADE;
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  assigned_to TEXT,
  type TEXT,
  house TEXT DEFAULT 'EPIC D1',
  completed BOOLEAN DEFAULT false,
  created_by TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- 2. Drop and recreate calendar_assignments table
DROP TABLE IF EXISTS calendar_assignments CASCADE;
CREATE TABLE calendar_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  type TEXT,
  house TEXT DEFAULT 'EPIC D1',
  created_at TIMESTAMP DEFAULT now()
);

-- 3. Drop and recreate inventory table
DROP TABLE IF EXISTS inventory CASCADE;
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  quantity INTEGER DEFAULT 0,
  location TEXT,
  complete BOOLEAN DEFAULT false,
  notes TEXT,
  house TEXT DEFAULT 'EPIC D1',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- 4. Enable realtime on all tables
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE calendar_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE inventory;

-- 5. Create indexes for better query performance
CREATE INDEX idx_tasks_house ON tasks(house);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_calendar_house ON calendar_assignments(house);
CREATE INDEX idx_calendar_employee ON calendar_assignments(employee);
CREATE INDEX idx_inventory_house ON inventory(house);
