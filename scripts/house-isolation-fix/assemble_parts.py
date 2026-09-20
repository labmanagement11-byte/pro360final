#!/usr/bin/env python3
"""Assemble patch scripts from .chunkXX.txt or .partXX.b64, then run apply_all."""
import base64, json, subprocess, sys
from pathlib import Path

root = Path(__file__).resolve().parent

chunks_index = root / 'CHUNKS_INDEX.json'
parts_index = root / 'PARTS_INDEX.json'

if chunks_index.exists():
    index = json.loads(chunks_index.read_text())
    for item in index:
        name = item['name']
        n = item['chunks']
        data = ''.join((root / f'{name}.chunk{i:02d}.txt').read_text() for i in range(n))
        (root / name).write_text(data)
        print('assembled chunks', name, (root / name).stat().st_size)
elif parts_index.exists():
    index = json.loads(parts_index.read_text())
    for item in index:
        name = item['name']
        parts = item['parts']
        data = ''.join((root / f'{name}.part{i:02d}.b64').read_text().strip() for i in range(parts))
        (root / name).write_bytes(base64.b64decode(data))
        print('assembled b64', name, (root / name).stat().st_size)
else:
    print('No CHUNKS_INDEX or PARTS_INDEX found', file=sys.stderr)
    sys.exit(1)

r = subprocess.run([sys.executable, str(root / 'apply_all.py')], cwd=str(root.parent.parent))
sys.exit(r.returncode)
