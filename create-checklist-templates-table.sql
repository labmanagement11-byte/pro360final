-- Crear tabla checklist_templates si no existe
CREATE TABLE IF NOT EXISTS checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house TEXT NOT NULL,
  task_type TEXT NOT NULL,
  zone TEXT NOT NULL,
  task TEXT NOT NULL,
  order_num INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice por casa y tipo
CREATE INDEX IF NOT EXISTS idx_checklist_templates_house_type
ON checklist_templates(house, task_type)
WHERE active = true;

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE checklist_templates;
