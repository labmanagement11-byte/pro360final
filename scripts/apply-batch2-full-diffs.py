#!/usr/bin/env python3
from pathlib import Path
import json, hashlib, subprocess, sys
root = Path(__file__).resolve().parents[1]
meta = json.loads((root/"scripts"/"batch2-DIFFS.json").read_text())
for name, info in meta.items():
    p = root/"scripts"/name
    hexp = root/"scripts"/(name + ".hex")
    if hexp.exists():
        data = bytes.fromhex("".join(hexp.read_text().split())).decode()
        p.write_text(data)
    else:
        data = p.read_text()
    if hashlib.sha256(data.encode()).hexdigest() != info["sha256"] or len(data) != info["len"]:
        sys.stderr.write(f"corrupt {name}\n"); sys.exit(1)
    target = root/info["target"]
    if info["marker"] in target.read_text():
        print("skip", name); continue
    r = subprocess.run(["git","apply","--whitespace=nowarn", str(p)], cwd=root, capture_output=True, text=True)
    if r.returncode != 0:
        r2 = subprocess.run(["git","apply","--3way","--whitespace=nowarn", str(p)], cwd=root, capture_output=True, text=True)
        if r2.returncode != 0:
            sys.stderr.write(r.stderr or r2.stderr); sys.exit(1)
    print("applied", name)
print("BATCH2 OK")
