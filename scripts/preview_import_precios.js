// Preview de importación de precios de venta desde CSVs normalizados
// Uso: node scripts/preview_import_precios.js
// Genera: C:/Users/Usuario/Desktop/import_preview.csv

require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('../src/generated/prisma');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const CSV_DIR = 'C:/Users/Usuario/Desktop/familias_csv/normalizados';
const OUT_FILE = 'C:/Users/Usuario/Desktop/import_preview.csv';

// ── Leer CSV normalizado ──
function parseCsvNorm(filepath) {
  const content = fs.readFileSync(filepath, 'utf8').replace(/^\uFEFF/, '');
  const lines = content.trim().split('\n');
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const cols = line.split(';');
    return {
      cod:     (cols[0]||'').trim(),
      nombre:  (cols[1]||'').trim(),
      familia: (cols[2]||'').trim(),
      mat:     (cols[3]||'').trim(),
      esp:     parseFloat((cols[4]||'').replace(',','.')) || null,
      anc:     parseFloat((cols[5]||'').replace(',','.')) || null,
      lar:     parseFloat((cols[6]||'').replace(',','.')) || null,
      pvp:     parseFloat((cols[7]||'').replace(',','.')) || 0,
      uds:     parseFloat((cols[8]||'').replace(',','.')) || 0,
    };
  });
}

// ── Similitud de nombres (% palabras comunes) ──
function simNombre(a, b) {
  const tokens = s => s.toUpperCase()
    .replace(/[()[\].,\-_\/]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !/^\d+$/.test(w));
  const ta = new Set(tokens(a));
  const tb = new Set(tokens(b));
  if (!ta.size || !tb.size) return 0;
  let common = 0;
  ta.forEach(w => { if (tb.has(w)) common++; });
  return common / Math.max(ta.size, tb.size);
}

// ── Match de material (string CSV vs nombre material DB) ──
function matMatch(csvMat, dbMatNombre) {
  if (!csvMat || !dbMatNombre) return false;
  const c = csvMat.toUpperCase();
  const d = dbMatNombre.toUpperCase();
  if (c.includes('GOMA') && d.includes('GOMA')) return true;
  if (c.includes('FIELTRO') && d.includes('FIELTRO')) return true;
  if (c.includes('PVC') && d.includes('PVC')) return true;
  if (c.includes('PU') && d.includes('POLIURETANO')) return true;
  if (c.includes('CARAMELO') && d.includes('CARAMELO')) return true;
  return false;
}

// ── Dimensiones coinciden (tolerancia ±0.5mm) ──
function dimMatch(csvVal, dbVal) {
  if (csvVal === null || dbVal === null) return null; // desconocido
  return Math.abs(csvVal - dbVal) <= 0.5;
}

async function main() {
  // Cargar todos los productos de BD con su material
  const dbProductos = await prisma.producto.findMany({
    where: { activo: true },
    select: {
      id: true,
      nombre: true,
      espesor: true,
      ancho: true,
      largo: true,
      precioVenta: true,
      unidadesVendidas: true,
      lonas: true,
      material: { select: { nombre: true } },
      subfamilia: { select: { nombre: true, familia: { select: { nombre: true } } } },
    }
  });
  console.log(`BD: ${dbProductos.length} productos activos`);

  // Cargar todos los CSVs normalizados
  const csvFiles = fs.readdirSync(CSV_DIR).filter(f => f.endsWith('_norm.csv'));
  const allCsvRows = [];
  csvFiles.forEach(f => {
    parseCsvNorm(path.join(CSV_DIR, f)).forEach(r => {
      r._archivo = f.replace('_norm.csv', '');
      allCsvRows.push(r);
    });
  });
  console.log(`CSVs: ${allCsvRows.length} productos en ${csvFiles.length} familias`);

  // Para cada fila CSV, buscar el mejor match en BD
  const results = [];

  allCsvRows.forEach(csv => {
    let bestStatus = 'NUEVO';
    let bestDb = null;
    let bestScore = 0;

    dbProductos.forEach(db => {
      // Intentar match dimensional (si hay dimensiones en ambos)
      const espOk = dimMatch(csv.esp, db.espesor);
      const ancOk = dimMatch(csv.anc, db.ancho);
      const larOk = dimMatch(csv.lar, db.largo);

      const dimsDefinidas = [csv.esp, csv.anc, csv.lar].filter(x => x !== null).length;
      const dimMatchCount = [espOk, ancOk, larOk].filter(x => x === true).length;
      const dimNoMatch   = [espOk, ancOk, larOk].filter(x => x === false).length;

      const matOk = matMatch(csv.mat, db.material?.nombre || '');
      const sim   = simNombre(csv.nombre, db.nombre);

      let score = 0;
      let status = null;

      // EXACTO: todas las dimensiones definidas coinciden + material ok
      if (dimsDefinidas >= 2 && dimMatchCount === dimsDefinidas && dimNoMatch === 0 && matOk) {
        score = 100 + sim * 10;
        status = 'EXACTO';
      }
      // PROBABLE: 2+ dims coinciden y material ok, o alta similitud de nombre
      else if ((dimMatchCount >= 2 && dimNoMatch === 0 && matOk) || (sim >= 0.60 && matOk)) {
        score = 50 + sim * 30;
        status = 'PROBABLE';
      }
      // POSIBLE: solo similitud de nombre alta
      else if (sim >= 0.65) {
        score = sim * 20;
        status = 'POSIBLE';
      }

      if (status && score > bestScore) {
        bestScore = score;
        bestStatus = status;
        bestDb = db;
      }
    });

    results.push({ csv, status: bestStatus, db: bestDb, score: bestScore });
  });

  // Resumen
  const totales = { EXACTO: 0, PROBABLE: 0, POSIBLE: 0, NUEVO: 0 };
  results.forEach(r => totales[r.status]++);
  console.log('\nResumen:');
  Object.entries(totales).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

  // Escribir CSV de preview
  const BOM = '\uFEFF';
  const HDR = [
    'Estado','Archivo_CSV','Cod_CSV','Nombre_CSV','Mat_CSV','Esp_CSV','Anc_CSV','Lar_CSV','PVP_nuevo','UDS_csv',
    'DB_Id','DB_Nombre','DB_Material','DB_Espesor','DB_Ancho','DB_Largo','PVP_actual','UDS_actual','Score'
  ].join(';');

  const filas = results.map(r => {
    const c = r.csv;
    const d = r.db;
    return [
      r.status,
      c._archivo,
      c.cod,
      '"' + c.nombre.replace(/"/g,'""') + '"',
      c.mat,
      c.esp ?? '',
      c.anc ?? '',
      c.lar ?? '',
      (c.pvp||0).toFixed(2).replace('.',','),
      c.uds,
      d ? d.id : '',
      d ? '"' + d.nombre.replace(/"/g,'""') + '"' : '',
      d ? (d.material?.nombre||'') : '',
      d ? (d.espesor ?? '') : '',
      d ? (d.ancho ?? '') : '',
      d ? (d.largo ?? '') : '',
      d ? d.precioVenta.toFixed(2).replace('.',',') : '',
      d ? d.unidadesVendidas : '',
      r.score.toFixed(0),
    ].join(';');
  });

  // Ordenar: EXACTO primero, luego PROBABLE, POSIBLE, NUEVO
  const orden = { EXACTO: 0, PROBABLE: 1, POSIBLE: 2, NUEVO: 3 };
  filas.sort((a, b) => {
    const sa = orden[a.split(';')[0]] ?? 4;
    const sb = orden[b.split(';')[0]] ?? 4;
    return sa - sb;
  });

  fs.writeFileSync(OUT_FILE, BOM + HDR + '\n' + filas.join('\n'), 'utf8');
  console.log(`\nPreview guardado: ${OUT_FILE}`);
  console.log('Revisa el CSV. Luego ejecuta: node scripts/aplicar_import_precios.js');
}

main().catch(console.error).finally(() => prisma.$disconnect());
