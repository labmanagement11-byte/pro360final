#!/usr/bin/env python3
"""Add pending/alert styles for dashboard cards (keep single Dashboard.css)."""
from pathlib import Path

path = Path('components/Dashboard.css')
text = path.read_text()
marker = '/* PENDING CARD ALERT STYLES (house-isolation-fix) */'
if marker in text:
    print('Dashboard.css pending styles already present')
    raise SystemExit(0)

block = '''

/* PENDING CARD ALERT STYLES (house-isolation-fix) */
.dashboard-card.has-pending {
  border: 2px solid #ef4444 !important;
  background: linear-gradient(180deg, #fff5f5 0%, #ffe4e6 100%) !important;
  box-shadow: 0 10px 28px rgba(239, 68, 68, 0.22) !important;
  animation: pendingCardPulse 2.4s ease-in-out infinite;
}

.dashboard-card.has-pending .dashboard-card-title {
  color: #b91c1c;
}

.dashboard-card.has-pending .dashboard-card-desc {
  color: #7f1d1d;
}

.dashboard-card-badge-pending {
  margin-left: 0.45rem;
  background: #ef4444;
  color: #fff;
  border-radius: 999px;
  padding: 0.1rem 0.45rem;
  font-size: 0.75rem;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
}

@keyframes pendingCardPulse {
  0%, 100% { box-shadow: 0 10px 28px rgba(239, 68, 68, 0.22); }
  50% { box-shadow: 0 12px 34px rgba(239, 68, 68, 0.38); }
}
'''
# Append near .dashboard-card block if possible
anchor = '.dashboard-card:hover::before {\n  opacity: 1;\n}'
if anchor in text:
    text = text.replace(anchor, anchor + block, 1)
else:
    text += block
path.write_text(text)
print('Dashboard.css patched OK', path.stat().st_size)
