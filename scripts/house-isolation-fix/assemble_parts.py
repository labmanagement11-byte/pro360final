#!/usr/bin/env python3
import json, subprocess, sys
from pathlib import Path
root = Path(__file__).resolve().parent
idx = root / 'CONCAT_INDEX.json'
if idx.exists():
    for item in json.loads(idx.read_text()):
        name, n = item['name'], item['n']
        data = ''.join((root / f'{name}.c{i:02d}').read_text() for i in range(n))
        (root / name).write_text(data)
        print('concat', name, len(data))
r = subprocess.run([sys.executable, str(root / 'apply_all.py')], cwd=str(root.parent.parent))
sys.exit(r.returncode)
