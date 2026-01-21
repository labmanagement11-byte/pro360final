-- Crear tabla para el checklist de limpieza sincronizado en tiempo real

-- 1. Crear tabla cleaning_checklist
DROP TABLE IF EXISTS cleaning_checklist CASCADE;
CREATE TABLE cleaning_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_assignment_id UUID NOT NULL REFERENCES calendar_assignments(id) ON DELETE CASCADE,
  employee TEXT NOT NULL,
  house TEXT DEFAULT 'EPIC D1',
  zone TEXT NOT NULL,  -- Zona de limpieza (Cocina, Baños, Salas, etc)
  task TEXT NOT NULL,  -- Descripción de la tarea
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  completed_by TEXT,
  order_num INTEGER DEFAULT 0,  -- Para ordenar las tareas
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- 2. Habilitar realtime en la tabla
ALTER PUBLICATION supabase_realtime ADD TABLE cleaning_checklist;

-- 3. Crear índices para mejor rendimiento
CREATE INDEX idx_checklist_calendar ON cleaning_checklist(calendar_assignment_id);
CREATE INDEX idx_checklist_employee ON cleaning_checklist(employee);
CREATE INDEX idx_checklist_house ON cleaning_checklist(house);
CREATE INDEX idx_checklist_completed ON cleaning_checklist(completed);

-- 4. Insertar checklist predeterminado cuando se crea una asignación de calendario
-- (Esto se manejará desde el código, pero aquí van los items de ejemplo)

-- Ejemplo de items de checklist por zona:
-- COCINA: Limpiar mostrador, Limpiar estufa, Limpiar refrigerador, Barrer piso
-- BAÑOS: Limpiar espejo, Limpiar inodoro, Limpiar ducha, Trapear piso
-- SALAS: Limpiar muebles, Vaciar basura, Trapear, Desempolvar
-- DORMITORIOS: Cambiar sábanas, Desempolvar, Pasar aspiradora, Limpiar espejos
