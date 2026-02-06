-- ============================================
-- PARTE 1: MIGRAR SISTEMA A PLANTILLAS POR CASA
-- ============================================

-- Agregar columna house a checklist_templates
ALTER TABLE checklist_templates 
ADD COLUMN IF NOT EXISTS house TEXT;

-- Migrar plantillas existentes a EPIC D1 (si no tienen house asignado)
UPDATE checklist_templates 
SET house = 'EPIC D1' 
WHERE house IS NULL;

-- Hacer la columna NOT NULL
ALTER TABLE checklist_templates 
ALTER COLUMN house SET NOT NULL;

-- Crear índice para mejorar performance
CREATE INDEX IF NOT EXISTS idx_checklist_templates_house_type 
ON checklist_templates(house, task_type) 
WHERE active = true;

-- ============================================
-- PARTE 2: CREAR TABLA INVENTORY_TEMPLATES
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

-- Crear índice
CREATE INDEX IF NOT EXISTS idx_inventory_templates_house 
ON inventory_templates(house) 
WHERE active = true;

-- ============================================
-- PARTE 3: INSERTAR INVENTARIO PARA EPIC D1
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
-- PARTE 4: PLANTILLAS PARA HYNTIBA2 APTO 406
-- ============================================

-- Checklist - Limpieza Regular (18 tareas)
INSERT INTO checklist_templates (house, task_type, zone, task, order_num, active) VALUES
-- Limpieza General
('HYNTIBA2 APTO 406', 'Limpieza regular', 'LIMPIEZA GENERAL', 'Barrer y trapear todo el apartamento', 1, true),
('HYNTIBA2 APTO 406', 'Limpieza regular', 'LIMPIEZA GENERAL', 'Quitar el polvo de todas las superficies', 2, true),
('HYNTIBA2 APTO 406', 'Limpieza regular', 'LIMPIEZA GENERAL', 'Vaciar basureros', 3, true),

-- Cocina
('HYNTIBA2 APTO 406', 'Limpieza regular', 'COCINA', 'Limpiar superficies y gabinetes', 4, true),
('HYNTIBA2 APTO 406', 'Limpieza regular', 'COCINA', 'Lavar platos y limpiar fregadero', 5, true),
('HYNTIBA2 APTO 406', 'Limpieza regular', 'COCINA', 'Limpiar estufa y microondas', 6, true),
('HYNTIBA2 APTO 406', 'Limpieza regular', 'COCINA', 'Limpiar nevera por fuera', 7, true),

-- Baño
('HYNTIBA2 APTO 406', 'Limpieza regular', 'BAÑO', 'Limpiar sanitario, lavamanos y ducha', 8, true),
('HYNTIBA2 APTO 406', 'Limpieza regular', 'BAÑO', 'Limpiar espejo', 9, true),
('HYNTIBA2 APTO 406', 'Limpieza regular', 'BAÑO', 'Barrer y trapear piso', 10, true),

-- Habitaciones
('HYNTIBA2 APTO 406', 'Limpieza regular', 'HABITACIONES', 'Tender las 2 camas', 11, true),
('HYNTIBA2 APTO 406', 'Limpieza regular', 'HABITACIONES', 'Organizar ropa y closets', 12, true),
('HYNTIBA2 APTO 406', 'Limpieza regular', 'HABITACIONES', 'Quitar polvo de muebles', 13, true),

-- Sala
('HYNTIBA2 APTO 406', 'Limpieza regular', 'SALA', 'Organizar cojines y muebles', 14, true),
('HYNTIBA2 APTO 406', 'Limpieza regular', 'SALA', 'Limpiar televisor', 15, true),
('HYNTIBA2 APTO 406', 'Limpieza regular', 'SALA', 'Barrer y trapear', 16, true),

-- Lavadero
('HYNTIBA2 APTO 406', 'Limpieza regular', 'LAVADERO', 'Lavar ropa pendiente', 17, true),
('HYNTIBA2 APTO 406', 'Limpieza regular', 'LAVADERO', 'Limpiar área de lavadora', 18, true);

-- Checklist - Limpieza Profunda (4 tareas)
INSERT INTO checklist_templates (house, task_type, zone, task, order_num, active) VALUES
('HYNTIBA2 APTO 406', 'Limpieza profunda', 'LIMPIEZA PROFUNDA', 'Lavar forros de sofás y cojines', 1, true),
('HYNTIBA2 APTO 406', 'Limpieza profunda', 'LIMPIEZA PROFUNDA', 'Limpiar ventanas por dentro y fuera', 2, true),
('HYNTIBA2 APTO 406', 'Limpieza profunda', 'LIMPIEZA PROFUNDA', 'Limpiar nevera por dentro completa', 3, true),
('HYNTIBA2 APTO 406', 'Limpieza profunda', 'LIMPIEZA PROFUNDA', 'Desinfectar todas las superficies', 4, true);

-- Checklist - Mantenimiento (9 tareas)
INSERT INTO checklist_templates (house, task_type, zone, task, order_num, active) VALUES
-- Eléctrico
('HYNTIBA2 APTO 406', 'Mantenimiento', 'ELÉCTRICO', 'Revisar que todos los enchufes funcionen', 1, true),
('HYNTIBA2 APTO 406', 'Mantenimiento', 'ELÉCTRICO', 'Revisar bombillas y cambiar si es necesario', 2, true),

-- Plomería
('HYNTIBA2 APTO 406', 'Mantenimiento', 'PLOMERÍA', 'Revisar que no haya fugas en llaves', 3, true),
('HYNTIBA2 APTO 406', 'Mantenimiento', 'PLOMERÍA', 'Revisar sanitario y tanque', 4, true),

-- Electrodomésticos
('HYNTIBA2 APTO 406', 'Mantenimiento', 'ELECTRODOMÉSTICOS', 'Revisar funcionamiento de lavadora', 5, true),
('HYNTIBA2 APTO 406', 'Mantenimiento', 'ELECTRODOMÉSTICOS', 'Revisar funcionamiento de nevera', 6, true),
('HYNTIBA2 APTO 406', 'Mantenimiento', 'ELECTRODOMÉSTICOS', 'Revisar funcionamiento de estufa', 7, true),

-- General
('HYNTIBA2 APTO 406', 'Mantenimiento', 'GENERAL', 'Revisar puertas y cerraduras', 8, true),
('HYNTIBA2 APTO 406', 'Mantenimiento', 'GENERAL', 'Revisar ventanas y persianas', 9, true);

-- Inventario HYNTIBA2 (13 items)
INSERT INTO inventory_templates (house, item_name, quantity, category, location, order_num, active) VALUES
-- Cocina
('HYNTIBA2 APTO 406', 'Platos', 8, 'Cocina', 'Gabinete', 1, true),
('HYNTIBA2 APTO 406', 'Vasos', 8, 'Cocina', 'Gabinete', 2, true),
('HYNTIBA2 APTO 406', 'Cubiertos', 16, 'Cocina', 'Gaveta', 3, true),
('HYNTIBA2 APTO 406', 'Ollas', 3, 'Cocina', 'Gabinete', 4, true),
('HYNTIBA2 APTO 406', 'Sartenes', 2, 'Cocina', 'Gabinete', 5, true),

-- Baño
('HYNTIBA2 APTO 406', 'Toallas de cuerpo', 6, 'Baño', 'Closet', 6, true),
('HYNTIBA2 APTO 406', 'Toallas de mano', 3, 'Baño', 'Baño', 7, true),
('HYNTIBA2 APTO 406', 'Papel higiénico', 8, 'Baño', 'Closet', 8, true),

-- Habitaciones
('HYNTIBA2 APTO 406', 'Almohadas', 4, 'Habitaciones', 'Camas', 9, true),
('HYNTIBA2 APTO 406', 'Juegos de sábanas', 2, 'Habitaciones', 'Closet', 10, true),
('HYNTIBA2 APTO 406', 'Cobijas', 2, 'Habitaciones', 'Closet', 11, true),

-- Sala
('HYNTIBA2 APTO 406', 'Cojines', 4, 'Sala', 'Sofá', 12, true),

-- Lavadero
('HYNTIBA2 APTO 406', 'Ganchos de ropa', 30, 'Lavadero', 'Área lavado', 13, true);

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================
-- Ver todas las casas con sus plantillas
SELECT 
    house,
    task_type,
    COUNT(*) as total_tareas
FROM checklist_templates
WHERE active = true
GROUP BY house, task_type
ORDER BY house, task_type;

-- Ver inventarios por casa
SELECT 
    house,
    COUNT(*) as total_items,
    SUM(quantity) as cantidad_total
FROM inventory_templates
WHERE active = true
GROUP BY house
ORDER BY house;

-- ============================================
-- RESULTADO ESPERADO:
-- ============================================
-- EPIC D1:
--   Limpieza regular: 23 tareas
--   Limpieza profunda: 5 tareas
--   Mantenimiento: 26 tareas
--   Inventario: 18 items
--
-- HYNTIBA2 APTO 406:
--   Limpieza regular: 18 tareas
--   Limpieza profunda: 4 tareas
--   Mantenimiento: 9 tareas
--   Inventario: 13 items
