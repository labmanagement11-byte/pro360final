import { assignmentKind } from './archiveCompletedAssignment';
import { readAssignmentNotes } from './calendarWork';
import { nameBelongsToEmployee } from './employeeScope';

export type AssignmentCheckItem = {
  id: string;
  zone: string;
  task: string;
  completed: boolean;
  completed_by: string | null;
  completed_at: string | null;
  progressIndex: number;
  cleaningId: string | null;
};

const MAINT_ROOMS = ['ÁREAS VERDES', 'PISCINA Y AGUA', 'RUTINA DE MANTENIMIENTO', 'SISTEMAS ELÉCTRICOS'];

function norm(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function rowId(row: any): number {
  const n = Number(row?.id);
  return Number.isFinite(n) ? n : 0;
}

/** Same rooms the employee sees, in the same order as subtasks_progress. */
export function houseRowsForJob(rows: any[], type?: string | null): any[] {
  const kind = assignmentKind(type);
  const sorted = [...(rows || [])].sort((a, b) => rowId(a) - rowId(b) || String(a?.id || '').localeCompare(String(b?.id || '')));
  return sorted.filter((row) => {
    const room = String(row?.room || row?.zone || 'GENERAL').trim() || 'GENERAL';
    const assigned = String(row?.assigned_to || '').toLowerCase();
    const roomUp = room.toUpperCase();
    const roomIsDeep = roomUp.includes('PROFUNDA');
    const roomIsMaint = roomUp.includes('MANTEN') || MAINT_ROOMS.includes(roomUp);
    if (kind === 'maint') return assigned.includes('manten') || roomIsMaint;
    if (kind === 'deep') return assigned.includes('profund') || roomIsDeep;
    return !assigned.includes('manten') && !assigned.includes('profund') && !roomIsDeep && !roomIsMaint;
  });
}

function cleaningForAssignment(assignment: any, cleaningRows: any[]): any[] {
  const id = String(assignment?.id ?? '');
  const house = String(assignment?.house || '').trim();
  const employee = assignment?.employee;
  return (cleaningRows || []).filter((row) => {
    if (String(row?.calendar_assignment_id ?? '') !== id) return false;
    const rowHouse = String(row?.house || '').trim();
    if (house && rowHouse && rowHouse !== house) return false;
    const rowEmployee = String(row?.employee || '').trim();
    if (rowEmployee && employee && !nameBelongsToEmployee(rowEmployee, String(employee))) return false;
    return true;
  });
}

function findCleaning(rows: any[], zone: string, task: string): any | null {
  const zoneKey = norm(zone);
  const taskKey = norm(task);
  return rows.find((row) => norm(row?.task || row?.item) === taskKey && (!norm(row?.zone || row?.room) || norm(row?.zone || row?.room) === zoneKey)) || null;
}

function employeeMarked(row: any, employee: string): boolean {
  if (!(row?.completed || row?.complete)) return false;
  const who = String(row?.completed_by || '').trim();
  return !!who && !!employee && nameBelongsToEmployee(who, employee);
}

function copyMarked(row: any, employee: string): boolean {
  if (!(row?.completed || row?.complete)) return false;
  const who = String(row?.completed_by || '').trim();
  if (!who) return true;
  return !!employee && nameBelongsToEmployee(who, employee);
}

/**
 * Tasks for one assignment only: that house, that job type, that employee.
 * Checks follow what the employee marked (subtasks_progress), then this
 * assignment's cleaning_checklist rows, then house checks attributed to them.
 */
export function buildAssignmentChecklistItems(
  assignment: any,
  houseRows: any[] = [],
  cleaningRows: any[] = []
): AssignmentCheckItem[] {
  if (!assignment?.id) return [];
  const employee = String(assignment.employee || '');
  const house = String(assignment.house || '').trim();
  const scopedHouse = (houseRows || []).filter((row) => {
    const rowHouse = String(row?.house || '').trim();
    return !house || !rowHouse || rowHouse === house;
  });
  const jobRows = houseRowsForJob(scopedHouse, assignment.type);
  const scopedCleaning = cleaningForAssignment(assignment, cleaningRows);
  const notes = readAssignmentNotes(assignment.notes);
  const progress = Array.isArray(notes.subtasks_progress) ? notes.subtasks_progress : [];
  const hasProgress = progress.length > 0;
  const progressBy = String(notes.progress_updated_by || employee || '').trim() || null;
  const progressAt = String(notes.progress_updated_at || '').trim() || null;

  if (jobRows.length > 0) {
    return jobRows.map((row, index) => {
      const zone = String(row?.room || row?.zone || 'General').trim() || 'General';
      const task = String(row?.item || row?.task || '').trim();
      const cleaning = findCleaning(scopedCleaning, zone, task);
      let completed = false;
      let completedBy: string | null = null;
      let completedAt: string | null = null;
      if (hasProgress) {
        completed = !!progress[index];
        if (completed) {
          completedBy = progressBy || employee || null;
          completedAt = progressAt;
        }
      } else if (cleaning && copyMarked(cleaning, employee)) {
        completed = true;
        completedBy = String(cleaning.completed_by || employee || '').trim() || null;
        completedAt = cleaning.completed_at || null;
      } else if (employeeMarked(row, employee)) {
        completed = true;
        completedBy = String(row.completed_by || '').trim() || null;
        completedAt = row.completed_at || null;
      }
      return {
        id: `job-${assignment.id}-${row?.id ?? index}`,
        zone,
        task: task || 'Tarea',
        completed,
        completed_by: completed ? completedBy : null,
        completed_at: completed ? completedAt : null,
        progressIndex: index,
        cleaningId: cleaning?.id != null ? String(cleaning.id) : null,
      };
    });
  }

  const kind = assignmentKind(assignment.type);
  const typed = scopedCleaning.filter((row) => {
    const zone = String(row?.zone || row?.room || '');
    const upper = zone.toUpperCase();
    if (kind === 'deep') return upper.includes('PROFUNDA');
    if (kind === 'maint') return upper.includes('MANTEN') || MAINT_ROOMS.includes(upper);
    return !upper.includes('PROFUNDA') && !upper.includes('MANTEN') && !MAINT_ROOMS.includes(upper);
  });
  const source = typed.length > 0 ? typed : scopedCleaning;
  return source.map((row, index) => {
    const completed = copyMarked(row, employee);
    return {
      id: `clean-${assignment.id}-${row?.id ?? index}`,
      zone: String(row?.zone || row?.room || 'General').trim() || 'General',
      task: String(row?.task || row?.item || 'Tarea').trim() || 'Tarea',
      completed,
      completed_by: completed ? (String(row?.completed_by || employee || '').trim() || null) : null,
      completed_at: completed ? (row?.completed_at || null) : null,
      progressIndex: index,
      cleaningId: row?.id != null ? String(row.id) : null,
    };
  });
}
