/**
 * scripts/configuracion.js
 *
 * Exporta o importa las tablas configurables de la base de datos a/desde JSON.
 *
 * Uso:
 *   node scripts/configuracion.js export          → DB → data/configuracion/
 *   node scripts/configuracion.js import          → data/configuracion/ → DB
 *   node scripts/configuracion.js export tacos    → solo la tabla Taco
 *   node scripts/configuracion.js import margenes → solo la tabla ReglaMargen
 */

const fs   = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma  = new PrismaClient();
const OUT_DIR = path.join(process.cwd(), 'data', 'configuracion');

// ─── Definición de tablas configurables ────────────────────────────────────
// upsertKey: campo(s) que identifican unívocamente el registro para el upsert
// orderBy:   cómo ordenar al exportar (para JSON legible)
const TABLAS = [
  {
    alias:    'tarifas-material',
    modelo:   'tarifaMaterial',
    archivo:  'tarifas-material.json',
    orderBy:  [{ material: 'asc' }, { espesor: 'asc' }, { color: 'asc' }],
    upsertKey: r => ({ material_espesor_color: { material: r.material, espesor: r.espesor, color: r.color ?? null } }),
    upsertWhere: r => ({ material_espesor_color: { material: r.material, espesor: r.espesor, color: r.color ?? null } }),
  },
  {
    alias:    'tarifas-rollo',
    modelo:   'tarifaRollo',
    archivo:  'tarifas-rollo.json',
    orderBy:  [{ material: 'asc' }, { espesor: 'asc' }, { color: 'asc' }],
    upsertWhere: r => ({ material_espesor_color: { material: r.material, espesor: r.espesor, color: r.color ?? null } }),
  },
  {
    alias:    'margenes',
    modelo:   'reglaMargen',
    archivo:  'margenes.json',
    orderBy:  [{ base: 'asc' }],
    upsertWhere: r => ({ base: r.base }),
  },
  {
    alias:    'tacos',
    modelo:   'taco',
    archivo:  'tacos.json',
    orderBy:  [{ tipo: 'asc' }, { altura: 'asc' }],
    upsertWhere: r => ({ tipo_altura: { tipo: r.tipo, altura: r.altura } }),
  },
  {
    alias:    'grapas',
    modelo:   'grapa',
    archivo:  'grapas.json',
    orderBy:  [{ nombre: 'asc' }],
    upsertWhere: r => ({ id: r.id }),
  },
  {
    alias:    'paletizado',
    modelo:   'configPaletizado',
    archivo:  'paletizado.json',
    orderBy:  [{ tipo: 'asc' }],
    upsertWhere: r => ({ tipo: r.tipo }),
  },
  {
    alias:    'transporte',
    modelo:   'tarifaTransporte',
    archivo:  'transporte.json',
    orderBy:  [{ provincia: 'asc' }, { codigoPostal: 'asc' }],
    upsertWhere: r => ({ provincia_codigoPostal: { provincia: r.provincia, codigoPostal: r.codigoPostal } }),
  },
  {
    alias:    'referencias-bobina',
    modelo:   'referenciaBobina',
    archivo:  'referencias-bobina.json',
    orderBy:  [{ referencia: 'asc' }],
    upsertWhere: r => ({ referencia_ancho_lonas: { referencia: r.referencia, ancho: r.ancho ?? null, lonas: r.lonas ?? null } }),
  },
  {
    alias:    'config',
    modelo:   'config',
    archivo:  'config.json',
    orderBy:  [{ key: 'asc' }],
    upsertWhere: r => ({ key: r.key }),
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function resolverTablas(filtro) {
  if (!filtro) return TABLAS;
  const encontrada = TABLAS.find(t => t.alias === filtro || t.modelo === filtro || t.archivo === filtro);
  if (!encontrada) {
    console.error(`❌ Tabla desconocida: "${filtro}"`);
    console.log(`   Disponibles: ${TABLAS.map(t => t.alias).join(', ')}`);
    process.exit(1);
  }
  return [encontrada];
}

function limpiarParaImport(registro) {
  const r = { ...registro };
  delete r.id;         // Prisma lo genera solo (o lo usamos en where si es UUID propio)
  delete r.createdAt;
  delete r.updatedAt;
  return r;
}

// ─── Export ─────────────────────────────────────────────────────────────────

async function exportar(filtro) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const tablas = resolverTablas(filtro);

  console.log(`\n📤 Exportando ${tablas.length} tabla(s) → ${OUT_DIR}\n`);

  for (const t of tablas) {
    try {
      const datos = await prisma[t.modelo].findMany({ orderBy: t.orderBy });
      const destino = path.join(OUT_DIR, t.archivo);
      fs.writeFileSync(destino, JSON.stringify(datos, null, 2), 'utf8');
      console.log(`  ✅  ${t.alias.padEnd(20)} ${datos.length} registros  →  ${t.archivo}`);
    } catch (err) {
      console.error(`  ❌  ${t.alias}: ${err.message}`);
    }
  }

  console.log('\n✔  Exportación completada.');
  console.log(`   Edita los JSON en: ${OUT_DIR}`);
  console.log('   Luego ejecuta:  node scripts/configuracion.js import\n');
}

// ─── Import ─────────────────────────────────────────────────────────────────

async function importar(filtro) {
  const tablas = resolverTablas(filtro);

  console.log(`\n📥 Importando ${tablas.length} tabla(s) desde ${OUT_DIR}\n`);

  for (const t of tablas) {
    const origen = path.join(OUT_DIR, t.archivo);

    if (!fs.existsSync(origen)) {
      console.warn(`  ⚠️   ${t.alias}: archivo no encontrado (${t.archivo}), omitiendo`);
      continue;
    }

    let registros;
    try {
      registros = JSON.parse(fs.readFileSync(origen, 'utf8'));
    } catch (err) {
      console.error(`  ❌  ${t.alias}: JSON inválido — ${err.message}`);
      continue;
    }

    let creados = 0, actualizados = 0, errores = 0;

    for (const registro of registros) {
      try {
        const datos = limpiarParaImport(registro);
        const where = t.upsertWhere(registro);

        // Grapas no tienen unique excepto id — usamos create/update por id
        if (t.alias === 'grapas' && registro.id) {
          await prisma[t.modelo].upsert({
            where: { id: registro.id },
            update: datos,
            create: { ...datos, id: registro.id },
          });
        } else {
          const existente = await prisma[t.modelo].findFirst({ where });
          if (existente) {
            await prisma[t.modelo].update({ where: { id: existente.id }, data: datos });
            actualizados++;
          } else {
            await prisma[t.modelo].create({ data: datos });
            creados++;
          }
          continue;
        }

        actualizados++;
      } catch (err) {
        console.error(`  ⚠️   ${t.alias} registro ${JSON.stringify(registro).slice(0, 60)}…: ${err.message}`);
        errores++;
      }
    }

    const resumen = [`✅  ${t.alias.padEnd(20)}`];
    if (creados)     resumen.push(`+${creados} creados`);
    if (actualizados) resumen.push(`~${actualizados} actualizados`);
    if (errores)     resumen.push(`✗${errores} errores`);
    console.log(`  ${resumen.join('  ')}`);
  }

  console.log('\n✔  Importación completada.\n');
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const [accion, filtro] = process.argv.slice(2);

  if (!accion || !['export', 'import'].includes(accion)) {
    console.log(`
Uso:
  node scripts/configuracion.js export          → exporta todas las tablas a JSON
  node scripts/configuracion.js import          → importa todas las tablas desde JSON
  node scripts/configuracion.js export <tabla>  → exporta solo una tabla
  node scripts/configuracion.js import <tabla>  → importa solo una tabla

Tablas disponibles:
  ${TABLAS.map(t => `${t.alias.padEnd(22)} (${t.archivo})`).join('\n  ')}
`);
    process.exit(0);
  }

  if (accion === 'export') await exportar(filtro);
  if (accion === 'import') await importar(filtro);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
