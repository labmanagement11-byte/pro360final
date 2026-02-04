# Guía de Deployment Automático en Vercel

Este proyecto está configurado para realizar deployments automáticos en Vercel cada vez que hagas push a la rama `main`.

## 🚀 Configuración Inicial (Solo una vez)

### Paso 1: Preparar el Código
El proyecto ya tiene los archivos necesarios:
- ✅ `vercel.json` - Configuración de Vercel
- ✅ `.vercelignore` - Archivos a excluir del deployment
- ✅ `next.config.js` - Configuración de Next.js

### Paso 2: GitHub Repository
Asegúrate de que el código está en GitHub:

```bash
# Si aún no has inicializado el repositorio:
git init
git add .
git commit -m "Initial commit: 360pro app with Vercel deployment config"

# Agregar remoto de GitHub (reemplaza USER/REPO con tus valores)
git remote add origin https://github.com/USER/REPO.git

# Push a main branch
git branch -M main
git push -u origin main
```

### Paso 3: Crear Proyecto en Vercel

1. Ve a [vercel.com](https://vercel.com)
2. Haz login con tu cuenta (o crea una nueva)
3. Haz click en "New Project"
4. Selecciona "Import a Git Repository"
5. Busca y selecciona tu repositorio de GitHub

### Paso 4: Configurar Variables de Entorno

En el dashboard de Vercel, en la sección "Environment Variables", agrega:

| Variable | Valor | Visibility |
|----------|-------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | https://tu-proyecto.supabase.co | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Tu clave anon de Supabase | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Tu clave service role | Secret |

**Para obtener estas claves:**
1. Ve a [supabase.com](https://supabase.com)
2. Abre tu proyecto
3. Ve a Settings → API
4. Copia `Project URL` y `anon public key`
5. Para `service_role key`, ve a Settings → API → Service Role → Cambiar a "Service Role"

### Paso 5: Deploy

Haz click en "Deploy". Vercel:
- Detectará automáticamente que es un proyecto Next.js
- Ejecutará `npm run build`
- Compilará tu aplicación
- La desplegará en una URL única

**Tu aplicación estará lista en ~2-3 minutos** ✅

## 🔄 Deployments Automáticos

Después de la configuración inicial, cada vez que hagas:

```bash
git push origin main
```

Vercel automáticamente:
1. Detecta el push
2. Clona el repositorio
3. Ejecuta `npm install`
4. Ejecuta `npm run build`
5. Despliega la nueva versión
6. Tu sitio se actualiza sin que hagas nada más

## 📊 Monitorear Deployments

- Dashboard de Vercel: Ver logs, builds, y states en tiempo real
- Notificaciones por email: Vercel te notifica cuando un deploy falla
- Deployments previos: Puedes volver a una versión anterior con un click

## 🔐 Seguridad de Variables de Entorno

Nunca comitas archivos `.env` a Git:
- `.env.local` está en `.gitignore` ✅
- Las variables sensibles viven en Vercel dashboard
- El `SUPABASE_SERVICE_ROLE_KEY` está marcado como "Secret"

## 🚨 Troubleshooting

### El build falla en Vercel pero funciona localmente

**Solución:**
```bash
# Limpia dependencias y reconstruye
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Variables de entorno no funcionan

1. Verifica que están correctamente copiadas en Vercel dashboard
2. Asegúrate que `NEXT_PUBLIC_SUPABASE_URL` comienza con `https://`
3. Las variables tardan ~5 minutos en estar disponibles después de cambiar

### Errores de Base de Datos en Producción

Verifica que:
- La URL de Supabase es correcta
- El `ANON_KEY` es válido
- Las RLS policies permiten acceso al usuario autenticado
- El usuario existe en la base de datos

## 📝 Configuración Actual (vercel.json)

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "nodeVersion": "20.x",
  "env": [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY"
  ],
  "git": {
    "deploymentEnabled": {
      "main": true
    }
  }
}
```

## 🎯 Próximos Pasos

Después de desplegar exitosamente:

1. **Dominio Personalizado** (Opcional)
   - En Settings → Domains
   - Agrega tu dominio personalizado
   - Actualiza DNS records según instrucciones

2. **CI/CD Checks** (Opcional)
   - Crea `.github/workflows/test.yml` para ejecutar tests antes de deploy
   - Esto previene deployments de código roto

3. **Analytics & Monitoring**
   - Habilita Web Analytics en Vercel
   - Configura alertas para errores en producción

## 📞 Soporte

- [Documentación de Vercel](https://vercel.com/docs)
- [Documentación de Next.js](https://nextjs.org/docs)
- [Documentación de Supabase](https://supabase.com/docs)

---

**¡Tu aplicación está lista para deployment automático! 🚀**

El próximo paso es ir a Vercel y conectar tu repositorio de GitHub.
