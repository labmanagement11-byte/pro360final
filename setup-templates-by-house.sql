-- ============================================
-- PASO 1: Agregar columna house a checklist_templates
-- ============================================
ALTER TABLE checklist_templates 
ADD COLUMN IF NOT EXISTS house TEXT DEFAULT 'EPIC D1';

-- Migrar plantillas existentes a EPIC D1
UPDATE checklist_templates 
SET house = 'EPIC D1' 
WHERE house IS NULL;

-- Hacer la columna NOT NULL después de migrar
ALTER TABLE checklist_templates 
ALTER COLUMN house SET NOT NULL;

COMMENT ON COLUMN checklist_templates.house IS 'Casa a la que pertenece esta plantilla de checklist';

-- ============================================
-- PASO 2: Crear tabla inventory_templates
-- ============================================
CREATE TABLE IF NOT EXISTS inventory_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  category TEXT NOT NULL DEFAULT 'General',
  location TEXT,
  order_num INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE inventory_templates IS 'Plantillas de inventario por casa - define qué items revisar en cada limpieza profunda';
COMMENT ON COLUMN inventory_templates.house IS 'Casa a la que pertenece este item de inventario';
COMMENT ON COLUMN inventory_templates.item_name IS 'Nombre del item (ej: Almohadas, Toallas, Platos)';
COMMENT ON COLUMN inventory_templates.quantity IS 'Cantidad esperada del item';
COMMENT ON COLUMN inventory_templates.category IS 'Categoría del item (Cocina, Baños, Dormitorios, etc)';
COMMENT ON COLUMN inventory_templates.location IS 'Ubicación específica en la casa';
COMMENT ON COLUMN inventory_templates.order_num IS 'Orden de visualización';
COMMENT ON COLUMN inventory_templates.active IS 'Si el item está activo para usar en nuevas asignaciones';

-- ============================================
-- PASO 3: Insertar inventario template para EPIC D1
-- ============================================
INSERT INTO inventory_templates (house, item_name, quantity, category, location, order_num, active) VALUES
-- Cocina
('EPIC D1', 'Platos grandes', 12, 'Cocina', 'Gabinete cocina', 1, true),
('EPIC D1', 'Platos pequeños', 12, 'Cocina', 'Gabinete cocina', 2, true),
('EPIC D1', 'Vasos', 12, 'Cocina', 'Gabinete cocina', 3, true),
('EPIC D1', 'Tazas', 8, 'Cocina', 'Gabinete cocina', 4, true),
('EPIC D1', 'Cubiertos completos', 24, 'Cocina', 'Gaveta cocina', 5, true),
('EPIC D1', 'Ollas', 4, 'Cocina', 'Gabinete cocina', 6, true),
('EPIC D1', 'Sartenes', 3, 'Cocina', 'Gabinete cocina', 7, true),

-- Baños
('EPIC D1', 'Toallas de cuerpo blancas', 10, 'Baños', 'Closet principal', 8, true),
('EPIC D1', 'Toallas de mano', 4, 'Baños', 'Closet principal', 9, true),
('EPIC D1', 'Tapetes de baño', 3, 'Baños', 'Cada baño', 10, true),
('EPIC D1', 'Rollos papel higiénico', 12, 'Baños', 'Closet lavado', 11, true),

-- Dormitorios
('EPIC D1', 'Almohadas', 8, 'Dormitorios', 'Cada cama', 12, true),
('EPIC D1', 'Juegos de sábanas', 4, 'Dormitorios', 'Closet principal', 13, true),
('EPIC D1', 'Cobijas', 4, 'Dormitorios', 'Closet principal', 14, true),

-- Sala y General
('EPIC D1', 'Cojines decorativos', 8, 'Sala', 'Sofás', 15, true),
('EPIC D1', 'Controles remotos', 3, 'Sala', 'Mesa centro', 16, true),
('EPIC D1', 'Toallas de piscina', 6, 'Piscina', 'Closet lavado', 17, true),
('EPIC D1', 'Ganchos de ropa', 50, 'Lavandería', 'Cuarto lavado', 18, true);

-- ============================================
-- PASO 4: Crear índices para optimizar búsquedas
-- ============================================
CREATE INDEX IF NOT EXISTS idx_checklist_templates_house_type 
ON checklist_templates(house, task_type) 
WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_inventory_templates_house 
ON inventory_templates(house) 
WHERE active = true;

-- ============================================
-- PASO 5: Verificar datos migrados
-- ============================================
-- Ver checklist templates por casa
SELECT house, task_type, COUNT(*) as total_tareas
FROM checklist_templates
WHERE active = true
GROUP BY house, task_type
ORDER BY house, task_type;

-- Ver inventory templates por casa
SELECT house, category, COUNT(*) as total_items
FROM inventory_templates
WHERE active = true
GROUP BY house, category
ORDER BY house, category;

-- ============================================
-- RESULTADO ESPERADO:
-- ============================================
-- checklist_templates: 
--   EPIC D1 - Limpieza regular: 23 tareas
--   EPIC D1 - Limpieza profunda: 5 tareas
--   EPIC D1 - Mantenimiento: 26 tareas
--
-- inventory_templates:
--   EPIC D1 - Cocina: 7 items
--   EPIC D1 - Baños: 4 items
--   EPIC D1 - Dormitorios: 3 items
--   EPIC D1 - Sala: 2 items
--   EPIC D1 - Piscina: 1 item
--   EPIC D1 - Lavandería: 1 item
--   Total: 18 items
