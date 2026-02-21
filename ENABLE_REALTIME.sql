-- ================================================
-- HABILITAR REALTIME EN SUPABASE
-- ================================================
-- Ejecutar este script en el SQL Editor de Supabase
-- Dashboard > SQL Editor > New Query > Pegar y ejecutar
-- ================================================

-- Habilitar Realtime para la tabla inventory
ALTER PUBLICATION supabase_realtime ADD TABLE inventory;

-- Habilitar Realtime para la tabla calendar_assignments
ALTER PUBLICATION supabase_realtime ADD TABLE calendar_assignments;

-- Habilitar Realtime para la tabla cleaning_checklist
ALTER PUBLICATION supabase_realtime ADD TABLE cleaning_checklist;

-- Habilitar Realtime para la tabla assignment_checklist
ALTER PUBLICATION supabase_realtime ADD TABLE assignment_checklist;

-- Habilitar Realtime para la tabla assignment_inventory
ALTER PUBLICATION supabase_realtime ADD TABLE assignment_inventory;

-- Habilitar Realtime para la tabla subtask_progress
ALTER PUBLICATION supabase_realtime ADD TABLE subtask_progress;

-- Habilitar Realtime para la tabla inventory_progress
ALTER PUBLICATION supabase_realtime ADD TABLE inventory_progress;

-- Habilitar Realtime para la tabla reminders
ALTER PUBLICATION supabase_realtime ADD TABLE reminders;

-- Habilitar Realtime para la tabla shopping_list
ALTER PUBLICATION supabase_realtime ADD TABLE shopping_list;

-- Habilitar Realtime para la tabla checklist
ALTER PUBLICATION supabase_realtime ADD TABLE checklist;

-- Habilitar Realtime para la tabla app_users
ALTER PUBLICATION supabase_realtime ADD TABLE app_users;

-- ================================================
-- VERIFICAR QUE REALTIME ESTA HABILITADO
-- ================================================
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- ================================================
-- NOTA: Si alguna tabla ya esta en la publicacion,
-- el comando mostrara un error que puedes ignorar.
-- ================================================
