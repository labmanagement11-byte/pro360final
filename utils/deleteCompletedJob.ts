import { getSupabaseClient } from './supabaseClient';
import { canCloseExtraTask, type HouseActor } from './completeExtraTask';

/** Trabajos completados se guardan 6 meses desde completed_at. Después los borra pg_cron. */
export const COMPLETED_RETENTION_MONTHS = 6;

export function retentionCutoff(now: Date = new Date()): Date {
  const cutoff = new Date(now.getTime());
  cutoff.setMonth(cutoff.getMonth() - COMPLETED_RETENTION_MONTHS);
  return cutoff;
}

/** true si completed_at cae dentro de los últimos 6 meses. */
export function isCompletedWithinRetention(
  completedAt: string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!completedAt) return false;
  const when = new Date(completedAt);
  if (Number.isNaN(when.getTime())) return false;
  return when.getTime() >= retentionCutoff(now).getTime();
}

export type CompletedJobKind = 'calendar' | 'extra';

/** Solo Jonathan (dueño) o el manager de esa casa. Empleados nunca. */
export function canDeleteCompletedJob(user: HouseActor, job: { house?: string | null }): boolean {
  return canCloseExtraTask(user, job);
}

function isMissingRpc(error: any): boolean {
  const code = String(error?.code || '');
  const msg = String(error?.message || '');
  return code === 'PGRST202' || code === '42883' || /could not find the function/i.test(msg);
}

/** Error de red (sin señal, conexión cortada): la petición no llegó a la base. */
function isNetworkError(error: any): boolean {
  const code = String(error?.code || '');
  const msg = `${error?.message || ''} ${error?.details || ''}`;
  return !code && /failed to fetch|fetch failed|network|load failed|aborted|timeout/i.test(msg);
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Borra UN trabajo completado por completo, con todas sus copias por trabajo:
 *  - calendario: cleaning_checklist (calendar_assignment_id = id), assignment_inventory de ese id
 *    y la fila de calendar_assignments.
 *  - tarea extra: checklist_items de esa tarea y la fila de tasks.
 * Nunca toca las plantillas de la casa: checklist, inventory_template, inventory.
 * Los trabajos no guardan archivos en Storage, así que no hay archivos que borrar.
 * Usa la función delete_completed_job (revisa rol y casa en la base). Si el trabajo ya no
 * existe responde ok (ya estaba borrado). Si aún no existe la función, hace el mismo borrado
 * desde el cliente (RLS ya limita a la casa).
 */
export async function deleteCompletedJob(
  kind: CompletedJobKind,
  id: string | number
): Promise<{ ok: true } | { ok: false; error: string }> {
  const jobId = String(id ?? '').trim();
  if (!jobId) return { ok: false, error: 'No se encontró el trabajo' };
  const supabase: any = getSupabaseClient();

  let data: any = null;
  let error: any = null;
  // Un reintento si la conexión falla (celular con mala señal).
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      ({ data, error } = await supabase.rpc('delete_completed_job', { p_kind: kind, p_id: jobId }));
    } catch (thrown) {
      data = null;
      error = thrown;
    }
    if (!error || !isNetworkError(error) || attempt === 1) break;
    await wait(800);
  }

  if (!error) {
    return data === true
      ? { ok: true }
      : { ok: false, error: 'Este trabajo todavía no está completado. Solo se borran trabajos completados.' };
  }
  if (!isMissingRpc(error)) {
    console.error('delete_completed_job falló', error);
    const code = String(error?.code || '');
    if (code === '42501') return { ok: false, error: 'Solo Jonathan o el manager de la casa pueden eliminarlo' };
    if (isNetworkError(error)) return { ok: false, error: 'No hay conexión. Revisa el internet e intenta otra vez.' };
    if (code === 'PGRST301' || code === 'PGRST303' || /jwt/i.test(String(error?.message || ''))) {
      return { ok: false, error: 'La sesión venció. Cierra sesión, vuelve a entrar e intenta otra vez.' };
    }
    return { ok: false, error: `No se pudo eliminar${code ? ` (${code})` : ''}. Intenta otra vez.` };
  }

  // Respaldo mientras la migración no esté aplicada.
  if (kind === 'extra') {
    await supabase.from('checklist_items').delete().eq('task_id', jobId);
    const { data: rows, error: taskError } = await supabase
      .from('tasks').delete().eq('id', jobId).eq('completed', true).select('id');
    if (taskError || !rows?.length) return { ok: false, error: 'No se pudo eliminar la tarea' };
    return { ok: true };
  }

  if (!/^\d+$/.test(jobId)) return { ok: false, error: 'Id de trabajo inválido' };
  const { data: job } = await supabase
    .from('calendar_assignments').select('id, completed').eq('id', jobId).maybeSingle();
  if (!job) return { ok: true };
  if (!job.completed) return { ok: false, error: 'Este trabajo todavía no está completado. Solo se borran trabajos completados.' };

  await supabase.from('cleaning_checklist').delete().eq('calendar_assignment_id', jobId);
  // assignment_inventory.calendar_assignment_id es uuid y calendar_assignments.id es bigint:
  // un trabajo del calendario nunca tiene filas ahí (y .eq con un número da error de uuid).
  const { data: rows, error: jobError } = await supabase
    .from('calendar_assignments').delete().eq('id', jobId).eq('completed', true).select('id');
  if (jobError || !rows?.length) return { ok: false, error: 'No se pudo eliminar el trabajo' };
  return { ok: true };
}
