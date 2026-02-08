const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yvowykxomuwqkvpkwhsx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2b3d5a3hvbXV3cWt2cGt3aHN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAwMDM5NjgsImV4cCI6MjA0NTU3OTk2OH0.hVNqCh8zr3pGfLxApNiJYxOQ9u0V-AZtfBl8w4-eqgQ'
);

async function cleanupChecklist() {
  try {
    console.log('🧹 Limpiando tabla cleaning_checklist...');
    
    // Obtener todos los items que NO tienen calendar_assignment_id relleno
    const { data: itemsWithoutAssignmentId, error: fetchError } = await supabase
      .from('cleaning_checklist')
      .select('id, calendar_assignment_id')
      .or('calendar_assignment_id.is.null,calendar_assignment_id.eq.');

    if (fetchError) {
      console.error('❌ Error fetching items:', fetchError);
      return;
    }

    console.log(`📊 Found ${itemsWithoutAssignmentId?.length || 0} items without calendar_assignment_id`);

    if (itemsWithoutAssignmentId && itemsWithoutAssignmentId.length > 0) {
      // Eliminar todos los items sin calendar_assignment_id
      const { error: deleteError } = await supabase
        .from('cleaning_checklist')
        .delete()
        .or('calendar_assignment_id.is.null,calendar_assignment_id.eq.');

      if (deleteError) {
        console.error('❌ Error deleting items:', deleteError);
      } else {
        console.log(`✅ Eliminados ${itemsWithoutAssignmentId.length} items sin assignment_id`);
      }
    }

    // Verificar cuántos items quedaron
    const { data: remaining, error: checkError } = await supabase
      .from('cleaning_checklist')
      .select('id', { count: 'exact' });

    if (!checkError) {
      console.log(`📊 Items restantes en la tabla: ${remaining?.length || 0}`);
    }

  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

cleanupChecklist();
