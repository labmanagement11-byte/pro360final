#!/usr/bin/env python3
"""Red pending style + badges on dashboard cards for pending items."""
from pathlib import Path

path = Path('components/Dashboard.tsx')
text = path.read_text()

# 1) Insert pendingCounts helper just before cards render (after cards array definition end)
if 'pendingCardCounts' not in text:
    anchor = "  const formatPurchaseAmount = (value: number | string | null | undefined) => {"
    helper = '''  const pendingRemindersCount = (reminders || []).filter((r: any) => {
    if (r.paid) return false;
    const raw = r.due_date || r.due;
    if (!raw) return false;
    const due = new Date(raw);
    if (Number.isNaN(due.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const limit = new Date(today);
    limit.setDate(limit.getDate() + 3);
    return due <= limit;
  }).length;

  const pendingShoppingCount = (shoppingList || []).filter((i: any) => !i.is_purchased).length;
  const pendingInventoryIssuesCount = (inventoryList || []).filter((i: any) => !!i.issue_type && !i.complete).length;
  const pendingTasksCount = (tasksList || []).filter((t: any) => !t.completed && (
    user.role === 'empleado' ? t.assignedTo === user.username || t.assigned_to === user.username : true
  )).length;
  const pendingAssignmentsCount = (calendarAssignments || []).filter((a: any) => !a.completed).length;
  const pendingCardCounts: Record<string, number> = {
    shopping: pendingShoppingCount,
    inventory: pendingInventoryIssuesCount,
    reminders: pendingRemindersCount,
    tasks: pendingTasksCount,
    assignedTasks: pendingAssignmentsCount,
    checklist: 0,
    extraTasks: extraTasksForUser.length,
  };

  const formatPurchaseAmount = (value: number | string | null | undefined) => {
'''
    if anchor not in text:
        raise SystemExit('formatPurchaseAmount anchor missing')
    text = text.replace(anchor, helper, 1)
    print('inserted pendingCardCounts')
else:
    print('pendingCardCounts already present')

# 2) Patch employee assignedTasks card
old_emp = '''            {user.role === 'empleado' && (
              <button
                className="dashboard-card"
                onClick={() => setSelectedModalCard('assignedTasks')}
                aria-label="Tareas Asignadas"
              >
                <span className="dashboard-card-title">Tareas Asignadas</span>
                <span className="dashboard-card-desc">Tareas de limpieza o mantenimiento asignadas por el manager</span>
              </button>
            )}'''

new_emp = '''            {user.role === 'empleado' && (
              <button
                className={`dashboard-card${(pendingCardCounts.assignedTasks || 0) > 0 ? ' has-pending' : ''}`}
                onClick={() => setSelectedModalCard('assignedTasks')}
                aria-label="Tareas Asignadas"
              >
                <span className="dashboard-card-title">
                  Tareas Asignadas
                  {(pendingCardCounts.assignedTasks || 0) > 0 && (
                    <span className="dashboard-card-badge-pending">{pendingCardCounts.assignedTasks}</span>
                  )}
                </span>
                <span className="dashboard-card-desc">Tareas de limpieza o mantenimiento asignadas por el manager</span>
              </button>
            )}'''

if old_emp in text:
    text = text.replace(old_emp, new_emp, 1)
    print('patched employee assigned card')
elif 'has-pending' in text and 'Tareas Asignadas' in text:
    print('employee card already pending-aware')
else:
    print('WARN: employee card block not found exactly')

# 3) Patch generic cards map button className + badge
old_btn = '''            {cards.filter(card => card.show).map(card => (
              <button
                key={card.key}
                className="dashboard-card"
                onClick={() => {
                  if (['calendar', 'shopping', 'reminders', 'checklist', 'inventory', 'tasks', 'extraTasks', 'completedJobs'].includes(card.key)) {
                    setSelectedModalCard(card.key);
                  } else {
                    setView(card.key);
                  }
                }}
                aria-label={card.title}
              >
                <span className="dashboard-card-title">
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
                <span className="dashboard-card-desc">{card.desc}</span>
              </button>
            ))}'''

new_btn = '''            {cards.filter(card => card.show).map(card => {
              const pendingN = pendingCardCounts[card.key] || 0;
              const showPending = pendingN > 0 && ['shopping', 'inventory', 'reminders', 'tasks', 'extraTasks'].includes(card.key);
              return (
              <button
                key={card.key}
                className={`dashboard-card${showPending ? ' has-pending' : ''}`}
                onClick={() => {
                  if (['calendar', 'shopping', 'reminders', 'checklist', 'inventory', 'tasks', 'extraTasks', 'completedJobs'].includes(card.key)) {
                    setSelectedModalCard(card.key);
                  } else {
                    setView(card.key);
                  }
                }}
                aria-label={card.title}
              >
                <span className="dashboard-card-title">
                  {card.title}
                  {showPending && (
                    <span className="dashboard-card-badge-pending">{pendingN}</span>
                  )}
                </span>
                <span className="dashboard-card-desc">{card.desc}</span>
              </button>
              );
            })}'''

if old_btn in text:
    text = text.replace(old_btn, new_btn, 1)
    print('patched cards map')
elif 'pendingCardCounts[card.key]' in text:
    print('cards map already patched')
else:
    # Try a smaller unique replace for className only
    raise SystemExit('cards map block not found — adjust patch')

path.write_text(text)
print('Dashboard pending cards OK', path.stat().st_size)
assert 'pendingCardCounts' in path.read_text()
assert 'has-pending' in path.read_text()
