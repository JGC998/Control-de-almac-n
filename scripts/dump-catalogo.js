// node scripts/dump-catalogo.js
const { PrismaClient } = require('./src/generated/prisma');
const db = new PrismaClient();

async function main() {
  const sep = (t) => console.log('\n' + '='.repeat(60) + '\n' + t + '\n' + '='.repeat(60));

  // ── Materiales ────────────────────────────────────────────────
  sep('MATERIALES');
  const materiales = await db.material.findMany({ orderBy: { nombre: 'asc' } });
  console.log(`Total: ${materiales.length}`);
  materiales.forEach(m => console.log(`  [${m.id}] ${m.nombre}`));

  // ── Productos ─────────────────────────────────────────────────
  sep('PRODUCTOS (Producto)');
  const productos = await db.producto.findMany({
    include: { material: true, fabricante: true },
    orderBy: { nombre: 'asc' },
  });
  console.log(`Total: ${productos.length}`);
  productos.forEach(p => {
    const dims = [p.espesor && `${p.espesor}mm`, p.ancho && `${p.ancho}mm`, p.largo && `${p.largo}mm`].filter(Boolean).join('x');
    const mat  = p.material?.nombre || '—';
    const fab  = p.fabricante?.nombre || '—';
    console.log(`  [${p.id.slice(-6)}] ${p.nombre}`);
    console.log(`         mat:${mat}  dims:${dims || '—'}  color:${p.color || '—'}  ref:${p.referenciaFabricante || '—'}  fab:${fab}`);
    console.log(`         precio:${p.precioUnitario ?? '—'}  costo:${p.costoUnitario ?? '—'}  peso:${p.pesoUnitario ?? '—'}kg  stock:${p.stock ?? 0}`);
  });

  // ── Artículos simples ─────────────────────────────────────────
  sep('ARTICULOS SIMPLES (ArticuloSimple)');
  let artSimples = [];
  try {
    artSimples = await db.articuloSimple.findMany({ orderBy: { nombre: 'asc' } });
    console.log(`Total: ${artSimples.length}`);
    artSimples.forEach(a => {
      console.log(`  [${String(a.id).padStart(4)}] ${a.nombre}`);
      console.log(`         precio:${a.precio ?? '—'}  unidad:${a.unidad || '—'}  ref:${a.referencia || '—'}`);
      if (a.descripcion) console.log(`         desc:${a.descripcion}`);
    });
  } catch (e) {
    console.log('  (modelo no encontrado: ' + e.message.split('\n')[0] + ')');
  }

  // ── Fabricantes ───────────────────────────────────────────────
  sep('FABRICANTES');
  const fabricantes = await db.fabricante.findMany({ orderBy: { nombre: 'asc' } });
  console.log(`Total: ${fabricantes.length}`);
  fabricantes.forEach(f => console.log(`  [${f.id}] ${f.nombre}  (${f.pais || '—'})`));

  // ── Productos por material ────────────────────────────────────
  sep('PRODUCTOS POR MATERIAL');
  const byMat = {};
  productos.forEach(p => {
    const k = p.material?.nombre || 'SIN MATERIAL';
    byMat[k] = (byMat[k] || 0) + 1;
  });
  Object.entries(byMat).sort((a,b) => b[1]-a[1]).forEach(([k,v]) => console.log(`  ${String(v).padStart(4)}  ${k}`));

  // ── Productos por fabricante ──────────────────────────────────
  sep('PRODUCTOS POR FABRICANTE');
  const byFab = {};
  productos.forEach(p => {
    const k = p.fabricante?.nombre || 'SIN FABRICANTE';
    byFab[k] = (byFab[k] || 0) + 1;
  });
  Object.entries(byFab).sort((a,b) => b[1]-a[1]).forEach(([k,v]) => console.log(`  ${String(v).padStart(4)}  ${k}`));

  // ── Espesores únicos ──────────────────────────────────────────
  sep('ESPESORES UNICOS EN PRODUCTOS');
  const espesores = [...new Set(productos.map(p => p.espesor).filter(Boolean))].sort((a,b)=>a-b);
  console.log(espesores.map(e => `${e}mm`).join('  '));

  // ── Anchuras únicas ───────────────────────────────────────────
  sep('ANCHURAS UNICAS EN PRODUCTOS');
  const anchos = [...new Set(productos.map(p => p.ancho).filter(Boolean))].sort((a,b)=>a-b);
  console.log(anchos.map(e => `${e}mm`).join('  '));
}

main().catch(console.error).finally(() => db.$disconnect());
