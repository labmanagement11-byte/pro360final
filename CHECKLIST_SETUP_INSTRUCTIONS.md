# 🔧 Configuración de Tabla Checklist

Si estás viendo errores al agregar tareas al checklist, es probable que la tabla `checklist` en Supabase no esté configurada correctamente.

## ❌ Síntomas del Problema

- Cuando Sandra agrega una tarea, aparece temporalmente pero desaparece al recargar
- Chava y Jonathan no ven las tareas que Sandra agrega
- Mensaje en consola: `Could not find the 'type' column` o `violates row-level security policy`

## ✅ Solución

Necesitas ejecutar un script SQL en Supabase para crear/actualizar la tabla.

### Pasos:

1. **Abre Supabase Dashboard**
   - Ve a https://supabase.com/dashboard/
   - Selecciona tu proyecto

2. **Abre el SQL Editor**
   - En el menú izquierdo → "SQL Editor"
   - Clic en "New Query"

3. **Copia y pega el contenido de `SETUP_CHECKLIST_TABLE.sql`**
   - Abre el archivo SETUP_CHECKLIST_TABLE.sql en este proyecto
   - Copia TODO el contenido SQL
   - Pégalo en el editor de Supabase

4. **Ejecuta el script**
   - Clic en el botón "▶ Run" o presiona Ctrl+Enter
   - Debería mostrar "Tabla creada" con el número de registros

5. **Prueba nuevamente**
   - Ve al Dashboard
   - Agrega una nueva tarea al checklist
   - Recarga la página
   - La tarea debe estar ahí (guardada en Supabase)

## 📝 Qué hace el script SQL

1. **Crea la tabla `checklist`** con las columnas correctas:
   - `id` - identificador único
   - `house` - nombre de la casa
   - `item` - descripción de la tarea
   - `room` - zona/habitación
   - `complete` - si está completada
   - `assigned_to` - usuario asignado
   - `created_at` / `updated_at` - timestamps

2. **Configura Row Level Security (RLS)**
   - Permite que usuarios autenticados vean las tareas
   - Permite que managers agreguen nuevas tareas
   - Permite actualizaciones y eliminaciones

3. **Crea índices** para mejorar performance al filtrar por casa

## 🔍 Verificar que funcionó

Después de ejecutar el script, prueba esto en el Dashboard:

```
1. Sandra agrega: "Limpiar ventanas"
2. Recarga la página
3. La tarea "Limpiar ventanas" debe seguir visible
4. Chava abre el checklist y TAMBIÉN ve "Limpiar ventanas"
```

## 💬 Si sigue sin funcionar

1. Verifica que no hay errores en la consola del navegador (F12)
2. Revisa que estés usando credenciales de Supabase correctas en `.env.local`
3. Asegúrate de ejecutar el SQL en tu proyecto correcto
4. Intenta refrescar la página completamente (Ctrl+Shift+R)
