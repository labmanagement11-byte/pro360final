#!/usr/bin/env python3
from pathlib import Path
import binascii
import sys

root = Path(__file__).resolve().parents[1] / "scripts" / "p1-patches"

def assemble(name: str) -> None:
    parts = sorted(root.glob(f"{name}.hex.p*"))
    if not parts:
        # plain diff already present
        if (root / name).exists():
            print(f"plain present: {name}")
            return
        print(f"missing hex parts for {name}", file=sys.stderr)
        sys.exit(1)
    hx = "".join(p.read_text().strip() for p in parts)
    (root / name).write_bytes(binascii.unhexlify(hx))
    print(f"assembled {name} -> {(root / name).stat().st_size} bytes")

for name in ["login-users.diff", "service.diff", "dashboard.diff"]:
    assemble(name)
