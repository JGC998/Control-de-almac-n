import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Iniciando migración de colores para PVC...');

    // 1. Obtener todas las tarifas de PVC existentes
    const tarifasPVC = await prisma.tarifaMaterial.findMany({
        where: { material: 'PVC' }
    });

    console.log(`📊 Encontradas ${tarifasPVC.length} tarifas de PVC existentes`);

    if (tarifasPVC.length === 0) {
        console.log('⚠️  No hay tarifas de PVC para migrar');
        return;
    }

    // 2. Para cada tarifa PVC existente, crear 4 variantes de color
    const colores = ['VERDE', 'BLANCO', 'AZUL', 'NEGRO'];
    let creadas = 0;

    for (const tarifa of tarifasPVC) {
        // Si la tarifa ya tiene color, saltarla
        if (tarifa.color) {
            console.log(`⏭️  Tarifa ${tarifa.id} ya tiene color: ${tarifa.color}`);
            continue;
        }

        console.log(`\n🔧 Procesando tarifa PVC ${tarifa.espesor}mm...`);

        // Eliminar la tarifa sin color
        await prisma.tarifaMaterial.delete({
            where: { id: tarifa.id }
        });
        console.log(`  ❌ Eliminada tarifa sin color`);

        // Crear una tarifa para cada color
        for (const color of colores) {
            try {
                await prisma.tarifaMaterial.create({
                    data: {
                        material: tarifa.material,
                        espesor: tarifa.espesor,
                        precio: tarifa.precio,
                        peso: tarifa.peso,
                        color: color
                    }
                });
                creadas++;
                console.log(`  ✅ Creada tarifa ${color}`);
            } catch (error) {
                console.error(`  ❌ Error creando tarifa ${color}:`, error.message);
            }
        }
    }

    console.log(`\n✅ Migración completada: ${creadas} tarifas de color creadas`);
}

main()
    .catch((e) => {
        console.error('❌ Error en migración:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
