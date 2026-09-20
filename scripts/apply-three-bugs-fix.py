#!/usr/bin/env python3
"""Apply 3 production bugs: empty checklist, inventory red card, show house name."""
from __future__ import annotations
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def must_replace(text: str, old: str, new: str, label: str) -> str:
    if new in text and old not in text:
        print(f'already: {label}')
        return text
    if old not in text:
        raise SystemExit(f'missing marker: {label}')
    print(f'ok: {label}')
    return text.replace(old, new)

def patch_checklist() -> None:
    p = ROOT / 'components/Checklist.tsx'
    t = p.read_text()
    t = must_replace(
        t,
        "<p className=\"cl-sub\">{selectedHouse || 'Sin casa'}</p>",
        "<p className=\"cl-sub\">\U0001f3e0 {selectedHouse || 'Sin casa'}</p>",
        'checklist subtitle',
    )
    p.write_text(t)

def patch_service() -> None:
    p = ROOT / 'utils/supabaseRealtimeService.ts'
    t = p.read_text()
    if 'persisted: false, error' in t and 'assignmentId = String(assignmentId)' in t:
        print('already: service')
        return
    t = must_replace(
        t,
        "export async function createChecklistFromTemplate(assignmentId: string, taskType: string, employee: string, house: string) {\n  try {\n    console.log('\U0001f4cb Creando checklist desde plantilla:', { assignmentId, taskType, employee, house });\n    const supabase = getSupabaseClient();\n    const houseName = String(house || '').trim();\n",
        "export async function createChecklistFromTemplate(assignmentId: string | number, taskType: string, employee: string, house: string) {\n  try {\n    assignmentId = String(assignmentId);\n    console.log('\U0001f4cb Creando checklist desde plantilla:', { assignmentId, taskType, employee, house });\n    const supabase = getSupabaseClient();\n    const houseName = String(house || '').trim();\n",
        'service signature',
    )
    old = (
        "    const checklistItems = templates.map((template: any) => ({\n"
        "      calendar_assignment_id: assignmentId,\n"
        "      employee: employee,\n"
        "      house: houseName,\n"
        "      zone: template.zone,\n"
        "      task: template.task,\n"
        "      completed: false,\n"
        "      order_num: template.order_num\n"
        "    }));\n\n"
        "    const { data, error } = await (supabase\n"
        "      .from('cleaning_checklist') as any)\n"
        "      .insert(checklistItems)\n"
        "      .select();\n\n"
        "    if (error) {\n"
        "      console.error('\u274c Error insertando checklist:', error);\n"
        "      return { success: false, error };\n"
        "    }\n\n"
        "    // Defense: only return rows for this house\n"
        "    const items = (data || []).filter((row: any) => String(row.house || '').trim() === houseName);\n"
        "    console.log(`\u2705 ${items.length} items de checklist creados para asignaci\u00f3n ${assignmentId} @ ${houseName}`);\n"
        "    return { success: true, count: items.length, items };\n"
    )
    new = (
        "    // calendar_assignments.id is bigint; cleaning_checklist.calendar_assignment_id is text\n"
        "    const assignmentIdStr = String(assignmentId);\n"
        "    const checklistItems = templates.map((template: any) => ({\n"
        "      calendar_assignment_id: assignmentIdStr,\n"
        "      employee: employee,\n"
        "      house: houseName,\n"
        "      zone: template.zone,\n"
        "      task: template.task,\n"
        "      completed: false,\n"
        "      order_num: template.order_num\n"
        "    }));\n\n"
        "    const memoryItems = checklistItems.map((row: any, idx: number) => ({\n"
        "      ...row,\n"
        "      id: `tmp-${assignmentIdStr}-${idx}`,\n"
        "      _ephemeral: true,\n"
        "    }));\n\n"
        "    const { data, error } = await (supabase\n"
        "      .from('cleaning_checklist') as any)\n"
        "      .insert(checklistItems)\n"
        "      .select();\n\n"
        "    if (error) {\n"
        "      console.error('\u274c Error insertando checklist (plantilla en memoria):', error);\n"
        "      return { success: true, count: memoryItems.length, items: memoryItems, persisted: false, error };\n"
        "    }\n\n"
        "    const items = (data || []).filter((row: any) => String(row.house || '').trim() === houseName);\n"
        "    console.log(`\u2705 ${items.length} items de checklist creados para asignaci\u00f3n ${assignmentIdStr} @ ${houseName}`);\n"
        "    return { success: true, count: items.length, items, persisted: true };\n"
    )
    t = must_replace(t, old, new, 'service insert fallback')
    p.write_text(t)

def patch_dashboard() -> None:
    p = ROOT / 'components/Dashboard.tsx'
    t = p.read_text()
    pairs = [
        (
            "  const pendingInventoryIssuesCount = (inventoryList || []).filter((i: any) => !!i.issue_type && !i.complete).length;",
            "  const pendingInventoryIssuesCount = (inventoryList || []).filter((i: any) => !i.complete).length;",
            'inventory pending count',
        ),
        (
            "const subtasksMap = getSubtasks(task.type || '');",
            "const subtasksMap = getSubtasks(task.type || '', task.house);",
            'getSubtasks call',
        ),
        (
            "setSelectedAssignmentForChecklist(assignment.id);",
            "setSelectedAssignmentForChecklist(String(assignment.id));",
            'stringify checklist id',
        ),
        (
            "setSelectedAssignmentForInventory(assignment.id);",
            "setSelectedAssignmentForInventory(String(assignment.id));",
            'stringify inventory id',
        ),
        (
            "const assignment = calendarAssignments.find(a => a.id === selectedAssignmentForChecklist);",
            "const assignment = calendarAssignments.find(a => String(a.id) === String(selectedAssignmentForChecklist));",
            'find assignment string',
        ),
        (
            "const assignmentToComplete = calendarAssignments.find((a: any) => a.id === selectedAssignmentForChecklist);",
            "const assignmentToComplete = calendarAssignments.find((a: any) => String(a.id) === String(selectedAssignmentForChecklist));",
            'find complete string',
        ),
    ]
    for old, new, label in pairs:
        if old in t:
            t = t.replace(old, new)
            print(f'ok: {label}')
        elif new in t:
            print(f'already: {label}')
        else:
            print(f'WARN: {label}')

    if 'houseChecklistByHouse' not in t:
        t = must_replace(
            t,
            '  const [houseChecklistRows, setHouseChecklistRows] = useState<any[]>([]);\n',
            '  const [houseChecklistRows, setHouseChecklistRows] = useState<any[]>([]);\n  const [houseChecklistByHouse, setHouseChecklistByHouse] = useState<Record<string, any[]>>({});\n',
            'houseChecklistByHouse state',
        )

    if 'function getSubtasks(type: string, taskHouse?: string)' not in t:
        old = (
            "  function getSubtasks(type: string) {\n"
            "    // Prefer per-house checklist from Supabase\n"
            "    const fromHouse = buildSubtasksFromHouseChecklist(type);\n"
            "    if (fromHouse && Object.keys(fromHouse).length > 0) return fromHouse;\n"
            "    // Empty house => empty checklist (do not fall back to global hardcoded mix)\n"
            "    if ((houseChecklistRows || []).length === 0) return {};\n"
            "    return fromHouse;\n"
            "  }"
        )
        new = (
            "  function getSubtasks(type: string, taskHouse?: string) {\n"
            "    const effectiveHouse = String(taskHouse || '').trim() && String(taskHouse).trim() !== 'all'\n"
            "      ? String(taskHouse).trim()\n"
            "      : (String(user.house || user.house_id || '').trim() !== 'all' ? String(user.house || user.house_id || '').trim() : '');\n"
            "    const fromHouse = buildSubtasksFromHouseChecklist(type, effectiveHouse);\n"
            "    if (fromHouse && Object.keys(fromHouse).length > 0) return fromHouse;\n"
            "    const rows = effectiveHouse && houseChecklistByHouse[effectiveHouse]\n"
            "      ? houseChecklistByHouse[effectiveHouse]\n"
            "      : houseChecklistRows;\n"
            "    if ((rows || []).length === 0) return {};\n"
            "    return fromHouse;\n"
            "  }"
        )
        t = must_replace(t, old, new, 'getSubtasks')

    if 'houseOverride?: string' not in t:
        old = (
            "  function buildSubtasksFromHouseChecklist(type: string): { [zona: string]: string[] } | null {\n"
            "    const typeLower = String(type || '').toLowerCase();\n"
            "    const isDeep = typeLower.includes('profund');\n"
            "    const isMaint = typeLower.includes('manten');\n"
            "    const rows = houseChecklistRows || [];\n"
            "    if (!rows.length) {\n"
            "      // Casa sin checklist propio: vac\u00edo (no mezclar globals de otras casas)\n"
            "      return {};\n"
            "    }"
        )
        new = (
            "  function buildSubtasksFromHouseChecklist(type: string, houseOverride?: string): { [zona: string]: string[] } | null {\n"
            "    const typeLower = String(type || '').toLowerCase();\n"
            "    const isDeep = typeLower.includes('profund');\n"
            "    const isMaint = typeLower.includes('manten');\n"
            "    const houseKey = String(houseOverride || '').trim();\n"
            "    const rows = (houseKey && houseChecklistByHouse[houseKey])\n"
            "      ? houseChecklistByHouse[houseKey]\n"
            "      : (houseChecklistRows || []);\n"
            "    if (!rows.length) {\n"
            "      // Casa sin checklist propio: vac\u00edo (no mezclar globals de otras casas)\n"
            "      return {};\n"
            "    }"
        )
        t = must_replace(t, old, new, 'buildSubtasks')

    # AssignedTasks row house
    old_row = (
        "                          <div className=\"assigned-task-date-label\">\n"
        "                            \U0001f4c5 {new Date(task.date).toLocaleDateString('es-CO', {month: 'short', day: 'numeric'})} {task.time ? `\u2022 \U0001f550 ${task.time}` : ''}\n"
        "                          </div>"
    )
    new_row = (
        "                          <div className=\"assigned-task-date-label\">\n"
        "                            \U0001f3e0 {task.house} \u2022 \U0001f4c5 {new Date(task.date).toLocaleDateString('es-CO', {month: 'short', day: 'numeric'})} {task.time ? `\u2022 \U0001f550 ${task.time}` : ''}\n"
        "                          </div>"
    )
    if old_row in t:
        t = t.replace(old_row, new_row, 1)
        print('ok: assigned row house')
    elif '\U0001f3e0 {task.house}' in t:
        print('already: assigned row house')
    else:
        print('WARN: assigned row house')

    if 'modal-house-subtitle' not in t:
        old_hdr = (
            "            <div className=\"modal-header\">\n"
            "              <h2>\n"
            "                {currentAssignmentType?.toLowerCase().includes('mantenimiento')\n"
            "                  ? '\U0001f527 Tareas de Mantenimiento'\n"
            "                  : currentAssignmentType?.toLowerCase().includes('profunda')\n"
            "                  ? '\U0001f9f9 Checklist de Limpieza Profunda'\n"
            "                  : '\u2728 Checklist de Limpieza Regular'}\n"
            "              </h2>\n"
            "              <button className=\"modal-close\" onClick={() => {\n"
            "                setSelectedAssignmentForChecklist(null);\n"
            "                setCurrentAssignmentType(null);\n"
            "              }}>\u2715</button>\n"
            "            </div>"
        )
        new_hdr = (
            "            <div className=\"modal-header\">\n"
            "              <h2>\n"
            "                {currentAssignmentType?.toLowerCase().includes('mantenimiento')\n"
            "                  ? '\U0001f527 Tareas de Mantenimiento'\n"
            "                  : currentAssignmentType?.toLowerCase().includes('profunda')\n"
            "                  ? '\U0001f9f9 Checklist de Limpieza Profunda'\n"
            "                  : '\u2728 Checklist de Limpieza Regular'}\n"
            "              </h2>\n"
            "              {(() => {\n"
            "                const a = calendarAssignments.find((x: any) => String(x.id) === String(selectedAssignmentForChecklist));\n"
            "                return a?.house ? <p className=\"modal-house-subtitle\" style={{margin:'0.25rem 0 0', fontSize:'0.95rem', color:'#475569'}}>\U0001f3e0 {a.house}</p> : null;\n"
            "              })()}\n"
            "              <button className=\"modal-close\" onClick={() => {\n"
            "                setSelectedAssignmentForChecklist(null);\n"
            "                setCurrentAssignmentType(null);\n"
            "              }}>\u2715</button>\n"
            "            </div>"
        )
        t = must_replace(t, old_hdr, new_hdr, 'modal header house')

    if '\U0001f3e0 {assignment.house} \u2022 \U0001f4c5' not in t:
        old_info = (
            "                          <div className=\"assignment-info\">\n"
            "                            <h3 className=\"assignment-employee-name\">{assignment.employee}</h3>\n"
            "                            <p className=\"assignment-date-time\">\n"
            "                              \U0001f4c5 {(() => {\n"
            "                                const dateStr = assignment.date;\n"
            "                                const dateParts = dateStr.split('T')[0].split('-');\n"
            "                                const date = new Date(dateParts[0], parseInt(dateParts[1]) - 1, dateParts[2]);\n"
            "                                return date.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' });\n"
            "                              })()} \u2022 \U0001f550 {assignment.time}\n"
            "                            </p>\n"
            "                          </div>"
        )
        new_info = (
            "                          <div className=\"assignment-info\">\n"
            "                            <h3 className=\"assignment-employee-name\">{assignment.employee}</h3>\n"
            "                            <p className=\"assignment-date-time\">\n"
            "                              \U0001f3e0 {assignment.house} \u2022 \U0001f4c5 {(() => {\n"
            "                                const dateStr = assignment.date;\n"
            "                                const dateParts = dateStr.split('T')[0].split('-');\n"
            "                                const date = new Date(dateParts[0], parseInt(dateParts[1]) - 1, dateParts[2]);\n"
            "                                return date.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' });\n"
            "                              })()} \u2022 \U0001f550 {assignment.time}\n"
            "                            </p>\n"
            "                          </div>"
        )
        t = must_replace(t, old_info, new_info, 'modal body house')

    # house=all checklist loader
    if "When user.house==='all', load checklist rows" not in t:
        old_fx = (
            "  // Cargar checklist SOLO de la casa del usuario/asignaci\u00f3n (sin mezclar otras casas)\n"
            "  useEffect(() => {\n"
            "    const houseName = String(user.house || user.house_id || '').trim();\n"
            "    if (!houseName || houseName === 'all' || !supabase) {\n"
            "      setHouseChecklistRows([]);\n"
            "      return;\n"
            "    }\n"
            "    let cancelled = false;\n"
            "    (async () => {\n"
            "      try {\n"
            "        const { data, error } = await (supabase as any)\n"
            "          .from('checklist')\n"
            "          .select('*')\n"
            "          .eq('house', houseName)\n"
            "          .order('id', { ascending: true });\n"
            "        if (cancelled) return;\n"
            "        if (error) {\n"
            "          console.error('[AssignedTasksCard] Error cargando checklist de casa:', error);\n"
            "          setHouseChecklistRows([]);\n"
            "          return;\n"
            "        }\n"
            "        const only = (data || []).filter((row: any) => String(row.house || '').trim() === houseName);\n"
            "        setHouseChecklistRows(only);\n"
            "      } catch (err) {\n"
            "        if (!cancelled) setHouseChecklistRows([]);\n"
            "      }\n"
            "    })();\n"
            "    const channel = (supabase as any)\n"
            "      .channel(`assigned-house-checklist-${houseName.replace(/\\s+/g, '-')}`)\n"
            "      .on('postgres_changes', { event: '*', schema: 'public', table: 'checklist', filter: `house=eq.${houseName}` }, async () => {\n"
            "        const { data } = await (supabase as any).from('checklist').select('*').eq('house', houseName).order('id', { ascending: true });\n"
            "        setHouseChecklistRows((data || []).filter((row: any) => String(row.house || '').trim() === houseName));\n"
            "      })\n"
            "      .subscribe();\n"
            "    return () => {\n"
            "      cancelled = true;\n"
            "      try { (supabase as any).removeChannel(channel); } catch {}\n"
            "    };\n"
            "  }, [user.house, user.house_id]);"
        )
        new_fx = (
            "  // Cargar checklist de la casa del usuario; si house==='all', cargar por casa de cada asignaci\u00f3n\n"
            "  useEffect(() => {\n"
            "    const houseName = String(user.house || user.house_id || '').trim();\n"
            "    if (!supabase) {\n"
            "      setHouseChecklistRows([]);\n"
            "      return;\n"
            "    }\n"
            "    if (!houseName || houseName === 'all') {\n"
            "      setHouseChecklistRows([]);\n"
            "      return;\n"
            "    }\n"
            "    let cancelled = false;\n"
            "    (async () => {\n"
            "      try {\n"
            "        const { data, error } = await (supabase as any)\n"
            "          .from('checklist')\n"
            "          .select('*')\n"
            "          .eq('house', houseName)\n"
            "          .order('id', { ascending: true });\n"
            "        if (cancelled) return;\n"
            "        if (error) {\n"
            "          console.error('[AssignedTasksCard] Error cargando checklist de casa:', error);\n"
            "          setHouseChecklistRows([]);\n"
            "          return;\n"
            "        }\n"
            "        const only = (data || []).filter((row: any) => String(row.house || '').trim() === houseName);\n"
            "        setHouseChecklistRows(only);\n"
            "        setHouseChecklistByHouse(prev => ({ ...prev, [houseName]: only }));\n"
            "      } catch (err) {\n"
            "        if (!cancelled) setHouseChecklistRows([]);\n"
            "      }\n"
            "    })();\n"
            "    const channel = (supabase as any)\n"
            "      .channel(`assigned-house-checklist-${houseName.replace(/\\s+/g, '-')}`)\n"
            "      .on('postgres_changes', { event: '*', schema: 'public', table: 'checklist', filter: `house=eq.${houseName}` }, async () => {\n"
            "        const { data } = await (supabase as any).from('checklist').select('*').eq('house', houseName).order('id', { ascending: true });\n"
            "        const only = (data || []).filter((row: any) => String(row.house || '').trim() === houseName);\n"
            "        setHouseChecklistRows(only);\n"
            "        setHouseChecklistByHouse(prev => ({ ...prev, [houseName]: only }));\n"
            "      })\n"
            "      .subscribe();\n"
            "    return () => {\n"
            "      cancelled = true;\n"
            "      try { (supabase as any).removeChannel(channel); } catch {}\n"
            "    };\n"
            "  }, [user.house, user.house_id]);\n\n"
            "  // When user.house==='all', load checklist rows for each assignment house (never filter by 'all')\n"
            "  useEffect(() => {\n"
            "    const ownerHouse = String(user.house || user.house_id || '').trim();\n"
            "    if (ownerHouse !== 'all' || !supabase || !assignedTasks?.length) return;\n"
            "    let cancelled = false;\n"
            "    const houses = Array.from(new Set(\n"
            "      assignedTasks.map((t: any) => String(t.house || '').trim()).filter((h: string) => h && h !== 'all')\n"
            "    ));\n"
            "    (async () => {\n"
            "      const next: Record<string, any[]> = {};\n"
            "      for (const h of houses) {\n"
            "        if (houseChecklistByHouse[h]?.length) { next[h] = houseChecklistByHouse[h]; continue; }\n"
            "        try {\n"
            "          const { data, error } = await (supabase as any)\n"
            "            .from('checklist')\n"
            "            .select('*')\n"
            "            .eq('house', h)\n"
            "            .order('id', { ascending: true });\n"
            "          if (cancelled) return;\n"
            "          next[h] = error ? [] : (data || []).filter((row: any) => String(row.house || '').trim() === h);\n"
            "        } catch { next[h] = []; }\n"
            "      }\n"
            "      if (!cancelled) setHouseChecklistByHouse(prev => ({ ...prev, ...next }));\n"
            "    })();\n"
            "    return () => { cancelled = true; };\n"
            "  }, [user.house, user.house_id, assignedTasks]);"
        )
        t = must_replace(t, old_fx, new_fx, 'house=all useEffect')

    t = t.replace('a.id === selectedAssignmentForChecklist\n', 'String(a.id) === String(selectedAssignmentForChecklist)\n')
    p.write_text(t)
    print('Dashboard written')

def main() -> None:
    patch_checklist()
    patch_service()
    patch_dashboard()
    print('ALL 3 BUG FIXES APPLIED')

if __name__ == '__main__':
    main()
