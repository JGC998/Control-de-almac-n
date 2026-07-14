// node prisma/seed-familias.js
// Siembra las 6 familias y sus ~17 subfamilias en la base de datos.
// Seguro de ejecutar varias veces (upsert).

const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

const FAMILIAS = [
  {
    id: 'fam-goma',
    nombre: 'GOMA',
    color: '#C0392B',
    descripcion: 'Cauchos y bandas de goma para cintas transportadoras',
    subfamilias: [
      { id: 'sub-goma-cierre',   nombre: 'Cierre tronco' },
      { id: 'sub-goma-faldeta',  nombre: 'Faldeta' },
      { id: 'sub-goma-estrella', nombre: 'Estrella' },
      { id: 'sub-goma-metraje',  nombre: 'Metraje' },
    ],
  },
  {
    id: 'fam-caramelo',
    nombre: 'CARAMELO',
    color: '#B45309',
    descripcion: 'Tenias y bandas de caucho caramelo',
    subfamilias: [
      { id: 'sub-car-faldeta',  nombre: 'Faldeta' },
      { id: 'sub-car-estrella', nombre: 'Estrella' },
      { id: 'sub-car-metraje',  nombre: 'Metraje' },
    ],
  },
  {
    id: 'fam-fieltro',
    nombre: 'FIELTRO',
    color: '#6D28D9',
    descripcion: 'Piezas y metrajes de fieltro',
    subfamilias: [
      { id: 'sub-fie-faldeta', nombre: 'Faldeta' },
      { id: 'sub-fie-metraje', nombre: 'Metraje' },
    ],
  },
  {
    id: 'fam-pvc',
    nombre: 'PVC',
    color: '#1D4ED8',
    descripcion: 'Bandas y piezas de PVC para cintas transportadoras',
    subfamilias: [
      { id: 'sub-pvc-sinfin',   nombre: 'Banda sin fin' },
      { id: 'sub-pvc-grapa',    nombre: 'Banda con grapa' },
      { id: 'sub-pvc-abierta',  nombre: 'Banda abierta' },
      { id: 'sub-pvc-pieza',    nombre: 'Pieza PVC' },
    ],
  },
  {
    id: 'fam-plancha',
    nombre: 'PLANCHA DE GOMA',
    color: '#065F46',
    descripcion: 'Planchas de goma negra o verde en metraje o faldeta',
    subfamilias: [
      { id: 'sub-pla-negra', nombre: 'Plancha Negra' },
      { id: 'sub-pla-verde', nombre: 'Plancha Verde' },
    ],
  },
  {
    id: 'fam-accesorio',
    nombre: 'ACCESORIO',
    color: '#374151',
    descripcion: 'Accesorios, consumibles y herrajes varios',
    subfamilias: [
      { id: 'sub-acc-grapa',     nombre: 'Grapa' },
      { id: 'sub-acc-taco',      nombre: 'Taco / barra' },
      { id: 'sub-acc-herraje',   nombre: 'Herraje' },
      { id: 'sub-acc-consumible',nombre: 'Consumible' },
      { id: 'sub-acc-otro',      nombre: 'Otro' },
    ],
  },
];

async function main() {
  console.log('Sembrando familias y subfamilias...\n');

  for (const fam of FAMILIAS) {
    const { subfamilias, ...famData } = fam;

    await db.familia.upsert({
      where: { id: famData.id },
      update: { nombre: famData.nombre, color: famData.color, descripcion: famData.descripcion },
      create: famData,
    });
    console.log(`✓ Familia: ${famData.nombre}`);

    for (const sub of subfamilias) {
      await db.subfamilia.upsert({
        where: { id: sub.id },
        update: { nombre: sub.nombre, familiaId: famData.id },
        create: { id: sub.id, nombre: sub.nombre, familiaId: famData.id },
      });
      console.log(`    › ${sub.nombre}`);
    }
  }

  console.log('\n✅ Seed completado correctamente.');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
