#!/usr/bin/env python3
"""Run all house-isolation patches in order."""
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
    print('\n===', name, '===')
    r = subprocess.run([sys.executable, str(root / name)], cwd=str(root.parent.parent))
    if r.returncode != 0:
        failed.append(name)

# Smoke asserts
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
    text = Path(rel).read_text()
    for n in needles:
        if n not in text:
            print('MISSING', rel, '->', n)
            ok = False
        else:
            print('OK', rel, '->', n[:40])

# TDZ / unused import light checks
dash = Path('components/Dashboard.tsx').read_text()
if 'pendingCardCounts' in dash and 'const [shoppingList' in dash:
    if dash.index('const [shoppingList') > dash.index('pendingCardCounts'):
        print('TDZ RISK: pendingCardCounts before shoppingList')
        ok = False
    else:
        print('OK pendingCardCounts after shoppingList')

if failed or not ok:
    print('FAILED', failed)
    sys.exit(1)
print('\nALL PATCHES OK')
