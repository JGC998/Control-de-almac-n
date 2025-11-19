const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const db = new PrismaClient();

// Datos extraídos y consolidados para la inserción masiva
const REFERENCIAS_DATA = [
    { "referencia": "EP 250/2 2+1.5", "ancho": 400, "lonas": 2, "pesoPorMetroLineal": 2.56 },
    { "referencia": "EP 250/2 2+1.5", "ancho": 440, "lonas": 2, "pesoPorMetroLineal": 3 },
    { "referencia": "EP 250/2 2+1.5", "ancho": 500, "lonas": 2, "pesoPorMetroLineal": 3.20 },
    { "referencia": "EP 250/2 2+1.5", "ancho": 600, "lonas": 2, "pesoPorMetroLineal": 3.84 },
    { "referencia": "EP 250/2 2+1.5", "ancho": 650, "lonas": 2, "pesoPorMetroLineal": 4.16 },
    
    { "referencia": "EP400/3 3+1.5", "ancho": 400, "lonas": 3, "pesoPorMetroLineal": 3.56 },
    { "referencia": "EP400/3 3+1.5", "ancho": 500, "lonas": 3, "pesoPorMetroLineal": 4.45 },
    { "referencia": "EP400/3 3+1.5", "ancho": 540, "lonas": 3, "pesoPorMetroLineal": 5.13 },
    { "referencia": "EP400/3 3+1.5", "ancho": 600, "lonas": 3, "pesoPorMetroLineal": 5.34 },
    { "referencia": "EP400/3 3+1.5", "ancho": 650, "lonas": 3, "pesoPorMetroLineal": 5.79 },
    { "referencia": "EP400/3 3+1.5", "ancho": 800, "lonas": 3, "pesoPorMetroLineal": 7.12 },
    { "referencia": "EP400/3 3+1.5", "ancho": 1000, "lonas": 3, "pesoPorMetroLineal": 8.90 },
    { "referencia": "EP400/3 3+1.5", "ancho": 1250, "lonas": 3, "pesoPorMetroLineal": 11.90 },

    
    { "referencia": "EP500/4 4+2", "ancho": 500, "lonas": 4, "pesoPorMetroLineal": 5.95 },
    { "referencia": "EP500/4 4+2", "ancho": 550, "lonas": 4, "pesoPorMetroLineal": 6.34 },
    { "referencia": "EP500/4 4+2", "ancho": 600, "lonas": 4, "pesoPorMetroLineal": 7.08 },
    { "referencia": "EP500/4 4+2", "ancho": 650, "lonas": 4, "pesoPorMetroLineal": 7.67 },
    { "referencia": "EP500/4 4+2", "ancho": 800, "lonas": 4, "pesoPorMetroLineal": 9.44 },
    { "referencia": "EP500/4 4+2", "ancho": 1000, "lonas": 4, "pesoPorMetroLineal": 11.80 },
    { "referencia": "EP500/4 4+2", "ancho": 1200, "lonas": 4, "pesoPorMetroLineal": 14.16 },
    { "referencia": "EP500/4 4+2", "ancho": 1400, "lonas": 4, "pesoPorMetroLineal": 16.55 },
    { "referencia": "EP500/4 4+2", "ancho": 1600, "lonas": 4, "pesoPorMetroLineal": 18.88 },

    { "referencia": "EP500/4 8+3", "ancho": 500, "lonas": 4, "pesoPorMetroLineal": 9.5},
    { "referencia": "EP500/4 8+3", "ancho": 600, "lonas": 4, "pesoPorMetroLineal": 11.42},

    { "referencia": "EP500/4 6+2", "ancho": 500, "lonas": 4, "pesoPorMetroLineal": 7.37},
    { "referencia": "EP500/4 6+2", "ancho": 600, "lonas": 4, "pesoPorMetroLineal": 8.86},
    
    { "referencia": "EP630/4 6+2", "ancho": 800, "lonas": 4, "pesoPorMetroLineal": 12.02 },
    { "referencia": "EP630/4 6+2", "ancho": 1000, "lonas": 4, "pesoPorMetroLineal": 15.03 },
    { "referencia": "EP630/4 6+2", "ancho": 1200, "lonas": 4, "pesoPorMetroLineal": 18.04 }
];

async function main() {
    console.log('Iniciando el proceso de siembra de datos...');
    
    try {
        // --- Limpieza de datos antiguos ---
        await db.tarifaMaterial.deleteMany({});
        await db.material.deleteMany({});
        await db.fabricante.deleteMany({});
        await db.referenciaBobina.deleteMany({});
        await db.reglaMargen.deleteMany({});
        console.log('Datos antiguos eliminados.');

        // --- Seed Fabricantes ---
        console.log('Iniciando inserción de fabricantes...');
        await db.fabricante.createMany({
            data: [
                { id: uuidv4(), nombre: 'Esbelt' },
                { id: uuidv4(), nombre: 'Ammeraal' },
                { id: uuidv4(), nombre: 'Siban' },
            ],
        });
        console.log('✅ Fabricantes insertados.');

        // --- Seed Materiales ---
        console.log('Iniciando inserción de materiales...');
        const pvc = await db.material.create({ data: { id: uuidv4(), nombre: 'PVC' } });
        const goma = await db.material.create({ data: { id: uuidv4(), nombre: 'GOMA' } });
        console.log('✅ Materiales insertados.');

        // --- Seed Tarifas de Material ---
        console.log('Iniciando inserción de tarifas...');
        await db.tarifaMaterial.createMany({
            data: [
                // Tarifas para PVC
                { id: uuidv4(), material: pvc.nombre, espesor: 1, precio: 5.25, peso: 0 },
                { id: uuidv4(), material: pvc.nombre, espesor: 2, precio: 10.50, peso: 0 }, // <-- Tarifa necesaria para el test
                { id: uuidv4(), material: pvc.nombre, espesor: 3, precio: 15.75, peso: 0 },
                // Tarifas para GOMA
                { id: uuidv4(), material: goma.nombre, espesor: 6, precio: 30.00, peso: 0 },
            ],
        });
        console.log('✅ Tarifas de material insertadas.');

        // --- Seed Reglas de Margen ---
        console.log('Iniciando inserción de reglas de margen...');
        await db.reglaMargen.createMany({
            data: [
                {
                    id: uuidv4(),
                    base: 'CLIENTE FINAL',
                    descripcion: 'CLIENTE FINAL',
                    multiplicador: 1.5,
                    tipo: 'General',
                    gastoFijo: 0,
                },
                {
                    id: uuidv4(),
                    base: 'DISTRIBUIDOR',
                    descripcion: 'DISTRIBUIDOR',
                    multiplicador: 1.2,
                    tipo: 'General',
                    gastoFijo: 0,
                },
                {
                    id: uuidv4(),
                    base: 'OEM',
                    descripcion: 'OEM',
                    multiplicador: 1.1,
                    tipo: 'General',
                    gastoFijo: 0,
                },
            ],
        });
        console.log('✅ Reglas de margen insertadas.');


        // --- Seed Referencias de Bobina ---
        console.log('Iniciando inserción de referencias de bobina...');
        const datosConId = REFERENCIAS_DATA.map(r => ({
            id: uuidv4(),
            referencia: r.referencia,
            ancho: r.ancho,
            lonas: r.lonas,
            pesoPorMetroLineal: r.pesoPorMetroLineal,
        }));
        
        const result = await db.referenciaBobina.createMany({
            data: datosConId,
        });
        console.log(`✅ ${result.count} referencias de bobina insertadas con éxito.`);

    } catch (error) {
        console.error('❌ Error durante el proceso de siembra:', error);
        if (error.code === 'P2002') {
            console.error('  Conflicto de clave única. Asegúrate de que no haya duplicados en los datos de entrada.');
        } else {
             throw error;
        }
    } finally {
        await db.$disconnect();
        console.log('Proceso de siembra finalizado.');
    }
}

main();