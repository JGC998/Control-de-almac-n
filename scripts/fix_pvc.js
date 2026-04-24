const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Adding PVC materials to TarifaMaterial...');
    const coloresPVC = ['VERDE', 'BLANCO', 'AZUL', 'NEGRO'];
    const tarifasMat = [];
    coloresPVC.forEach(color => {
        tarifasMat.push(
            { material: 'PVC', espesor: 1, precio: 3.50, peso: 0.3, color },
            { material: 'PVC', espesor: 2, precio: 5.50, peso: 0.5, color },
            { material: 'PVC', espesor: 3, precio: 8.50, peso: 0.8, color },
            { material: 'PVC', espesor: 4, precio: 10.00, peso: 1.0, color },
            { material: 'PVC', espesor: 5, precio: 11.00, peso: 1.1, color },
            { material: 'PVC', espesor: 6, precio: 13.00, peso: 1.3, color }
        );
    });

    for (const t of tarifasMat) {
        try {
            await prisma.tarifaMaterial.upsert({
                where: { material_espesor_color: { material: t.material, espesor: t.espesor, color: t.color || "sin_color" } },
                update: { precio: t.precio, peso: t.peso },
                create: t
            });
        } catch (error) {
            console.error('Error inserting', t, error.message);
        }
    }
    console.log('Done adding PVC.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
