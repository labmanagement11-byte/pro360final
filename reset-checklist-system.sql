-- =========================================================
-- LIMPIAR Y RESETEAR SISTEMA DE CHECKLISTS POR ASIGNACIÓN
-- =========================================================

-- 1. Eliminar TODOS los items de cleaning_checklist
-- (Se regenerarán automáticamente desde plantillas cuando se abra cada asignación)
DELETE FROM cleaning_checklist;

-- 2. Verificar que la tabla esté vacía
SELECT COUNT(*) as total_items FROM cleaning_checklist;

-- 3. Verificar que checklist_templates tiene datos
SELECT 
    house,
    task_type,
    COUNT(*) as total_plantillas
FROM checklist_templates
WHERE active = true
GROUP BY house, task_type
ORDER BY house, task_type;

-- 4. Verificar calendar_assignments disponibles
SELECT 
    id,
    house,
    employee,
    type,
    created_at
FROM calendar_assignments
ORDER BY created_at DESC;
