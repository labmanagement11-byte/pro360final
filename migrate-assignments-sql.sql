-- Script SQL para migrar asignaciones existentes agregando tareas desde plantillas
-- Este script solo procesa asignaciones con ID tipo UUID

-- 1. Verificar asignaciones con UUID que NO tienen tareas
SELECT 
    ca.id,
    ca.employee,
    ca.house,
    ca.date,
    ca.type,
    COUNT(cc.id) as tareas_existentes
FROM calendar_assignments ca
LEFT JOIN cleaning_checklist cc ON ca.id::text = cc.calendar_assignment_id
WHERE ca.id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
GROUP BY ca.id, ca.employee, ca.house, ca.date, ca.type
HAVING COUNT(cc.id) = 0;

-- 2. Insertar tareas para "Limpieza regular" (asignaciones sin tareas)
INSERT INTO cleaning_checklist (calendar_assignment_id, employee, house, zone, task, completed, order_num)
SELECT 
    ca.id::text,
    ca.employee,
    ca.house,
    ct.zone,
    ct.task,
    false,
    ct.order_num
FROM calendar_assignments ca
CROSS JOIN checklist_templates ct
LEFT JOIN cleaning_checklist cc ON ca.id::text = cc.calendar_assignment_id
WHERE ca.type = 'Limpieza regular'
    AND ct.task_type = 'Limpieza regular'
    AND ct.active = true
    AND cc.id IS NULL
    AND ca.id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 3. Insertar tareas para "Limpieza profunda" (asignaciones sin tareas)
INSERT INTO cleaning_checklist (calendar_assignment_id, employee, house, zone, task, completed, order_num)
SELECT 
    ca.id::text,
    ca.employee,
    ca.house,
    ct.zone,
    ct.task,
    false,
    ct.order_num
FROM calendar_assignments ca
CROSS JOIN checklist_templates ct
LEFT JOIN cleaning_checklist cc ON ca.id::text = cc.calendar_assignment_id
WHERE ca.type = 'Limpieza profunda'
    AND ct.task_type = 'Limpieza profunda'
    AND ct.active = true
    AND cc.id IS NULL
    AND ca.id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 4. Insertar tareas para "Mantenimiento" (asignaciones sin tareas)
INSERT INTO cleaning_checklist (calendar_assignment_id, employee, house, zone, task, completed, order_num)
SELECT 
    ca.id::text,
    ca.employee,
    ca.house,
    ct.zone,
    ct.task,
    false,
    ct.order_num
FROM calendar_assignments ca
CROSS JOIN checklist_templates ct
LEFT JOIN cleaning_checklist cc ON ca.id::text = cc.calendar_assignment_id
WHERE ca.type = 'Mantenimiento'
    AND ct.task_type = 'Mantenimiento'
    AND ct.active = true
    AND cc.id IS NULL
    AND ca.id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 5. Verificar resultado final
SELECT 
    ca.id,
    ca.employee,
    ca.type,
    COUNT(cc.id) as total_tareas
FROM calendar_assignments ca
LEFT JOIN cleaning_checklist cc ON ca.id::text = cc.calendar_assignment_id
WHERE ca.id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
GROUP BY ca.id, ca.employee, ca.type
ORDER BY ca.date DESC;
