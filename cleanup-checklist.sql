-- Limpiar la tabla cleaning_checklist para que solo quede data consistente
-- Eliminar items sin calendar_assignment_id (datos legados)

DELETE FROM cleaning_checklist 
WHERE calendar_assignment_id IS NULL 
   OR calendar_assignment_id = '';

-- Verificar cuántos items quedan
SELECT COUNT(*) as total_items FROM cleaning_checklist;

-- Ver estructura de datos que quedan
SELECT DISTINCT 
  calendar_assignment_id,
  house,
  employee,
  COUNT(*) as item_count
FROM cleaning_checklist
WHERE calendar_assignment_id IS NOT NULL
GROUP BY calendar_assignment_id, house, employee
ORDER BY calendar_assignment_id;
