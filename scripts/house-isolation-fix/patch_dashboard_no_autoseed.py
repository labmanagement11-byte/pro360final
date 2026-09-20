#!/usr/bin/env python3
"""New houses stay EMPTY: do not auto-seed checklist templates when empty."""
from pathlib import Path

path = Path('components/Dashboard.tsx')
text = path.read_text()

# Block 1: legacy empty seed
old1 = '''            if (!legacy || legacy.length === 0) {
              const seedTemplates = buildChecklistSeedTemplates(selectedHouse);
              if (seedTemplates.length > 0) {
                const createdLegacy = await realtimeService.createChecklistTemplatesLegacyBulk(
                  seedTemplates.map(t => ({
                    house: t.house,
                    room: t.zone,
                    item: t.task,
                    assigned_to: t.task_type
                  }))
                );
                if (!createdLegacy || createdLegacy.length === 0) {
                  setChecklistTemplatesError('No se pudo crear la plantilla en Supabase. Revisa permisos RLS.');
                  setChecklistTemplates([]);
                } else {
                  const refreshedLegacy = await realtimeService.getChecklistTemplatesLegacy(selectedHouse);
                  setChecklistTemplatesError(null);
                  setChecklistTemplates(dedupeChecklistTemplates(refreshedLegacy || []));
                }
              } else {
                setChecklistTemplatesError(null);
                setChecklistTemplates([]);
              }
            } else {
              setChecklistTemplatesError(null);
              setChecklistTemplates(dedupeChecklistTemplates(legacy || []));
            }'''

new1 = '''            if (!legacy || legacy.length === 0) {
              // Casa nueva / vacía: NO auto-copiar plantillas de otras casas ni seeds globales
              setChecklistTemplatesError(null);
              setChecklistTemplates([]);
            } else {
              setChecklistTemplatesError(null);
              setChecklistTemplates(dedupeChecklistTemplates(legacy || []));
            }'''

if old1 in text:
    text = text.replace(old1, new1, 1)
    print('legacy autoseed removed')
elif 'Casa nueva / vacía: NO auto-copiar' in text:
    print('legacy autoseed already removed')
else:
    raise SystemExit('legacy autoseed block not found')

# Block 2: modern empty seed
old2 = '''        } else if (!data || data.length === 0) {
          // Auto-cargar plantilla por defecto en Supabase
          const seedTemplates = buildChecklistSeedTemplates(selectedHouse);
          if (seedTemplates.length > 0) {
            const created = await realtimeService.createChecklistTemplatesBulk(seedTemplates);
            if (!created || created.length === 0) {
              setChecklistTemplatesError('No se pudo crear la plantilla en Supabase. Revisa permisos RLS.');
              setChecklistTemplates([]);
            } else {
              const { data: refreshed } = await realtimeService.getChecklistTemplatesWithError(selectedHouse);
              setChecklistTemplates(dedupeChecklistTemplates(refreshed || []));
            }
          } else {
            setChecklistTemplates([]);
          }
          setChecklistTemplatesSource('checklist_templates');
        } else {'''

new2 = '''        } else if (!data || data.length === 0) {
          // Casa nueva: checklist vacío (admin agrega tareas manualmente). Sin seed/copia.
          setChecklistTemplates([]);
          setChecklistTemplatesSource('checklist_templates');
        } else {'''

if old2 in text:
    text = text.replace(old2, new2, 1)
    print('modern autoseed removed')
elif 'Casa nueva: checklist vacío' in text:
    print('modern autoseed already removed')
else:
    raise SystemExit('modern autoseed block not found')

# Also harden the localStorage checklist sync that merges LIMPIEZA_REGULAR into every house
old_sync = '''        // Transformar datos de Supabase al formato esperado
        const checklistByZona: any = {};
        
        // Inicializar con zonas predefinidas
        Object.keys(LIMPIEZA_REGULAR).forEach(zona => {
          checklistByZona[zona] = {
            type: 'regular',
            tasks: LIMPIEZA_REGULAR[zona as keyof typeof LIMPIEZA_REGULAR].map((task: string) => ({
              text: task,
              completed: false
            }))
          };
        });
        Object.keys(LIMPIEZA_PROFUNDA).forEach(zona => {
          checklistByZona[zona] = {
            type: 'profunda','''

# Only replace if present — make init empty then fill from data
if old_sync in text:
    # Find a larger chunk to replace carefully — read surrounding
    start = text.find(old_sync)
    # Find end of profunda+mantenimiento init — look for "// Luego sobrescribir" or similar
    marker = text.find('data.forEach', start)
    if marker < 0:
        marker = text.find('(data || []).forEach', start)
    if marker > start:
        # Replace init section with empty object
        pre = text[:start]
        # Keep from data.forEach
        # Actually we need to find where predefined init ends
        pass

# Simpler: comment that we skip predefined merge by replacing Object.keys(LIMPIEZA_REGULAR).forEach in that load function only once at that location
# Use unique context including console.log
ctx_start = text.find("console.log(`📋 Cargando checklist desde Supabase para: ${houseName}`)")
if ctx_start > 0 and 'HOUSE_ISOLATION_EMPTY_INIT' not in text:
    # Within this function, replace the first LIMPIEZA_REGULAR forEach init block
    sub = text[ctx_start:ctx_start+3500]
    needle = '''        const checklistByZona: any = {};
        
        // Inicializar con zonas predefinidas
        Object.keys(LIMPIEZA_REGULAR).forEach(zona => {
          checklistByZona[zona] = {
            type: 'regular',
            tasks: LIMPIEZA_REGULAR[zona as keyof typeof LIMPIEZA_REGULAR].map((task: string) => ({
              text: task,
              completed: false
            }))
          };
        });'''
    repl = '''        const checklistByZona: any = {};
        // HOUSE_ISOLATION_EMPTY_INIT: no prefill from global templates (avoids mixing other houses)
'''
    if needle in sub:
        text = text[:ctx_start] + sub.replace(needle, repl, 1) + text[ctx_start+3500:]
        print('supabase checklist local merge init emptied')
    else:
        print('WARN: checklistByZona init needle not in window')

path.write_text(text)
print('Dashboard no-autoseed OK', path.stat().st_size)
assert 'Casa nueva / vacía: NO auto-copiar' in path.read_text()
