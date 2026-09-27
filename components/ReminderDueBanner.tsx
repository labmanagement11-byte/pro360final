"use client"
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as realtimeService from '../utils/supabaseRealtimeService';
import './ReminderDueBanner.css';

// Días de anticipación para la alerta visible antes del vencimiento
export const REMINDER_WARNING_DAYS = 7;

type UrgencyLevel = 'ok' | 'soon' | 'today' | 'overdue';

interface BannerUser {
  username: string;
  role: string;
  house?: string;
}

// 'YYYY-MM-DD' se interpreta como fecha LOCAL (new Date('YYYY-MM-DD') sería UTC y en
// Colombia (UTC-5) correría el vencimiento un día hacia atrás).
function parseDueDate(raw: any): Date | null {
  if (!raw) return null;
  const str = String(raw).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(str);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(str);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getReminderUrgency(reminder: any): { level: UrgencyLevel; daysLeft: number | null } {
  if (!reminder || reminder.paid) return { level: 'ok', daysLeft: null };
  const due = parseDueDate(reminder.due || reminder.due_date);
  if (!due) return { level: 'ok', daysLeft: null };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysLeft = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (daysLeft < 0) return { level: 'overdue', daysLeft };
  if (daysLeft === 0) return { level: 'today', daysLeft };
  if (daysLeft <= REMINDER_WARNING_DAYS) return { level: 'soon', daysLeft };
  return { level: 'ok', daysLeft };
}

export function reminderUrgencyLabel(level: UrgencyLevel, daysLeft: number | null): string {
  if (level === 'overdue') {
    const d = Math.abs(daysLeft || 0);
    return `vencido hace ${d} día${d === 1 ? '' : 's'}`;
  }
  if (level === 'today') return 'vence HOY';
  if (level === 'soon') return `vence en ${daysLeft} día${daysLeft === 1 ? '' : 's'}`;
  return '';
}

function canManageReminders(role?: string) {
  const r = String(role || '').toLowerCase();
  return r === 'owner' || r === 'dueno' || r === 'manager';
}

/**
 * Alerta visible y persistente (roja) cuando hay pagos que vencen en los próximos
 * REMINDER_WARNING_DAYS días o ya vencieron. Se muestra encima del Dashboard para
 * dueños y managers, y se refresca cada 60 s y al volver a la app.
 */
const ReminderDueBanner = ({ user }: { user: BannerUser }) => {
  const allowed = canManageReminders(user?.role);
  const role = String(user?.role || '').toLowerCase();
  const scope = role === 'owner' || role === 'dueno' || !user?.house || user.house === 'all'
    ? '*'
    : user.house;
  const [reminders, setReminders] = useState<any[]>([]);
  const [dismissed, setDismissed] = useState(false);

  const load = useCallback(async () => {
    try {
      const rows = await realtimeService.getReminders(scope);
      setReminders(rows || []);
    } catch (err) {
      console.error('❌ [ReminderDueBanner] Error cargando recordatorios:', err);
    }
  }, [scope]);

  // Sin canal realtime propio: el Dashboard ya usa el topic `reminders-changes-<casa>` y
  // compartirlo rompería su suscripción. Refresco cada 60 s y al volver a la app.
  useEffect(() => {
    if (!allowed) return;
    load();
    const refresh = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      load();
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    const timer = setInterval(refresh, 60 * 1000);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      clearInterval(timer);
    };
  }, [allowed, scope, load]);

  const urgent = useMemo(() => (
    reminders
      .map((r: any) => ({ reminder: r, ...getReminderUrgency(r) }))
      .filter((x) => x.level !== 'ok')
      .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0))
  ), [reminders]);

  if (!allowed || dismissed || urgent.length === 0) return null;

  const overdueCount = urgent.filter((x) => x.level === 'overdue').length;
  const showHouse = scope === '*';

  return (
    <div className="reminder-due-banner" role="alert" aria-live="polite">
      <span className="reminder-due-banner-icon" aria-hidden="true">🚨</span>
      <div className="reminder-due-banner-text">
        <strong>
          {urgent.length} pago{urgent.length === 1 ? '' : 's'} {overdueCount > 0 ? 'vencido(s) o ' : ''}por vencer (próximos {REMINDER_WARNING_DAYS} días)
        </strong>
        <ul className="reminder-due-banner-list">
          {urgent.slice(0, 4).map((x) => (
            <li key={x.reminder.id || `${x.reminder.name}-${x.reminder.due}`}>
              <span className="reminder-due-banner-name">{x.reminder.name}</span>
              {showHouse && x.reminder.house ? <span className="reminder-due-banner-house"> · {x.reminder.house}</span> : null}
              <span className={`reminder-due-banner-when level-${x.level}`}> — {reminderUrgencyLabel(x.level, x.daysLeft)} ({x.reminder.due})</span>
            </li>
          ))}
          {urgent.length > 4 && <li>+{urgent.length - 4} más en Recordatorios</li>}
        </ul>
      </div>
      <button
        type="button"
        className="reminder-due-banner-close"
        onClick={() => setDismissed(true)}
        aria-label="Ocultar alerta de recordatorios"
        title="Ocultar"
      >
        ×
      </button>
    </div>
  );
};

export default ReminderDueBanner;
