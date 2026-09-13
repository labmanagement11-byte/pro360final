import { supabase, checklistTable } from './supabaseClient';

const MAINT_ROOMS = new Set([
  'ÁREAS VERDES',
  'PISCINA Y AGUA',
  'RUTINA DE MANTENIMIENTO',
  'SISTEMAS ELÉCTRICOS',
]);

function assignmentKind(type?: string | null): 'regular' | 'deep' | 'maint' {
  const value = String(type || '').toLowerCase();
  if (value.includes('manten')) return 'maint';
  if (value.includes('profund')) return 'deep';
  return 'regular';
}

function roomKind(room?: string | null): 'regular' | 'deep' | 'maint' {
  const name = String(room || '').trim().toUpperCase();
  if (name.includes('PROFUNDA')) return 'deep';
  if (MAINT_ROOMS.has(name) || name.includes('MANTEN')) return 'maint';
  return 'regular';
}

function progressFromNotes(notes: any): boolean[] {
  if (!notes) return [];
  if (typeof notes === 'string') {
    try {
      const parsed = JSON.parse(notes);
      return Array.isArray(parsed?.subtasks_progress) ? parsed.subtasks_progress : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(notes?.subtasks_progress) ? notes.subtasks_progress : [];
}

export function assignmentLooksDone(assignment: any): boolean {
  if (assignment?.completed) return true;
  const progress = progressFromNotes(assignment?.notes);
  return progress.length > 0 && progress.every(Boolean);
}

export async function houseChecklistDone(house?: string | null, type?: string | null): Promise<boolean> {
  if (!house) return false;
  const kind = assignmentKind(type);
  const { data, error } = await (checklistTable() as any)
    .select('id, room, complete')
    .eq('house', house);
  if (error || !data) return false;
  const rows = data.filter((row: any) => roomKind(row.room) === kind);
  return rows.length > 0 && rows.every((row: any) => !!row.complete);
}

export async function shouldArchiveAssignment(assignment: any): Promise<boolean> {
  if (assignmentLooksDone(assignment)) return true;
  return houseChecklistDone(assignment?.house, assignment?.type);
}

export async function resetHouseChecklistForType(house?: string | null, type?: string | null) {
  if (!house) return;
  const kind = assignmentKind(type);
  const { data } = await (checklistTable() as any)
    .select('id, room')
    .eq('house', house);
  const ids = (data || [])
    .filter((row: any) => roomKind(row.room) === kind)
    .map((row: any) => row.id);
  if (!ids.length) return;
  await (checklistTable() as any)
    .update({ complete: false, completed_by: null, completed_at: null })
    .in('id', ids);
}

export async function resetHouseInventoryStatus(house?: string | null) {
  if (!supabase || !house) return;
  await (supabase as any)
    .from('inventory')
    .update({
      complete: false,
      issue_type: null,
      missing_qty: 0,
      checked_by: null,
      checked_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('house', house);
}

export async function archiveCalendarAssignment(assignment: any, closedBy: string) {
  if (!supabase || !assignment?.id) return false;
  const now = new Date().toISOString();
  const { error } = await (supabase as any)
    .from('calendar_assignments')
    .update({
      completed: true,
      completed_at: assignment.completed_at || now,
      completed_by: assignment.completed_by || closedBy,
      updated_at: now,
    })
    .eq('id', assignment.id);

  if (error) {
    console.error('No se pudo archivar la asignación', error);
    return false;
  }

  await resetHouseChecklistForType(assignment.house, assignment.type);
  await resetHouseInventoryStatus(assignment.house);
  return true;
}
