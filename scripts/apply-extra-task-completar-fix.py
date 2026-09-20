#!/usr/bin/env python3
"""Apply Completar fix for tarea extra on components/Dashboard.tsx"""
from pathlib import Path

path = Path("components/Dashboard.tsx")
text = path.read_text()

old_handler = """                            {!task.completed && (
                              <button
                                className=\"dashboard-btn main\"
                                onClick={async () => {
                                  const assignmentId = await resolveAssignmentIdForTask(task);
                                  if (!assignmentId) return;
                                  
                                  const now = new Date().toISOString();
                                  const { error } = await (supabase as any)
                                    .from('calendar_assignments')
                                    .update({
                                      completed: true,
                                      completed_at: now,
                                      completed_by: user.username,
                                      updated_at: now
                                    })
                                    .eq('id', assignmentId);
                                  
                                  if (error) {
                                    console.error('❌ Error marcando tarea completada:', error);
                                    return;
                                  }
                                  
                                  // Actualizar estado local
                                  setCalendarAssignments(prev => prev.map(t => 
                                    t.id === task.id 
                                      ? { ...t, completed: true, completed_at: now, completed_by: user.username } 
                                      : t
                                  ));
                                  
                                  console.log(`✅ [AssignedTasksCard] Tarea ${task.id} marcada como completada por ${user.username}`);
                                }}
                              >
                                ✅ Marcar Completada
                              </button>
                            )}"""

new_handler = """                            {!task.completed && (
                              <button
                                className=\"dashboard-btn main\"
                                onClick={async () => {
                                  // Extra tasks live in `tasks`, not calendar_assignments
                                  const assignee = task.assignedTo || task.assigned_to || '';
                                  if (assignee !== user.username) {
                                    console.error('❌ Solo puedes completar tus propias tareas extra');
                                    return;
                                  }

                                  const updated = await realtimeService.updateTask(task.id, { completed: true });
                                  if (!updated) {
                                    console.error('❌ Error marcando tarea extra como completada');
                                    alert('No se pudo completar la tarea. Intenta de nuevo.');
                                    return;
                                  }

                                  setTasksList(prev => prev.map(t =>
                                    t.id === task.id ? { ...t, ...updated, completed: true } : t
                                  ));

                                  console.log(`✅ Tarea extra ${task.id} completada por ${user.username}`);
                                }}
                              >
                                ✅ Completar
                              </button>
                            )}"""

old_sub = """      tasksSubscription = realtimeService.subscribeToTasks(houseName, (tasks: any) => {
        console.log(`⚡ Tareas actualizadas (realtime) para ${houseName}:`, tasks);
        setTasksList(tasks || []);
      });"""

new_sub = """      tasksSubscription = realtimeService.subscribeToTasks(houseName, (payload: any) => {
        console.log(`⚡ Tareas actualizadas (realtime) para ${houseName}:`, payload);
        if (payload?.eventType === 'INSERT' && payload.new) {
          setTasksList(prev => {
            if (!Array.isArray(prev)) return [payload.new];
            if (prev.some(t => t.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        } else if (payload?.eventType === 'UPDATE' && payload.new) {
          setTasksList(prev => Array.isArray(prev)
            ? prev.map(t => t.id === payload.new.id ? payload.new : t)
            : [payload.new]);
        } else if (payload?.eventType === 'DELETE' && payload.old) {
          setTasksList(prev => Array.isArray(prev)
            ? prev.filter(t => t.id !== payload.old.id)
            : []);
        }
      });"""

old_filter = "const extraTasksForUser = tasksList.filter(t => t.assignedTo === user.username && t.type === 'Tarea extra' && !t.completed);"
new_filter = "const extraTasksForUser = (Array.isArray(tasksList) ? tasksList : []).filter(t => (t.assignedTo === user.username || t.assigned_to === user.username) && t.type === 'Tarea extra' && !t.completed);"

changed = False
if "Extra tasks live in `tasks`, not calendar_assignments" in text:
    print("ALREADY_PATCHED")
else:
    if old_handler not in text:
        raise SystemExit("OLD_HANDLER_NOT_FOUND")
    text = text.replace(old_handler, new_handler, 1)
    changed = True
    print("handler patched")

if old_sub in text:
    text = text.replace(old_sub, new_sub, 1)
    changed = True
    print("sub patched")
elif "payload?.eventType === 'INSERT' && payload.new" in text and "Tareas actualizadas (realtime)" in text:
    print("sub already patched")
else:
    print("WARN: old_sub not found")

if old_filter in text:
    text = text.replace(old_filter, new_filter, 1)
    changed = True
    print("filter patched")
elif "Array.isArray(tasksList) ? tasksList : []" in text:
    print("filter already patched")
else:
    print("WARN: old_filter not found")

if changed:
    path.write_text(text)
    print("WROTE", path)
else:
    print("NO_CHANGES")
