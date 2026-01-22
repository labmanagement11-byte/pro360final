# Cargar Tareas Predefinidas a Supabase

## El Problema
Las tareas predefinidas (LIMPIEZA REGULAR, PROFUNDA, MANTENIMIENTO) solo existen en el código del Dashboard, pero no en la base de datos. Por eso los empleados ven "0/0 Completadas" en el Checklist.

## Solución
Ejecuta el script SQL `INSERT_PREDEFINED_TASKS.sql` en Supabase para insertar todas las tareas predefinidas.

## Pasos

### 1. Abre Supabase
Ve a: https://app.supabase.com → Tu proyecto → SQL Editor

### 2. Crea una Query Nueva
Haz clic en "+ New Query"

### 3. Copia todo el contenido del archivo `INSERT_PREDEFINED_TASKS.sql`
Puede ser desde la carpeta raíz del proyecto

### 4. Pega el código en el editor SQL

### 5. Ejecuta el script
- Click en el botón ▶️ "RUN" (esquina inferior derecha)
- O presiona: Ctrl + Enter

### 6. Verifica los resultados
Al final del script hay un SELECT que mostrará:
```
house              | total_tareas
HYNTIBA2 APTO 406  | 54
EPIC D1            | 59
```

Esto significa que se insertaron correctamente todas las tareas.

## ¿Ahora qué?

Una vez ejecutado el script:

1. **Para Chava (empleado):**
   - Abre "Ver Checklist"
   - Debería ver las tareas predefinidas por zona
   - La estadística debería mostrar: "54 Totales, 0 Completadas" en HYNTIBA2 APTO 406

2. **Para Sandra/Jonathan (managers):**
   - Las tareas aparecen igual que antes
   - Pueden asignar tareas a empleados
   - Pueden ver en tiempo real cuando Chava completa una tarea

3. **Realtime Sync:**
   - Cuando Chava completa una tarea → se actualiza en tiempo real para Sandra/Jonathan
   - Cuando Sandra/Jonathan agregan nueva tarea → aparece en tiempo real para Chava

## Estructura de las Tareas

Cada tarea tiene:
- **house**: Casa donde aplica (EPIC D1 o HYNTIBA2 APTO 406)
- **item**: Descripción de la tarea
- **room**: Zona/Cuarto (ENTRADA, SALA, COCINA, BAÑOS, etc.)
- **complete**: false (sin completar inicialmente)
- **assigned_to**: null (sin asignar hasta que un manager la asigne)

## Si hay errores

Si ves un error como:
```
ERROR: 23505: duplicate key value violates unique constraint
```

Significa que las tareas ya existen. Puedes:

### Opción A: Limpiar e insertar de nuevo
```sql
DELETE FROM checklist WHERE house IN ('EPIC D1', 'HYNTIBA2 APTO 406');
-- Luego ejecuta el script de inserción
```

### Opción B: Solo insertar nuevas (si ya hay algunas)
Modifica el script para usar `ON CONFLICT... DO NOTHING` (avanzado)

## Notas Técnicas

- El script respeta la RLS (Row Level Security) porque todas las inserciones son hechas como admin
- Las tareas no se duplican entre Dashboard (estado local) y Supabase (base de datos)
- Checklist.tsx cargar automáticamente todas las tareas desde Supabase
- Las nuevas tareas agregadas via formulario se sincronizan en tiempo real

