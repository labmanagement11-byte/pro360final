-- Crear tabla para la lista de compras sincronizada

DROP TABLE IF EXISTS shopping_list CASCADE;
CREATE TABLE shopping_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house TEXT DEFAULT 'EPIC D1',
  item_name TEXT NOT NULL,
  quantity TEXT,  -- "2 kg", "1 unidad", etc.
  category TEXT,  -- "Alimentos", "Limpieza", "Baño", etc.
  added_by TEXT NOT NULL,  -- Usuario que agregó el item
  is_purchased BOOLEAN DEFAULT false,
  purchased_by TEXT,
  purchased_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Habilitar realtime en la tabla
ALTER PUBLICATION supabase_realtime ADD TABLE shopping_list;

-- Crear índices para mejor rendimiento
CREATE INDEX idx_shopping_list_house ON shopping_list(house);
CREATE INDEX idx_shopping_list_purchased ON shopping_list(is_purchased);
CREATE INDEX idx_shopping_list_added_by ON shopping_list(added_by);
CREATE INDEX idx_shopping_list_created_at ON shopping_list(created_at DESC);
