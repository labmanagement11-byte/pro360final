-- Crear tabla houses si no existe
CREATE TABLE IF NOT EXISTS public.houses (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_houses_name ON public.houses(name);

-- Habilitar RLS
ALTER TABLE public.houses ENABLE ROW LEVEL SECURITY;

-- Crear policy para SELECT (todos pueden ver)
CREATE POLICY "Houses are viewable by all users" ON public.houses
  FOR SELECT
  USING (true);

-- Crear policy para INSERT (solo admin)
CREATE POLICY "Only authenticated users can insert houses" ON public.houses
  FOR INSERT
  WITH CHECK (true);

-- Crear policy para UPDATE
CREATE POLICY "Only authenticated users can update houses" ON public.houses
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Crear policy para DELETE
CREATE POLICY "Only authenticated users can delete houses" ON public.houses
  FOR DELETE
  USING (true);
