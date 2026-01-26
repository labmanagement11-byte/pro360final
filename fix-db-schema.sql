-- Agrega la columna para vincular checklist con asignaciones
ALTER TABLE cleaning_checklist ADD COLUMN IF NOT EXISTS calendar_assignment_id_bigint bigint;

-- Cambia el tipo de calendar_assignment_id en assignment_inventory a bigint (si usas números)
ALTER TABLE assignment_inventory ALTER COLUMN calendar_assignment_id TYPE bigint USING calendar_assignment_id::bigint;

-- Opcional: agrega un índice para mejorar búsquedas por asignación
CREATE INDEX IF NOT EXISTS idx_cleaning_checklist_assignment_id_bigint ON cleaning_checklist(calendar_assignment_id_bigint);
CREATE INDEX IF NOT EXISTS idx_assignment_inventory_assignment_id ON assignment_inventory(calendar_assignment_id);
