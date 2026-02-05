import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Iniciando seed de tacos...');

    // Definir los tacos con precios de ejemplo
    const tacosData = [
        // Tacos Rectos
        { tipo: 'RECTO', altura: 10, precioMetro: 2.50 },
        { tipo: 'RECTO', altura: 20, precioMetro: 3.00 },
        { tipo: 'RECTO', altura: 30, precioMetro: 3.50 },
        { tipo: 'RECTO', altura: 40, precioMetro: 4.00 },
        { tipo: 'RECTO', altura: 50, precioMetro: 4.50 },
        { tipo: 'RECTO', altura: 60, precioMetro: 5.00 },
        { tipo: 'RECTO', altura: 70, precioMetro: 5.50 },
        { tipo: 'RECTO', altura: 80, precioMetro: 6.00 },
        { tipo: 'RECTO', altura: 100, precioMetro: 7.00 },

        // Tacos Inclinados
        { tipo: 'INCLINADO', altura: 10, precioMetro: 2.80 },
        { tipo: 'INCLINADO', altura: 20, precioMetro: 3.30 },
        { tipo: 'INCLINADO', altura: 30, precioMetro: 3.80 },
        { tipo: 'INCLINADO', altura: 40, precioMetro: 4.30 },
        { tipo: 'INCLINADO', altura: 50, precioMetro: 4.80 },
        { tipo: 'INCLINADO', altura: 60, precioMetro: 5.30 },
        { tipo: 'INCLINADO', altura: 70, precioMetro: 5.80 },
        { tipo: 'INCLINADO', altura: 80, precioMetro: 6.30 },
        { tipo: 'INCLINADO', altura: 100, precioMetro: 7.50 },
    ];

    // Crear o actualizar tacos
    for (const taco of tacosData) {
        await prisma.taco.upsert({
            where: {
                tipo_altura: {
                    tipo: taco.tipo,
                    altura: taco.altura,
                },
            },
            update: {
                precioMetro: taco.precioMetro,
                activo: true,
            },
            create: taco,
        });
    }

    console.log(`✅ Seed completado: ${tacosData.length} tacos creados/actualizados`);
}

main()
    .catch((e) => {
        console.error('❌ Error en seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
