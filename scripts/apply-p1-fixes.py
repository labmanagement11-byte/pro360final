#!/usr/bin/env python3
"""Apply P1 unified diffs (checklist delete, login errors, manager Usuarios)."""
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
PATCH_DIR = ROOT / "scripts" / "p1-patches"

def main():
    diffs = [
        PATCH_DIR / "login-users.diff",
        PATCH_DIR / "service.diff",
        PATCH_DIR / "dashboard.diff",
    ]
    for d in diffs:
        if not d.exists():
            print(f"MISSING {d}", file=sys.stderr)
            sys.exit(1)
        print(f"Applying {d.name}...")
        r = subprocess.run(
            ["git", "apply", "--whitespace=nowarn", str(d)],
            cwd=ROOT,
            capture_output=True,
            text=True,
        )
        if r.returncode != 0:
            # already applied?
            r2 = subprocess.run(
                ["git", "apply", "--check", "--reverse", str(d)],
                cwd=ROOT,
                capture_output=True,
                text=True,
            )
            if r2.returncode == 0:
                print(f"  already applied: {d.name}")
                continue
            print(r.stdout)
            print(r.stderr, file=sys.stderr)
            sys.exit(r.returncode)
        print(f"  OK {d.name}")
    print("All P1 patches applied.")

if __name__ == "__main__":
    main()
