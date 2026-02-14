-- Crear tabla para recordatorios sincronizados

CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  due_date DATE NOT NULL,
  bank TEXT,
  account TEXT,
  invoice_number TEXT,
  house TEXT DEFAULT 'EPIC D1',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Habilitar realtime en la tabla
ALTER PUBLICATION supabase_realtime ADD TABLE reminders;

-- Crear indices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_reminders_house ON reminders(house);
CREATE INDEX IF NOT EXISTS idx_reminders_due_date ON reminders(due_date);
CREATE INDEX IF NOT EXISTS idx_reminders_created_at ON reminders(created_at DESC);
