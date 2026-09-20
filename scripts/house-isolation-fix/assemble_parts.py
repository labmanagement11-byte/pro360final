#!/usr/bin/env python3
"""Assemble .py patch scripts from .partXX.b64 shards, then run apply_all."""
import base64, json, subprocess, sys
from pathlib import Path

root = Path(__file__).resolve().parent
index = json.loads((root / 'PARTS_INDEX.json').read_text())
for item in index:
    name = item['name']
    parts = item['parts']
    data = ''.join((root / f'{name}.part{i:02d}.b64').read_text().strip() for i in range(parts))
    (root / name).write_bytes(base64.b64decode(data))
    print('assembled', name, (root / name).stat().st_size)

r = subprocess.run([sys.executable, str(root / 'apply_all.py')], cwd=str(root.parent.parent))
sys.exit(r.returncode)
