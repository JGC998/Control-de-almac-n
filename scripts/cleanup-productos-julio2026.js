// scripts/cleanup-productos-julio2026.js
// Auditoría y limpieza de datos de productos — julio 2026
// Ejecutar: node scripts/cleanup-productos-julio2026.js
// (usa la DATABASE_URL del .env actual — apunta a producción si está configurado así)

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // ─── 1. Cargar IDs de materiales por nombre ──────────────────────────────
  const nombresNecesarios = ['GOMA', 'FIELTRO', 'PVC', 'VERDE', 'PLANCHA DE GOMA'];
  const materialesDB = await prisma.material.findMany({
    where: { nombre: { in: nombresNecesarios } },
    select: { id: true, nombre: true },
  });

  const matId = Object.fromEntries(materialesDB.map(m => [m.nombre, m.id]));
  const faltantes = nombresNecesarios.filter(n => !matId[n]);
  if (faltantes.length > 0) {
    console.error(`❌ Materiales no encontrados en la BD: ${faltantes.join(', ')}`);
    console.error('   Revisa que existen en la tabla Material antes de continuar.');
    process.exit(1);
  }
  console.log('✅ Materiales cargados:', JSON.stringify(matId, null, 2));

  let total = 0;

  // ─── 2. Asignar material GOMA ─────────────────────────────────────────────
  const idsGoma = [
    '02e9a973-e5a4-4dd1-90d6-26c06715b725', // 200x4040
    '38b13e2b-487d-4093-a8e8-b50e1df1c066', // 250x2.000 con cortes
    '56ccfe9e-ef39-407b-9b47-ffc6c57321f5', // 300x2000 c/cortes
    '38c2b822-c2f1-493f-a8cf-72c1819583d0', // 3160566170200043
    'd74fb0e2-c148-4501-8e92-8daedc1d77d6', // 3162266170200056
    '4babcdb5-823e-4965-b113-a3773570ce8a', // 318096604020000
    '50009a5b-2b07-40c4-a6d9-c41045a8dc6d', // 3181066060200000
    'a74f5dbe-a280-43a4-aff8-58657ef92b83', // GOMA 2 LONAS ANCHO 70
    '1516884c-3684-401a-bf71-92fc0b72afd2', // M BOHORQUEZ 4LONAS 500X500
    '37e8db11-337d-412a-848e-2f0e1edbf7b6', // M BOHORQUEZ 4LONAS 500X650
    '54cac667-e8ae-47a0-8881-09ca3f4c6c45', // ESTRELLA 4 PUNTAS 170
    '3b71ac37-dc15-451d-9909-2af7e8b3ef51', // ARANDELA ALDAMA PLANCHA DE GOMA NEGRA 5MM
  ];
  const rGoma = await prisma.producto.updateMany({
    where: { id: { in: idsGoma } },
    data: { materialId: matId['GOMA'] },
  });
  console.log(`✅ GOMA asignado: ${rGoma.count} productos`);
  total += rGoma.count;

  // ─── 3. Asignar material FIELTRO ─────────────────────────────────────────
  const idsFieltro = [
    'e6b0efd7-bbb0-4b1f-b74b-74d760e696de', // 380X380 F10
    'b71ce938-fbd4-4ba3-87c5-b7c73498cd44', // N500 F15-FIELTRO-NOLI
    '02607aa3-5353-4a22-9da1-dd383889f374', // M BOHORQUEZ F15 500X500
    '446f27b0-6712-4f7e-905c-ab89b59e1114', // M BOHORQUEZ F15 500X650
    '3a16a461-71a4-4b29-8109-c80a84bf9685', // F10 ROLLO 1600
    '6c7e8607-329f-4680-8fd1-500f470cb82c', // F15 ROLLO 1600
  ];
  const rFieltro = await prisma.producto.updateMany({
    where: { id: { in: idsFieltro } },
    data: { materialId: matId['FIELTRO'] },
  });
  console.log(`✅ FIELTRO asignado: ${rFieltro.count} productos`);
  total += rFieltro.count;

  // ─── 4. Asignar material PVC ──────────────────────────────────────────────
  const idsPVC = [
    '51aa0199-47a2-410f-a2f7-4aea78e26d1f', // CLASIFICADORA CASTILLERO
    'a06d47ed-895d-47e9-baf9-6699813fbf74', // CLASIFICADORA LA PREFERIDA
    '9477fa33-fb31-471d-878b-e0ad07503a43', // PVC 2mm AZUL - Con Grapa
    '6fb57d42-4dbc-427b-9f26-3083d99c54ba', // PVC 2mm BLANCO - Con Grapa
    'fa4e191e-0470-497c-9f16-0a152cbae4a7', // PVC 6mm BLANCO - Sin Fin
    '38da85fe-47f7-48f2-8140-6afc7e57ff52', // 225X1700 PVC AZUL
    '790f1d29-a761-44cb-9980-1b07a0ba3632', // AGM007 (PVC 2.7mm)
  ];
  const rPVC = await prisma.producto.updateMany({
    where: { id: { in: idsPVC } },
    data: { materialId: matId['PVC'] },
  });
  console.log(`✅ PVC asignado: ${rPVC.count} productos`);
  total += rPVC.count;

  // ─── 5. Asignar material VERDE (plancha de goma verde) ───────────────────
  const idsVerde = [
    '1bf5f695-3fa5-40af-bf8b-424cc112fa37', // NOLI 500X920 VERDE
    'f3fb4e50-1a6f-4fd7-99ab-f88b3a161631', // NOLI 600X920 VERDE
    'c5fb083e-2224-4d56-b0bb-560033be5c10', // ESTRELLA 4 PUNTAS 170 VERDE BLANDA
  ];
  const rVerde = await prisma.producto.updateMany({
    where: { id: { in: idsVerde } },
    data: { materialId: matId['VERDE'] },
  });
  console.log(`✅ VERDE asignado: ${rVerde.count} productos`);
  total += rVerde.count;

  // ─── 6. NOLI500 500X920: cambiar a PLANCHA DE GOMA NEGRA ─────────────────
  // Era VERDE (material vacío, acabado VERDE). Pasa a plancha negra.
  const rNoli500 = await prisma.producto.update({
    where: { id: 'dbdab6fb-e737-4429-830d-97b22fd91aa9' },
    data: {
      materialId: matId['PLANCHA DE GOMA'],
      acabado: 'NEGRA',
      color: null,
    },
  });
  console.log(`✅ NOLI500 500X920 → PLANCHA DE GOMA NEGRA (${rNoli500.nombre})`);
  total += 1;

  // ─── 7. Corregir tipo: BORDE ONDULADO 80MM → BORDE_ONDULADO ─────────────
  const rBorde = await prisma.producto.update({
    where: { id: '333ddf2b-a8f5-40ef-946c-b60a85f078e4' },
    data: { tipo: 'BORDE_ONDULADO' },
  });
  console.log(`✅ Tipo corregido: ${rBorde.nombre} → BORDE_ONDULADO`);
  total += 1;

  // ─── 8. Corregir dimensiones swapeadas ───────────────────────────────────
  // 170 - PVC - Crispe: ancho=1920/largo=170 → ancho=170/largo=1920
  const rCrispe = await prisma.producto.update({
    where: { id: '7961d650-3034-445f-8a5e-57b4fd09c5a9' },
    data: { ancho: 170, largo: 1920 },
  });
  console.log(`✅ Dims corregidas: ${rCrispe.nombre} → ${rCrispe.ancho}×${rCrispe.largo}`);
  total += 1;

  // B2 300X6.000: ancho=6000/largo=300 → ancho=300/largo=6000
  const rB2300 = await prisma.producto.update({
    where: { id: 'c9e241ac-386b-4c2f-af07-708b089ba925' },
    data: { ancho: 300, largo: 6000 },
  });
  console.log(`✅ Dims corregidas: ${rB2300.nombre} → ${rB2300.ancho}×${rB2300.largo}`);
  total += 1;

  // Picador: ancho=28000/largo=270 → ancho=270/largo=28000
  const rPicador = await prisma.producto.update({
    where: { id: 'f5333f16-f1ff-4e5e-b500-4f3fdc2f05d6' },
    data: { ancho: 270, largo: 28000 },
  });
  console.log(`✅ Dims corregidas: ${rPicador.nombre} → ${rPicador.ancho}×${rPicador.largo}`);
  total += 1;

  // ─── 9. Marcar duplicado como obsoleto ────────────────────────────────────
  // "PVC 6mm BLANCO - Con Grapa - 1000×3700mm" duplica a CLASIFICADORA CASTILLERO
  const rDup = await prisma.producto.update({
    where: { id: '4e0f9823-ad11-4721-96e2-89ddfca7b150' },
    data: { activo: false },
  });
  console.log(`✅ Marcado obsoleto (duplicado): ${rDup.nombre}`);
  total += 1;

  console.log(`\n🎉 Limpieza completada: ${total} productos actualizados en total.`);
}

main()
  .catch(e => {
    console.error('❌ Error en el script:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
