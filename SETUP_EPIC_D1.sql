-- ========================================
-- CONFIGURAR DATOS PARA EPIC D1
-- ========================================
-- Ejecuta esto en Supabase SQL Editor para crear checklist e inventario para EPIC D1

-- PASO 1: Insertar tareas para EPIC D1
INSERT INTO checklist (house, item, room, complete, assigned_to) VALUES
-- Limpieza Regular - ENTRADA
('EPIC D1', 'Barrer y trapear toda la casa.', 'ENTRADA', false, null),
('EPIC D1', 'Quitar el polvo de todas las superficies y decoración usando un trapo húmedo.', 'ENTRADA', false, null),
('EPIC D1', 'Limpiar los televisores cuidadosamente sin dejar marcas en la pantalla.', 'ENTRADA', false, null),
('EPIC D1', 'Revisar zócalos y esquinas para asegurarse de que estén limpios.', 'ENTRADA', false, null),
('EPIC D1', 'Limpiar telaraña.', 'ENTRADA', false, null),
-- SALA
('EPIC D1', 'Limpiar todas las superficies de la sala.', 'SALA', false, null),
('EPIC D1', 'Mover los cojines del sofá y verificar que no haya suciedad ni hormigas debajo.', 'SALA', false, null),
('EPIC D1', 'Organizar cojines y dejar la sala ordenada.', 'SALA', false, null),
-- COMEDOR
('EPIC D1', 'Limpiar mesa, sillas y superficies del comedor.', 'COMEDOR', false, null),
('EPIC D1', 'Asegurarse de que el área del comedor quede limpia y ordenada.', 'COMEDOR', false, null),
-- COCINA
('EPIC D1', 'Limpiar superficies, gabinetes por fuera y por dentro de la cocina.', 'COCINA', false, null),
('EPIC D1', 'Verificar que los gabinetes estén limpios, organizados y funcionales.', 'COCINA', false, null),
('EPIC D1', 'Limpiar la cafetera y su filtro.', 'COCINA', false, null),
('EPIC D1', 'Verificar que el dispensador de jabón de loza esté lleno.', 'COCINA', false, null),
('EPIC D1', 'Dejar toallas de cocina limpias y disponibles para los visitantes.', 'COCINA', false, null),
('EPIC D1', 'Limpiar microondas por dentro y por fuera.', 'COCINA', false, null),
('EPIC D1', 'Limpiar el filtro de agua.', 'COCINA', false, null),
('EPIC D1', 'Limpiar la nevera por dentro y por fuera (no dejar alimentos).', 'COCINA', false, null),
('EPIC D1', 'Lavar las canecas de basura y colocar bolsas nuevas.', 'COCINA', false, null),
-- BAÑOS
('EPIC D1', 'Limpiar ducha (pisos y paredes) de los baños.', 'BAÑOS', false, null),
('EPIC D1', 'Limpiar divisiones de vidrio y asegurarse de que no queden marcas.', 'BAÑOS', false, null),
('EPIC D1', 'Limpiar espejo, sanitario y lavamanos con Clorox.', 'BAÑOS', false, null),
('EPIC D1', 'Lavar las canecas de basura y colocar bolsas nuevas en los baños.', 'BAÑOS', false, null),
('EPIC D1', 'Verificar disponibilidad de toallas: máximo 10 toallas blancas de cuerpo en toda la casa, máximo 4 toallas de mano en total.', 'BAÑOS', false, null),
('EPIC D1', 'Dejar un rollo de papel higiénico nuevo instalado en cada baño.', 'BAÑOS', false, null),
('EPIC D1', 'Dejar un rollo extra en el cuarto de lavado.', 'BAÑOS', false, null),
('EPIC D1', 'Lavar y volver a colocar los tapetes de baño.', 'BAÑOS', false, null),
-- HABITACIONES
('EPIC D1', 'Revisar que no haya objetos dentro de los cajones de las habitaciones.', 'HABITACIONES', false, null),
('EPIC D1', 'Lavar sábanas y hacer las camas correctamente.', 'HABITACIONES', false, null),
('EPIC D1', 'Limpiar el polvo de todas las superficies de las habitaciones.', 'HABITACIONES', false, null),
('EPIC D1', 'Lavar los tapetes de la habitación y volver a colocarlos limpios.', 'HABITACIONES', false, null),
-- ZONA DE LAVADO
('EPIC D1', 'Limpiar el filtro de la lavadora en cada lavada.', 'ZONA DE LAVADO', false, null),
('EPIC D1', 'Limpiar el gabinete debajo del lavadero.', 'ZONA DE LAVADO', false, null),
('EPIC D1', 'Dejar ganchos de ropa disponibles.', 'ZONA DE LAVADO', false, null),
('EPIC D1', 'Dejar toallas disponibles para la piscina.', 'ZONA DE LAVADO', false, null),
-- ÁREA DE BBQ
('EPIC D1', 'Barrer y trapear el área de BBQ.', 'ÁREA DE BBQ', false, null),
('EPIC D1', 'Limpiar mesa y superficies del área de BBQ.', 'ÁREA DE BBQ', false, null),
('EPIC D1', 'Limpiar la mini nevera y no dejar ningún alimento dentro.', 'ÁREA DE BBQ', false, null),
('EPIC D1', 'Limpiar la parrilla con el cepillo (no usar agua).', 'ÁREA DE BBQ', false, null),
('EPIC D1', 'Retirar las cenizas del carbón.', 'ÁREA DE BBQ', false, null),
('EPIC D1', 'Dejar toda el área de BBQ limpia y ordenada.', 'ÁREA DE BBQ', false, null),
-- ÁREA DE PISCINA
('EPIC D1', 'Barrer y trapear el área de piscina.', 'ÁREA DE PISCINA', false, null),
('EPIC D1', 'Organizar los muebles alrededor de la piscina.', 'ÁREA DE PISCINA', false, null),
-- TERRAZA
('EPIC D1', 'Limpiar el piso de la terraza.', 'TERRAZA', false, null),
('EPIC D1', 'Limpiar superficies de la terraza.', 'TERRAZA', false, null),
('EPIC D1', 'Organizar los cojines de la sala exterior.', 'TERRAZA', false, null),
-- Limpieza Profunda
('EPIC D1', 'Lavar los forros de los muebles (sofás, sillas y cojines).', 'LIMPIEZA PROFUNDA', false, null),
('EPIC D1', 'Limpiar todas las ventanas y ventanales de la casa, por dentro y por fuera.', 'LIMPIEZA PROFUNDA', false, null),
('EPIC D1', 'Limpiar con hidrolavadora el piso exterior, incluyendo escaleras, terraza y placas vehiculares.', 'LIMPIEZA PROFUNDA', false, null),
('EPIC D1', 'Lavar la caneca grande de basura ubicada debajo de la escalera.', 'LIMPIEZA PROFUNDA', false, null),
('EPIC D1', 'Limpiar las paredes y los guardaescobas de toda la casa.', 'LIMPIEZA PROFUNDA', false, null),
-- Mantenimiento
('EPIC D1', 'Mantener la piscina limpia y en funcionamiento.', 'PISCINA Y AGUA', false, null),
('EPIC D1', 'Revisar constantemente el cuarto de máquinas para verificar su funcionamiento y detectar posibles filtraciones de agua.', 'PISCINA Y AGUA', false, null),
('EPIC D1', 'Chequear que el generador eléctrico funcione correctamente y tenga diesel suficiente.', 'SISTEMAS ELÉCTRICOS', false, null),
('EPIC D1', 'Encender la planta eléctrica al menos 2 veces al mes durante mínimo media hora.', 'SISTEMAS ELÉCTRICOS', false, null),
('EPIC D1', 'Cortar el césped cada mes y medio a dos meses, y limpiar restos de césped.', 'ÁREAS VERDES', false, null),
('EPIC D1', 'Mantenimiento de palmeras: remover hojas secas.', 'ÁREAS VERDES', false, null),
('EPIC D1', 'Mantener la matera de la terraza libre de maleza y deshierbar regularmente.', 'ÁREAS VERDES', false, null),
('EPIC D1', 'Regar las plantas vivas según necesidad.', 'ÁREAS VERDES', false, null);

-- PASO 2: Insertar inventario para EPIC D1
INSERT INTO inventory (house, name, quantity, location, complete) VALUES
-- Habitaciones
('EPIC D1', 'Almohadas', 12, 'Habitaciones', false),
('EPIC D1', 'Sábanas', 10, 'Habitaciones', false),
('EPIC D1', 'Cobijas', 10, 'Habitaciones', false),
-- Baños
('EPIC D1', 'Toallas de Baño', 10, 'Baños', false),
('EPIC D1', 'Toallas de Mano', 4, 'Baños', false),
('EPIC D1', 'Jabón de Baño', 10, 'Baños', false),
('EPIC D1', 'Papel Higiénico', 20, 'Baños', false),
('EPIC D1', 'Shampoo', 5, 'Baños', false),
('EPIC D1', 'Acondicionador', 5, 'Baños', false),
('EPIC D1', 'Tapetes de Baño', 4, 'Baños', false),
-- Cocina
('EPIC D1', 'Platos Hondos', 12, 'Cocina', false),
('EPIC D1', 'Platos Planos', 12, 'Cocina', false),
('EPIC D1', 'Vasos', 12, 'Cocina', false),
('EPIC D1', 'Tazas', 12, 'Cocina', false),
('EPIC D1', 'Cubiertos (Set)', 12, 'Cocina', false),
('EPIC D1', 'Ollas', 5, 'Cocina', false),
('EPIC D1', 'Sartenes', 3, 'Cocina', false),
('EPIC D1', 'Toallas de Cocina', 5, 'Cocina', false),
('EPIC D1', 'Detergente de Loza', 2, 'Cocina', false),
('EPIC D1', 'Esponjas', 5, 'Cocina', false),
-- Zona de Lavado
('EPIC D1', 'Ganchos de Ropa', 50, 'Zona de Lavado', false),
('EPIC D1', 'Toallas de Piscina', 8, 'Zona de Lavado', false),
('EPIC D1', 'Detergente de Ropa', 2, 'Zona de Lavado', false),
-- Limpieza
('EPIC D1', 'Escobas', 3, 'Limpieza', false),
('EPIC D1', 'Trapeadores', 2, 'Limpieza', false),
('EPIC D1', 'Baldes', 2, 'Limpieza', false),
('EPIC D1', 'Clorox', 3, 'Limpieza', false),
('EPIC D1', 'Desinfectante', 3, 'Limpieza', false),
('EPIC D1', 'Bolsas de Basura Grandes', 20, 'Limpieza', false),
('EPIC D1', 'Bolsas de Basura Pequeñas', 20, 'Limpieza', false),
('EPIC D1', 'Guantes de Limpieza', 5, 'Limpieza', false),
-- Área de BBQ
('EPIC D1', 'Carbón para BBQ', 5, 'BBQ', false),
('EPIC D1', 'Encendedor de Carbón', 1, 'BBQ', false),
('EPIC D1', 'Cepillo para Parrilla', 1, 'BBQ', false),
('EPIC D1', 'Pinzas para BBQ', 2, 'BBQ', false),
('EPIC D1', 'Tabla para Cortar', 1, 'BBQ', false),
-- Piscina
('EPIC D1', 'Cloro para Piscina', 4, 'Piscina', false),
('EPIC D1', 'Limpiador de Piscina', 1, 'Piscina', false),
('EPIC D1', 'Red para Piscina', 1, 'Piscina', false),
('EPIC D1', 'Flotadores', 4, 'Piscina', false),
-- General
('EPIC D1', 'Velas', 10, 'General', false),
('EPIC D1', 'Fósforos', 5, 'General', false),
('EPIC D1', 'Pilas AA', 8, 'General', false),
('EPIC D1', 'Pilas AAA', 8, 'General', false),
('EPIC D1', 'Bombillos de Repuesto', 5, 'General', false),
('EPIC D1', 'Control Remoto TV', 3, 'General', false),
('EPIC D1', 'Control Remoto Aire', 4, 'General', false),
('EPIC D1', 'Baterías Control', 8, 'General', false),
('EPIC D1', 'Papel Toalla', 10, 'General', false),
('EPIC D1', 'Servilletas', 100, 'General', false),
('EPIC D1', 'Vasos Desechables', 50, 'General', false),
('EPIC D1', 'Platos Desechables', 50, 'General', false),
('EPIC D1', 'Cubiertos Desechables', 50, 'General', false),
('EPIC D1', 'Hielo (Bolsas)', 3, 'General', false),
('EPIC D1', 'Agua Embotellada', 24, 'General', false),
('EPIC D1', 'Café', 2, 'General', false),
('EPIC D1', 'Azúcar', 1, 'General', false),
('EPIC D1', 'Sal', 1, 'General', false),
('EPIC D1', 'Aceite de Cocina', 1, 'General', false);

-- PASO 3: Verificar
SELECT house, COUNT(*) as total_tareas FROM checklist GROUP BY house ORDER BY house;
SELECT house, COUNT(*) as total_items FROM inventory GROUP BY house ORDER BY house;
