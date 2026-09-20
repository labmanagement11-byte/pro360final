#!/usr/bin/env python3
from pathlib import Path
import binascii
import sys

root = Path(__file__).resolve().parents[1]
patches = root / "scripts" / "p1-patches"

def assemble_into(name: str, dest: Path, required: bool = True) -> None:
    parts = sorted(patches.glob(f"{name}.hex.p*"))
    if not parts:
        if dest.exists() and dest.stat().st_size > 100:
            print(f"plain present: {dest}")
            return
        if required:
            print(f"missing hex parts for {name}", file=sys.stderr)
            sys.exit(1)
        print(f"skip optional {name}")
        return
    hx = "".join(p.read_text().strip() for p in parts)
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(binascii.unhexlify(hx))
    print(f"assembled {name} -> {dest} ({dest.stat().st_size} bytes)")

assemble_into("login-users.diff", patches / "login-users.diff", required=True)
assemble_into("service.diff", patches / "service.diff", required=False)
# dashboard inline is written by the workflow from embedded b64; keep if already present
if not (root / "scripts" / "apply-p1-dashboard-inline.py").exists():
    assemble_into("apply-p1-dashboard-inline.py", root / "scripts" / "apply-p1-dashboard-inline.py", required=False)
