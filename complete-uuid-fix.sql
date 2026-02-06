-- SOLUCIÓN COMPLETA: Eliminar todo y recrear con UUID

-- Paso 1: Eliminar TODO de cleaning_checklist
TRUNCATE cleaning_checklist CASCADE;

-- Paso 2: Eliminar constraint
ALTER TABLE cleaning_checklist DROP CONSTRAINT IF EXISTS cleaning_checklist_calendar_assignment_id_fkey;

-- Paso 3: Eliminar calendar_assignments completamente
DROP TABLE IF EXISTS calendar_assignments CASCADE;

-- Paso 4: Recrear calendar_assignments con UUID
CREATE TABLE calendar_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  house TEXT NOT NULL,
  employee TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME,
  type TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_by TEXT DEFAULT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Paso 5: Índices
CREATE INDEX idx_calendar_house ON calendar_assignments(house);
CREATE INDEX idx_calendar_employee ON calendar_assignments(employee);
CREATE INDEX idx_calendar_house_employee ON calendar_assignments(house, employee);
CREATE INDEX idx_calendar_date ON calendar_assignments(date);

-- Paso 6: RLS
ALTER TABLE calendar_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_select_calendar" ON calendar_assignments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "allow_insert_calendar" ON calendar_assignments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "allow_update_calendar" ON calendar_assignments
  FOR UPDATE USING (auth.role() = 'authenticated') 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "allow_delete_calendar" ON calendar_assignments
  FOR DELETE USING (auth.role() = 'authenticated');

-- Paso 7: Cambiar cleaning_checklist.calendar_assignment_id a UUID
ALTER TABLE cleaning_checklist DROP COLUMN IF EXISTS calendar_assignment_id;
ALTER TABLE cleaning_checklist ADD COLUMN calendar_assignment_id UUID;

-- Paso 8: Recrear foreign key
ALTER TABLE cleaning_checklist 
  ADD CONSTRAINT cleaning_checklist_calendar_assignment_id_fkey 
  FOREIGN KEY (calendar_assignment_id) 
  REFERENCES calendar_assignments(id) 
  ON DELETE CASCADE;

SELECT 'TODO listo - ahora usa UUID' as message;
