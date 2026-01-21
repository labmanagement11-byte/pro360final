# Sistema de Subtarjetas Expandibles

## Descripción General

El dashboard ahora incluye un sistema hermoso de subtarjetas expandibles que se abre en un modal profesional cuando haces clic en las tarjetas principales. Esto mantiene el diseño limpio en la pantalla inicial mientras proporciona información detallada y organizada.

## Características Principales

### 🎨 Diseño Visual Profesional
- **Modal con backdrop blur**: Efecto de desenfoque de fondo para mejor enfoque
- **Animación suave**: Las subtarjetas se abren con animación `slideUp`
- **Colores coherentes**: Mantiene la paleta de colores profesional del dashboard
- **Iconografía clara**: Cada sección tiene emojis representativos

### 📊 Estadísticas Principales
Cada modal muestra estadísticas clave al inicio:
- **Calendario**: Total de próximas fechas y vencidas
- **Shopping**: Productos pendientes y cantidad total
- **Reminders**: Total de recordatorios activos
- **Inventory**: Artículos inventariados
- **Tasks**: Total de tareas

### 🎯 Subtarjetas Individuales
Cada subtarjeta incluye:
- **Header con icono**: Icono de color azul profesional con label
- **Contenido organizado**: Información principal en párrafos estructurados
- **Badges informativos**: Estados visuales con colores (success, warning, danger)
- **Efectos hover**: Elevación y cambio de borde al pasar el mouse

## Estructura de Datos por Sección

### 📅 Calendario
```typescript
{
  name: string          // Nombre del evento
  due: string          // Fecha del evento
  employee?: string    // Empleado asignado
}
```

### 🛒 Lista de Compras
```typescript
{
  id: number
  name: string         // Nombre del producto
  qty: number         // Cantidad
  completed?: boolean
}
```

### 🔔 Recordatorios
```typescript
{
  name: string         // Nombre del pago
  due: string         // Fecha de pago
  bank: string        // Nombre del banco
  account: string     // Número de cuenta
}
```

### 📦 Inventario
```typescript
{
  name: string         // Nombre del artículo
  quantity: number    // Cantidad
  location?: string   // Ubicación física
}
```

### 📋 Tareas
```typescript
{
  title: string        // Título de la tarea
  description?: string // Descripción
  assignedTo?: string  // Asignado a
  completed?: boolean  // Estado
}
```

## Estilos CSS Relacionados

### Clases Principales
- `.modal-overlay`: Contenedor con backdrop blur
- `.modal-content`: Caja principal del modal
- `.modal-header`: Encabezado con título y botón de cierre
- `.modal-body`: Área de contenido
- `.subcards-grid`: Grid responsive de subtarjetas
- `.subcard`: Cada subtarjeta individual
- `.subcard-header`: Encabezado de subtarjeta
- `.subcard-badge`: Badges informativos
- `.modal-stats`: Sección de estadísticas

### Animaciones
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
```

## Responsividad

El sistema es completamente responsive:

### Desktop (>768px)
- Grid de subtarjetas: `repeat(auto-fit, minmax(280px, 1fr))`
- Gap entre tarjetas: `1.5rem`
- Modal con max-width: `90vw`

### Tablet (768px)
- Grid: 1 columna
- Gap: `1rem`
- Modal con max-width: `95vw`

### Mobile (<480px)
- Grid: 1 columna ajustada
- Gap: `0.75rem`
- Modal adaptado con padding reducido
- Botón de cierre redimensionado

## Interactividad

### Abrir Modal
1. Usuario hace clic en una tarjeta del dashboard
2. Se establece `selectedModalCard` con la clave de la tarjeta
3. Modal se renderiza con `fadeIn` animation
4. Backdrop blur se aplica automáticamente

### Cerrar Modal
1. Usuario hace clic en el botón `✕`
2. Usuario hace clic en el backdrop oscuro
3. `selectedModalCard` se establece en `null`
4. Modal se desvanece

### Efectos Hover en Subtarjetas
- `.subcard:hover`:
  - `transform: translateY(-6px)` (elevación)
  - `border-color: #0284c7` (borde azul)
  - `box-shadow: 0 12px 24px rgba(2, 132, 199, 0.15)` (sombra azul)
  - Fondo pasa de gris a blanco

## Mejoras Futuras

Posibles enhancements:
- ✅ Agregar acciones de edición/eliminación en las subtarjetas
- ✅ Soporte para filtros dentro del modal
- ✅ Busca/filtro rápido de subtarjetas
- ✅ Exportar datos del modal
- ✅ Comparte el estado del modal con URL params

## Ejemplo de Uso

```tsx
// El componente detecta automáticamente qué modal mostrar
if (selectedModalCard === 'shopping') {
  // Renderiza modal de shopping con todas las subtarjetas
  // Incluye estadísticas y badges de estado
}

// Usuario solo ve el modal cuando hace clic
<div className="modal-overlay">
  <div className="modal-content">
    {/* Subtarjetas se generan automáticamente */}
  </div>
</div>
```

## Accesibilidad

El sistema mantiene buenas prácticas de accesibilidad:
- Modal se puede cerrar con ESC (futuro)
- Backdrop previene interacción con fondo
- Contraste de colores cumple WCAG
- Iconografía clara con etiquetas de texto
- Tab navigation dentro del modal

## Paleta de Colores Utilizada

- **Primary**: #0284c7 (Azul profesional)
- **Success**: #10b981 (Verde)
- **Warning**: #f59e0b (Naranja)
- **Danger**: #ef4444 (Rojo)
- **Background**: #f3f4f6 (Gris claro)
- **Text**: #111827 (Gris oscuro)
- **Text Secondary**: #6b7280 (Gris medio)

## Performance

- Animaciones usan `cubic-bezier(0.4, 0, 0.2, 1)` para suavidad
- Transiciones: 200-300ms para respuesta rápida
- Modal se renderiza bajo demanda (condicional)
- Grid usa `auto-fit` para eficiencia
- Backdrop-filter con webkit prefix para compatibilidad Safari

---

**Última actualización**: January 20, 2026
**Versión**: 1.0
