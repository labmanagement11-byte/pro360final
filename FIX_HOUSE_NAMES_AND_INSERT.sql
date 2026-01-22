-- ========================================
-- LIMPIAR Y CORREGIR NOMBRES DE CASAS
-- ========================================
-- Ejecuta esto en Supabase SQL Editor

-- PASO 1: Borrar tareas con nombres incorrectos
DELETE FROM checklist WHERE house IN ('HYNTIBA2 APTO 406', 'EPIC D1');

-- PASO 2: Insertar tareas para YNTIBA 2 (casa de Chava y Sandra)
INSERT INTO checklist (house, item, room, complete, assigned_to) VALUES
-- Limpieza Regular - ENTRADA
('YNTIBA 2', 'Barrer y trapear toda la casa.', 'ENTRADA', false, null),
('YNTIBA 2', 'Quitar el polvo de todas las superficies y decoración usando un trapo húmedo.', 'ENTRADA', false, null),
('YNTIBA 2', 'Limpiar los televisores cuidadosamente sin dejar marcas en la pantalla.', 'ENTRADA', false, null),
('YNTIBA 2', 'Revisar zócalos y esquinas para asegurarse de que estén limpios.', 'ENTRADA', false, null),
('YNTIBA 2', 'Limpiar telaraña.', 'ENTRADA', false, null),
-- SALA
('YNTIBA 2', 'Limpiar todas las superficies de la sala.', 'SALA', false, null),
('YNTIBA 2', 'Mover los cojines del sofá y verificar que no haya suciedad ni hormigas debajo.', 'SALA', false, null),
('YNTIBA 2', 'Organizar cojines y dejar la sala ordenada.', 'SALA', false, null),
-- COMEDOR
('YNTIBA 2', 'Limpiar mesa, sillas y superficies del comedor.', 'COMEDOR', false, null),
('YNTIBA 2', 'Asegurarse de que el área del comedor quede limpia y ordenada.', 'COMEDOR', false, null),
-- COCINA
('YNTIBA 2', 'Limpiar superficies, gabinetes por fuera y por dentro de la cocina.', 'COCINA', false, null),
('YNTIBA 2', 'Verificar que los gabinetes estén limpios, organizados y funcionales.', 'COCINA', false, null),
('YNTIBA 2', 'Limpiar la cafetera y su filtro.', 'COCINA', false, null),
('YNTIBA 2', 'Verificar que el dispensador de jabón de loza esté lleno.', 'COCINA', false, null),
('YNTIBA 2', 'Dejar toallas de cocina limpias y disponibles para los visitantes.', 'COCINA', false, null),
('YNTIBA 2', 'Limpiar microondas por dentro y por fuera.', 'COCINA', false, null),
('YNTIBA 2', 'Limpiar el filtro de agua.', 'COCINA', false, null),
('YNTIBA 2', 'Limpiar la nevera por dentro y por fuera (no dejar alimentos).', 'COCINA', false, null),
('YNTIBA 2', 'Lavar las canecas de basura y colocar bolsas nuevas.', 'COCINA', false, null),
-- BAÑOS
('YNTIBA 2', 'Limpiar ducha (pisos y paredes) de los baños.', 'BAÑOS', false, null),
('YNTIBA 2', 'Limpiar divisiones de vidrio y asegurarse de que no queden marcas.', 'BAÑOS', false, null),
('YNTIBA 2', 'Limpiar espejo, sanitario y lavamanos con Clorox.', 'BAÑOS', false, null),
('YNTIBA 2', 'Lavar las canecas de basura y colocar bolsas nuevas en los baños.', 'BAÑOS', false, null),
('YNTIBA 2', 'Verificar disponibilidad de toallas: máximo 10 toallas blancas de cuerpo en toda la casa, máximo 4 toallas de mano en total.', 'BAÑOS', false, null),
('YNTIBA 2', 'Dejar un rollo de papel higiénico nuevo instalado en cada baño.', 'BAÑOS', false, null),
('YNTIBA 2', 'Dejar un rollo extra en el cuarto de lavado.', 'BAÑOS', false, null),
('YNTIBA 2', 'Lavar y volver a colocar los tapetes de baño.', 'BAÑOS', false, null),
-- HABITACIONES
('YNTIBA 2', 'Revisar que no haya objetos dentro de los cajones de las habitaciones.', 'HABITACIONES', false, null),
('YNTIBA 2', 'Lavar sábanas y hacer las camas correctamente.', 'HABITACIONES', false, null),
('YNTIBA 2', 'Limpiar el polvo de todas las superficies de las habitaciones.', 'HABITACIONES', false, null),
('YNTIBA 2', 'Lavar los tapetes de la habitación y volver a colocarlos limpios.', 'HABITACIONES', false, null),
-- ZONA DE LAVADO
('YNTIBA 2', 'Limpiar el filtro de la lavadora en cada lavada.', 'ZONA DE LAVADO', false, null),
('YNTIBA 2', 'Limpiar el gabinete debajo del lavadero.', 'ZONA DE LAVADO', false, null),
('YNTIBA 2', 'Dejar ganchos de ropa disponibles.', 'ZONA DE LAVADO', false, null),
('YNTIBA 2', 'Dejar toallas disponibles para la piscina.', 'ZONA DE LAVADO', false, null),
-- ÁREA DE BBQ
('YNTIBA 2', 'Barrer y trapear el área de BBQ.', 'ÁREA DE BBQ', false, null),
('YNTIBA 2', 'Limpiar mesa y superficies del área de BBQ.', 'ÁREA DE BBQ', false, null),
('YNTIBA 2', 'Limpiar la mini nevera y no dejar ningún alimento dentro.', 'ÁREA DE BBQ', false, null),
('YNTIBA 2', 'Limpiar la parrilla con el cepillo (no usar agua).', 'ÁREA DE BBQ', false, null),
('YNTIBA 2', 'Retirar las cenizas del carbón.', 'ÁREA DE BBQ', false, null),
('YNTIBA 2', 'Dejar toda el área de BBQ limpia y ordenada.', 'ÁREA DE BBQ', false, null),
-- ÁREA DE PISCINA
('YNTIBA 2', 'Barrer y trapear el área de piscina.', 'ÁREA DE PISCINA', false, null),
('YNTIBA 2', 'Organizar los muebles alrededor de la piscina.', 'ÁREA DE PISCINA', false, null),
-- TERRAZA
('YNTIBA 2', 'Limpiar el piso de la terraza.', 'TERRAZA', false, null),
('YNTIBA 2', 'Limpiar superficies de la terraza.', 'TERRAZA', false, null),
('YNTIBA 2', 'Organizar los cojines de la sala exterior.', 'TERRAZA', false, null),
-- Limpieza Profunda
('YNTIBA 2', 'Lavar los forros de los muebles (sofás, sillas y cojines).', 'LIMPIEZA PROFUNDA', false, null),
('YNTIBA 2', 'Limpiar todas las ventanas y ventanales de la casa, por dentro y por fuera.', 'LIMPIEZA PROFUNDA', false, null),
('YNTIBA 2', 'Limpiar con hidrolavadora el piso exterior, incluyendo escaleras, terraza y placas vehiculares.', 'LIMPIEZA PROFUNDA', false, null),
('YNTIBA 2', 'Lavar la caneca grande de basura ubicada debajo de la escalera.', 'LIMPIEZA PROFUNDA', false, null),
('YNTIBA 2', 'Limpiar las paredes y los guardaescobas de toda la casa.', 'LIMPIEZA PROFUNDA', false, null),
-- Mantenimiento
('YNTIBA 2', 'Mantener la piscina limpia y en funcionamiento.', 'PISCINA Y AGUA', false, null),
('YNTIBA 2', 'Revisar constantemente el cuarto de máquinas para verificar su funcionamiento y detectar posibles filtraciones de agua.', 'PISCINA Y AGUA', false, null),
('YNTIBA 2', 'Chequear que el generador eléctrico funcione correctamente y tenga diesel suficiente.', 'SISTEMAS ELÉCTRICOS', false, null),
('YNTIBA 2', 'Encender la planta eléctrica al menos 2 veces al mes durante mínimo media hora.', 'SISTEMAS ELÉCTRICOS', false, null),
('YNTIBA 2', 'Cortar el césped cada mes y medio a dos meses, y limpiar restos de césped.', 'ÁREAS VERDES', false, null),
('YNTIBA 2', 'Mantenimiento de palmeras: remover hojas secas.', 'ÁREAS VERDES', false, null),
('YNTIBA 2', 'Mantener la matera de la terraza libre de maleza y deshierbar regularmente.', 'ÁREAS VERDES', false, null),
('YNTIBA 2', 'Regar las plantas vivas según necesidad.', 'ÁREAS VERDES', false, null);

-- Verificar
SELECT house, COUNT(*) as total_tareas FROM checklist GROUP BY house;
