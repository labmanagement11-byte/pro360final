#!/usr/bin/env python3
from pathlib import Path
path = Path('components/Dashboard.tsx')
text = path.read_text()
marker = '  // Alertas de recordatorios vencidos o próximos (3 días)\n'
if marker not in text:
    print('no alert block; skip')
    raise SystemExit(0)
start = text.index(marker)
end_marker = '  // Guardar mantenimiento de tareas en localStorage'
# If alert is already after showReminders, skip
decl = '  const showReminders = canManageReminders;\n'
if decl not in text:
    # maybe still old form
    decl_old = "  const showReminders = user.role === 'owner' || user.role === 'manager';\n"
    if decl_old in text and 'canManageReminders' not in text:
        raise SystemExit('showReminders not patched yet')
    raise SystemExit('canManageReminders declaration missing')
decl_pos = text.index(decl)
if decl_pos < start:
    print('order already ok')
    raise SystemExit(0)
# alert is before declaration — move it
# Find end of alert block: either localStorage comment or the declaration area
if end_marker in text[start:]:
    end = text.index(end_marker, start)
else:
    raise SystemExit('end marker missing')
block = text[start:end]
text2 = text[:start] + text[end:]
# re-find decl after removal
decl_pos = text2.index(decl) + len(decl)
text2 = text2[:decl_pos] + '\n' + block + text2[decl_pos:]
path.write_text(text2)
assert text2.index(decl) < text2.index(marker)
print('reordered reminder alerts after showReminders', path.stat().st_size)
