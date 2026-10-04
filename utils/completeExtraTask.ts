import * as realtimeService from "./supabaseRealtimeService";

/** Complete an assigned "tarea extra" in the `tasks` table (not calendar_assignments). */
export async function completeExtraTask(
  task: { id: string; assignedTo?: string; assigned_to?: string; completed?: boolean },
  username: string
): Promise<{ ok: true; task: any } | { ok: false; error: string }> {
  const assignee = task.assignedTo || task.assigned_to || "";
  if (!task?.id) return { ok: false, error: "missing task id" };
  if (assignee !== username) return { ok: false, error: "Solo puedes completar tus propias tareas extra" };

  const completedAt = new Date().toISOString();
  // Always persist completed:true. Add who/when only if those columns exist.
  let updated = await realtimeService.updateTask(task.id, {
    completed: true,
    completedBy: username,
    completedAt,
  });
  if (!updated) {
    updated = await realtimeService.updateTask(task.id, {
      completed: true,
      completedBy: username,
    });
  }
  if (!updated) {
    updated = await realtimeService.updateTask(task.id, { completed: true });
  }
  if (!updated) return { ok: false, error: "No se pudo completar la tarea" };
  return {
    ok: true,
    task: {
      ...updated,
      completed: true,
      completedBy: updated.completedBy || updated.completed_by || username,
      completedAt: updated.completedAt || updated.completed_at || completedAt,
    },
  };
}
