#!/usr/bin/env python3
from pathlib import Path

path = Path('components/Dashboard.tsx')
text = path.read_text()

# 1) Add state near editingChecklistTemplateId
old_state = """  const [editingChecklistTemplateId, setEditingChecklistTemplateId] = useState<string | null>(null);
  const [newChecklistTemplate, setNewChecklistTemplate] = useState({
    zone: '',
    task: '',
    task_type: 'Limpieza regular'
  });"""

new_state = """  const [editingChecklistTemplateId, setEditingChecklistTemplateId] = useState<string | null>(null);
  const [checklistTemplateTypeFilter, setChecklistTemplateTypeFilter] = useState<string>('Limpieza regular');
  const [openChecklistTemplateZone, setOpenChecklistTemplateZone] = useState<string | null>(null);
  const [newChecklistTemplate, setNewChecklistTemplate] = useState({
    zone: '',
    task: '',
    task_type: 'Limpieza regular'
  });
  const CHECKLIST_TEMPLATE_ROOM_ORDER = [
    'LIMPIEZA GENERAL',
    'HABITACIÓN 1',
    'HABITACIÓN 2',
    'HABITACIONES',
    'SALA / COMEDOR',
    'SALA',
    'COMEDOR',
    'COCINA',
    'BAÑO 1',
    'BAÑO 2',
    'BAÑO 3',
    'BAÑOS',
    'ZONA DE LAVADO',
    'TERRAZA',
    'ÁREA DE BBQ',
    'ÁREA DE PISCINA',
    'LIMPIEZA PROFUNDA',
    'ÁREAS VERDES',
    'PISCINA Y AGUA',
    'RUTINA DE MANTENIMIENTO',
    'SISTEMAS ELÉCTRICOS',
  ];"""

if old_state not in text:
    raise SystemExit('state block not found')
text = text.replace(old_state, new_state, 1)

# 2) Allow managers to use the add/edit form (not only Jonathan)
text = text.replace(
    "{(user.role === 'owner' || (user.role === 'manager' && isJonathanUser)) && (\n                    <div className=\"modal-assignment-form\" style={{marginBottom: '2rem'}} ref={checklistFormRef}>",
    "{(user.role === 'owner' || user.role === 'manager' || user.role === 'dueno') && (\n                    <div className=\"modal-assignment-form\" style={{marginBottom: '2rem'}} ref={checklistFormRef}>",
    1,
)

# 3) Zone input -> datalist of known zones
old_zone_input = """                          <div className=\"form-group\">
                            <label>📍 Zona</label>
                            <input
                              id=\"checklist-template-zone\"
                              type=\"text\"
                              value={newChecklistTemplate.zone}
                              onChange={(e) => setNewChecklistTemplate({ ...newChecklistTemplate, zone: e.target.value })}
                              required
                              placeholder=\"Ej: COCINA\"
                              title=\"Zona\"
                            />
                          </div>"""

new_zone_input = """                          <div className=\"form-group\">
                            <label>📍 Zona</label>
                            <input
                              id=\"checklist-template-zone\"
                              type=\"text\"
                              list=\"checklist-template-zone-options\"
                              value={newChecklistTemplate.zone}
                              onChange={(e) => setNewChecklistTemplate({ ...newChecklistTemplate, zone: e.target.value })}
                              required
                              placeholder=\"Ej: COCINA\"
                              title=\"Zona\"
                            />
                            <datalist id=\"checklist-template-zone-options\">
                              {Array.from(new Set([
                                ...CHECKLIST_TEMPLATE_ROOM_ORDER,
                                ...checklistTemplates.map((t: any) => String(t.zone || t.room || '').trim()).filter(Boolean),
                              ])).map((zoneName) => (
                                <option key={zoneName} value={zoneName} />
                              ))}
                            </datalist>
                          </div>"""

if old_zone_input not in text:
    raise SystemExit('zone input not found')
text = text.replace(old_zone_input, new_zone_input, 1)

# 4) Replace stats + list block
start = text.find("                  {/* Estadísticas generales */}")
end = text.find("              {selectedTaskMaintenance && (", start)
if start < 0 or end < 0:
    raise SystemExit(f'markers not found start={start} end={end}')

# Find the closing of checklist modal before selectedTaskMaintenance - the stats block through end of checklist fragment
# Actually end marker is selectedTaskMaintenance which comes AFTER the checklist closing. Need to include only through checklist list end.
# Looking at structure: stats ... list ... </> )} then selectedTaskMaintenance
checklist_end = text.find("                </>\n              )}\n              {selectedTaskMaintenance && (", start)
if checklist_end < 0:
    raise SystemExit('checklist end not found')

new_block = r'''                  {/* Estadísticas + filtros */}
                  {(() => {
                    const filteredTemplates = checklistTemplates.filter((item: any) => {
                      if (checklistTemplateTypeFilter === 'all') return true;
                      const type = item.task_type || item.assigned_to || 'Limpieza regular';
                      return type === checklistTemplateTypeFilter;
                    });
                    const zoneCount = new Set(filteredTemplates.map((t: any) => t.zone || t.room || 'SIN ZONA')).size;
                    return (
                      <div className="modal-stats" style={{marginBottom: '1rem'}}>
                        <div className="stat-box">
                          <p className="stat-box-number">{filteredTemplates.length}</p>
                          <p className="stat-box-label">Tareas visibles</p>
                        </div>
                        <div className="stat-box">
                          <p className="stat-box-number">{zoneCount}</p>
                          <p className="stat-box-label">Zonas</p>
                        </div>
                        <div className="stat-box">
                          <p className="stat-box-number">{houses[allowedHouseIdx]?.name || 'EPIC D1'}</p>
                          <p className="stat-box-label">Casa</p>
                        </div>
                      </div>
                    );
                  })()}
                  {checklistTemplatesError && checklistTemplatesSource === 'checklist_templates' && (
                    <div style={{textAlign: 'center', marginBottom: '1rem', color: '#dc2626'}}>
                      {checklistTemplatesError}
                      {String(checklistTemplatesError).includes('checklist_templates') && (
                        <div style={{marginTop: '0.5rem', color: '#b91c1c'}}>
                          Ejecuta el SQL en &quot;create-checklist-templates-table.sql&quot; para crear la tabla en Supabase.
                        </div>
                      )}
                    </div>
                  )}

                  <div className="cl-admin-type-tabs">
                    {[
                      { id: 'Limpieza regular', label: 'Limpieza' },
                      { id: 'Limpieza profunda', label: 'Profunda' },
                      { id: 'Mantenimiento', label: 'Mantenimiento' },
                      { id: 'all', label: 'Todo' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        className={checklistTemplateTypeFilter === tab.id ? 'on' : ''}
                        onClick={() => {
                          setChecklistTemplateTypeFilter(tab.id);
                          setOpenChecklistTemplateZone(null);
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Zonas con tareas (acordeón compacto) */}
                  <div className="cl-admin-zones">
                    {loadingChecklistTemplates ? (
                      <div className="modal-body-empty">
                        <p>Cargando template...</p>
                      </div>
                    ) : checklistTemplates.length > 0 ? (
                      (() => {
                        const filtered = checklistTemplates.filter((item: any) => {
                          if (checklistTemplateTypeFilter === 'all') return true;
                          const type = item.task_type || item.assigned_to || 'Limpieza regular';
                          return type === checklistTemplateTypeFilter;
                        });

                        const zones = new Map<string, any[]>();
                        filtered.forEach((item: any) => {
                          const zoneName = String(item.zone || item.room || 'SIN ZONA').trim() || 'SIN ZONA';
                          if (!zones.has(zoneName)) zones.set(zoneName, []);
                          zones.get(zoneName)!.push(item);
                        });

                        const sortedZones = Array.from(zones.entries()).sort((a, b) => {
                          const ai = CHECKLIST_TEMPLATE_ROOM_ORDER.indexOf(a[0].toUpperCase());
                          const bi = CHECKLIST_TEMPLATE_ROOM_ORDER.indexOf(b[0].toUpperCase());
                          return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
                        });

                        if (!sortedZones.length) {
                          return (
                            <div className="modal-body-empty">
                              <p>No hay tareas en este tipo. Cambia el filtro o agrega una tarea.</p>
                            </div>
                          );
                        }

                        const activeZone = openChecklistTemplateZone && sortedZones.some(([z]) => z === openChecklistTemplateZone)
                          ? openChecklistTemplateZone
                          : sortedZones[0][0];

                        return (
                          <>
                            {sortedZones.map(([zone, items]) => {
                              const open = activeZone === zone;
                              return (
                                <section key={zone} className={`cl-admin-zone${open ? ' open' : ''}`}>
                                  <button
                                    type="button"
                                    className="cl-admin-zone-btn"
                                    aria-expanded={open}
                                    onClick={() => setOpenChecklistTemplateZone(open ? null : zone)}
                                  >
                                    <span>{zone}</span>
                                    <span className="cl-admin-zone-count">{items.length} tareas</span>
                                  </button>
                                  {open && (
                                    <div className="cl-admin-task-list">
                                      {items.map((item: any) => (
                                        <div key={item.id} className="cl-admin-task-row">
                                          <div className="cl-admin-task-text">
                                            <strong>{item.task || item.item}</strong>
                                            {checklistTemplateTypeFilter === 'all' && (
                                              <span className="cl-admin-task-meta">{item.task_type || item.assigned_to || 'Limpieza regular'}</span>
                                            )}
                                          </div>
                                          {(user.role === 'owner' || user.role === 'manager' || user.role === 'dueno') && (
                                            <div className="cl-admin-task-actions">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setEditingChecklistTemplateId(item.id);
                                                  setNewChecklistTemplate({
                                                    zone: item.zone || item.room || '',
                                                    task: item.task || item.item || '',
                                                    task_type: item.task_type || item.assigned_to || 'Limpieza regular'
                                                  });
                                                  requestAnimationFrame(() => {
                                                    checklistFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                    const input = document.getElementById('checklist-template-task') as HTMLInputElement | null;
                                                    input?.focus();
                                                  });
                                                }}
                                              >
                                                Editar
                                              </button>
                                              <button
                                                type="button"
                                                className="danger"
                                                onClick={async () => {
                                                  const label = item.task || item.item || 'tarea';
                                                  if (confirm(`¿Eliminar "${label}" del template?`)) {
                                                    if (checklistTemplatesSource === 'checklist') {
                                                      const ok = await realtimeService.deleteChecklistTemplateLegacy(item.id);
                                                      if (ok) {
                                                        setChecklistTemplates(prev => prev.filter(t => t.id !== item.id));
                                                      } else {
                                                        alert('No se pudo eliminar. Revisa permisos en Supabase.');
                                                      }
                                                    } else {
                                                      const ok = await realtimeService.deleteChecklistTemplate(item.id);
                                                      if (ok) {
                                                        setChecklistTemplates(prev => prev.filter(t => t.id !== item.id));
                                                      } else {
                                                        alert('No se pudo eliminar. Revisa permisos en Supabase.');
                                                      }
                                                    }
                                                  }
                                                }}
                                              >
                                                Eliminar
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </section>
                              );
                            })}
                          </>
                        );
                      })()
                    ) : (
                      <div className="modal-body-empty">
                        <p>📭 No hay tareas en el template</p>
                      </div>
                    )}
                  </div>
'''

text = text[:start] + new_block + text[checklist_end:]
path.write_text(text)
print('Dashboard patched OK', path.stat().st_size)

# Verify markers
for needle in ['checklistTemplateTypeFilter', 'cl-admin-zones', 'CHECKLIST_TEMPLATE_ROOM_ORDER', 'checklist-template-zone-options']:
    print(needle, text.count(needle))
