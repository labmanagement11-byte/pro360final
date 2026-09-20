#!/usr/bin/env python3
from pathlib import Path
import binascii, subprocess, sys
root = Path(__file__).resolve().parents[1]
parts = sorted((root/"scripts"/"p1-patches").glob("apply-p1-fixes.py.hex.p*"))
if not parts:
    print("missing apply-p1-fixes.py hex", file=sys.stderr); sys.exit(1)
hx = "".join(p.read_text().strip() for p in parts)
dest = root/"scripts"/"apply-p1-fixes.py"
dest.write_bytes(binascii.unhexlify(hx))
print("wrote", dest, dest.stat().st_size)
raise SystemExit(subprocess.call([sys.executable, str(dest)], cwd=root))
