#!/usr/bin/env python3
from pathlib import Path
a = Path('scripts/install-batch2.a.py').read_text()
b = Path('scripts/install-batch2.b.py').read_text()
Path('scripts/install-batch2.py').write_text(a+b)
print('assembled', len(a)+len(b))
import runpy
runpy.run_path('scripts/install-batch2.py', run_name='__main__')
