const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Cleaning up PVC products with zero prices...');
    const result = await prisma.producto.deleteMany({
        where: {
            OR: [
                { nombre: { contains: 'PVC', mode: 'insensitive' } },
                { materialId: { not: null } } // We could check material relation, but let's just use string match
            ],
            nombre: { contains: 'PVC', mode: 'insensitive' },
            precioUnitario: 0
        }
    });
    console.log(`Eliminados ${result.count} productos de PVC con precio 0.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
