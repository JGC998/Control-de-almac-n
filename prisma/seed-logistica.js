const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Iniciando seed de logística...');

    // 1. Configuración de Paletizado
    const configs = [
        {
            tipo: 'EUROPEO',
            costePale: 5.38,
            costeFilm: 0.538,
            costeFleje: 0.183,
            costePrecinto: 0.0147,
        },
        {
            tipo: 'MEDIO',
            costePale: 3.50, // Estimado
            costeFilm: 0.35,
            costeFleje: 0.12,
            costePrecinto: 0.01,
        },
    ];

    for (const config of configs) {
        await prisma.configPaletizado.upsert({
            where: { tipo: config.tipo },
            update: config,
            create: config,
        });
        console.log(`✅ Configuración palé ${config.tipo} actualizada/creada.`);
    }

    // 2. Tarifas de Transporte (Mock Data basado en estructura real)
    // Provincias principales con códigos postales genéricos
    const tarifas = [
        { provincia: 'MADRID', codigoPostal: '28', base: 15 },
        { provincia: 'BARCELONA', codigoPostal: '08', base: 18 },
        { provincia: 'VALENCIA', codigoPostal: '46', base: 16 },
        { provincia: 'SEVILLA', codigoPostal: '41', base: 12 },
        { provincia: 'MALAGA', codigoPostal: '29', base: 10 }, // Local/Cercano
        { provincia: 'ALICANTE', codigoPostal: '03', base: 16 },
        { provincia: 'MURCIA', codigoPostal: '30', base: 15 },
        { provincia: 'CADIZ', codigoPostal: '11', base: 13 },
        { provincia: 'CORUÑA', codigoPostal: '15', base: 22 },
        { provincia: 'VIZCAYA', codigoPostal: '48', base: 20 },
    ];

    for (const t of tarifas) {
        const data = {
            provincia: t.provincia,
            codigoPostal: t.codigoPostal,
            parcel: t.base * 0.5,
            miniQuarter: t.base * 0.7,
            miniLight: t.base * 0.9,
            quarter: t.base * 1.0,
            light: t.base * 1.2,
            half: t.base * 1.5,
            megaLight: t.base * 1.8,
            full: t.base * 2.2,
            megaFull: t.base * 2.8,
        };

        await prisma.tarifaTransporte.upsert({
            where: {
                provincia_codigoPostal: {
                    provincia: t.provincia,
                    codigoPostal: t.codigoPostal
                }
            },
            update: data,
            create: data,
        });
        console.log(`✅ Tarifa transporte ${t.provincia} actualizada/creada.`);
    }

    console.log('🏁 Seed de logística completado.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
