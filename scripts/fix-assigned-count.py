from pathlib import Path
p = Path('components/Dashboard.tsx')
t = p.read_text()
old1 = """                                    <span className={assignedView === 'pendiente' ? `${visibleSubs.length} por hacer` : `${zoneCompletedCount}/${zoneItemsCount}`}></span>"""
old2 = """                                    <span className=\"assigned-task-zone-count\">{assignedView === 'pendiente' ? `${visibleSubs.length} por hacer` : `${zoneCompletedCount}/${zoneItemsCount}`}</span>"""
new = """                                    <span className='assigned-task-zone-count'>{assignedView === 'pendiente' ? `${visibleSubs.length} por hacer` : `${zoneCompletedCount}/${zoneItemsCount}`}</span>"""
new = new.replace("className='assigned-task-zone-count'", 'className="assigned-task-zone-count"')
found = False
for old in (old1, old2):
    if old in t:
        t = t.replace(old, new, 1)
        found = True
        break
if not found:
    raise SystemExit('count span missing')
p.write_text(t)
print('fixed count span')
