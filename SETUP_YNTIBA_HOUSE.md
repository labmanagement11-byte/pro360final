/**
 * INSTRUCCIONES PARA CREAR LA CASA YNTIBA 2 406
 * 
 * OPCIÓN 1: Usando Supabase SQL Editor
 * 1. Ve a https://supabase.com/dashboard
 * 2. Abre tu proyecto pro360final
 * 3. Ve a SQL Editor
 * 4. Copia y ejecuta este SQL:
 */

-- Crear tabla houses si no existe
CREATE TABLE IF NOT EXISTS public.houses (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_houses_name ON public.houses(name);
ALTER TABLE public.houses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Houses are viewable by all users" ON public.houses
  FOR SELECT USING (true);

CREATE POLICY "Users can insert houses" ON public.houses
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update houses" ON public.houses
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Users can delete houses" ON public.houses
  FOR DELETE USING (true);

-- Insertar casa YNTIBA 2 406
INSERT INTO public.houses (name, description)
VALUES ('YNTIBA 2 406', 'Apartamento de 2 habitaciones, 3 baños, sala, comedor, cocina y zona de lavandería para 4 personas')
ON CONFLICT (name) DO NOTHING;

/**
 * OPCIÓN 2: Si la tabla houses ya existe, ejecuta solo esto:
 */

INSERT INTO public.houses (name, description)
VALUES ('YNTIBA 2 406', 'Apartamento de 2 habitaciones, 3 baños, sala, comedor, cocina y zona de lavandería para 4 personas')
ON CONFLICT (name) DO NOTHING;

-- Luego ejecuta el script create-yntiba-house.js
-- node scripts/create-yntiba-house.js
