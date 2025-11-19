const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Sembrando datos completos...');

  // 1. Margen
  await prisma.reglaMargen.upsert({
    where: { base: 'CLIENTE FINAL' },
    update: { descripcion: 'CLIENTE FINAL' },
    create: { base: 'CLIENTE FINAL', multiplicador: 1.5, descripcion: 'CLIENTE FINAL', tipo: 'General' }
  });

  // 2. Material y Tarifa
  await prisma.material.upsert({ where: { nombre: 'PVC' }, update: {}, create: { nombre: 'PVC' } });
  await prisma.tarifaMaterial.deleteMany({ where: { material: 'PVC', espesor: 2 } });
  await prisma.tarifaMaterial.create({
    data: { material: 'PVC', espesor: 2, precio: 10.50, peso: 1.25 }
  });

  // 3. PROVEEDOR (CRÍTICO PARA FULL FLOW)
  await prisma.proveedor.upsert({
    where: { nombre: 'Proveedor Global' },
    update: {},
    create: { 
      nombre: 'Proveedor Global',
      email: 'contacto@global.com',
      telefono: '555-000-000'
    }
  });

  console.log('✅ Datos sembrados correctamente.');
}
main().catch(e => process.exit(1)).finally(async () => await prisma.$disconnect());
