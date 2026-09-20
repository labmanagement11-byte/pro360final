#!/usr/bin/env python3
from pathlib import Path
p = Path("utils/supabaseRealtimeService.ts")
t = p.read_text()
old = "  // New house starts EMPTY: do NOT copy checklist or inventory from other houses.\n"
new = (
  "  // New house starts EMPTY with same UI modules (checklist zones, inventory, shopping, reminders).\n"
  "  // Do NOT copy checklist/inventory/shopping/reminders from other houses — manager fills from scratch.\n"
)
if "manager fills from scratch" in t:
    print("service already patched")
elif old in t:
    p.write_text(t.replace(old, new, 1))
    print("patched service")
else:
    raise SystemExit("service createHouse comment not found")
