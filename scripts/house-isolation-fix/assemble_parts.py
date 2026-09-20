#!/usr/bin/env python3
"""Assemble patch scripts from single .b64 (wrapped ok), then apply_all."""
import base64, subprocess, sys
from pathlib import Path

root = Path(__file__).resolve().parent
SINGLE = [
  'patch_dashboard_pending_cards.py',
  'patch_dashboard_no_autoseed.py',
  'patch_assigned_tasks_house_checklist.py',
  'patch_checklist_house.py',
  'patch_calendar.py',
  'patch_service_house_isolation.py',
]
for name in SINGLE:
    b64path = root / f'{name}.b64'
    if b64path.exists() and b64path.stat().st_size > 20:
        raw = ''.join(b64path.read_text().split())
        (root / name).write_bytes(base64.b64decode(raw))
        print('assembled single-b64', name, (root / name).stat().st_size)

r = subprocess.run([sys.executable, str(root / 'apply_all.py')], cwd=str(root.parent.parent))
sys.exit(r.returncode)
