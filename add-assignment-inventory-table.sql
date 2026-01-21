-- Crear tabla para el inventario sincronizado por asignación

-- 1. Crear tabla assignment_inventory (inventario por asignación)
DROP TABLE IF EXISTS assignment_inventory CASCADE;
CREATE TABLE assignment_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_assignment_id UUID NOT NULL REFERENCES calendar_assignments(id) ON DELETE CASCADE,
  employee TEXT NOT NULL,
  house TEXT DEFAULT 'EPIC D1',
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  category TEXT,  -- Cocina, Baño, Dormitorio, etc
  is_complete BOOLEAN DEFAULT false,  -- Si el item está completo/disponible
  notes TEXT,  -- Notas del empleado sobre el item
  checked_by TEXT,
  checked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- 2. Habilitar realtime en la tabla
ALTER PUBLICATION supabase_realtime ADD TABLE assignment_inventory;

-- 3. Crear índices para mejor rendimiento
CREATE INDEX idx_assignment_inventory_assignment ON assignment_inventory(calendar_assignment_id);
CREATE INDEX idx_assignment_inventory_employee ON assignment_inventory(employee);
CREATE INDEX idx_assignment_inventory_house ON assignment_inventory(house);
CREATE INDEX idx_assignment_inventory_complete ON assignment_inventory(is_complete);

-- 4. Inventario template predeterminado para casa de 10 personas
DROP TABLE IF EXISTS inventory_template CASCADE;
CREATE TABLE inventory_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house TEXT DEFAULT 'EPIC D1',
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Habilitar realtime en inventory_template
ALTER PUBLICATION supabase_realtime ADD TABLE inventory_template;

-- Crear índices
CREATE INDEX idx_inventory_template_house ON inventory_template(house);
CREATE INDEX idx_inventory_template_category ON inventory_template(category);

-- 5. Insertar inventario predeterminado para casa de 10 personas
INSERT INTO inventory_template (house, item_name, quantity, category) VALUES
-- COCINA
('EPIC D1', 'Platos hondos', 10, 'Cocina'),
('EPIC D1', 'Platos planos', 10, 'Cocina'),
('EPIC D1', 'Tazones', 10, 'Cocina'),
('EPIC D1', 'Vasos de vidrio', 10, 'Cocina'),
('EPIC D1', 'Copas de vino', 10, 'Cocina'),
('EPIC D1', 'Tenedores', 10, 'Cocina'),
('EPIC D1', 'Cuchillos', 10, 'Cocina'),
('EPIC D1', 'Cucharas', 10, 'Cocina'),
('EPIC D1', 'Cucharitas', 10, 'Cocina'),
('EPIC D1', 'Tazas de café', 10, 'Cocina'),
('EPIC D1', 'Ollas grandes', 3, 'Cocina'),
('EPIC D1', 'Ollas medianas', 3, 'Cocina'),
('EPIC D1', 'Sartenes', 3, 'Cocina'),
('EPIC D1', 'Tablas de cortar', 3, 'Cocina'),
('EPIC D1', 'Cuchillos de cocina', 5, 'Cocina'),
('EPIC D1', 'Espátulas', 3, 'Cocina'),
('EPIC D1', 'Cucharones', 2, 'Cocina'),

-- BAÑOS
('EPIC D1', 'Toallas de cuerpo blancas', 10, 'Baños'),
('EPIC D1', 'Toallas de mano', 4, 'Baños'),
('EPIC D1', 'Tapetes de baño', 3, 'Baños'),
('EPIC D1', 'Rollos de papel higiénico', 12, 'Baños'),
('EPIC D1', 'Jabón líquido', 4, 'Baños'),
('EPIC D1', 'Shampoo', 4, 'Baños'),

-- DORMITORIOS
('EPIC D1', 'Juegos de sábanas', 5, 'Dormitorios'),
('EPIC D1', 'Almohadas', 10, 'Dormitorios'),
('EPIC D1', 'Cobijas', 10, 'Dormitorios'),
('EPIC D1', 'Edredones', 5, 'Dormitorios'),

-- SALA Y COMEDOR
('EPIC D1', 'Cojines decorativos', 8, 'Sala'),
('EPIC D1', 'Manteles', 2, 'Comedor'),
('EPIC D1', 'Servilletas de tela', 10, 'Comedor'),

-- LAVANDERÍA
('EPIC D1', 'Ganchos de ropa', 30, 'Lavandería'),
('EPIC D1', 'Toallas de piscina', 10, 'Lavandería'),
('EPIC D1', 'Detergente', 2, 'Lavandería'),
('EPIC D1', 'Suavizante', 2, 'Lavandería'),

-- LIMPIEZA
('EPIC D1', 'Escobas', 2, 'Limpieza'),
('EPIC D1', 'Trapeadores', 2, 'Limpieza'),
('EPIC D1', 'Baldes', 2, 'Limpieza'),
('EPIC D1', 'Bolsas de basura grandes', 20, 'Limpieza'),
('EPIC D1', 'Bolsas de basura pequeñas', 20, 'Limpieza'),
('EPIC D1', 'Productos de limpieza (Clorox)', 3, 'Limpieza'),
('EPIC D1', 'Jabón de loza', 2, 'Limpieza'),
('EPIC D1', 'Esponjas', 5, 'Limpieza');
