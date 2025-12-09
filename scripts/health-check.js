#!/usr/bin/env node
/**
 * Script de verificación de salud del sistema
 * Uso: node scripts/health-check.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_DIR = path.resolve(__dirname, '..');

console.log('🔍 Verificación de Salud del Sistema\n');
console.log('='.repeat(50));

let issues = [];
let warnings = [];

// 1. Verificar .env
const envPath = path.join(PROJECT_DIR, '.env');
if (fs.existsSync(envPath)) {
    console.log('✅ Archivo .env existe');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    if (envContent.includes('DATABASE_URL')) {
        console.log('✅ DATABASE_URL configurada');
    } else {
        issues.push('DATABASE_URL no está configurada en .env');
    }
} else {
    issues.push('Archivo .env no existe');
}

// 2. Verificar node_modules
const nodeModulesPath = path.join(PROJECT_DIR, 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
    console.log('✅ node_modules existe');
} else {
    issues.push('node_modules no existe - ejecutar npm install');
}

// 3. Verificar Prisma Client
const prismaClientPath = path.join(PROJECT_DIR, 'node_modules', '@prisma', 'client');
if (fs.existsSync(prismaClientPath)) {
    console.log('✅ @prisma/client generado');
} else {
    issues.push('@prisma/client no existe - ejecutar npm run generate');
}

// 4. Verificar carpeta backups
const backupsPath = path.join(PROJECT_DIR, 'backups');
if (fs.existsSync(backupsPath)) {
    const backups = fs.readdirSync(backupsPath).filter(f => f.endsWith('.gz'));
    if (backups.length > 0) {
        console.log(`✅ ${backups.length} backup(s) encontrado(s)`);
        // Mostrar el más reciente
        const sorted = backups.sort().reverse();
        console.log(`   Más reciente: ${sorted[0]}`);
    } else {
        warnings.push('No hay backups - ejecutar npm run backup');
    }
} else {
    warnings.push('Carpeta backups no existe');
}

// 5. Verificar espacio en disco
try {
    const dfOutput = execSync('df -h . | tail -1', { encoding: 'utf-8' });
    const parts = dfOutput.trim().split(/\s+/);
    const usePercent = parseInt(parts[4]);
    const available = parts[3];

    if (usePercent >= 90) {
        issues.push(`Disco al ${usePercent}% - Solo ${available} disponibles`);
    } else if (usePercent >= 80) {
        warnings.push(`Disco al ${usePercent}% - ${available} disponibles`);
    } else {
        console.log(`✅ Espacio en disco: ${available} disponibles (${usePercent}% usado)`);
    }
} catch (e) {
    console.log('⚠️ No se pudo verificar espacio en disco');
}

// 6. Verificar conexión a BD
try {
    execSync('npx prisma db execute --stdin <<< "SELECT 1"', {
        cwd: PROJECT_DIR,
        stdio: 'pipe'
    });
    console.log('✅ Conexión a base de datos OK');
} catch (e) {
    // Intentar de otra forma
    try {
        execSync('npx prisma db pull --force', {
            cwd: PROJECT_DIR,
            stdio: 'pipe'
        });
        console.log('✅ Conexión a base de datos OK');
    } catch (e2) {
        warnings.push('No se pudo verificar conexión a BD');
    }
}

// 7. Verificar build
const nextPath = path.join(PROJECT_DIR, '.next');
if (fs.existsSync(nextPath)) {
    console.log('✅ Build de Next.js existe');
} else {
    warnings.push('No hay build - ejecutar npm run build para producción');
}

// Resumen
console.log('\n' + '='.repeat(50));

if (issues.length > 0) {
    console.log('\n❌ ERRORES CRÍTICOS:');
    issues.forEach(i => console.log(`   • ${i}`));
}

if (warnings.length > 0) {
    console.log('\n⚠️ ADVERTENCIAS:');
    warnings.forEach(w => console.log(`   • ${w}`));
}

if (issues.length === 0 && warnings.length === 0) {
    console.log('\n✅ Sistema saludable - Sin problemas detectados');
}

console.log('\n');
process.exit(issues.length > 0 ? 1 : 0);
