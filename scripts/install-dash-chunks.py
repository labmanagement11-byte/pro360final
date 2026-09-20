#!/usr/bin/env python3
from pathlib import Path
import json, hashlib, sys
root = Path(__file__).resolve().parents[1]
d = root / "scripts" / "dash-chunks"
m = json.loads((d / "MANIFEST.json").read_text())
parts = []
for ch in m["chunks"]:
    p = d / ch["name"]
    data = p.read_text()
    if hashlib.sha256(data.encode()).hexdigest() != ch["sha256"] or len(data) != ch["len"]:
        sys.stderr.write(f"chunk corrupt: {ch['name']}\n"); sys.exit(1)
    parts.append(data)
text = "".join(parts)
if hashlib.sha256(text.encode()).hexdigest() != m["sha256"] or len(text) != m["len"]:
    sys.stderr.write("Dashboard concat checksum mismatch\n"); sys.exit(1)
out = root / m["file"]
out.write_text(text)
print("wrote", out, len(text), m["sha256"][:12])
