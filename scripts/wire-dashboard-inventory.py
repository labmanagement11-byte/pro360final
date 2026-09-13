#!/usr/bin/env python3
from pathlib import Path

path = Path("components/Dashboard.tsx")
text = path.read_text()
original = text


def replace_once(src: str, old: str, new: str, label: str) -> str:
    count = src.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")
    return src.replace(old, new, 1)


text = replace_once(
    text,
    "import Tasks from './Tasks';",
    "import Tasks from './Tasks';\nimport { archiveCalendarAssignment, shouldArchiveAssignment } from '../utils/archiveCompletedAssignment';",
    "archive import",
)

text = replace_once(
    text,
    "        const filtered = isManagerUser ? (data || []) : (data || []).filter((a: any) => a.employee === user.username);",
    "        const scoped = isManagerUser ? (data || []) : (data || []).filter((a: any) => a.employee === user.username);\n        const filtered = scoped.filter((a: any) => !a.completed);",
    "assigned filter",
)

text = replace_once(
    text,
    """    // Si todas las subtareas están completadas, marcar la tarea como completada
    if (allSubtasksCompleted) {
      updateData.completed = true;
      updateData.completed_at = now;
      updateData.completed_by = user.username;
      console.log(`✅ [SubtaskToggle] Todas las subtareas completadas para tarea ${taskId}, marcando como completada por ${user.username}`);
    }
""",
    """    // Jonathan cierra el trabajo. Aquí solo se guarda el progreso en verde.
""",
    "no auto complete",
)

text = replace_once(
    text,
    """    // Actualizar el estado local si se completó la tarea
    if (allSubtasksCompleted) {
      setAssignedTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: true, completed_at: now, completed_by: user.username } : t));
    }
""",
    "",
    "no local auto complete",
)

text = replace_once(
    text,
    "      const deleted = await realtimeService.deleteCalendarAssignmentCascade(String(resolvedId || task.id));\n      if (deleted) {\n        setAssignedTasks(prev => prev.filter(t => t.id !== task.id));\n      }",
    """      const target = { ...task, id: resolvedId || task.id };
      const archive = await shouldArchiveAssignment(target);
      const ok = archive
        ? await archiveCalendarAssignment(target, user.username)
        : await realtimeService.deleteCalendarAssignmentCascade(String(target.id));
      if (ok) {
        setAssignedTasks(prev => prev.filter(t => t.id !== task.id));
      }""",
    "assigned delete archives",
)

text = replace_once(
    text,
    """                                      console.log('🗑️ Eliminando asignación del calendario:', assignment.id);
                                      await realtimeService.deleteCalendarAssignment(assignment.id);
                                      setCalendarAssignments(calendarAssignments.filter(a => a.id !== assignment.id));""",
    """                                      console.log('🗑️ Cerrando o eliminando asignación del calendario:', assignment.id);
                                      if (await shouldArchiveAssignment(assignment)) {
                                        await archiveCalendarAssignment(assignment, user.username);
                                        setCalendarAssignments(calendarAssignments.map(a => a.id === assignment.id ? { ...a, completed: true, completed_at: a.completed_at || new Date().toISOString(), completed_by: a.completed_by || user.username } : a));
                                      } else {
                                        await realtimeService.deleteCalendarAssignment(assignment.id);
                                        setCalendarAssignments(calendarAssignments.filter(a => a.id !== assignment.id));
                                      }""",
    "calendar delete archives",
)

text = replace_once(
    text,
    "                                                  const deleted = await realtimeService.deleteCalendarAssignmentCascade(String(assignment.id));\n                                                  if (deleted) {\n                                                    setCalendarAssignments(prev => prev.filter(a => a.id !== assignment.id));",
    """                                                  const archive = await shouldArchiveAssignment(assignment);
                                                  const deleted = archive
                                                    ? await archiveCalendarAssignment(assignment, user.username)
                                                    : await realtimeService.deleteCalendarAssignmentCascade(String(assignment.id));
                                                  if (deleted) {
                                                    setCalendarAssignments(prev => archive
                                                      ? prev.map(a => a.id === assignment.id ? { ...a, completed: true, completed_at: a.completed_at || new Date().toISOString(), completed_by: a.completed_by || user.username } : a)
                                                      : prev.filter(a => a.id !== assignment.id));""",
    "checklist delete archives",
)

text = replace_once(
    text,
    "              {selectedModalCard === 'inventory' && (\n                <>",
    """              {selectedModalCard === 'inventory' && (
                <Inventory
                  user={user}
                  houseName={
                    user.house && user.house !== 'all'
                      ? user.house
                      : (houses[selectedHouseIdx]?.houseName || houses[selectedHouseIdx]?.name || houses[allowedHouseIdx]?.name || 'EPIC D1')
                  }
                />
              )}
              {false && selectedModalCard === 'inventory' && (
                <>""",
    "inventory modal",
)

if "import Inventory from './Inventory'" not in text:
    raise SystemExit("Inventory import missing")
if text == original:
    raise SystemExit("no changes applied")

path.write_text(text)
print("patched", path, "chars", len(text))
