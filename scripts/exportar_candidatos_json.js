// Convierte los CSVs normalizados en data/candidatos_precios.json
// Uso: node scripts/exportar_candidatos_json.js

const fs = require('fs');
const path = require('path');

const CSV_DIR = 'C:/Users/Usuario/Desktop/familias_csv/normalizados';
const OUT = path.join(__dirname, '../data/candidatos_precios.json');

function parseCsv(filepath) {
  const content = fs.readFileSync(filepath, 'utf8').replace(/^\uFEFF/, '');
  const lines = content.trim().split('\n');
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const cols = line.split(';');
    return {
      cod:      (cols[0]||'').trim(),
      nombre:   (cols[1]||'').trim(),
      familia:  (cols[2]||'').trim(),
      material: (cols[3]||'').trim(),
      espesor:  parseFloat((cols[4]||'').replace(',','.')) || null,
      ancho:    parseFloat((cols[5]||'').replace(',','.')) || null,
      largo:    parseFloat((cols[6]||'').replace(',','.')) || null,
      pvp:      parseFloat((cols[7]||'').replace(',','.')) || 0,
      uds:      parseFloat((cols[8]||'').replace(',','.')) || 0,
    };
  });
}

const csvFiles = fs.readdirSync(CSV_DIR).filter(f => f.endsWith('_norm.csv'));
let allRows = [];
csvFiles.forEach(f => {
  const familia = f.replace('_norm.csv', '');
  const rows = parseCsv(path.join(CSV_DIR, f)).map((r, i) => ({
    id: `${familia}_${i}`,
    ...r,
    familia: r.familia || familia,
  }));
  allRows = allRows.concat(rows);
});

fs.writeFileSync(OUT, JSON.stringify(allRows, null, 2), 'utf8');
console.log(`${allRows.length} candidatos guardados en data/candidatos_precios.json`);

const familias = [...new Set(allRows.map(r => r.familia))].sort();
console.log(`Familias: ${familias.join(', ')}`);
