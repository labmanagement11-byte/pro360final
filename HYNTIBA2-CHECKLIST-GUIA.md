# 🧹 HYNTIBA2 Checklist - Instrucciones de Uso

## ¿Qué cambió?

Se **borró completamente** la lista de checklist de HYNTIBA2 y ahora puedes **agregar tareas manualmente** desde la aplicación.

## Cómo Agregar Tareas (Manager/Owner)

### 1. **Abre la aplicación en HYNTIBA2**
   - Inicia sesión con un usuario manager u owner de HYNTIBA2

### 2. **Busca el formulario "➕ Agregar Nueva Tarea"**
   - Está en la parte superior de la sección de checklist
   - Solo aparece si eres manager u owner

### 3. **Completa los campos:**
   - **Descripción**: Escribe la tarea (ej: "Limpiar los pisos")
   - **Zona**: Selecciona la categoría (Limpieza, Mantenimiento, Cocina, etc.)
   - **Botón**: Haz clic en "Agregar Tarea"

### 4. **¡La tarea aparece inmediatamente!**
   - Verás la nueva tarea en la lista
   - Los empleados pueden marcarla como completada

## Eliminar Tareas

Si necesitas eliminar una tarea incorrecta, contacta al administrador (habrá un botón de eliminar en futuras versiones).

## Reset y Confirmación

### Reiniciar Checklist
- **Botón**: "Reiniciar Checklist"
- **Efecto**: Desmarca todas las tareas marcadas como completadas
- **Nota**: Ahora funciona correctamente incluso después de refrescar la página

### Confirmar Trabajo Completado
- Aparece cuando **todas las tareas están marcadas como completadas**
- **Botón**: "Confirmar trabajo completado"
- **Efecto**: 
  - Marca la asignación como completada
  - Reinicia el checklist
  - Limpian los datos para la próxima asignación

## Flujo de Trabajo Recomendado

### Para MANAGERS:
1. ✏️ Crear las tareas necesarias al inicio
2. 📋 Distribuir entre empleados (asignación)
3. ✅ Verificar avance en tiempo real
4. 🔄 Al terminar: Usar "Confirmar trabajo completado"

### Para EMPLEADOS:
1. 📋 Ver las tareas asignadas
2. ☑️ Marcar tareas conforme las completes
3. 💾 Los cambios se guardan automáticamente

## Características Técnicas

- ✅ Los datos se guardan en la base de datos
- ✅ Sincronización en tiempo real entre usuarios
- ✅ Reset funciona correctamente (tabla legacy)
- ✅ localStorage limpiado automáticamente
- ✅ Persistencia después de refrescar página

## Problemas Conocidos

Si el reset sigue sin funcionar:
1. Refrescar la página (F5)
2. Limpiar cache del navegador (Ctrl+Shift+Delete)
3. Cerrar sesión y volver a iniciar

## Próximos Pasos

- [ ] Agregar botón para eliminar tareas (sin recargar página)
- [ ] Editar tareas existentes
- [ ] Importar plantillas predefinidas
- [ ] Historial de cambios

---

**Versión**: 2.0 - Clean Start
**Fecha**: Febrero 2026
**Estado**: ✅ En Producción
