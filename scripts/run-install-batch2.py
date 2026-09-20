#!/usr/bin/env python3
"""Compat wrapper: old workflows called run-install-batch2.py looking for
install-batch2.a.py / .b.py. Delegate to run-batch2-install.py which uses
payload-*.b64 files that are actually on this branch.
"""
from pathlib import Path
import runpy
import sys

root = Path(__file__).resolve().parents[1]
target = root / "scripts" / "run-batch2-install.py"
if not target.exists():
    sys.stderr.write(f"Missing {target}\n")
    sys.exit(1)
runpy.run_path(str(target), run_name="__main__")
