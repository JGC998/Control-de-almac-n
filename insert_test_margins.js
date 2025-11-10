const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

// Usamos los nombres de campo del modelo (valor, categoria) que la API recibe del frontend,
// pero el cliente Prisma DEBERÍA mapear correctamente a multiplicador y tipo_categoria si el @map está bien.

const db = new PrismaClient();

async function insertTestRecords() {
    console.log('Intentando conectar con la base de datos...');
    try {
        await db.$connect();
    } catch (e) {
        console.error('❌ ERROR: No se pudo conectar a la BD. Asegúrese de que el servidor Next.js esté detenido.');
        process.exit(1);
    }

    const ID1 = uuidv4();
    const ID2 = uuidv4();
    
    console.log(`\nID de Regla 1 (General): ${ID1}`);
    console.log(`ID de Regla 2 (Categoría PVC): ${ID2}`);
    console.log('Intentando insertar registros...');

    try {
        // Regla 1: General (Debe funcionar si la tabla permite categoría: null)
        await db.reglaMargen.create({
            data: {
                id: ID1,
                descripcion: 'Prueba General (1.3x)',
                tipo: 'General',
                valor: 1.30, 
                gastoFijo: 5.00,
                categoria: null,
                base: null,
            },
        });
        console.log('✅ Regla General insertada con éxito.');

        // Regla 2: Categoría (Debe funcionar si el mapeo está bien)
        await db.reglaMargen.create({
            data: {
                id: ID2,
                descripcion: 'Prueba Categoria PVC (1.85x)',
                tipo: 'Categoria',
                valor: 1.85, 
                gastoFijo: 0.00,
                categoria: 'PVC',
                base: null,
            },
        });
        console.log('✅ Regla Categoria PVC insertada con éxito.');

    } catch (error) {
        console.error('\n--- ❌ ERROR CRÍTICO DE INSERCIÓN DIRECTA ---');
        console.error('El problema está en la base de datos. Detalles:');
        console.error(`Código de error de Prisma: ${error.code}`);
        console.error(`Mensaje: ${error.message}`);
        console.error('------------------------------------------');
        process.exit(1);
    } finally {
        await db.$disconnect();
    }
}

insertTestRecords();
