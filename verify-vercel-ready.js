#!/usr/bin/env node

/**
 * Script para validar que el proyecto está listo para deployment en Vercel
 * Ejecutar: node verify-vercel-ready.js
 */

const fs = require('fs');
const path = require('path');

const checks = [];

console.log('🔍 Verificando que el proyecto esté listo para Vercel...\n');

// Check 1: package.json existe y tiene scripts necesarios
console.log('1️⃣ Verificando package.json...');
try {
  const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
  
  if (packageJson.scripts && packageJson.scripts.build && packageJson.scripts.dev) {
    console.log('   ✅ Scripts de build y dev configurados');
    checks.push(true);
  } else {
    console.log('   ❌ Faltan scripts de build o dev');
    checks.push(false);
  }
  
  if (packageJson.dependencies['next'] && packageJson.dependencies['react']) {
    console.log('   ✅ Next.js y React detectados');
    checks.push(true);
  } else {
    console.log('   ❌ Next.js o React no encontrados');
    checks.push(false);
  }
} catch (error) {
  console.log('   ❌ Error leyendo package.json:', error.message);
  checks.push(false);
}

// Check 2: next.config.js existe
console.log('\n2️⃣ Verificando next.config.js...');
if (fs.existsSync('./next.config.js') || fs.existsSync('./next.config.ts')) {
  console.log('   ✅ Configuración de Next.js encontrada');
  checks.push(true);
} else {
  console.log('   ⚠️  next.config.js no encontrado (opcional)');
  checks.push(true);
}

// Check 3: vercel.json existe
console.log('\n3️⃣ Verificando vercel.json...');
if (fs.existsSync('./vercel.json')) {
  try {
    const vercelConfig = JSON.parse(fs.readFileSync('./vercel.json', 'utf-8'));
    console.log('   ✅ vercel.json configurado correctamente');
    console.log('   - buildCommand:', vercelConfig.buildCommand);
    console.log('   - framework:', vercelConfig.framework);
    checks.push(true);
  } catch (error) {
    console.log('   ❌ Error en vercel.json:', error.message);
    checks.push(false);
  }
} else {
  console.log('   ❌ vercel.json no encontrado');
  checks.push(false);
}

// Check 4: .vercelignore existe
console.log('\n4️⃣ Verificando .vercelignore...');
if (fs.existsSync('./.vercelignore')) {
  console.log('   ✅ .vercelignore configurado');
  checks.push(true);
} else {
  console.log('   ⚠️  .vercelignore no encontrado (recomendado)');
  checks.push(true);
}

// Check 5: .env.local existe
console.log('\n5️⃣ Verificando variables de entorno...');
if (fs.existsSync('./.env.local')) {
  const envContent = fs.readFileSync('./.env.local', 'utf-8');
  const hasSupabaseUrl = envContent.includes('NEXT_PUBLIC_SUPABASE_URL');
  const hasSupabaseKey = envContent.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  
  if (hasSupabaseUrl && hasSupabaseKey) {
    console.log('   ✅ Variables de Supabase encontradas en .env.local');
    checks.push(true);
  } else {
    console.log('   ⚠️  Variables de Supabase incompletas en .env.local');
    console.log('      Asegúrate de agregarlas en el dashboard de Vercel');
    checks.push(true);
  }
} else {
  console.log('   ⚠️  .env.local no encontrado');
  console.log('      Esto es correcto - agrégalas en el dashboard de Vercel');
  checks.push(true);
}

// Check 6: .gitignore no trackea .env
console.log('\n6️⃣ Verificando .gitignore...');
if (fs.existsSync('./.gitignore')) {
  const gitignore = fs.readFileSync('./.gitignore', 'utf-8');
  if (gitignore.includes('.env')) {
    console.log('   ✅ .env está en .gitignore (correcto)');
    checks.push(true);
  } else {
    console.log('   ⚠️  .env no está en .gitignore');
    console.log('      Considera agregarlo para seguridad');
    checks.push(true);
  }
} else {
  console.log('   ⚠️  .gitignore no encontrado');
  checks.push(true);
}

// Check 7: app o pages directory existe
console.log('\n7️⃣ Verificando estructura de Next.js...');
if (fs.existsSync('./app') || fs.existsSync('./pages')) {
  if (fs.existsSync('./app')) {
    console.log('   ✅ App router (App Directory) detectado');
  } else {
    console.log('   ✅ Pages router detectado');
  }
  checks.push(true);
} else {
  console.log('   ❌ No se encontró app/ o pages/ directory');
  checks.push(false);
}

// Check 8: node_modules existe
console.log('\n8️⃣ Verificando dependencias...');
if (fs.existsSync('./node_modules')) {
  const packageCount = fs.readdirSync('./node_modules').length;
  console.log(`   ✅ node_modules encontrado (${packageCount} paquetes)`);
  checks.push(true);
} else {
  console.log('   ⚠️  node_modules no encontrado');
  console.log('      Ejecuta: npm install');
  checks.push(true);
}

// Resumen
console.log('\n' + '='.repeat(60));
const passed = checks.filter(c => c).length;
const total = checks.length;
const percentage = Math.round((passed / total) * 100);

console.log(`\n✨ Resultado: ${passed}/${total} verificaciones pasadas (${percentage}%)\n`);

if (percentage === 100) {
  console.log('🎉 ¡Tu proyecto está listo para Vercel!');
  console.log('\nPróximos pasos:');
  console.log('1. Push tu código a GitHub:');
  console.log('   git add .');
  console.log('   git commit -m "Ready for Vercel deployment"');
  console.log('   git push origin main');
  console.log('\n2. Ve a https://vercel.com');
  console.log('3. Conecta tu repositorio de GitHub');
  console.log('4. Agrega variables de entorno en el dashboard:');
  console.log('   - NEXT_PUBLIC_SUPABASE_URL');
  console.log('   - NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.log('   - SUPABASE_SERVICE_ROLE_KEY (como variable "Secret")');
  console.log('5. Haz click en "Deploy"');
  console.log('\n¡Tu aplicación se desplegará automáticamente en ~2-3 minutos! 🚀');
} else if (percentage >= 80) {
  console.log('⚠️  Tu proyecto está casi listo para Vercel');
  console.log('Revisa los items marcados con ❌ arriba');
} else {
  console.log('❌ Tu proyecto necesita más configuración antes de Vercel');
  console.log('Revisa los items marcados con ❌ arriba');
}

console.log('\n' + '='.repeat(60));
