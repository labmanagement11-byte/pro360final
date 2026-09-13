import base64
from pathlib import Path
raw = Path('scripts/organize-assigned-tasks.py.b64').read_text().strip()
Path('scripts/organize-assigned-tasks.py').write_bytes(base64.b64decode(raw))
print('assembled organize-assigned-tasks.py')
