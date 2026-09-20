#!/usr/bin/env python3
from pathlib import Path
import json, hashlib, subprocess, sys, tempfile
root = Path(__file__).resolve().parents[1]
d = root / "scripts" / "source-diffs"
m = json.loads((d / "MANIFEST.json").read_text())
for diff_name, meta in m.items():
    parts = []
    for part in meta["parts"]:
        p = d / part["name"]
        data = p.read_text()
        if hashlib.sha256(data.encode()).hexdigest() != part["sha256"] or len(data) != part["len"]:
            sys.stderr.write(f"corrupt part {part['name']}\n"); sys.exit(1)
        parts.append(data)
    text = "".join(parts)
    if hashlib.sha256(text.encode()).hexdigest() != meta["sha256"] or len(text) != meta["len"]:
        sys.stderr.write(f"checksum mismatch {diff_name}\n"); sys.exit(1)
    target = root / meta["target"]
    # Skip if already applied (marker heuristics)
    cur = target.read_text()
    if diff_name == "Users.diff" and "canViewPasswords" in cur:
        print("skip Users already patched"); continue
    if diff_name == "admin-users.diff" and "canViewPasswords" in cur and "isManagerRole" in cur:
        print("skip admin already patched"); continue
    if diff_name == "Dashboard.diff" and "inferChecklistTemplateType" in cur:
        print("skip Dashboard already patched"); continue
    if diff_name == "service.diff" and "manager fills from scratch" in cur:
        print("skip service already patched"); continue
    patch_path = d / f"_assembled_{diff_name}"
    patch_path.write_text(text)
    r = subprocess.run(["git", "apply", "--whitespace=nowarn", str(patch_path)], cwd=root, capture_output=True, text=True)
    if r.returncode != 0:
        r2 = subprocess.run(["git", "apply", "--3way", "--whitespace=nowarn", str(patch_path)], cwd=root, capture_output=True, text=True)
        if r2.returncode != 0:
            sys.stderr.write(r.stderr or r2.stderr); sys.exit(1)
    print("applied", diff_name)
print("BATCH2 DIFFS OK")
