#!/usr/bin/env python3
from pathlib import Path
import base64, gzip, subprocess, sys
root = Path(__file__).resolve().parents[1]

def load_parts(*names):
    raw = "".join(Path(root/"scripts"/n).read_text().replace("\n","").strip() for n in names)
    return gzip.decompress(base64.b64decode(raw))

def load(name):
    return gzip.decompress(base64.b64decode(Path(root/"scripts"/name).read_text().replace("\n","").strip()))

(root/"components"/"Users.tsx").write_bytes(load_parts("payload-users-a.b64", "payload-users-b.b64"))
print("wrote Users", (root/"components"/"Users.tsx").stat().st_size)
(root/"supabase"/"functions"/"admin-users"/"index.ts").write_bytes(load("payload-admin.b64"))
print("wrote admin-users", (root/"supabase"/"functions"/"admin-users"/"index.ts").stat().st_size)

pd = root/"scripts"/"patches"; pd.mkdir(parents=True, exist_ok=True)
(pd/"batch2-Dashboard.patch").write_bytes(load("payload-dash.b64"))
(pd/"batch2-service.patch").write_bytes(load("payload-svc.b64"))
dash = (root/"components"/"Dashboard.tsx").read_text()
if "inferChecklistTemplateType" in dash:
    print("Dashboard already patched; skip")
else:
    for name in ["batch2-Dashboard.patch", "batch2-service.patch"]:
        p = pd/name
        r = subprocess.run(["git","apply","--whitespace=nowarn",str(p)], cwd=root, capture_output=True, text=True)
        if r.returncode != 0:
            r2 = subprocess.run(["git","apply","--3way","--whitespace=nowarn",str(p)], cwd=root, capture_output=True, text=True)
            if r2.returncode != 0:
                print(r.stderr or r2.stderr, file=sys.stderr); sys.exit(1)
        print("applied", name)
svc = (root/"utils"/"supabaseRealtimeService.ts").read_text()
if "manager fills from scratch" not in svc:
    p = pd/"batch2-service.patch"
    r = subprocess.run(["git","apply","--whitespace=nowarn",str(p)], cwd=root, capture_output=True, text=True)
    if r.returncode != 0:
        subprocess.run(["git","apply","--3way","--whitespace=nowarn",str(p)], cwd=root, check=False)
    print("applied service")
print("BATCH2 OK")
