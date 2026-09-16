#!/usr/bin/env python3
from pathlib import Path
path = Path('components/Dashboard.tsx')
text = path.read_text()

old = "  const showReminders = user.role === 'owner' || user.role === 'manager';"
new = """  const isOwnerLike = user.role === 'owner' || user.role === 'dueno';
  const canManageReminders = isOwnerLike || user.role === 'manager';
  const showReminders = canManageReminders;"""
if old in text:
    text = text.replace(old, new, 1)
elif 'canManageReminders' not in text:
    raise SystemExit('showReminders marker missing')

old_card = """      key: 'reminders',
      title: 'Recordatorios',
      desc: 'Visualiza y gestiona los recordatorios de pagos y eventos.',
      show: user.role === 'owner' || user.role === 'manager',"""
new_card = """      key: 'reminders',
      title: 'Recordatorios',
      desc: 'Visualiza y gestiona los recordatorios de pagos y eventos.',
      show: canManageReminders,"""
if old_card in text:
    text = text.replace(old_card, new_card, 1)

old_gate = "{(user.role === 'owner' || (user.role === 'manager' && isJonathanUser)) && (\n                    <div className=\"modal-assignment-form\">\n                      <h3>🔔 {editingReminderIdx >= 0 ? 'Editar Recordatorio' : 'Nuevo Recordatorio'}</h3>"
new_gate = "{(canManageReminders) && (\n                    <div className=\"modal-assignment-form\">\n                      <h3>🔔 {editingReminderIdx >= 0 ? 'Editar Recordatorio' : 'Nuevo Recordatorio'}</h3>"
if old_gate in text:
    text = text.replace(old_gate, new_gate, 1)

text = text.replace(
    "addRealtimeNotification(`Nuevo recordatorio: ${payload.new?.title || 'Sin título'}`, 'info');",
    "addRealtimeNotification(`Nuevo recordatorio: ${payload.new?.name || 'Sin nombre'}`, 'info');",
)

anchor = "  // Guardar mantenimiento de tareas en localStorage"
alert_effect = '''
  // Alertas de recordatorios vencidos o próximos (3 días)
  useEffect(() => {
    if (!showReminders || !reminders?.length) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const soonLimit = new Date(today);
    soonLimit.setDate(soonLimit.getDate() + 3);

    const urgent = reminders.filter((r: any) => {
      if (r.paid) return false;
      const raw = r.due_date || r.due;
      if (!raw) return false;
      const due = new Date(raw);
      if (Number.isNaN(due.getTime())) return false;
      due.setHours(0, 0, 0, 0);
      return due <= soonLimit;
    });

    if (!urgent.length) return;

    const overdue = urgent.filter((r: any) => {
      const due = new Date(r.due_date || r.due);
      due.setHours(0, 0, 0, 0);
      return due < today;
    });
    const soon = urgent.filter((r: any) => {
      const due = new Date(r.due_date || r.due);
      due.setHours(0, 0, 0, 0);
      return due >= today;
    });

    const parts: string[] = [];
    if (overdue.length) parts.push(`${overdue.length} vencido${overdue.length > 1 ? 's' : ''}`);
    if (soon.length) parts.push(`${soon.length} por vencer`);
    const msg = `Recordatorios: ${parts.join(' y ')} en ${houses[allowedHouseIdx]?.name || 'tu casa'}`;

    const dayKey = today.toISOString().slice(0, 10);
    const storageKey = `reminder_alert_${houses[allowedHouseIdx]?.name || 'house'}_${dayKey}`;
    try {
      if (typeof window !== 'undefined' && localStorage.getItem(storageKey) === msg) {
        return;
      }
      if (typeof window !== 'undefined') localStorage.setItem(storageKey, msg);
    } catch {}

    addRealtimeNotification(msg, overdue.length ? 'warning' : 'info');

    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default') {
          Notification.requestPermission().catch(() => {});
        }
        if (Notification.permission === 'granted') {
          new Notification('Limpieza360 Pro \u2014 Recordatorios', {
            body: msg + (overdue[0] ? `. Ej: ${overdue[0].name}` : soon[0] ? `. Ej: ${soon[0].name}` : ''),
          });
        }
      }
    } catch {}
  }, [reminders, showReminders, allowedHouseIdx, houses]);

'''
if 'Alertas de recordatorios vencidos' not in text:
    if anchor not in text:
        raise SystemExit('anchor missing')
    text = text.replace(anchor, alert_effect + anchor, 1)

old_title = '''                <span className="dashboard-card-title">{card.title}</span>
                <span className="dashboard-card-desc">{card.desc}</span>'''
new_title = '''                <span className="dashboard-card-title">
                  {card.title}
                  {card.key === 'reminders' && reminders.filter((r: any) => {
                    if (r.paid) return false;
                    const raw = r.due_date || r.due;
                    if (!raw) return false;
                    const due = new Date(raw);
                    if (Number.isNaN(due.getTime())) return false;
                    const today = new Date();
                    today.setHours(0,0,0,0);
                    due.setHours(0,0,0,0);
                    const limit = new Date(today);
                    limit.setDate(limit.getDate() + 3);
                    return due <= limit;
                  }).length > 0 && (
                    <span className="dashboard-card-badge" style={{
                      marginLeft: '0.45rem',
                      background: '#ef4444',
                      color: '#fff',
                      borderRadius: '999px',
                      padding: '0.1rem 0.45rem',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                    }}>
                      {reminders.filter((r: any) => {
                        if (r.paid) return false;
                        const raw = r.due_date || r.due;
                        if (!raw) return false;
                        const due = new Date(raw);
                        if (Number.isNaN(due.getTime())) return false;
                        const today = new Date();
                        today.setHours(0,0,0,0);
                        due.setHours(0,0,0,0);
                        const limit = new Date(today);
                        limit.setDate(limit.getDate() + 3);
                        return due <= limit;
                      }).length}
                    </span>
                  )}
                </span>
                <span className="dashboard-card-desc">{card.desc}</span>'''
if old_title in text:
    text = text.replace(old_title, new_title, 1)

path.write_text(text)
print('Dashboard patched OK', path.stat().st_size)
assert 'canManageReminders' in text
assert 'Alertas de recordatorios vencidos' in text
