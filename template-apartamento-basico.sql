-- ============================================
-- PLANTILLA TEMPORAL BÁSICA PARA APARTAMENTO 2 HABITACIONES
-- Casa: HYNTIBA2 APTO 406
-- ============================================

-- ============================================
-- CHECKLIST TEMPLATES - Limpieza Regular (Básica)
-- ============================================
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

-- ============================================
-- CHECKLIST TEMPLATES - Limpieza Profunda (Básica)
-- ============================================
INSERT INTO checklist_templates (house, task_type, zone, task, order_num, active) VALUES
('HYNTIBA2 APTO 406', 'Limpieza profunda', 'LIMPIEZA PROFUNDA', 'Lavar forros de sofás y cojines', 1, true),
('HYNTIBA2 APTO 406', 'Limpieza profunda', 'LIMPIEZA PROFUNDA', 'Limpiar ventanas por dentro y fuera', 2, true),
('HYNTIBA2 APTO 406', 'Limpieza profunda', 'LIMPIEZA PROFUNDA', 'Limpiar nevera por dentro completa', 3, true),
('HYNTIBA2 APTO 406', 'Limpieza profunda', 'LIMPIEZA PROFUNDA', 'Desinfectar todas las superficies', 4, true);

-- ============================================
-- CHECKLIST TEMPLATES - Mantenimiento (Básico)
-- ============================================
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

-- ============================================
-- INVENTORY TEMPLATES - Apartamento Básico
-- ============================================
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
-- VERIFICAR PLANTILLAS CREADAS
-- ============================================
-- Ver checklist templates por tipo
SELECT 
    task_type,
    COUNT(*) as total_tareas,
    STRING_AGG(DISTINCT zone, ', ') as zonas
FROM checklist_templates
WHERE house = 'HYNTIBA2 APTO 406' AND active = true
GROUP BY task_type
ORDER BY task_type;

-- Ver inventory templates por categoría
SELECT 
    category,
    COUNT(*) as total_items,
    SUM(quantity) as cantidad_total
FROM inventory_templates
WHERE house = 'HYNTIBA2 APTO 406' AND active = true
GROUP BY category
ORDER BY category;

-- ============================================
-- RESULTADO ESPERADO:
-- ============================================
-- Checklist Templates HYNTIBA2 APTO 406:
--   Limpieza regular: 18 tareas (LIMPIEZA GENERAL, COCINA, BAÑO, HABITACIONES, SALA, LAVADERO)
--   Limpieza profunda: 4 tareas (LIMPIEZA PROFUNDA)
--   Mantenimiento: 9 tareas (ELÉCTRICO, PLOMERÍA, ELECTRODOMÉSTICOS, GENERAL)
--   TOTAL: 31 tareas
--
-- Inventory Templates HYNTIBA2 APTO 406:
--   Cocina: 5 items (39 unidades)
--   Baño: 3 items (17 unidades)
--   Habitaciones: 3 items (8 unidades)
--   Sala: 1 item (4 unidades)
--   Lavadero: 1 item (30 unidades)
--   TOTAL: 13 items (98 unidades)
