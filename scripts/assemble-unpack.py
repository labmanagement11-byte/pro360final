#!/usr/bin/env python3
import base64
from pathlib import Path
p1 = base64.b64decode(Path('scripts/unpack-part1.b64').read_text().strip())
p2 = base64.b64decode(Path('scripts/unpack-part2.b64').read_text().strip())
Path('scripts/unpack-batch2-patches.py').write_bytes(p1 + p2)
print('assembled', len(p1)+len(p2))
