import * as realtimeService from "./supabaseRealtimeService";
import { nameBelongsToEmployee, type EmployeeIdentity } from "./employeeScope";

export type ExtraTaskRow = {
  id: string;
  assignedTo?: string;
  assigned_to?: string;
  completed?: boolean;
  house?: string | null;
  employeeConfirmedAt?: string | null;
  employee_confirmed_at?: string | null;
  employeeConfirmedBy?: string | null;
  employee_confirmed_by?: string | null;
  completedAt?: string | null;
  completed_at?: string | null;
  completedBy?: string | null;
  completed_by?: string | null;
};

export type HouseActor = EmployeeIdentity & {
  role?: string | null;
  house?: string | null;
};

export function employeeConfirmedAtOf(task: ExtraTaskRow | null | undefined): string {
  return String(task?.employeeConfirmedAt || task?.employee_confirmed_at || "");
}

export function isEmployeeConfirmed(task: ExtraTaskRow | null | undefined): boolean {
  return Boolean(employeeConfirmedAtOf(task));
}

function normalizeHouse(value?: string | null): string {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

/** Owner (Jonathan) or the manager assigned to that same house. */
export function canCloseExtraTask(user: HouseActor, task: { house?: string | null }): boolean {
  const role = String(user.role || "").trim().toLowerCase();
  const username = String(user.username || "").trim().toLowerCase();
  const email = String(user.email || "").trim().toLowerCase();
  const isJonathan = username === "jonathan" || email === "jonathan@360pro.com";
  if (isJonathan || role === "owner" || role === "dueno") return true;
  if (role !== "manager") return false;
  const managerHouse = normalizeHouse(user.house);
  const taskHouse = normalizeHouse(task.house);
  return Boolean(managerHouse) && managerHouse === taskHouse;
}

/** Employee confirmation only. It does not mark the task completed. */
export async function confirmExtraTaskByEmployee(
  task: ExtraTaskRow,
  identity: EmployeeIdentity | string
): Promise<{ ok: true; task: any } | { ok: false; error: string }> {
  if (!task?.id) return { ok: false, error: "No se encontró la tarea" };
  const username = typeof identity === "string" ? identity : String(identity.username || "").trim();
  if (!nameBelongsToEmployee(task.assignedTo || task.assigned_to, identity)) {
    return { ok: false, error: "Solo puedes confirmar tus propias tareas extra" };
  }
  if (task.completed) return { ok: false, error: "Esta tarea ya fue cerrada" };
  if (isEmployeeConfirmed(task)) return { ok: true, task: { ...task, completed: false } };

  const confirmedAt = new Date().toISOString();
  const updated = await realtimeService.updateTask(task.id, {
    employeeConfirmedAt: confirmedAt,
    employeeConfirmedBy: username,
  });
  if (!updated) return { ok: false, error: "No se pudo confirmar la tarea" };
  return {
    ok: true,
    task: {
      ...updated,
      completed: updated.completed === true ? true : false,
      employeeConfirmedAt: updated.employeeConfirmedAt || updated.employee_confirmed_at || confirmedAt,
      employeeConfirmedBy: updated.employeeConfirmedBy || updated.employee_confirmed_by || username,
    },
  };
}

/** Second step. Only after the employee confirmed, and only owner or house manager. */
export async function closeExtraTaskByAdmin(
  task: ExtraTaskRow,
  user: HouseActor
): Promise<{ ok: true; task: any } | { ok: false; error: string }> {
  if (!task?.id) return { ok: false, error: "No se encontró la tarea" };
  if (!canCloseExtraTask(user, task)) {
    return { ok: false, error: "Solo Jonathan o el manager de esta casa pueden cerrar la tarea" };
  }
  if (!isEmployeeConfirmed(task)) {
    return { ok: false, error: "El empleado todavía no confirma esta tarea" };
  }
  if (task.completed) return { ok: true, task };

  const completedAt = new Date().toISOString();
  const username = String(user.username || "").trim();
  const updated = await realtimeService.updateTask(task.id, {
    completed: true,
    completedAt,
    completedBy: username,
  });
  if (!updated) return { ok: false, error: "No se pudo cerrar la tarea" };
  return {
    ok: true,
    task: {
      ...updated,
      completed: true,
      completedBy: updated.completedBy || updated.completed_by || username,
      completedAt: updated.completedAt || updated.completed_at || completedAt,
      employeeConfirmedAt: updated.employeeConfirmedAt || updated.employee_confirmed_at || employeeConfirmedAtOf(task),
      employeeConfirmedBy: updated.employeeConfirmedBy || updated.employee_confirmed_by || task.employeeConfirmedBy || task.employee_confirmed_by || "",
    },
  };
}
