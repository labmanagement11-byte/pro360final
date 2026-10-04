import { supabase, checklistTable } from './supabaseClient';
import { archiveCalendarAssignment, assignmentKind, assignmentLooksDone, roomKind } from './archiveCompletedAssignment';
import { nameBelongsToEmployee } from './employeeScope';

export type EmployeeConfirmation = { at: string; by: string };

export function readAssignmentNotes(notes: any): Record<string, any> {
  if (!notes) return {};
  if (typeof notes === 'string') {
    try {
      const parsed = JSON.parse(notes);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return { ...parsed };
      return { legacy_note: notes };
    } catch {
      return { legacy_note: notes };
    }
  }
  if (typeof notes === 'object' && !Array.isArray(notes)) return { ...notes };
  return {};
}

/** Confirmación del empleado guardada en notes. No usa columnas nuevas. */
export function employeeConfirmation(assignment: any): EmployeeConfirmation | null {
  const notes = readAssignmentNotes(assignment?.notes);
  const at = String(notes.employee_confirmed_at || '').trim();
  const by = String(notes.employee_confirmed_by || '').trim();
  if (!at && !by) return null;
  return { at, by: by || String(assignment?.employee || '') };
}

export function isPendingCalendarAssignment(assignment: any): boolean {
  return !assignment?.completed;
}

export function notesWithEmployeeConfirmation(notes: any, by: string, at: string): string {
  const obj = readAssignmentNotes(notes);
  obj.employee_confirmed_by = by;
  obj.employee_confirmed_at = at;
  return JSON.stringify(obj);
}

export function notesWithoutEmployeeConfirmation(notes: any): string {
  const obj = readAssignmentNotes(notes);
  delete obj.employee_confirmed_by;
  delete obj.employee_confirmed_at;
  return JSON.stringify(obj);
}

function latestIso(values: any[]): string {
  const stamps = values.map((value) => String(value || '')).filter(Boolean).sort();
  return stamps.length ? stamps[stamps.length - 1] : new Date().toISOString();
}

function rowDone(row: any): boolean {
  return !!(row?.completed || row?.complete);
}

/**
 * Prueba de que el empleado ya terminó esta asignación (profunda, regular o mantenimiento),
 * sin marcarla como cerrada. Sirve para trabajos que Victor ya marcó antes de este flujo.
 */
export function confirmationFromEvidence(
  assignment: any,
  cleaningRows: any[] = [],
  houseRows: any[] = []
): EmployeeConfirmation | null {
  if (!assignment || assignment.completed) return null;
  const existing = employeeConfirmation(assignment);
  if (existing) return existing;

  const id = String(assignment.id ?? '');
  const mine = cleaningRows.filter((row) => String(row?.calendar_assignment_id ?? '') === id);
  if (mine.length > 0 && mine.every(rowDone)) {
    return {
      by: String(mine.map((row) => row.completed_by).filter(Boolean).pop() || assignment.employee || ''),
      at: latestIso(mine.map((row) => row.completed_at)),
    };
  }

  if (assignmentLooksDone(assignment)) {
    const notes = readAssignmentNotes(assignment.notes);
    const progress = Array.isArray(notes.subtasks_progress) ? notes.subtasks_progress : [];
    if (progress.length > 0 && progress.every(Boolean)) {
      return {
        by: String(notes.progress_updated_by || assignment.employee || ''),
        at: String(notes.progress_updated_at || new Date().toISOString()),
      };
    }
  }

  const house = String(assignment.house || '').trim();
  const kind = assignmentKind(assignment.type);
  const relevant = houseRows.filter((row) => {
    if (String(row?.house || '').trim() !== house) return false;
    return roomKind(row.room || row.zone) === kind;
  });
  if (!relevant.length || !relevant.every(rowDone)) return null;

  const bys = relevant.map((row) => String(row.completed_by || '').trim()).filter(Boolean);
  if (bys.length > 0 && !bys.some((name) => nameBelongsToEmployee(assignment.employee, name))) {
    return null;
  }
  return {
    by: bys[bys.length - 1] || String(assignment.employee || ''),
    at: latestIso(relevant.map((row) => row.completed_at)),
  };
}

export async function persistEmployeeConfirmation(
  assignment: any,
  by: string,
  at: string = new Date().toISOString()
): Promise<any | null> {
  if (!supabase || !assignment?.id) return null;
  const notes = notesWithEmployeeConfirmation(assignment.notes, by || String(assignment.employee || ''), at);
  const { error } = await (supabase as any)
    .from('calendar_assignments')
    .update({ notes, updated_at: new Date().toISOString() })
    .eq('id', assignment.id);
  if (error) {
    console.error('No se pudo guardar la confirmación del empleado', error);
    return null;
  }
  return { ...assignment, notes };
}

export async function clearEmployeeConfirmation(assignment: any): Promise<any | null> {
  if (!supabase || !assignment?.id) return null;
  if (!employeeConfirmation(assignment)) return assignment;
  const notes = notesWithoutEmployeeConfirmation(assignment.notes);
  const { error } = await (supabase as any)
    .from('calendar_assignments')
    .update({ notes, updated_at: new Date().toISOString() })
    .eq('id', assignment.id);
  if (error) {
    console.error('No se pudo quitar la confirmación del empleado', error);
    return null;
  }
  return { ...assignment, notes };
}

/**
 * Escribe la confirmación en las asignaciones pendientes que el empleado ya terminó.
 * No borra filas y no las marca completed.
 */
export async function syncPendingEmployeeConfirmations(assignments: any[]): Promise<any[]> {
  if (!supabase || !Array.isArray(assignments) || assignments.length === 0) return assignments || [];
  const pending = assignments.filter((row) => row && !row.completed && !employeeConfirmation(row));
  if (!pending.length) return assignments;

  const ids = Array.from(new Set(pending.map((row) => String(row.id)).filter(Boolean)));
  const houses = Array.from(new Set(pending.map((row) => String(row.house || '').trim()).filter((house) => house && house !== 'all')));

  let cleaningRows: any[] = [];
  let houseRows: any[] = [];
  if (ids.length) {
    const { data, error } = await (supabase as any)
      .from('cleaning_checklist')
      .select('calendar_assignment_id, completed, complete, completed_by, completed_at, house')
      .in('calendar_assignment_id', ids);
    if (!error && data) cleaningRows = data;
  }
  if (houses.length) {
    const { data, error } = await (checklistTable() as any)
      .select('house, room, zone, item, complete, completed, completed_by, completed_at')
      .in('house', houses);
    if (!error && data) houseRows = data;
  }

  const stamped = new Map<string, any>();
  for (const assignment of pending) {
    const proof = confirmationFromEvidence(assignment, cleaningRows, houseRows);
    if (!proof?.by && !proof?.at) continue;
    const saved = await persistEmployeeConfirmation(assignment, proof.by, proof.at);
    if (saved) stamped.set(String(assignment.id), saved);
  }

  if (!stamped.size) return assignments;
  return assignments.map((row) => stamped.get(String(row?.id)) || row);
}

/** Jonathan o el manager cierran. La fila sigue en la base, completed=true, y sale del calendario. */
export async function closeCalendarAssignment(assignment: any, closedBy: string): Promise<boolean> {
  if (!assignment?.id) return false;
  return archiveCalendarAssignment(
    { ...assignment, completed_by: null },
    closedBy
  );
}
