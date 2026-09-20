#!/usr/bin/env python3
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]

def run(cmd):
    print("+", " ".join(cmd))
    r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
    if r.stdout: print(r.stdout)
    if r.returncode != 0:
        print(r.stderr, file=sys.stderr)
        sys.exit(r.returncode)

run([sys.executable, str(ROOT / "scripts" / "assemble-p1-diffs.py")])

for name in ["login-users.diff", "service.diff"]:
    d = ROOT / "scripts" / "p1-patches" / name
    if not d.exists():
        print(f"MISSING {d}", file=sys.stderr); sys.exit(1)
    print(f"Applying {name}...")
    r = subprocess.run(["git", "apply", "--whitespace=nowarn", str(d)], cwd=ROOT, capture_output=True, text=True)
    if r.returncode != 0:
        r2 = subprocess.run(["git", "apply", "--check", "--reverse", str(d)], cwd=ROOT, capture_output=True, text=True)
        if r2.returncode == 0:
            print(f"  already applied: {name}"); continue
        print(r.stderr, file=sys.stderr); sys.exit(1)
    print(f"  OK {name}")

run([sys.executable, str(ROOT / "scripts" / "apply-p1-dashboard-inline.py")])
print("All P1 patches applied.")
