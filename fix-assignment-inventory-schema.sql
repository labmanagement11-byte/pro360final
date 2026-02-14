-- Corregir el schema de assignment_inventory SIN borrar datos
-- El problema: calendar_assignment_id esta definido como UUID pero calendar_assignments usa BIGINT
-- Esto causa error: "invalid input syntax for type uuid: \"193\""

-- PASO 1: Convertir calendar_assignment_id a BIGINT
-- Nota: si hay valores no numericos en calendar_assignment_id, esta conversion fallara.
ALTER TABLE assignment_inventory
  ALTER COLUMN calendar_assignment_id TYPE BIGINT
  USING NULLIF(calendar_assignment_id::text, '')::bigint;

-- PASO 2: Asegurar la FK hacia calendar_assignments
ALTER TABLE assignment_inventory
  DROP CONSTRAINT IF EXISTS assignment_inventory_calendar_assignment_id_fkey;
ALTER TABLE assignment_inventory
  ADD CONSTRAINT assignment_inventory_calendar_assignment_id_fkey
  FOREIGN KEY (calendar_assignment_id)
  REFERENCES calendar_assignments(id)
  ON DELETE CASCADE;

-- PASO 3: Indices
CREATE INDEX IF NOT EXISTS idx_assignment_inventory_assignment ON assignment_inventory(calendar_assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_inventory_employee ON assignment_inventory(employee);
CREATE INDEX IF NOT EXISTS idx_assignment_inventory_house ON assignment_inventory(house);
CREATE INDEX IF NOT EXISTS idx_assignment_inventory_complete ON assignment_inventory(is_complete);

-- PASO 4: Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE assignment_inventory;

-- PASO 5: RLS (si es necesario)
ALTER TABLE assignment_inventory ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Employees can view their assignment inventory'
  ) THEN
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
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Employees can update their assignment inventory'
  ) THEN
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
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Managers and owners can delete assignment inventory'
  ) THEN
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
  END IF;
END $$;

-- Verificar que todo este correcto
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'assignment_inventory'
ORDER BY ordinal_position;
