# 📅 Sistema de Asignación de Horarios de Empleados

## Descripción

El **Calendario** ahora funciona como un sistema completo de asignación de horarios de trabajo para empleados. Permite programar fechas específicas de limpieza y mantenimiento con información detallada.

## 🎯 Características Principales

### 1. Formulario de Asignación (Solo Owner/Manager)
Un formulario profesional en la parte superior del modal permite crear nuevas asignaciones con:

- **Empleado**: Selector desplegable con todos los empleados y managers disponibles
- **Fecha**: Selector de calendario para elegir el día
- **Hora**: Selector de hora específica (formato 24 horas)
- **Tipo de servicio**: 3 opciones disponibles:
  - 🧹 **Limpieza profunda** (badge naranja/warning)
  - ✨ **Limpieza regular** (badge verde/success)
  - 🔧 **Mantenimiento** (sin color especial)

### 2. Vista de Asignaciones
Las asignaciones se muestran en subtarjetas hermosas con:

#### Iconografía Dinámica
- 🧹 = Limpieza profunda
- ✨ = Limpieza regular  
- 🔧 = Mantenimiento

#### Información Detallada
Cada subtarjeta muestra:
- **Header**: Icono del tipo + nombre del empleado
- **📅 Fecha**: Formato completo (ej: "lunes, 20 de enero de 2026")
- **🕐 Hora**: Hora específica asignada
- **🏠 Servicio**: Tipo de limpieza/mantenimiento
- **Badge**: Color según tipo de servicio

#### Acciones (Owner/Manager)
- Botón **Eliminar** para cancelar asignaciones

### 3. Estadísticas en Tiempo Real
El modal muestra 3 métricas clave:
- **Asignaciones totales**: Número total de horarios programados
- **Limpiezas profundas**: Contador específico
- **Limpiezas regulares**: Contador específico

### 4. Ordenamiento Inteligente
Las asignaciones se ordenan automáticamente por fecha (más próximas primero).

## 💾 Persistencia de Datos

Todas las asignaciones se guardan en **localStorage** con la clave:
```javascript
'dashboard_calendar_assignments'
```

Esto significa que los datos persisten entre sesiones del navegador.

## 🎨 Diseño Visual

### Formulario de Asignación
- Fondo con gradiente azul claro
- Borde redondeado profesional
- Grid responsive de 4 columnas (se adapta a pantalla)
- Inputs con focus state azul
- Botón "Asignar Horario" de ancho completo

### Subtarjetas de Asignación
- Header con icono circular en fondo azul claro
- Información estructurada con emojis informativos
- Badges de color según tipo de servicio
- Botón de eliminar en rojo para managers/owners
- Efectos hover de elevación

### Responsive
- **Desktop**: Grid de 3-4 columnas
- **Tablet**: Grid de 2 columnas
- **Mobile**: 1 columna, formulario apilado

## 🔒 Permisos por Rol

### Owner / Manager
- ✅ Crear nuevas asignaciones
- ✅ Ver todas las asignaciones
- ✅ Eliminar asignaciones
- ✅ Acceso completo al formulario

### Empleado
- ✅ Ver asignaciones (solo lectura)
- ❌ No puede crear ni eliminar

## 📊 Estructura de Datos

Cada asignación contiene:

```typescript
{
  id: number,              // Timestamp único
  employee: string,        // Nombre del empleado
  date: string,           // Fecha en formato YYYY-MM-DD
  time: string,           // Hora en formato HH:mm
  type: string,           // 'Limpieza regular' | 'Limpieza profunda' | 'Mantenimiento'
  createdAt: string       // ISO timestamp de creación
}
```

## 🚀 Flujo de Uso

### Para Managers/Owners:

1. **Abrir Calendario**: Clic en tarjeta "Calendario" en dashboard
2. **Completar Formulario**:
   - Seleccionar empleado
   - Elegir fecha
   - Establecer hora
   - Seleccionar tipo de servicio
3. **Asignar**: Click en botón "Asignar Horario"
4. **Confirmación**: La asignación aparece inmediatamente en la lista
5. **Gestionar**: Revisar asignaciones y eliminar si es necesario

### Para Empleados:

1. **Abrir Calendario**: Clic en tarjeta "Calendario"
2. **Ver Asignaciones**: Revisar todas las asignaciones programadas
3. **Información**: Ver fecha, hora y tipo de servicio asignado

## 💡 Casos de Uso Reales

### Ejemplo 1: Limpieza Regular Semanal
```
Empleado: Carlina
Fecha: 22 de enero de 2026
Hora: 09:00
Tipo: Limpieza regular
Badge: ✨ Regular (verde)
```

### Ejemplo 2: Limpieza Profunda Mensual
```
Empleado: Victor
Fecha: 1 de febrero de 2026
Hora: 08:00
Tipo: Limpieza profunda
Badge: 🧹 Profunda (naranja)
```

### Ejemplo 3: Mantenimiento Especial
```
Empleado: Alejandra
Fecha: 15 de febrero de 2026
Hora: 14:00
Tipo: Mantenimiento
Badge: 🔧 Mantenimiento
```

## 🎯 Ventajas del Sistema

1. **Claridad Visual**: Cada asignación es fácil de identificar
2. **Organización**: Todo centralizado en un solo lugar
3. **Flexibilidad**: Soporte para diferentes tipos de servicio
4. **Accesibilidad**: Responsive en todos los dispositivos
5. **Persistencia**: Los datos no se pierden al recargar
6. **Tiempo Real**: Estadísticas actualizadas instantáneamente

## 🔄 Mejoras Futuras

Posibles enhancements:
- ⭐ Notificaciones push para empleados
- ⭐ Sincronización con Supabase
- ⭐ Vista de calendario mensual
- ⭐ Filtros por empleado/tipo
- ⭐ Exportar a PDF/Excel
- ⭐ Repetir asignaciones semanalmente
- ⭐ Marcar asignación como completada
- ⭐ Agregar notas/comentarios a asignaciones

## 📱 Accesibilidad

El sistema cumple con:
- Labels claros en formularios
- Contraste de colores WCAG
- Iconografía intuitiva
- Responsive design
- Teclado navigation friendly

---

**Creado**: January 20, 2026  
**Versión**: 1.0  
**Estado**: ✅ Producción
