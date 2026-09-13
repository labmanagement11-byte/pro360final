from pathlib import Path

p = Path('components/Dashboard.tsx')
t = p.read_text()
marker = '<span className="assigned-task-zone-name">{zona}</span>'
idx = t.find(marker)
if idx < 0:
    raise SystemExit('zone name span missing')
rest = t[idx + len(marker):]
start = rest.find('<span')
end = rest.find('</span>', start)
if start < 0 or end < 0:
    raise SystemExit('count span missing')
end += len('</span>')
old = rest[start:end]
new = '<span className="assigned-task-zone-count">{assignedView === \'pendiente\' ? (String(visibleSubs.length) + \' por hacer\') : (String(zoneCompletedCount) + \'/\' + String(zoneItemsCount))}</span>'
if 'assigned-task-zone-count' in old and 'visibleSubs.length' in old and 'className="assigned-task-zone-count"' in old:
    print('already fixed')
else:
    t = t[:idx + len(marker)] + rest[:start] + new + rest[end:]
    p.write_text(t)
    print('fixed count span')
    print(old)
    print('->')
    print(new)
