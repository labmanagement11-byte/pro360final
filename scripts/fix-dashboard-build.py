#!/usr/bin/env python3
from pathlib import Path

path = Path("components/Dashboard.tsx")
text = path.read_text()


def replace_once(src: str, old: str, new: str, label: str) -> str:
    count = src.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")
    return src.replace(old, new, 1)

text = replace_once(
    text,
    """        <Inventory
          user={user}
          houseName={houses[allowedHouseIdx]?.houseName || houses[allowedHouseIdx]?.name || 'HYNTIBA2 APTO 406'}
          inventory={houses[allowedHouseIdx]?.inventory || []}
          setInventory={(inventory: any[]) => setHouses(houses.map((h, i) => i === allowedHouseIdx ? { ...h, inventory } : h))}
        />""",
    """        <Inventory
          user={user}
          houseName={houses[allowedHouseIdx]?.houseName || houses[allowedHouseIdx]?.name || 'HYNTIBA2 APTO 406'}
        />""",
    "inventory extra props",
)

text = replace_once(
    text,
    """    // Verificar si todas las subtareas están completadas
    const allSubtasksCompleted = current.length === totalSubtasks && current.every(Boolean);

    const updateData: any = {""",
    """    const updateData: any = {""",
    "unused allSubtasksCompleted",
)

path.write_text(text)
print("patched", path, "chars", len(text))
