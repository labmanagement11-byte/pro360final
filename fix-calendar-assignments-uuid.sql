-- Modificar calendar_assignments para usar UUID en lugar de BIGINT

-- 1. Eliminar constraint de foreign key de cleaning_checklist temporalmente
ALTER TABLE cleaning_checklist DROP CONSTRAINT IF EXISTS cleaning_checklist_calendar_assignment_id_fkey;

-- 2. Guardar datos existentes si los hay (pero acabamos de eliminarlos)
-- Si hay asignaciones, las eliminamos porque acabamos de crearlas
DELETE FROM calendar_assignments WHERE house = 'EPIC D1';

-- 3. Eliminar y recrear calendar_assignments con UUID
DROP TABLE IF EXISTS calendar_assignments CASCADE;

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

-- 4. Recrear índices
CREATE INDEX idx_calendar_house ON calendar_assignments(house);
CREATE INDEX idx_calendar_employee ON calendar_assignments(employee);
CREATE INDEX idx_calendar_house_employee ON calendar_assignments(house, employee);
CREATE INDEX idx_calendar_date ON calendar_assignments(date);

-- 5. Recrear políticas RLS
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

-- 6. Recrear constraint de foreign key en cleaning_checklist
ALTER TABLE cleaning_checklist 
  ADD CONSTRAINT cleaning_checklist_calendar_assignment_id_fkey 
  FOREIGN KEY (calendar_assignment_id) 
  REFERENCES calendar_assignments(id) 
  ON DELETE CASCADE;

-- 7. Mensaje de éxito
SELECT 'calendar_assignments ahora usa UUID' as message;
