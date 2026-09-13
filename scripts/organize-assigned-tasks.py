from pathlib import Path

p = Path('components/Dashboard.tsx')
t = p.read_text()

imp = "import './Dashboard.css';"
imp2 = "import './Dashboard.css';\nimport './AssignedTasks.css';"
if "import './AssignedTasks.css'" not in t:
    if imp not in t:
        raise SystemExit('Dashboard.css import missing')
    t = t.replace(imp, imp2, 1)

state = "  const [expandedInventory, setExpandedInventory] = useState<Set<string>>(new Set());"
state2 = """  const [expandedInventory, setExpandedInventory] = useState<Set<string>>(new Set());
  const [openAssignedZone, setOpenAssignedZone] = useState<string | null>(null);
  const [assignedView, setAssignedView] = useState<'pendiente' | 'hecho' | 'todo'>('pendiente');"""
if 'openAssignedZone' not in t:
    if state not in t:
        raise SystemExit('expandedInventory state missing')
    t = t.replace(state, state2, 1)

old_title = """          <h3 className="assigned-tasks-title-v2">{isManager ? '👥 Progreso de Empleados' : '✨ Tareas Asignadas'}</h3>
          <p className="assigned-tasks-subtitle">{isManager ? 'Supervisar el progreso de todos los empleados' : 'Tu lista de tareas asignadas por el manager'}</p>"""
new_title = """          <h3 className="assigned-tasks-title-v2">{isManager ? 'Progreso de empleados' : 'Tareas Asignadas'}</h3>
          <p className="assigned-tasks-subtitle">{isManager ? 'Trabajos activos de cada empleado' : 'Toca una zona para ver solo lo que falta'}</p>"""
if old_title in t:
    t = t.replace(old_title, new_title, 1)

old_badge_close = """        <span className="assigned-tasks-badge-v2">{Object.values(groupedTasks).flat().length}</span>
      </div>

      {loading ? ("""
new_badge_close = """        <span className="assigned-tasks-badge-v2">{Object.values(groupedTasks).flat().length}</span>
      </div>
      <div className="at-tabs">
        <button type="button" className={assignedView === 'pendiente' ? 'on' : ''} onClick={() => setAssignedView('pendiente')}>Por hacer</button>
        <button type="button" className={assignedView === 'hecho' ? 'on' : ''} onClick={() => setAssignedView('hecho')}>Hechas</button>
        <button type="button" className={assignedView === 'todo' ? 'on' : ''} onClick={() => setAssignedView('todo')}>Todo</button>
      </div>

      {loading ? ("""
if 'className="at-tabs"' not in t:
    if old_badge_close not in t:
        raise SystemExit('header close block missing')
    t = t.replace(old_badge_close, new_badge_close, 1)

old_zones = '''                        <div className="assigned-task-zones-wrap">
                          <div className="assigned-task-zones-title">📋 Zonas de Limpieza</div>
                          <div className="assigned-task-zones-grid">
                            {Object.entries(subtasksMap).map(([zona, subtasks], zonaIdx) => {
                              const zoneItemsCount = (subtasks as string[]).length;
                              const zoneCompletedCount = (subtasks as string[]).filter((_, idx) => {
                                const globalIdx = Object.values(subtasksMap).slice(0, zonaIdx).flat().length + idx;
                                return progressArr[globalIdx];
                              }).length;
                              return (
                                <div key={zona} className="assigned-task-zone-card">
                                  <div className="assigned-task-zone-head">
                                    <span className="assigned-task-zone-name">{zona}</span>
                                    <span className="assigned-task-zone-count">{zoneCompletedCount}/{zoneItemsCount}</span>
                                  </div>
                                  <div className="assigned-task-subtasks-grid">
                                    {(subtasks as string[]).map((subtask, idx) => {
                                      const globalIdx = Object.values(subtasksMap).slice(0, zonaIdx).flat().length + idx;
                                      const isCompleted = progressArr[globalIdx];
                                      return (
                                        <div key={`${zona}-${idx}`} className={`assigned-task-subtask-row ${isCompleted ? 'is-completed' : ''}`}>
                                          <button
                                            className={`assigned-task-subtask-btn ${isCompleted ? 'done' : 'pending'}`}
                                            onClick={() => handleSubtaskToggle(task.id, globalIdx, !isCompleted, allSubtasks.length)}
                                          >
                                            {isCompleted ? '✅ Completada' : '⏳ Completar'}
                                          </button>
                                          <span className={`assigned-task-subtask-text ${isCompleted ? 'is-completed' : ''}`}>
                                            {subtask}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>'''

new_zones = '''                        <div className="assigned-task-zones-wrap">
                          <div className="assigned-task-zones-grid">
                            {Object.entries(subtasksMap).map(([zona, subtasks], zonaIdx) => {
                              const zoneItemsCount = (subtasks as string[]).length;
                              const zoneCompletedCount = (subtasks as string[]).filter((_, idx) => {
                                const globalIdx = Object.values(subtasksMap).slice(0, zonaIdx).flat().length + idx;
                                return progressArr[globalIdx];
                              }).length;
                              const zoneKey = `${task.id}-${zona}`;
                              const visibleSubs = (subtasks as string[]).map((subtask, idx) => {
                                const globalIdx = Object.values(subtasksMap).slice(0, zonaIdx).flat().length + idx;
                                const done = !!progressArr[globalIdx];
                                return { subtask, idx, globalIdx, done };
                              }).filter((row) => {
                                if (assignedView === 'pendiente') return !row.done;
                                if (assignedView === 'hecho') return row.done;
                                return true;
                              });
                              if (assignedView !== 'todo' && visibleSubs.length === 0) return null;
                              const open = openAssignedZone === null ? zonaIdx === 0 : openAssignedZone === zoneKey;
                              return (
                                <div key={zona} className={`assigned-task-zone-card${open ? ' open' : ''}`}>
                                  <button
                                    type="button"
                                    className="assigned-task-zone-head"
                                    onClick={() => setOpenAssignedZone(open ? null : zoneKey)}
                                  >
                                    <span className="assigned-task-zone-name">{zona}</span>
                                    <span className={assignedView === 'pendiente' ? `${visibleSubs.length} por hacer` : `${zoneCompletedCount}/${zoneItemsCount}`}</span>
                                  </button>
                                  {open && (
                                  <div className="assigned-task-subtasks-grid">
                                    {visibleSubs.map((row) => (
                                        <div key={`${zona}-${row.idx}`} className={`assigned-task-subtask-row ${row.done ? 'is-completed' : ''}`}>
                                          <button
                                            className={`assigned-task-subtask-btn ${row.done ? 'done' : 'pending'}`}
                                            onClick={() => handleSubtaskToggle(task.id, row.globalIdx, !row.done, allSubtasks.length)}
                                          >
                                            {row.done ? 'Hecha' : 'Completar'}
                                          </button>
                                          <span className={`assigned-task-subtask-text ${row.done ? 'is-completed' : ''}`}>
                                            {row.subtask}
                                          </span>
                                        </div>
                                    ))}
                                  </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>'''

if old_zones not in t:
    raise SystemExit('zones block missing or changed')
t = t.replace(old_zones, new_zones, 1)

p.write_text(t)
print('patched', p)
