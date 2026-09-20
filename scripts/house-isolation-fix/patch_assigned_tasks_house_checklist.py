#!/usr/bin/env python3
"""AssignedTasksCard: load subtasks from that assignment's house checklist (not hardcoded global)."""
from pathlib import Path

path = Path('components/Dashboard.tsx')
text = path.read_text()

if 'houseChecklistRows' in text and 'buildSubtasksFromHouseChecklist' in text:
    print('AssignedTasks house checklist already patched')
    raise SystemExit(0)

# Insert state + loader after assignedView state
anchor = "  const [assignedView, setAssignedView] = useState<'pendiente' | 'hecho' | 'todo'>('pendiente');"
if anchor not in text:
    raise SystemExit('assignedView anchor missing')

insert = '''  const [assignedView, setAssignedView] = useState<'pendiente' | 'hecho' | 'todo'>('pendiente');
  const [houseChecklistRows, setHouseChecklistRows] = useState<any[]>([]);
'''
text = text.replace(anchor, insert, 1)

# Add effect to load checklist for user.house (and assignment houses)
# Place after the fetchAssignedTasks effect's dependency — find unique spot after house-inventory-sync effect
load_anchor = "  useEffect(() => {\n    console.log('[AssignedTasksCard] Usuario:', user);"
load_block = '''  // Cargar checklist SOLO de la casa del usuario/asignación (sin mezclar otras casas)
  useEffect(() => {
    const houseName = String(user.house || user.house_id || '').trim();
    if (!houseName || houseName === 'all' || !supabase) {
      setHouseChecklistRows([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('checklist')
          .select('*')
          .eq('house', houseName)
          .order('id', { ascending: true });
        if (cancelled) return;
        if (error) {
          console.error('[AssignedTasksCard] Error cargando checklist de casa:', error);
          setHouseChecklistRows([]);
          return;
        }
        const only = (data || []).filter((row: any) => String(row.house || '').trim() === houseName);
        setHouseChecklistRows(only);
      } catch (err) {
        if (!cancelled) setHouseChecklistRows([]);
      }
    })();
    const channel = (supabase as any)
      .channel(`assigned-house-checklist-${houseName.replace(/\\s+/g, '-')}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checklist', filter: `house=eq.${houseName}` }, async () => {
        const { data } = await (supabase as any).from('checklist').select('*').eq('house', houseName).order('id', { ascending: true });
        setHouseChecklistRows((data || []).filter((row: any) => String(row.house || '').trim() === houseName));
      })
      .subscribe();
    return () => {
      cancelled = true;
      try { (supabase as any).removeChannel(channel); } catch {}
    };
  }, [user.house, user.house_id]);

  useEffect(() => {
    console.log('[AssignedTasksCard] Usuario:', user);'''

if load_anchor in text:
    text = text.replace(load_anchor, load_block, 1)
    print('house checklist loader inserted')
else:
    raise SystemExit('AssignedTasksCard log anchor missing')

# Replace getSubtasks function
old_gs = '''  function getSubtasks(type: string) {
    if (type.toLowerCase().includes('profunda')) return LIMPIEZA_PROFUNDA;
    if (type.toLowerCase().includes('regular')) return LIMPIEZA_REGULAR;
    if (type.toLowerCase().includes('mantenimiento')) {
      // Unir todas las secciones de MANTENIMIENTO en un solo objeto plano (sin duplicados)
      const allSections = Object.keys(MANTENIMIENTO).filter(z => z !== 'RUTINA DE MANTENIMIENTO');
      const result: { [zona: string]: string[] } = {};
      allSections.forEach(zona => {
        result[zona] = MANTENIMIENTO[zona as keyof typeof MANTENIMIENTO];
      });
      return result;
    }
    return null;
  }'''

new_gs = '''  function buildSubtasksFromHouseChecklist(type: string): { [zona: string]: string[] } | null {
    const typeLower = String(type || '').toLowerCase();
    const isDeep = typeLower.includes('profund');
    const isMaint = typeLower.includes('manten');
    const rows = houseChecklistRows || [];
    if (!rows.length) {
      // Casa sin checklist propio: vacío (no mezclar globals de otras casas)
      return {};
    }
    const result: { [zona: string]: string[] } = {};
    rows.forEach((row: any) => {
      const room = String(row.room || 'GENERAL').trim() || 'GENERAL';
      const assigned = String(row.assigned_to || '').toLowerCase();
      const roomUp = room.toUpperCase();
      const roomIsDeep = roomUp.includes('PROFUNDA') || roomUp === 'LIMPIEZA PROFUNDA';
      const roomIsMaint = roomUp.includes('MANTEN') || ['ÁREAS VERDES','PISCINA Y AGUA','RUTINA DE MANTENIMIENTO','SISTEMAS ELÉCTRICOS'].includes(roomUp);
      let include = false;
      if (isMaint) include = assigned.includes('manten') || roomIsMaint;
      else if (isDeep) include = assigned.includes('profund') || roomIsDeep;
      else include = !assigned.includes('manten') && !assigned.includes('profund') && !roomIsDeep && !roomIsMaint;
      if (!include) return;
      if (!result[room]) result[room] = [];
      result[room].push(String(row.item || ''));
    });
    return result;
  }

  function getSubtasks(type: string) {
    // Prefer per-house checklist from Supabase
    const fromHouse = buildSubtasksFromHouseChecklist(type);
    if (fromHouse && Object.keys(fromHouse).length > 0) return fromHouse;
    // Empty house => empty checklist (do not fall back to global hardcoded mix)
    if ((houseChecklistRows || []).length === 0) return {};
    return fromHouse;
  }'''

if old_gs in text:
    text = text.replace(old_gs, new_gs, 1)
    print('getSubtasks patched')
else:
    raise SystemExit('getSubtasks not found')

# Fix house filter for owner/manager with house=all — use selected house from parent if available
# In fetchAssignedTasks:
old_filter = '''      const houseFilter = user.house || user.house_id;
      console.log(`🏠 [Dashboard] Filtrando por casa: ${houseFilter} para ${user.username} (${user.role})`);
      const { data, error } = await (supabase as any)
        .from('calendar_assignments')
        .select('*')
        .eq('house', houseFilter)
        .in('type', ['Limpieza', 'Limpieza profunda', 'Limpieza regular', 'Mantenimiento']);'''

new_filter = '''      const houseFilter = user.house || user.house_id;
      console.log(`🏠 [Dashboard] Filtrando por casa: ${houseFilter} para ${user.username} (${user.role})`);
      let assignQuery = (supabase as any)
        .from('calendar_assignments')
        .select('*')
        .in('type', ['Limpieza', 'Limpieza profunda', 'Limpieza regular', 'Mantenimiento']);
      // Never query house='all' — that mixes nothing useful; owner without house sees none here
      if (houseFilter && houseFilter !== 'all') {
        assignQuery = assignQuery.eq('house', houseFilter);
      }
      const { data, error } = await assignQuery;'''

if old_filter in text:
    text = text.replace(old_filter, new_filter, 1)
    print('assignment house filter patched')
else:
    print('WARN assignment house filter not found')

path.write_text(text)
print('AssignedTasks house checklist OK', path.stat().st_size)
assert 'buildSubtasksFromHouseChecklist' in path.read_text()
