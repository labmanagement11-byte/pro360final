#!/usr/bin/env python3
"""Pass assignment house into Checklist from Calendar modal."""
from pathlib import Path

path = Path('components/Calendar.tsx')
text = path.read_text()

# Track selected assignment house
if 'selectedAssignmentHouse' not in text:
    text = text.replace(
        "  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);",
        "  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);\n  const [selectedAssignmentHouse, setSelectedAssignmentHouse] = useState<string>('');",
        1,
    )
    print('added selectedAssignmentHouse state')

# Find where setSelectedAssignmentId is called when opening modal
# Common pattern: setSelectedAssignmentId(ev.id); setShowChecklistModal(true);
import re
# Patch clicks that open checklist
patterns = [
    (r'setSelectedAssignmentId\(([^)]+)\);\s*setShowChecklistModal\(true\);',
     r'setSelectedAssignmentId(\1);\n    setSelectedAssignmentHouse(String((events.find((e) => e.id === \1)?.house) || selectedHouse || \'\'));\n    setShowChecklistModal(true);'),
]

# Simpler: look for setShowChecklistModal(true)
if 'setSelectedAssignmentHouse' not in text.split('setShowChecklistModal(true)')[0][-200:] if 'setShowChecklistModal(true)' in text else '':
    pass

# Replace Checklist usage
old_cl = '<Checklist user={{...user, password: user.password ?? \'\'}} assignmentId={selectedAssignmentId} />'
new_cl = '<Checklist user={{...user, password: user.password ?? \'\', house: selectedAssignmentHouse || selectedHouse || user.house}} assignmentId={selectedAssignmentId ?? undefined} />'

if old_cl in text:
    text = text.replace(old_cl, new_cl, 1)
    print('Checklist usage patched')
elif 'selectedAssignmentHouse || selectedHouse' in text:
    print('Checklist usage already patched')
else:
    # try without escaping
    alt = 'assignmentId={selectedAssignmentId}'
    if alt in text and 'selectedAssignmentHouse' not in text[text.find('Checklist'):text.find('Checklist')+300]:
        # replace the Checklist line more loosely
        text2 = re.sub(
            r'<Checklist\s+user=\{\{[^}]+\}\}\s+assignmentId=\{selectedAssignmentId\}\s*/>',
            new_cl,
            text,
            count=1,
        )
        if text2 == text:
            raise SystemExit('Could not patch Checklist usage in Calendar')
        text = text2
        print('Checklist usage patched via regex')
    else:
        print('WARN Checklist usage — checking file')
        for i, line in enumerate(text.splitlines()):
            if 'Checklist' in line:
                print(i+1, line)

# When setting assignment id from event click, also set house
# Look for setSelectedAssignmentId(
for m in re.finditer(r'setSelectedAssignmentId\(([^)]+)\)', text):
    print('found setSelectedAssignmentId at', m.start(), m.group(0))

# Add house when opening — patch common pattern with event
old_open = None
# Try: onClick that sets id from event
if 'setSelectedAssignmentHouse(' not in text or text.count('setSelectedAssignmentHouse') < 2:
    # Inject helper close to addEvent end / render
    # Patch: whenever we setSelectedAssignmentId(Number(x)) also set house from events
    text = text.replace(
        'setSelectedAssignmentId(null)',
        "setSelectedAssignmentId(null); setSelectedAssignmentHouse('')",
    )
    # For opening - search lines with setSelectedAssignmentId( and not null
    lines = text.splitlines()
    out = []
    for line in lines:
        out.append(line)
        stripped = line.strip()
        if stripped.startswith('setSelectedAssignmentId(') and 'null' not in stripped and 'setSelectedAssignmentHouse' not in stripped:
            # extract arg
            arg = stripped[len('setSelectedAssignmentId('):-1]
            if arg.endswith(')'):
                arg = arg[:-1]
            indent = line[:len(line)-len(line.lstrip())]
            out.append(f"{indent}setSelectedAssignmentHouse(String(events.find((ev) => String(ev.id) === String({arg}))?.house || selectedHouse || ''));")
    text = '\n'.join(out) + ('\n' if text.endswith('\n') else '')
    print('injected setSelectedAssignmentHouse after id sets')


# Ensure Ver Checklist button sets house from event
old_btn = 'onClick={() => { setSelectedAssignmentId(ev.id!); setShowChecklistModal(true); }}'
new_btn = "onClick={() => { setSelectedAssignmentId(ev.id!); setSelectedAssignmentHouse(String(ev.house || selectedHouse || '')); setShowChecklistModal(true); }}"
if old_btn in text:
    text = text.replace(old_btn, new_btn, 1)
    print('Ver Checklist onClick patched')
elif 'setSelectedAssignmentHouse(String(ev.house' in text:
    print('Ver Checklist onClick already patched')
else:
    old2 = 'setSelectedAssignmentId(ev.id!); setShowChecklistModal(true);'
    if old2 in text:
        text = text.replace(old2, "setSelectedAssignmentId(ev.id!); setSelectedAssignmentHouse(String(ev.house || selectedHouse || '')); setShowChecklistModal(true);", 1)
        print('Ver Checklist onClick patched (alt)')
    else:
        print('WARN: Ver Checklist onClick not found')

path.write_text(text)
print('Calendar.tsx patched OK', path.stat().st_size)
assert 'selectedAssignmentHouse' in path.read_text()
