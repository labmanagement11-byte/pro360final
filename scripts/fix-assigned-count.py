from pathlib import Path
p = Path('components/Dashboard.tsx')
t = p.read_text()
old = """                                    <span className={assignedView === 'pendiente' ? `${visibleSubs.length} por hacer` : `${zoneCompletedCount}/${zoneItemsCount}`}></span>"""
new = """                                    <span className=\"assigned-task-zone-count\">{assignedView === 'pendiente' ? `${visibleSubs.length} por hacer` : `${zoneCompletedCount}/${zoneItemsCount}`}</span>"""
if old not in t:
    raise SystemExit('count span missing')
p.write_text(t.replace(old, new, 1))
print('fixed count span')
