<!-- ============================================
     GUÍA DE EJEMPLOS - CÓMO USAR LOS NUEVOS ESTILOS
     ============================================ -->

# 📖 GUÍA DE EJEMPLOS PRÁCTICOS

## 🔵 BOTONES

### Botón Primario (Recomendado)
```jsx
<button className="btn btn--primary">
  Entrar
</button>
```

### Botón de Éxito
```jsx
<button className="btn btn--success">
  ✓ Completado
</button>
```

### Botón de Peligro
```jsx
<button className="btn btn--danger">
  🗑️ Eliminar
</button>
```

### Botón Secundario
```jsx
<button className="btn btn--secondary">
  Cancelar
</button>
```

### Botón Pequeño
```jsx
<button className="btn btn--sm btn--primary">
  Guardar
</button>
```

### Botón Icono
```jsx
<button className="btn btn--icon btn--primary">
  ⚙️
</button>
```

---

## 📋 TARJETAS

### Tarjeta Simple
```jsx
<div className="card">
  <h3>Tarea importante</h3>
  <p>Descripción de la tarea</p>
</div>
```

### Tarjeta Interactiva (Con hover)
```jsx
<div className="card card--interactive">
  <h4>Hacer clic</h4>
  <p>Esta tarjeta tiene efecto hover</p>
</div>
```

### Tarjeta Elevada (Sombra grande)
```jsx
<div className="card card--elevated">
  <h3>Elemento importante</h3>
  <p>Con sombra destacada</p>
</div>
```

---

## 📝 FORMULARIOS

### Formulario Completo
```jsx
<form className="form">
  <div className="form-group">
    <label className="form-label">Email</label>
    <input 
      type="email" 
      className="form-input" 
      placeholder="tu@email.com"
    />
  </div>
  
  <div className="form-group">
    <label className="form-label">Mensaje</label>
    <textarea 
      className="form-textarea"
      placeholder="Escribe tu mensaje..."
      rows="4"
    ></textarea>
  </div>
  
  <button type="submit" className="btn btn--primary">
    Enviar
  </button>
</form>
```

### Input con Focus
```jsx
<input 
  type="text" 
  className="form-input"
  placeholder="Escribe aquí"
  onChange={(e) => console.log(e.target.value)}
/>
```

---

## 🏷️ BADGES (Etiquetas)

### Badge Primario
```jsx
<span className="badge badge--primary">Principal</span>
```

### Badge de Éxito
```jsx
<span className="badge badge--success">Completado</span>
```

### Badge de Advertencia
```jsx
<span className="badge badge--warning">Pendiente</span>
```

### Badge de Peligro
```jsx
<span className="badge badge--danger">Urgente</span>
```

---

## 🔔 ALERTAS

### Alerta Informativa
```jsx
<div className="alert alert--info">
  <strong>Información:</strong> Esto es un mensaje informativo.
</div>
```

### Alerta de Éxito
```jsx
<div className="alert alert--success">
  <strong>¡Éxito!</strong> La acción se completó correctamente.
</div>
```

### Alerta de Advertencia
```jsx
<div className="alert alert--warning">
  <strong>⚠️ Advertencia:</strong> Por favor revisa esto.
</div>
```

### Alerta de Peligro
```jsx
<div className="alert alert--danger">
  <strong>❌ Error:</strong> Algo salió mal. Intenta nuevamente.
</div>
```

---

## 📊 LAYOUTS

### Grid 2 Columnas
```jsx
<div className="grid grid--2">
  <div className="card">Item 1</div>
  <div className="card">Item 2</div>
  <div className="card">Item 3</div>
  <div className="card">Item 4</div>
</div>
```

### Grid 3 Columnas
```jsx
<div className="grid grid--3">
  <div className="card">Item 1</div>
  <div className="card">Item 2</div>
  <div className="card">Item 3</div>
</div>
```

### Grid 4 Columnas
```jsx
<div className="grid grid--4">
  <div className="card">Item 1</div>
  <div className="card">Item 2</div>
  <div className="card">Item 3</div>
  <div className="card">Item 4</div>
</div>
```

### Flex Centrado
```jsx
<div className="flex flex--center gap-lg">
  <button className="btn btn--primary">Botón 1</button>
  <button className="btn btn--secondary">Botón 2</button>
</div>
```

### Flex Espaciado
```jsx
<div className="flex flex--between">
  <h2>Título</h2>
  <button className="btn btn--sm">Cerrar</button>
</div>
```

---

## 🎨 ESPACIADO

### Padding
```jsx
<div className="p-1">Padding 0.5rem</div>
<div className="p-2">Padding 1rem</div>
<div className="p-3">Padding 1.5rem</div>
<div className="p-4">Padding 2rem</div>
```

### Margin
```jsx
<div className="m-1">Margin 0.5rem</div>
<div className="m-2">Margin 1rem</div>
<div className="m-3">Margin 1.5rem</div>
<div className="m-4">Margin 2rem</div>
```

### Margin Top
```jsx
<div className="mt-1">MT 0.5rem</div>
<div className="mt-2">MT 1rem</div>
<div className="mt-3">MT 1.5rem</div>
<div className="mt-4">MT 2rem</div>
```

### Gap (entre elementos flexbox)
```jsx
<div className="flex gap-sm">Pequeño gap</div>
<div className="flex gap-md">Gap medio</div>
<div className="flex gap-lg">Gap grande</div>
```

---

## 📱 RESPONSIVE

### Ocultar en Mobile
```jsx
@media (max-width: 768px) {
  .ocultar-mobile {
    display: none;
  }
}
```

### Mostrar solo en Mobile
```jsx
@media (max-width: 768px) {
  .solo-mobile {
    display: block;
  }
}
```

### Cambiar Grid en Mobile
```jsx
.grid--2 {
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

@media (max-width: 768px) {
  .grid--2 {
    grid-template-columns: 1fr;
  }
}
```

---

## 🌙 DARK MODE

El sistema está preparado para dark mode. Cuando lo implementes:

```css
@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #0f172a;
    --bg-secondary: #1e293b;
    --text-primary: #f9fafb;
    /* ... más variables */
  }
}
```

---

## 💻 COMPONENTE REACT COMPLETO

### Ejemplo: Tarjeta de Usuario
```jsx
import React from 'react';

const UserCard = ({ user }) => {
  return (
    <div className="card card--interactive">
      <div className="flex flex--between mb-2">
        <div>
          <h3 className="card-title">{user.name}</h3>
          <span className="badge badge--primary">{user.role}</span>
        </div>
      </div>
      
      <div className="text-muted gap-md flex">
        <span>📧 {user.email}</span>
        <span>🏢 {user.house}</span>
      </div>
      
      <div className="flex gap-md mt-3">
        <button className="btn btn--sm btn--primary">
          Editar
        </button>
        <button className="btn btn--sm btn--danger">
          Eliminar
        </button>
      </div>
    </div>
  );
};

export default UserCard;
```

---

## 🎯 MEJORES PRÁCTICAS

### ✅ DO - Haz esto

```jsx
// Usar variables CSS
color: var(--primary);

// Usar transiciones
transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);

// Clases base + variantes
<button className="btn btn--primary">

// Espaciado consistente
padding: 1rem; /* múltiplos de 0.5rem */

// Legibilidad primero
font-size: 1rem; /* mínimo 14px */
```

### ❌ DON'T - No hagas esto

```jsx
// Hardcodear colores
color: #0284c7; /* ❌ Usa var(--primary) */

// Sin transiciones
/* ❌ transiciones abruptas */

// Classes al azar
<button className="btn azul grande"> /* ❌ Caótico */

// Espaciado random
padding: 13px; /* ❌ Usa múltiplos de 8px */

// Texto muy pequeño
font-size: 12px; /* ❌ Mínimo 14px */
```

---

## 🔗 LINKS Y REFERENCIAS

- [Documentación Completa](./MEJORAS-VISUALES.md)
- [Colores y Estilos](./COLORES-Y-ESTILOS.css)
- [Sistema de Diseño](./app/modern-design-system.css)

---

## 🤝 SOPORTE

¿Preguntas sobre cómo usar los estilos?

1. Revisa esta guía
2. Consulta `COLORES-Y-ESTILOS.css`
3. Mira los componentes existentes
4. Sigue el patrón establecido

---

## 🎉 ¡DIVIÉRTETE CREANDO!

Ahora tienes un sistema de diseño profesional y fácil de usar.
**¡Crea componentes hermosos con confianza!** ✨
