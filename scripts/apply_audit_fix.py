#!/usr/bin/env python3
"""One-shot apply of remaining-audit-bugs sources from base64 parts."""
from __future__ import annotations
import base64
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PARTS = ROOT / "scripts" / "audit-fix-parts"
MANIFEST = PARTS / "MANIFEST.json"

def main() -> None:
    manifest = json.loads(MANIFEST.read_text())
    for entry in manifest:
        path = ROOT / entry["path"]
        chunks = []
        for p in entry["parts"]:
            chunks.append((PARTS / Path(p).name).read_text().strip())
        data = "".join(chunks)
        raw = base64.b64decode(data)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(raw)
        text = raw.decode("utf-8")
        if "PLACEHOLDER" in text and entry["path"].endswith((".tsx", ".ts", ".css")):
            raise SystemExit(f"PLACEHOLDER leaked into {entry['path']}")
        if entry["path"].endswith("Users.tsx") and "export default Users" not in text:
            raise SystemExit("Users.tsx invalid")
        print(f"OK {entry['path']} ({len(raw)} bytes)")
    print("ALL_OK")

if __name__ == "__main__":
    main()
