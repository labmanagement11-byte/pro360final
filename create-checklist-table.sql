-- Create checklist_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.checklist_items (
  id BIGSERIAL PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  zona TEXT,
  text TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  house TEXT,
  type TEXT DEFAULT 'regular',
  completed_by TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

-- Insert checklist items for YNTIBA 2 406
INSERT INTO public.checklist_items (taskId, zona, text, completed, house, type) VALUES
  (1, 'Sala', 'Barrer pisos', false, 'YNTIBA 2 406', 'regular'),
  (1, 'Sala', 'Limpiar sofá', false, 'YNTIBA 2 406', 'regular'),
  (1, 'Comedor', 'Limpiar mesas', false, 'YNTIBA 2 406', 'regular'),
  (2, 'Habitación 1', 'Limpiar piso', false, 'YNTIBA 2 406', 'regular'),
  (2, 'Habitación 2', 'Cambiar sábanas', false, 'YNTIBA 2 406', 'regular'),
  (3, 'Baño Principal', 'Limpiar sanitario', false, 'YNTIBA 2 406', 'regular'),
  (3, 'Baño Principal', 'Limpiar espejo', false, 'YNTIBA 2 406', 'regular'),
  (3, 'Baño Secundario', 'Limpiar ducha', false, 'YNTIBA 2 406', 'regular'),
  (4, 'Cocina', 'Limpiar encimeras', false, 'YNTIBA 2 406', 'regular'),
  (4, 'Cocina', 'Limpiar estufa', false, 'YNTIBA 2 406', 'regular'),
  (5, 'Lavandería', 'Limpiar lavadora', false, 'YNTIBA 2 406', 'regular')
ON CONFLICT DO NOTHING;
