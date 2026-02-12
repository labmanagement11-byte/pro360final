# 🔧 INVENTORY FIX - URGENT ACTION REQUIRED

## Problem Identified

The `assignment_inventory` table has `calendar_assignment_id` defined as UUID, but the actual `calendar_assignments` table uses BIGINT (numeric) IDs like `188`.

This causes the error:
```
invalid input syntax for type uuid: "188"
```

## Solution

You need to manually execute this SQL in your Supabase SQL Editor (Database → SQL Editor → New Query):

```sql
-- Drop old assignment_inventory table
DROP TABLE IF EXISTS assignment_inventory CASCADE;

-- Create assignment_inventory with BIGINT for calendar_assignment_id
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

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE assignment_inventory;

-- Create indexes
CREATE INDEX idx_assignment_inventory_calendar_id ON assignment_inventory(calendar_assignment_id);
CREATE INDEX idx_assignment_inventory_employee ON assignment_inventory(employee);
CREATE INDEX idx_assignment_inventory_house ON assignment_inventory(house);
CREATE INDEX idx_assignment_inventory_category ON assignment_inventory(category);
CREATE INDEX idx_assignment_inventory_complete ON assignment_inventory(is_complete);

-- Enable RLS
ALTER TABLE assignment_inventory ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "authenticated_select_assignment_inventory" ON assignment_inventory
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_insert_assignment_inventory" ON assignment_inventory
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_update_assignment_inventory" ON assignment_inventory
  FOR UPDATE USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_delete_assignment_inventory" ON assignment_inventory
  FOR DELETE USING (auth.role() = 'authenticated');
```

## Steps to Execute

1. Open your Supabase project dashboard
2. Go to **Database** → **SQL Editor**
3. Click **New Query**
4. Copy and paste the SQL above
5. Click **Run** 
6. Wait for success message

## What This Does

✅ Recreates the `assignment_inventory` table with correct BIGINT type for `calendar_assignment_id`
✅ Enables real-time sync for inventory changes
✅ Creates performance indexes
✅ Sets up Row Level Security (RLS) policies for user authentication
✅ Allows the app to query and insert inventory items with numeric assignment IDs

## After Running the SQL

The app will automatically:
1. Load 68 inventory template items from EPIC D1
2. Create inventory entries for each assigned task
3. Allow employees to mark items as Completo/Incompleto/Faltante
4. Sync all changes in real-time

## Code Changes Already Made

✅ `utils/supabaseRealtimeService.ts`:
  - Fixed `inventory_templates` → `inventory_template` (table name)
  - Simplified numeric ID handling in `getAssignmentInventory()` and `createAssignmentInventory()`
  - Removed complex UUID resolution logic

These changes are already committed and deployed. Only the SQL fix in Supabase is needed.
