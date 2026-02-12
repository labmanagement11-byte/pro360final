-- URGENTE: Corregir el schema de assignment_inventory
-- El problema: calendar_assignment_id está definido como UUID pero calendar_assignments usa BIGINT
-- Esto causa error: "invalid input syntax for type uuid: \"193\""

-- PASO 1: Crear tabla temporal con el schema correcto
CREATE TABLE assignment_inventory_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_assignment_id BIGINT NOT NULL REFERENCES calendar_assignments(id) ON DELETE CASCADE,
  employee TEXT NOT NULL,
  house TEXT DEFAULT 'EPIC D1',
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  category TEXT,
  is_complete BOOLEAN DEFAULT false,
  notes TEXT,
  checked_by TEXT,
  checked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- PASO 2: Copiar datos de la tabla vieja a la nueva (si hay datos)
INSERT INTO assignment_inventory_new 
SELECT * FROM assignment_inventory;

-- PASO 3: Eliminar la tabla vieja
DROP TABLE assignment_inventory CASCADE;

-- PASO 4: Renombrar la tabla nueva al nombre original
ALTER TABLE assignment_inventory_new RENAME TO assignment_inventory;

-- PASO 5: Recrear índices
CREATE INDEX idx_assignment_inventory_assignment ON assignment_inventory(calendar_assignment_id);
CREATE INDEX idx_assignment_inventory_employee ON assignment_inventory(employee);
CREATE INDEX idx_assignment_inventory_house ON assignment_inventory(house);
CREATE INDEX idx_assignment_inventory_complete ON assignment_inventory(is_complete);

-- PASO 6: Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE assignment_inventory;

-- PASO 7: Crear políticas RLS (si necesarias)
ALTER TABLE assignment_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view their assignment inventory"
  ON assignment_inventory
  FOR SELECT
  USING (
    employee = auth.jwt() ->> 'username'
    OR EXISTS (
      SELECT 1 FROM app_users 
      WHERE username = auth.jwt() ->> 'username' 
      AND role IN ('manager', 'owner')
    )
  );

CREATE POLICY "Employees can update their assignment inventory"
  ON assignment_inventory
  FOR UPDATE
  USING (
    employee = auth.jwt() ->> 'username'
    OR EXISTS (
      SELECT 1 FROM app_users 
      WHERE username = auth.jwt() ->> 'username' 
      AND role IN ('manager', 'owner')
    )
  )
  WITH CHECK (
    employee = auth.jwt() ->> 'username'
    OR EXISTS (
      SELECT 1 FROM app_users 
      WHERE username = auth.jwt() ->> 'username' 
      AND role IN ('manager', 'owner')
    )
  );

CREATE POLICY "Managers and owners can delete assignment inventory"
  ON assignment_inventory
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM app_users 
      WHERE username = auth.jwt() ->> 'username' 
      AND role IN ('manager', 'owner')
    )
  );

-- Verificar que todo esté correcto
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'assignment_inventory' 
ORDER BY ordinal_position;
