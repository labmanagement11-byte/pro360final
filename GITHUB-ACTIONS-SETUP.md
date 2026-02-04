# Configuración de GitHub Actions para Vercel (Opcional)

El proyecto incluye un archivo `.github/workflows/deploy.yml` que:
- ✅ Valida que el código compila correctamente
- ✅ Detecta errores de TypeScript/linting antes de deployar
- ✅ Deploya automáticamente a Vercel si los checks pasan

## 🔧 Configuración (Solo una vez)

### Opción 1: Deployo Simple (SIN GitHub Actions)

Si solo quieres que Vercel automáticamente despliegue sin validaciones:

1. Conecta tu repositorio a Vercel (como se describe en QUICK-START-VERCEL.md)
2. Vercel desplegará automáticamente cada push
3. **Listo.** No necesitas configurar nada más.

### Opción 2: Deployo con Validaciones (CON GitHub Actions)

Si quieres que GitHub Actions valide el build antes de deployar:

#### Paso 1: Obtén tu Token de Vercel

1. Ve a https://vercel.com/account/tokens
2. Haz click en **"Create Token"**
3. Dale un nombre (ej: "GitHub Actions")
4. Selecciona **"Full Access"**
5. Copia el token (se ve así: `xxx_xxxxxxxxxxxxxxxxxx`)

#### Paso 2: Crea Secretos en GitHub

En tu repositorio de GitHub:

1. Ve a **Settings → Secrets and variables → Actions**
2. Haz click en **"New repository secret"**
3. Crea estos secretos:

| Nombre | Valor | Fuente |
|--------|-------|--------|
| `VERCEL_TOKEN` | Token de Vercel (paso anterior) | https://vercel.com/account/tokens |
| `VERCEL_ORG_ID` | ID de tu organización | En dashboard de Vercel |
| `VERCEL_PROJECT_ID` | ID de tu proyecto | En dashboard de Vercel |
| `NEXT_PUBLIC_SUPABASE_URL` | Tu URL de Supabase | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Tu ANON_KEY | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Tu SERVICE_ROLE_KEY | Supabase → Settings → API |

**¿Cómo obtener VERCEL_ORG_ID y VERCEL_PROJECT_ID?**

```bash
# Ejecuta esto localmente (requiere vercel CLI instalado):
vercel env list

# O ve a tu proyecto en Vercel:
# URL será: https://vercel.com/dashboard/[ORG_ID]/[PROJECT_ID]
```

#### Paso 3: Verifica el Workflow

Haz un push a tu repositorio:

```bash
git add .
git commit -m "Add GitHub Actions workflow"
git push origin main
```

En GitHub, ve a **Actions** y verás el workflow ejecutándose:
- ✅ **build**: Compila el proyecto
- ✅ **deploy**: Despliega a Vercel si el build es exitoso

## 📊 Cómo funciona

### Cuando empujas código:

```
git push origin main
    ↓
GitHub Actions inicia "build" job
    ↓
npm install + npm run build
    ↓
¿Éxito? 
    ├─ SÍ → Ejecuta "deploy" job → Vercel despliega
    └─ NO → Workflow falla, Vercel NO despliega (código roto bloqueado)
```

### Beneficios:

- 🛡️ **Previene deployments rotos**: Si el código no compila, no se deploya
- 📊 **Feedback rápido**: Ves el resultado en 1-2 minutos
- 🔄 **Automatización completa**: De código a producción sin clicks
- 📧 **Notificaciones**: GitHub te notifica si algo falla

## 🚨 Troubleshooting de GitHub Actions

### El workflow no corre

**Problema:** No ves el workflow en Actions

**Solución:**
1. Verifica que `.github/workflows/deploy.yml` está en tu repositorio
2. Haz un nuevo commit y push
3. Ve a GitHub → Actions, debería aparecer

### Build falla en GitHub Actions pero funciona localmente

**Problema:** "npm run build" falla en Actions

**Solución:**
```bash
# Limpia y reconstruye localmente
rm -rf .next node_modules
npm ci  # (ci = clean install)
npm run build
```

Si falla aquí, también fallará en GitHub. Corrige el error y re-push.

### Deploy no ocurre aunque build es exitoso

**Problema:** Build pasa pero deploy no ocurre

**Solución:**
1. Verifica que `VERCEL_TOKEN`, `VERCEL_ORG_ID`, y `VERCEL_PROJECT_ID` están correctos en Secrets
2. Los secrets son sensibles - deben estar **exactamente** igual
3. Intenta crear un nuevo token en Vercel

## 📝 Configuración del Workflow

```yaml
# Ejecuta en estos eventos:
- Push a main o develop
- Pull requests a main o develop

# Valida:
- npm install: Dependencias correctas
- npm run lint: Código limpio (si está configurado)
- npm run build: Compila correctamente

# Despliega:
- Solo si build es exitoso
- Solo en push (no en pull requests)
- A Vercel automáticamente
```

## 🎯 Recomendación

**Para comenzar:**
- Usa Opción 1 (Deployo Simple) - es más rápido
- Vercel automáticamente valida y despliega

**Después, si lo necesitas:**
- Configura Opción 2 (con validaciones)
- Protege tu rama main de código roto

## 📞 Ayuda

- [Documentación de GitHub Actions](https://docs.github.com/en/actions)
- [Documentación de Vercel Deploy Action](https://github.com/vercel/action)

---

**TL;DR:** 
- ✅ Sin GitHub Actions: Solo conecta Vercel a GitHub (automático)
- ✅ Con GitHub Actions: Agrega los 6 secrets en Settings → Secrets y ya funciona
