-- =====================================================================
-- MIGRACIÓN: Rellenar calendar_assignment_id para todos los items
-- =====================================================================

-- Paso 1: Ver estado actual
SELECT 
    COUNT(*) as total_items,
    COUNT(CASE WHEN calendar_assignment_id IS NOT NULL THEN 1 END) as items_con_assignment_id,
    COUNT(CASE WHEN calendar_assignment_id IS NULL THEN 1 END) as items_sin_assignment_id
FROM cleaning_checklist;

-- Paso 2: Obtener todas las asignaciones y sus tareas
SELECT 
    ca.id,
    ca.employee,
    ca.house,
    ca.type,
    COUNT(cc.id) as tareas_sin_id
FROM calendar_assignments ca
LEFT JOIN cleaning_checklist cc ON ca.id::text = cc.calendar_assignment_id
WHERE cc.id IS NOT NULL
GROUP BY ca.id, ca.employee, ca.house, ca.type
ORDER BY ca.id;

-- Paso 3: Para cada asignación, relacionar sus items correctamente
-- Esto actualiza los items existentes sin assignment_id, 
-- matcheando por employee + house + type

UPDATE cleaning_checklist
SET calendar_assignment_id = ca.id::text
FROM calendar_assignments ca
WHERE cleaning_checklist.employee = ca.employee
  AND cleaning_checklist.house = ca.house
  AND (cleaning_checklist.calendar_assignment_id IS NULL OR cleaning_checklist.calendar_assignment_id = '')
  AND ca.type = 'Limpieza regular'
  -- Identificar items de limpieza regular (zona o nombre de tarea)
  AND (
    cleaning_checklist.zone IN ('COCINA', 'BAÑO', 'HABITACIONES', 'SALA', 'LAVADERO', 'LIMPIEZA GENERAL')
    OR cleaning_checklist.task ILIKE '%Barrer%'
    OR cleaning_checklist.task ILIKE '%trapear%'
    OR cleaning_checklist.task ILIKE '%polvo%'
    OR cleaning_checklist.task ILIKE '%limpiar%'
    OR cleaning_checklist.task ILIKE '%Lavar%'
  );

-- Paso 4: Actualizar items de Limpieza Profunda
UPDATE cleaning_checklist
SET calendar_assignment_id = ca.id::text
FROM calendar_assignments ca
WHERE cleaning_checklist.employee = ca.employee
  AND cleaning_checklist.house = ca.house
  AND (cleaning_checklist.calendar_assignment_id IS NULL OR cleaning_checklist.calendar_assignment_id = '')
  AND ca.type = 'Limpieza profunda'
  AND (
    cleaning_checklist.zone = 'LIMPIEZA PROFUNDA'
    OR cleaning_checklist.task ILIKE '%Lavar forros%'
    OR cleaning_checklist.task ILIKE '%ventanas%'
    OR cleaning_checklist.task ILIKE '%nevera%completa%'
    OR cleaning_checklist.task ILIKE '%Desinfectar%'
  );

-- Paso 5: Actualizar items de Mantenimiento
UPDATE cleaning_checklist
SET calendar_assignment_id = ca.id::text
FROM calendar_assignments ca
WHERE cleaning_checklist.employee = ca.employee
  AND cleaning_checklist.house = ca.house
  AND (cleaning_checklist.calendar_assignment_id IS NULL OR cleaning_checklist.calendar_assignment_id = '')
  AND ca.type = 'Mantenimiento'
  AND (
    cleaning_checklist.zone IN ('ELÉCTRICO', 'PLOMERÍA', 'ELECTRODOMÉSTICOS', 'GENERAL')
    OR cleaning_checklist.task ILIKE '%Revisar%'
  );

-- Paso 6: Verificar resultados
SELECT 
    COUNT(*) as total_items,
    COUNT(CASE WHEN calendar_assignment_id IS NOT NULL THEN 1 END) as items_con_assignment_id,
    COUNT(CASE WHEN calendar_assignment_id IS NULL THEN 1 END) as items_sin_assignment_id
FROM cleaning_checklist;

-- Paso 7: Ver distribución por assignment
SELECT 
    calendar_assignment_id,
    COUNT(*) as items_count
FROM cleaning_checklist
WHERE calendar_assignment_id IS NOT NULL
GROUP BY calendar_assignment_id
ORDER BY calendar_assignment_id;
