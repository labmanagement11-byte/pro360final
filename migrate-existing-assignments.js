/**
 * Script de migración: Agregar tareas desde plantillas a asignaciones existentes
 * Este script busca asignaciones sin tareas y les crea checklists desde checklist_templates
 */

const { createClient } = require('@supabase/supabase-js');

// Usar SERVICE ROLE KEY para bypasear RLS y acceder a todos los datos
const supabaseUrl = 'https://hecvlywrahigujakkguw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlY3ZseXdyYWhpZ3VqYWtrZ3V3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjcyMzg2NCwiZXhwIjoyMDgyMjk5ODY0fQ.ZgmvGtXXCSNJ51RsHBe0vBONP6TaZ_pAW5fcRJchSCA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateAssignments() {
  console.log('🔄 Iniciando migración de asignaciones...\n');

  try {
    // 1. Obtener todas las asignaciones
    console.log('🔍 Consultando tabla calendar_assignments...');
    const { data: assignments, error: assignError } = await supabase
      .from('calendar_assignments')
      .select('*');

    if (assignError) {
      console.error('❌ Error obteniendo asignaciones:', assignError);
      return;
    }

    console.log(`📋 Encontradas ${assignments?.length || 0} asignaciones totales`);
    
    if (!assignments || assignments.length === 0) {
      console.log('ℹ️  La tabla calendar_assignments está vacía.');
      console.log('💡 Esto es normal si acabas de implementar el sistema de plantillas.');
      console.log('💡 Las nuevas asignaciones que crees tendrán sus tareas automáticamente.\n');
      return;
    }
    
    console.log('');

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    // 2. Para cada asignación, verificar si tiene tareas
    for (const assignment of assignments) {
      const assignmentId = String(assignment.id); // Convertir a string por si es número
      
      console.log(`\n🔍 Verificando asignación: ${assignmentId}`);
      console.log(`   👤 Empleado: ${assignment.employee}`);
      console.log(`   🏠 Casa: ${assignment.house}`);
      console.log(`   📅 Fecha: ${assignment.date}`);
      console.log(`   🏷️  Tipo: ${assignment.type}`);

      // Verificar si ya tiene tareas en cleaning_checklist
      const { data: existingTasks, error: taskError } = await supabase
        .from('cleaning_checklist')
        .select('id')
        .eq('calendar_assignment_id', assignmentId);

      if (taskError) {
        console.error(`   ❌ Error verificando tareas: ${taskError.message}`);
        errors++;
        continue;
      }

      if (existingTasks && existingTasks.length > 0) {
        console.log(`   ⏭️  Ya tiene ${existingTasks.length} tareas - OMITIENDO`);
        skipped++;
        continue;
      }

      // 3. Obtener plantillas para este tipo de asignación
      const { data: templates, error: templateError } = await supabase
        .from('checklist_templates')
        .select('*')
        .eq('task_type', assignment.type)
        .eq('active', true)
        .order('order_num', { ascending: true });

      if (templateError) {
        console.error(`   ❌ Error obteniendo plantillas: ${templateError.message}`);
        errors++;
        continue;
      }

      if (!templates || templates.length === 0) {
        console.log(`   ⚠️  No hay plantillas para tipo "${assignment.type}" - OMITIENDO`);
        skipped++;
        continue;
      }

      console.log(`   ✅ Encontradas ${templates.length} plantillas para "${assignment.type}"`);

      // 4. Crear tareas desde plantillas
      const checklistItems = templates.map((template) => ({
        calendar_assignment_id: assignmentId, // Usar el ID convertido a string
        employee: assignment.employee,
        house: assignment.house,
        zone: template.zone,
        task: template.task,
        completed: false,
        order_num: template.order_num
      }));

      const { data: insertedTasks, error: insertError } = await supabase
        .from('cleaning_checklist')
        .insert(checklistItems)
        .select();

      if (insertError) {
        console.error(`   ❌ Error insertando tareas: ${insertError.message}`);
        errors++;
        continue;
      }

      console.log(`   ✅ MIGRADO: ${insertedTasks.length} tareas creadas`);
      migrated++;
    }

    // Resumen final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE MIGRACIÓN');
    console.log('='.repeat(60));
    console.log(`✅ Asignaciones migradas: ${migrated}`);
    console.log(`⏭️  Asignaciones omitidas: ${skipped}`);
    console.log(`❌ Errores: ${errors}`);
    console.log(`📋 Total procesadas: ${assignments.length}`);
    console.log('='.repeat(60) + '\n');

    if (migrated > 0) {
      console.log('🎉 Migración completada exitosamente!');
      console.log('💡 Las asignaciones migradas ahora tienen sus tareas desde las plantillas.');
    } else {
      console.log('ℹ️  No hubo asignaciones para migrar.');
    }

  } catch (error) {
    console.error('❌ Error fatal en migración:', error);
  }
}

// Ejecutar migración
migrateAssignments();
