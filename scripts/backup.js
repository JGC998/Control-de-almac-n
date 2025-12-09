#!/usr/bin/env node
/**
 * Script de backup para la base de datos SQLite
 * Uso: node scripts/backup.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const zlib = require('zlib');

const PROJECT_DIR = path.resolve(__dirname, '..');
const DB_FILE = path.join(PROJECT_DIR, 'prisma', 'dev.db');
const BACKUP_DIR = path.join(PROJECT_DIR, 'backups');

const now = new Date();
const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
const BACKUP_NAME = `backup_${dateStr}.db`;

console.log('🔄 Iniciando backup de base de datos...\n');

if (!fs.existsSync(DB_FILE)) {
    console.error('❌ Error: No se encontró la base de datos en:', DB_FILE);
    process.exit(1);
}

if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const backupPath = path.join(BACKUP_DIR, BACKUP_NAME);

try {
    execSync(`sqlite3 "${DB_FILE}" ".backup '${backupPath}'"`, { stdio: 'pipe' });
    console.log('✅ Backup creado con sqlite3');
} catch (error) {
    fs.copyFileSync(DB_FILE, backupPath);
    console.log('✅ Backup creado por copia');
}

const compressedPath = `${backupPath}.gz`;
const fileContents = fs.readFileSync(backupPath);
const compressed = zlib.gzipSync(fileContents);
fs.writeFileSync(compressedPath, compressed);
fs.unlinkSync(backupPath);

const sizeKB = (compressed.length / 1024).toFixed(2);
console.log(`📦 Backup comprimido: ${BACKUP_NAME}.gz (${sizeKB} KB)`);

// Limpiar backups > 30 días
const files = fs.readdirSync(BACKUP_DIR);
let deleted = 0;
files.forEach(file => {
    if (file.startsWith('backup_') && file.endsWith('.db.gz')) {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = fs.statSync(filePath);
        const ageInDays = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24);
        if (ageInDays > 30) {
            fs.unlinkSync(filePath);
            deleted++;
        }
    }
});

if (deleted > 0) console.log(`🧹 Eliminados ${deleted} backups antiguos`);
console.log('\n✅ Backup completado');
