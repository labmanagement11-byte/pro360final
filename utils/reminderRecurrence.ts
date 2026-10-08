// Recurrencia de recordatorios y botón "Ya lo hice".
// Las fechas se manejan como 'YYYY-MM-DD' en hora de Colombia (igual que work-push),
// para que "hoy" sea el mismo día en el teléfono y en el servidor.

export type ReminderFrequency =
  | 'once'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'semiannual'
  | 'yearly'
  | 'custom';

export const REMINDER_FREQUENCY_OPTIONS: { value: ReminderFrequency; label: string }[] = [
  { value: 'once', label: 'Única vez' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'semiannual', label: 'Semestral' },
  { value: 'yearly', label: 'Anual' },
  { value: 'custom', label: 'Cada N días' },
];

const MONTHS_BY_FREQUENCY: Partial<Record<ReminderFrequency, number>> = {
  monthly: 1,
  quarterly: 3,
  semiannual: 6,
  yearly: 12,
};

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function normalizeFrequency(value: unknown): ReminderFrequency {
  const v = String(value || '').trim().toLowerCase();
  return (REMINDER_FREQUENCY_OPTIONS.some((o) => o.value === v) ? v : 'once') as ReminderFrequency;
}

export function isRecurring(reminder: any): boolean {
  return normalizeFrequency(reminder?.frequency) !== 'once';
}

/** Hoy en Colombia como 'YYYY-MM-DD'. */
export function bogotaTodayISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function parseISODate(raw: unknown): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(raw ?? ''));
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

function toISO(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function addDaysISO(iso: string, days: number): string {
  const p = parseISODate(iso);
  if (!p) return iso;
  const t = new Date(Date.UTC(p.y, p.m - 1, p.d + days));
  return toISO(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

/** Suma meses sin desbordar: 31 ene + 1 mes = 28/29 feb. */
export function addMonthsISO(iso: string, months: number): string {
  const p = parseISODate(iso);
  if (!p) return iso;
  const total = p.m - 1 + months;
  const y = p.y + Math.floor(total / 12);
  const m = ((total % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return toISO(y, m + 1, Math.min(p.d, lastDay));
}

function daysBetween(fromISO: string, toISODate: string): number {
  const a = parseISODate(fromISO);
  const b = parseISODate(toISODate);
  if (!a || !b) return 0;
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86400000);
}

/**
 * Días del intervalo "Cada N días". Si falta interval_days se usa la distancia
 * original entre la creación y el vencimiento (mínimo 1 día).
 */
export function customIntervalDays(reminder: any): number {
  const n = Number(reminder?.interval_days);
  if (Number.isFinite(n) && n > 0) return Math.round(n);
  const created = reminder?.created_at ? bogotaTodayISO(new Date(reminder.created_at)) : '';
  const due = String(reminder?.due || reminder?.due_date || '').slice(0, 10);
  return Math.max(1, daysBetween(created, due));
}

/** Próximo vencimiento después de "Ya lo hice": hoy + intervalo. null si es de única vez. */
export function nextDueDate(reminder: any, todayISO: string = bogotaTodayISO()): string | null {
  const freq = normalizeFrequency(reminder?.frequency);
  if (freq === 'once') return null;
  if (freq === 'weekly') return addDaysISO(todayISO, 7);
  if (freq === 'custom') return addDaysISO(todayISO, customIntervalDays(reminder));
  return addMonthsISO(todayISO, MONTHS_BY_FREQUENCY[freq] || 1);
}

export function frequencyLabel(reminder: any): string {
  const freq = normalizeFrequency(reminder?.frequency);
  if (freq === 'custom') {
    const n = customIntervalDays(reminder);
    return `Cada ${n} día${n === 1 ? '' : 's'}`;
  }
  return REMINDER_FREQUENCY_OPTIONS.find((o) => o.value === freq)?.label || 'Única vez';
}

/** '2026-10-08' o un timestamp → '8 oct 2026' (hora de Colombia). */
export function formatShortDate(raw: unknown): string {
  if (!raw) return '';
  const str = String(raw);
  let iso = str;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const t = new Date(str);
    if (Number.isNaN(t.getTime())) return str;
    iso = bogotaTodayISO(t);
  }
  const p = parseISODate(iso);
  if (!p) return str;
  return `${p.d} ${MESES[p.m - 1]} ${p.y}`;
}

export function doneByLabel(reminder: any): string {
  if (!reminder?.last_done_at) return '';
  const who = String(reminder.last_done_by || '').trim() || 'alguien';
  return `Hecho por ${who} el ${formatShortDate(reminder.last_done_at)}`;
}

/** Pueden marcar "Ya lo hice": dueño/owner (Jonathan) y el manager de esa casa. */
export function canMarkReminderDone(
  user: { role?: string; house?: string; username?: string } | null | undefined,
  reminder: any,
  isJonathan = false,
): boolean {
  if (!user || !reminder) return false;
  const role = String(user.role || '').toLowerCase();
  if (isJonathan || role === 'owner' || role === 'dueno') return true;
  if (role !== 'manager') return false;
  const norm = (v: unknown) => String(v || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const userHouse = norm(user.house);
  return !!userHouse && userHouse !== 'all' && userHouse === norm(reminder.house);
}

/** Inserta o reemplaza por id: evita el recordatorio duplicado (respuesta + realtime). */
export function upsertReminderById<T extends { id?: any }>(list: T[], row: T | null | undefined): T[] {
  if (!row || row.id == null) return list;
  const idx = list.findIndex((r) => r?.id === row.id);
  if (idx === -1) return [...list, row];
  const copy = list.slice();
  copy[idx] = { ...copy[idx], ...row };
  return copy;
}

/** Quita filas repetidas por id (por si la carga inicial y el realtime se cruzan). */
export function dedupeRemindersById<T extends { id?: any }>(list: T[]): T[] {
  const seen = new Set<any>();
  return list.filter((r) => {
    if (r?.id == null) return true;
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
}
