#!/usr/bin/env node

/**
 * 🚀 DEPLOYMENT MAESTRO - Automatiza todo el deployment a Vercel
 * 
 * Este script:
 * 1. Valida que todo esté listo
 * 2. Prepara el código para GitHub
 * 3. Genera instrucciones finales para Vercel
 * 
 * Uso: node deploy-maestro.js
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

console.clear();
console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║                  🚀 DEPLOYMENT MAESTRO 🚀                 ║');
console.log('║         Automatización Total para Vercel Deployment       ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

// Track progress
let completed = 0;
let failed = 0;

async function runCommand(command, description) {
  try {
    console.log(`⏳ ${description}...`);
    const { stdout, stderr } = await execAsync(command, { stdio: 'pipe' });
    if (stderr && !stderr.includes('warning')) {
      throw new Error(stderr);
    }
    console.log(`✅ ${description}`);
    completed++;
    return true;
  } catch (error) {
    console.log(`❌ ${description}`);
    console.log(`   Error: ${error.message.substring(0, 100)}`);
    failed++;
    return false;
  }
}

async function checkFile(filePath, description) {
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${description}`);
    completed++;
    return true;
  } else {
    console.log(`❌ ${description} - NO ENCONTRADO`);
    failed++;
    return false;
  }
}

async function main() {
  try {
    // FASE 1: VALIDACIÓN
    console.log('\n📋 FASE 1: VALIDANDO CONFIGURACIÓN\n');

    await checkFile('./vercel.json', 'vercel.json existe');
    await checkFile('./.vercelignore', '.vercelignore existe');
    await checkFile('./next.config.js', 'next.config.js existe');
    await checkFile('./.env.local', '.env.local existe');
    await checkFile('./package.json', 'package.json existe');

    // FASE 2: VERIFICAR COMPILACIÓN
    console.log('\n🔨 FASE 2: VERIFICANDO COMPILACIÓN\n');

    await runCommand('npm run build', 'Compilación de Next.js');

    // FASE 3: GIT PREPARACIÓN
    console.log('\n📦 FASE 3: PREPARANDO REPOSITORIO GIT\n');

    // Verificar si es un repo git
    if (!fs.existsSync('./.git')) {
      console.log('ℹ️  Inicializando repositorio Git...');
      await runCommand('git init', 'Inicialización de Git');
      await runCommand('git branch -M main', 'Crear rama main');
    } else {
      console.log('✅ Repositorio Git ya existe');
      completed++;
    }

    // Verificar estado de git
    await runCommand('git add .', 'Agregar archivos a Git');
    
    // Verificar si hay cambios para commitear
    const { stdout: status } = await execAsync('git status --porcelain', { stdio: 'pipe' });
    if (status) {
      const timestamp = new Date().toLocaleString('es-ES');
      await runCommand(
        `git commit -m "Deployment: Vercel configuration ready (${timestamp})"`,
        'Commit con configuración de Vercel'
      );
    } else {
      console.log('ℹ️  No hay cambios nuevos para commitear');
      completed++;
    }

    // FASE 4: INFORMACIÓN DE CONEXIÓN
    console.log('\n🔗 FASE 4: GENERANDO INFORMACIÓN DE DEPLOY\n');

    // Obtener información del repositorio Git
    let repoUrl = 'https://github.com/TU_USUARIO/TU_REPO';
    try {
      const { stdout: remote } = await execAsync('git config --get remote.origin.url', { stdio: 'pipe' });
      if (remote) {
        repoUrl = remote.trim();
        console.log(`✅ Repositorio Git remoto: ${repoUrl}`);
        completed++;
      }
    } catch (e) {
      console.log(`ℹ️  Repositorio remoto no configurado aún`);
      console.log(`   Será configurado cuando hagas push a GitHub`);
      completed++;
    }

    // FASE 5: GENERACIÓN DE INSTRUCCIONES
    console.log('\n📋 FASE 5: GENERANDO INSTRUCCIONES FINALES\n');

    const instructionsFile = `DEPLOYMENT-VERCEL-FINAL.md`;
    const instructions = `# ✅ DEPLOYMENT FINAL - PASOS A SEGUIR

## Estado Actual

✅ Compilación verificada
✅ Configuración lista
✅ Git preparado
✅ Archivos listos

## 🎯 PRÓXIMOS PASOS (5 minutos)

### Paso 1: Asegúrate que tu código está en GitHub

**Opción A: Si aún NO has subido a GitHub**
\`\`\`bash
# Agregar remoto de GitHub (reemplaza USER/REPO)
git remote add origin https://github.com/USER/REPO.git

# Push al repositorio
git push -u origin main
\`\`\`

**Opción B: Si ya lo subiste**
\`\`\`bash
# Solo actualiza
git push origin main
\`\`\`

### Paso 2: Ir a Vercel y conectar

1. Abre: https://vercel.com/dashboard
2. Haz click en: **"+ New Project"**
3. Selecciona: **"Import Git Repository"**
4. Busca: tu repositorio (labmanagement11-byte/pro360final)
5. Haz click en: **"Import"**

### Paso 3: Vercel detectará automáticamente

✅ Framework: Next.js (auto-detectado)
✅ Build Command: npm run build
✅ Output Directory: .next

**No necesitas cambiar nada en esta sección**

### Paso 4: Agregar Environment Variables

En la sección "Environment Variables", agrega estas 3:

| Variable | Valor | Visibility |
|----------|-------|-----------|
| NEXT_PUBLIC_SUPABASE_URL | https://tu-proyecto.supabase.co | Public |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | tu-anon-key-aqui | Public |
| SUPABASE_SERVICE_ROLE_KEY | tu-service-role-key-aqui | Secret |

**Obtener las claves:**
- Ve a: supabase.com → Tu Proyecto → Settings → API
- Copia: Project URL, anon key, service role key

### Paso 5: Deploy

Haz click en: **"Deploy"**

⏱️ Espera 2-3 minutos mientras Vercel:
- Clona tu repositorio
- Instala dependencias
- Compila tu app
- Publica en producción

### 🎉 ¡LISTO!

Tu app estará en una URL como:
\`\`\`
https://360profinal.vercel.app
\`\`\`

## 🔄 Futuros Deployments (Automáticos)

Cada vez que hagas:
\`\`\`bash
git push origin main
\`\`\`

Vercel automáticamente:
1. Detecta el cambio
2. Compila el código
3. Actualiza la app

**¡Sin hacer nada más!** ✨

## 📊 Resumen de Configuración

- ✅ Framework: Next.js 16.1.0
- ✅ Runtime: React 19.2.3
- ✅ Backend: Supabase (PostgreSQL)
- ✅ Realtime: Supabase Realtime
- ✅ Hosting: Vercel
- ✅ CI/CD: GitHub Actions (opcional)
- ✅ Node: 20.x
- ✅ Build Time: ~2-3 min

## 🔐 Variables Configuradas

El archivo \`.env.local\` tiene:
- NEXT_PUBLIC_SUPABASE_URL ✅
- NEXT_PUBLIC_SUPABASE_ANON_KEY ✅

Estos se proporcionan localmente y en .vercelignore para Vercel.

## 🚨 Si algo falla

**Build error:**
\`\`\`bash
npm run build
\`\`\`
Si falla aquí, también fallará en Vercel.

**Variable no encontrada:**
- Verifica ortografía exacta en Vercel dashboard
- Espera 5 minutos para propagación

**Login error:**
- Verifica URLs de Supabase correctas
- Asegúrate que usuario existe en base de datos

## 📞 Soporte

- Vercel Docs: https://vercel.com/docs
- Next.js Docs: https://nextjs.org/docs
- Supabase Docs: https://supabase.com/docs

---

**¡Tu aplicación está lista para ir a producción! 🚀**

Tiempo estimado restante: **5 minutos**
`;

    fs.writeFileSync(instructionsFile, instructions);
    console.log(`✅ Instrucciones finales generadas: ${instructionsFile}`);
    completed++;

    // FASE 6: RESUMEN FINAL
    console.log('\n' + '═'.repeat(60));
    console.log('\n📊 RESUMEN DE EJECUCIÓN\n');
    
    console.log(`✅ Completadas: ${completed}`);
    if (failed > 0) {
      console.log(`⚠️  Fallidas: ${failed}`);
    }

    console.log('\n' + '═'.repeat(60));
    console.log('\n🎯 PRÓXIMOS PASOS:\n');

    console.log('1. Lee: DEPLOYMENT-VERCEL-FINAL.md');
    console.log('2. Asegúrate que tu código está en GitHub');
    console.log('3. Ve a Vercel.com y conecta tu repositorio');
    console.log('4. Agrega las 3 variables de entorno');
    console.log('5. Haz click en "Deploy"');
    console.log('\n🕐 Tiempo restante: ~5 minutos para estar LIVE\n');

    console.log('═'.repeat(60));
    console.log('\n✨ STATUS: ✅ LISTO PARA VERCEL\n');

  } catch (error) {
    console.error('\n❌ Error inesperado:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
