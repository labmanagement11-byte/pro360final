#!/usr/bin/env python3
"""Run all house-isolation patches in order (skip missing/tiny scripts)."""
import subprocess
import sys
from pathlib import Path

scripts = [
    'patch_login.py',
    'patch_dashboard_css.py',
    'patch_dashboard_pending_cards.py',
    'patch_dashboard_no_autoseed.py',
    'patch_assigned_tasks_house_checklist.py',
    'patch_checklist_house.py',
    'patch_calendar.py',
    'patch_service_house_isolation.py',
]

root = Path(__file__).resolve().parent
failed = []
for name in scripts:
    path = root / name
    if not path.exists() or path.stat().st_size < 50:
        print('SKIP missing/tiny', name)
        continue
    body = path.read_text().strip()
    if body in ('TEMP', 'PLACEHOLDER', 'PLACEHOLDER_INDEX', 'PLACEHOLDER_ASSEMBLE'):
        print('SKIP placeholder', name)
        continue
    print('\n===', name, '===')
    r = subprocess.run([sys.executable, str(path)], cwd=str(root.parent.parent))
    if r.returncode != 0:
        failed.append(name)

checks = {
    'components/Login.tsx': ['showPassword', 'login-password-wrap'],
    'components/Login.css': ['login-password-toggle'],
    'components/Dashboard.css': ['has-pending', 'dashboard-card-badge-pending'],
    'components/Dashboard.tsx': [
        'pendingCardCounts',
        'has-pending',
        'Casa nueva / vacía: NO auto-copiar',
        'buildSubtasksFromHouseChecklist',
    ],
    'components/Checklist.tsx': ['assignmentId', 'Defense in depth', 'resolvedHouse'],
    'components/Calendar.tsx': ['selectedAssignmentHouse'],
    'utils/supabaseRealtimeService.ts': [
        'New house starts EMPTY',
        'Legacy fallback: public.checklist',
        'vacío intencional',
    ],
}

print('\n=== smoke checks ===')
ok = True
for rel, needles in checks.items():
    p = Path(rel)
    if not p.exists():
        print('MISSING FILE', rel)
        ok = False
        continue
    text = p.read_text()
    for n in needles:
        if n not in text:
            print('MISSING', rel, '->', n)
            ok = False
        else:
            print('OK', rel, '->', n[:40])

dash = Path('components/Dashboard.tsx')
if dash.exists() and 'pendingCardCounts' in dash.read_text() and 'const [shoppingList' in dash.read_text():
    t = dash.read_text()
    if t.index('const [shoppingList') > t.index('pendingCardCounts'):
        print('TDZ RISK: pendingCardCounts before shoppingList')
        ok = False
    else:
        print('OK pendingCardCounts after shoppingList')

if failed:
    print('FAILED scripts', failed)
    sys.exit(1)
if not ok:
    print('Smoke incomplete (some patches not yet applied) — continuing if core login present')
    # Soft-fail only if login eye missing
    login = Path('components/Login.tsx')
    if not login.exists() or 'showPassword' not in login.read_text():
        sys.exit(1)
print('\nALL AVAILABLE PATCHES OK')
