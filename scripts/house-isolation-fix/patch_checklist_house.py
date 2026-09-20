#!/usr/bin/env python3
"""Fix Checklist to honor assignmentId + assignment.house (no cross-house mix)."""
from pathlib import Path

path = Path('components/Checklist.tsx')
text = path.read_text()

# Fix houseForUser: do not force EPIC D1 for owner when explicit house provided via override
old_hfu = '''function houseForUser(user: User) {
  if (!user.house || user.house === 'all') return 'EPIC D1';
  return user.house;
}'''

new_hfu = '''function houseForUser(user: User, fallbackHouse?: string | null) {
  const explicit = String(fallbackHouse || '').trim();
  if (explicit && explicit !== 'all') return explicit;
  if (!user.house || user.house === 'all') return explicit || '';
  return user.house;
}'''

if old_hfu in text:
    text = text.replace(old_hfu, new_hfu, 1)
elif 'fallbackHouse' in text:
    print('houseForUser already patched')
else:
    raise SystemExit('houseForUser not found')

# Use assignmentId prop
old_comp = '''const Checklist = ({ user }: ChecklistProps) => {
  const selectedHouse = houseForUser(user);
  const owner = isOwnerRole(user.role);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'regular' | 'deep' | 'maint' | 'all'>('regular');
  const [statusFilter, setStatusFilter] = useState<'pendiente' | 'hecho' | 'todo'>('pendiente');
  const [openRoom, setOpenRoom] = useState<string | null>(null);
  const [assignmentType, setAssignmentType] = useState<string | null>(null);
  const [activeAssignment, setActiveAssignment] = useState<any>(null);
  const [notice, setNotice] = useState('');'''

new_comp = '''const Checklist = ({ user, assignmentId }: ChecklistProps) => {
  const [resolvedHouse, setResolvedHouse] = useState<string>(() => houseForUser(user));
  const selectedHouse = resolvedHouse;
  const owner = isOwnerRole(user.role);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'regular' | 'deep' | 'maint' | 'all'>('regular');
  const [statusFilter, setStatusFilter] = useState<'pendiente' | 'hecho' | 'todo'>('pendiente');
  const [openRoom, setOpenRoom] = useState<string | null>(null);
  const [assignmentType, setAssignmentType] = useState<string | null>(null);
  const [activeAssignment, setActiveAssignment] = useState<any>(null);
  const [notice, setNotice] = useState('');'''

if old_comp in text:
    text = text.replace(old_comp, new_comp, 1)
elif 'assignmentId }: ChecklistProps' in text or 'assignmentId }: ChecklistProps' in text.replace(' ', ''):
    print('Checklist props already use assignmentId')
elif 'resolvedHouse' in text:
    print('Checklist already patched')
else:
    # try looser
    if 'const Checklist = ({ user }: ChecklistProps)' in text:
        text = text.replace(
            'const Checklist = ({ user }: ChecklistProps) => {\n  const selectedHouse = houseForUser(user);',
            'const Checklist = ({ user, assignmentId }: ChecklistProps) => {\n  const [resolvedHouse, setResolvedHouse] = useState<string>(() => houseForUser(user));\n  const selectedHouse = resolvedHouse;',
            1,
        )
        print('Checklist props patched (loose)')
    else:
        raise SystemExit('Checklist component signature not found')

# Replace assignment loader effect to resolve house from assignmentId first
old_effect = '''  useEffect(() => {
    const loadAssignment = async () => {
      if (!supabase) return;
      let query = (supabase as any)
        .from('calendar_assignments')
        .select('*')
        .eq('house', selectedHouse)
        .eq('completed', false)
        .order('date', { ascending: false });
      if (user.role === 'empleado') {
        query = query.eq('employee', user.username);
      }
      const { data } = await query.limit(1);
      const current = data && data[0] ? data[0] : null;
      setActiveAssignment(current);
      const type = current ? String(current.type || '') : '';
      setAssignmentType(type || null);
      if (type) setFilter(assignmentKind(type));
    };
    loadAssignment();
    if (!supabase) return;
    const channel = supabase
      .channel(`assignments-live-${selectedHouse}-${user.username}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'calendar_assignments',
      }, () => {
        loadAssignment();
      })
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [user.username, user.role, selectedHouse]);'''

new_effect = '''  useEffect(() => {
    const loadAssignment = async () => {
      if (!supabase) return;

      // CRITICAL: if assignmentId is provided, resolve THAT assignment's house only
      if (assignmentId != null && assignmentId !== '') {
        const { data: byId } = await (supabase as any)
          .from('calendar_assignments')
          .select('*')
          .eq('id', assignmentId)
          .maybeSingle();
        if (byId) {
          const houseName = String(byId.house || '').trim();
          if (houseName) setResolvedHouse(houseName);
          setActiveAssignment(byId);
          const type = String(byId.type || '');
          setAssignmentType(type || null);
          if (type) setFilter(assignmentKind(type));
          return;
        }
      }

      const house = houseForUser(user, resolvedHouse);
      if (!house) {
        setActiveAssignment(null);
        setAssignmentType(null);
        return;
      }
      if (house !== resolvedHouse) setResolvedHouse(house);

      let query = (supabase as any)
        .from('calendar_assignments')
        .select('*')
        .eq('house', house)
        .eq('completed', false)
        .order('date', { ascending: false });
      if (user.role === 'empleado') {
        query = query.eq('employee', user.username);
      }
      const { data } = await query.limit(1);
      const current = data && data[0] ? data[0] : null;
      setActiveAssignment(current);
      const type = current ? String(current.type || '') : '';
      setAssignmentType(type || null);
      if (type) setFilter(assignmentKind(type));
    };
    loadAssignment();
    if (!supabase) return;
    const channel = supabase
      .channel(`assignments-live-${resolvedHouse || 'none'}-${user.username}-${assignmentId || 'none'}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'calendar_assignments',
      }, () => {
        loadAssignment();
      })
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [user.username, user.role, user.house, assignmentId]);'''

if old_effect in text:
    text = text.replace(old_effect, new_effect, 1)
    print('assignment effect patched')
elif 'assignmentId != null' in text:
    print('assignment effect already patched')
else:
    raise SystemExit('assignment load effect not found')

# Guard loadItems when house empty — never load all houses
old_load = '''  const loadItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (checklistTable() as any)
      .select('*')
      .eq('house', selectedHouse)
      .order('id', { ascending: true });

    if (error) {
      console.error('Error cargando checklist:', error);
      setItems([]);
    } else {
      setItems((data || []) as ChecklistItem[]);
    }
    setLoading(false);
  }, [selectedHouse]);'''

new_load = '''  const loadItems = useCallback(async () => {
    setLoading(true);
    if (!selectedHouse || selectedHouse === 'all') {
      setItems([]);
      setLoading(false);
      return;
    }
    const { data, error } = await (checklistTable() as any)
      .select('*')
      .eq('house', selectedHouse)
      .order('id', { ascending: true });

    if (error) {
      console.error('Error cargando checklist:', error);
      setItems([]);
    } else {
      // Defense in depth: never show another house's rows
      const onlyThisHouse = ((data || []) as ChecklistItem[]).filter(
        (row) => String(row.house || '').trim() === selectedHouse
      );
      setItems(onlyThisHouse);
    }
    setLoading(false);
  }, [selectedHouse]);'''

if old_load in text:
    text = text.replace(old_load, new_load, 1)
    print('loadItems patched')
elif 'Defense in depth' in text:
    print('loadItems already patched')
else:
    raise SystemExit('loadItems not found')

# Empty house message
text = text.replace(
    "<p className=\"cl-sub\">{selectedHouse}</p>",
    "<p className=\"cl-sub\">{selectedHouse || 'Sin casa'}</p>",
    1,
)

path.write_text(text)
print('Checklist.tsx patched OK', path.stat().st_size)
assert 'assignmentId' in path.read_text()
assert 'Defense in depth' in path.read_text()
