# Guía Rápida: Deploy en Vercel (5 minutos)

## ✅ Pre-requisitos
- [ ] Tienes una cuenta en [GitHub](https://github.com)
- [ ] Tienes una cuenta en [Vercel](https://vercel.com) (puedes usar GitHub para login)
- [ ] Tu código está en un repositorio de GitHub

## 🚀 Pasos Rápidos

### Paso 1: Verifica que el Proyecto está Listo (30 segundos)
```bash
node verify-vercel-ready.js
```
Debería mostrar: ✅ **9/9 verificaciones pasadas (100%)**

### Paso 2: Push a GitHub (1 minuto)
```bash
# Agrega todos los cambios
git add .

# Commit con mensaje
git commit -m "Ready for Vercel: deployment configuration added"

# Push a main branch
git push origin main
```

**Resultado esperado:** Tu código está en https://github.com/USUARIO/REPO

### Paso 3: Conectar GitHub con Vercel (2 minutos)

1. Ve a https://vercel.com/dashboard
2. Haz click en **"+ New Project"**
3. Selecciona **"Import a Git Repository"**
4. Busca tu repositorio en GitHub
5. Haz click en **"Import"**

Vercel detectará automáticamente:
- ✅ Framework: **Next.js**
- ✅ Build command: **npm run build**
- ✅ Output directory: **.next**

No necesitas cambiar nada.

### Paso 4: Agregar Variables de Entorno (1.5 minutos)

En la página de configuración de Vercel, en la sección **"Environment Variables"**:

**Agrega estas 3 variables:**

1. **NEXT_PUBLIC_SUPABASE_URL**
   - Valor: `https://tu-proyecto.supabase.co`
   - Visibility: Public (default)

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - Valor: Tu clave anon de Supabase
   - Visibility: Public (default)

3. **SUPABASE_SERVICE_ROLE_KEY**
   - Valor: Tu clave service role de Supabase
   - Visibility: **Secret** (cambiar dropdown)

**¿Dónde obtener las claves?**
- Ve a [supabase.com](https://supabase.com)
- Abre tu proyecto
- Settings → API → copia las claves

### Paso 5: Deploy (automatizado)

Haz click en el botón **"Deploy"**

Vercel hará:
- ✅ Clonar tu repositorio
- ✅ Instalar dependencias (`npm install`)
- ✅ Compilar (`npm run build`)
- ✅ Desplegar a URL única

**⏱️ Espera 2-3 minutos...**

### 🎉 ¡LISTO!

Tu aplicación estará live en una URL como:
```
https://360profinal.vercel.app
```

## 🔄 Futuros Deployments (AUTOMÁTICOS)

Cada vez que hagas:
```bash
git push origin main
```

Vercel automáticamente:
- Detecta el cambio
- Construye
- Despliega la nueva versión

**No necesitas hacer nada más. ¡Está completamente automatizado!** ✨

## 📊 Monitorear el Deploy

1. En el dashboard de Vercel, verás un log en tiempo real
2. Cuando veas el checkmark verde ✅, tu sitio está live
3. Haz click en la URL para abrirlo

## 🚨 Si algo falla

**Error: Build failed**
```bash
# En tu máquina local, intenta:
npm run build
```
Si falla localmente, intenta:
- `npm install` para actualizar dependencias
- Verificar que `next.config.js` está bien configurado

**Error: Variables de entorno no funcionan**
- Verifica que están **exactamente** iguales en Vercel
- Espera 5 minutos a que se propaguen
- Trigger un nuevo deploy: haz un pequeño cambio y push

**Error: "Usuario no encontrado" en login**
- Verifica que `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` son correctas
- Asegúrate que el usuario existe en tu tabla de `profiles`
- Verifica que las RLS policies permiten acceso al usuario

## 📝 Configuración Actual

Tu proyecto tiene:
- ✅ `vercel.json` - Configuración de Vercel
- ✅ `.vercelignore` - Optimización de deploy
- ✅ `next.config.js` - Configuración de Next.js
- ✅ `VERCEL-DEPLOYMENT-GUIDE.md` - Guía detallada

## 🎯 Resumen

| Paso | Acción | Tiempo |
|------|--------|--------|
| 1 | Verificar proyecto | 30s |
| 2 | Push a GitHub | 1 min |
| 3 | Conectar Vercel | 2 min |
| 4 | Agregar variables | 1.5 min |
| 5 | Deploy | 2-3 min |
| **TOTAL** | **Deploy completo** | **~7 minutos** |

## 📞 Ayuda

- [Documentación de Vercel](https://vercel.com/docs)
- [Documentación de Next.js](https://nextjs.org/docs)
- [Documentación de Supabase](https://supabase.com/docs)

---

**¡Tu aplicación estará online en minutos! 🚀**

Si tuviste éxito, comparte tu URL en las redes sociales:
```
Hey! 🎉 Mi aplicación 360pro está live en: https://360profinal.vercel.app
Creada con Next.js, React y Supabase 🚀
```
