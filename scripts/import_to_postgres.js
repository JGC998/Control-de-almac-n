// ═══════════════════════════════════════════════════════════════
// SCRIPT DE IMPORTACIÓN - EJECUTAR EN TU MÁQUINA LOCAL
// ═══════════════════════════════════════════════════════════════
// Este script importa los archivos JSON exportados de MySQL
// hacia la base de datos PostgreSQL local.
//
// USO:
//   1. Copia la carpeta 'export_data' del servidor a ./scripts/export_data/
//   2. Ejecuta: node scripts/import_to_postgres.js
// ═══════════════════════════════════════════════════════════════

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const EXPORT_DIR = path.join(__dirname, 'export_data');

// Mapeo de tipos de datos MySQL → PostgreSQL
const parseValue = (value, type) => {
    if (value === null || value === undefined || value === 'NULL' || value === '\\N') {
        return null;
    }

    switch (type) {
        case 'int':
            return parseInt(value, 10) || 0;
        case 'float':
            return parseFloat(value) || 0;
        case 'decimal':
            return parseFloat(value) || 0;
        case 'boolean':
            return value === '1' || value === 'true' || value === true;
        case 'date':
            return value ? new Date(value) : null;
        default:
            return value;
    }
};

// Leer archivo JSON
const readJsonFile = (filename) => {
    const filepath = path.join(EXPORT_DIR, filename);
    if (!fs.existsSync(filepath)) {
        console.log(`   ⚠️  Archivo no encontrado: ${filename}`);
        return [];
    }
    const content = fs.readFileSync(filepath, 'utf8');
    return JSON.parse(content);
};

// Función principal de migración
async function main() {
    console.log('═══════════════════════════════════════');
    console.log('🚀 Iniciando importación a PostgreSQL...');
    console.log('═══════════════════════════════════════\n');

    // Verificar que existe la carpeta de datos
    if (!fs.existsSync(EXPORT_DIR)) {
        console.error('❌ Error: No se encontró la carpeta de datos exportados.');
        console.error(`   Esperada en: ${EXPORT_DIR}`);
        console.error('\n   Pasos:');
        console.error('   1. Ejecuta export_mysql.sh en tu servidor');
        console.error('   2. Copia la carpeta export_data/ aquí');
        process.exit(1);
    }

    // ========================================
    // 1. FABRICANTES
    // ========================================
    console.log('📦 Importando Fabricantes...');
    const fabricantes = readJsonFile('Fabricante.json');
    for (const f of fabricantes) {
        try {
            await prisma.fabricante.upsert({
                where: { id: f.id },
                update: { nombre: f.nombre },
                create: { id: f.id, nombre: f.nombre }
            });
        } catch (e) {
            // Si hay conflicto de nombre único, intentar por nombre
            await prisma.fabricante.upsert({
                where: { nombre: f.nombre },
                update: {},
                create: { nombre: f.nombre }
            });
        }
    }
    console.log(`   ✓ ${fabricantes.length} fabricantes\n`);

    // ========================================
    // 2. MATERIALES
    // ========================================
    console.log('🧱 Importando Materiales...');
    const materiales = readJsonFile('Material.json');
    for (const m of materiales) {
        await prisma.material.upsert({
            where: { nombre: m.nombre },
            update: {},
            create: { id: m.id, nombre: m.nombre }
        });
    }
    console.log(`   ✓ ${materiales.length} materiales\n`);

    // ========================================
    // 3. PROVEEDORES
    // ========================================
    console.log('🚚 Importando Proveedores...');
    const proveedores = readJsonFile('Proveedor.json');
    for (const p of proveedores) {
        await prisma.proveedor.upsert({
            where: { nombre: p.nombre },
            update: { email: p.email, telefono: p.telefono, direccion: p.direccion },
            create: {
                id: p.id,
                nombre: p.nombre,
                email: p.email,
                telefono: p.telefono,
                direccion: p.direccion
            }
        });
    }
    console.log(`   ✓ ${proveedores.length} proveedores\n`);

    // ========================================
    // 4. CLIENTES
    // ========================================
    console.log('👥 Importando Clientes...');
    const clientes = readJsonFile('Cliente.json');
    for (const c of clientes) {
        await prisma.cliente.upsert({
            where: { nombre: c.nombre },
            update: {
                email: c.email,
                direccion: c.direccion,
                telefono: c.telefono,
                tier: c.tier,
                categoria: c.categoria
            },
            create: {
                id: c.id,
                nombre: c.nombre,
                email: c.email,
                direccion: c.direccion,
                telefono: c.telefono,
                tier: c.tier,
                categoria: c.categoria
            }
        });
    }
    console.log(`   ✓ ${clientes.length} clientes\n`);

    // ========================================
    // 5. PRODUCTOS (modelo nuevo con autoincrement)
    // ========================================
    console.log('📦 Importando Productos...');
    const productos = readJsonFile('Producto.json');
    for (const p of productos) {
        // PostgreSQL con autoincrement - usamos upsert con id específico
        await prisma.$executeRaw`
            INSERT INTO "Producto" (id, nombre, descripcion, precio, stock, categoria, "creadoEn", actualizado)
            VALUES (${parseInt(p.id)}, ${p.nombre}, ${p.descripcion}, ${parseFloat(p.precio) || 0}, 
                    ${parseInt(p.stock) || 0}, ${p.categoria}, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET 
                nombre = EXCLUDED.nombre,
                descripcion = EXCLUDED.descripcion,
                precio = EXCLUDED.precio,
                stock = EXCLUDED.stock,
                categoria = EXCLUDED.categoria,
                actualizado = NOW()
        `;
    }
    // Resetear secuencia de autoincrement
    if (productos.length > 0) {
        const maxId = Math.max(...productos.map(p => parseInt(p.id) || 0));
        await prisma.$executeRaw`SELECT setval('"Producto_id_seq"', ${maxId + 1}, false)`;
    }
    console.log(`   ✓ ${productos.length} productos\n`);

    // ========================================
    // 6. TARIFAS DE MATERIAL
    // ========================================
    console.log('💰 Importando Tarifas de Material...');
    const tarifas = readJsonFile('TarifaMaterial.json');
    for (const t of tarifas) {
        await prisma.tarifaMaterial.upsert({
            where: { material_espesor: { material: t.material, espesor: parseFloat(t.espesor) } },
            update: { precio: parseFloat(t.precio), peso: parseFloat(t.peso) },
            create: {
                id: t.id,
                material: t.material,
                espesor: parseFloat(t.espesor),
                precio: parseFloat(t.precio),
                peso: parseFloat(t.peso)
            }
        });
    }
    console.log(`   ✓ ${tarifas.length} tarifas\n`);

    // ========================================
    // 7. REGLAS DE MARGEN
    // ========================================
    console.log('📊 Importando Reglas de Margen...');
    const margenes = readJsonFile('ReglaMargen.json');
    for (const m of margenes) {
        await prisma.reglaMargen.upsert({
            where: { base: m.base },
            update: {
                multiplicador: parseFloat(m.multiplicador),
                gastoFijo: parseFloat(m.gastoFijo) || 0,
                descripcion: m.descripcion,
                tierCliente: m.tierCliente
            },
            create: {
                id: m.id,
                base: m.base,
                multiplicador: parseFloat(m.multiplicador),
                gastoFijo: parseFloat(m.gastoFijo) || 0,
                descripcion: m.descripcion,
                tierCliente: m.tierCliente
            }
        });
    }
    console.log(`   ✓ ${margenes.length} reglas de margen\n`);

    // ========================================
    // 8. REFERENCIAS DE BOBINA
    // ========================================
    console.log('🎯 Importando Referencias de Bobina...');
    const referencias = readJsonFile('ReferenciaBobina.json');
    for (const r of referencias) {
        await prisma.referenciaBobina.upsert({
            where: {
                referencia_ancho_lonas: {
                    referencia: r.referencia,
                    ancho: parseFloat(r.ancho) || 0,
                    lonas: parseFloat(r.lonas) || 0
                }
            },
            update: { pesoPorMetroLineal: parseFloat(r.pesoPorMetroLineal) },
            create: {
                id: r.id,
                referencia: r.referencia,
                ancho: parseFloat(r.ancho),
                lonas: parseFloat(r.lonas),
                pesoPorMetroLineal: parseFloat(r.pesoPorMetroLineal)
            }
        });
    }
    console.log(`   ✓ ${referencias.length} referencias\n`);

    // ========================================
    // 9. STOCK
    // ========================================
    console.log('🏭 Importando Stock...');
    const stocks = readJsonFile('Stock.json');
    for (const s of stocks) {
        await prisma.stock.upsert({
            where: { id: s.id },
            update: {
                material: s.material,
                espesor: parseFloat(s.espesor),
                metrosDisponibles: parseFloat(s.metrosDisponibles),
                proveedor: s.proveedor,
                costoMetro: parseFloat(s.costoMetro),
                cantidadBobinas: parseInt(s.cantidadBobinas) || 0
            },
            create: {
                id: s.id,
                material: s.material,
                espesor: parseFloat(s.espesor),
                metrosDisponibles: parseFloat(s.metrosDisponibles),
                proveedor: s.proveedor,
                costoMetro: parseFloat(s.costoMetro),
                cantidadBobinas: parseInt(s.cantidadBobinas) || 0
            }
        });
    }
    console.log(`   ✓ ${stocks.length} registros de stock\n`);

    // ========================================
    // 10. MOVIMIENTOS DE STOCK
    // ========================================
    console.log('📈 Importando Movimientos de Stock...');
    const movimientos = readJsonFile('MovimientoStock.json');
    for (const m of movimientos) {
        await prisma.movimientoStock.upsert({
            where: { id: m.id },
            update: {},
            create: {
                id: m.id,
                tipo: m.tipo,
                cantidad: parseFloat(m.cantidad),
                fecha: new Date(m.fecha),
                stockId: m.stockId
            }
        });
    }
    console.log(`   ✓ ${movimientos.length} movimientos\n`);

    // ========================================
    // 11. PRESUPUESTOS
    // ========================================
    console.log('📋 Importando Presupuestos...');
    const presupuestos = readJsonFile('Presupuesto.json');
    for (const p of presupuestos) {
        await prisma.presupuesto.upsert({
            where: { numero: p.numero },
            update: {
                estado: p.estado,
                notas: p.notas,
                subtotal: parseFloat(p.subtotal),
                tax: parseFloat(p.tax),
                total: parseFloat(p.total)
            },
            create: {
                id: p.id,
                numero: p.numero,
                fechaCreacion: new Date(p.fechaCreacion),
                estado: p.estado,
                notas: p.notas,
                subtotal: parseFloat(p.subtotal),
                tax: parseFloat(p.tax),
                total: parseFloat(p.total),
                clienteId: p.clienteId,
                marginId: p.marginId
            }
        });
    }
    console.log(`   ✓ ${presupuestos.length} presupuestos\n`);

    // ========================================
    // 12. ITEMS DE PRESUPUESTO
    // ========================================
    console.log('📋 Importando Items de Presupuesto...');
    const presupuestoItems = readJsonFile('PresupuestoItem.json');
    for (const item of presupuestoItems) {
        await prisma.presupuestoItem.upsert({
            where: { id: item.id },
            update: {},
            create: {
                id: item.id,
                descripcion: item.descripcion,
                quantity: parseInt(item.quantity),
                unitPrice: parseFloat(item.unitPrice),
                pesoUnitario: parseFloat(item.pesoUnitario) || 0,
                presupuestoId: item.presupuestoId,
                productoId: item.productoId ? parseInt(item.productoId) : null
            }
        });
    }
    console.log(`   ✓ ${presupuestoItems.length} items de presupuesto\n`);

    // ========================================
    // 13. PEDIDOS
    // ========================================
    console.log('🛒 Importando Pedidos...');
    const pedidos = readJsonFile('Pedido.json');
    for (const p of pedidos) {
        await prisma.pedido.upsert({
            where: { numero: p.numero },
            update: {
                estado: p.estado,
                notas: p.notas,
                subtotal: parseFloat(p.subtotal),
                tax: parseFloat(p.tax),
                total: parseFloat(p.total)
            },
            create: {
                id: p.id,
                numero: p.numero,
                fechaCreacion: new Date(p.fechaCreacion),
                estado: p.estado,
                notas: p.notas,
                subtotal: parseFloat(p.subtotal),
                tax: parseFloat(p.tax),
                total: parseFloat(p.total),
                clienteId: p.clienteId,
                presupuestoId: p.presupuestoId,
                marginId: p.marginId
            }
        });
    }
    console.log(`   ✓ ${pedidos.length} pedidos\n`);

    // ========================================
    // 14. ITEMS DE PEDIDO
    // ========================================
    console.log('🛒 Importando Items de Pedido...');
    const pedidoItems = readJsonFile('PedidoItem.json');
    for (const item of pedidoItems) {
        await prisma.pedidoItem.upsert({
            where: { id: item.id },
            update: {},
            create: {
                id: item.id,
                descripcion: item.descripcion,
                quantity: parseInt(item.quantity),
                unitPrice: parseFloat(item.unitPrice),
                pesoUnitario: parseFloat(item.pesoUnitario) || 0,
                pedidoId: item.pedidoId,
                productoId: item.productoId ? parseInt(item.productoId) : null
            }
        });
    }
    console.log(`   ✓ ${pedidoItems.length} items de pedido\n`);

    // ========================================
    // 15. PEDIDOS A PROVEEDOR
    // ========================================
    console.log('📥 Importando Pedidos a Proveedor...');
    const pedidosProveedor = readJsonFile('PedidoProveedor.json');
    for (const p of pedidosProveedor) {
        await prisma.pedidoProveedor.upsert({
            where: { id: p.id },
            update: {},
            create: {
                id: p.id,
                material: p.material,
                fecha: new Date(p.fecha),
                estado: p.estado,
                proveedorId: p.proveedorId,
                tipo: p.tipo || 'NACIONAL',
                notas: p.notas,
                numeroFactura: p.numeroFactura,
                gastosTotales: parseFloat(p.gastosTotales) || 0,
                tasaCambio: parseFloat(p.tasaCambio) || 1,
                numeroContenedor: p.numeroContenedor,
                naviera: p.naviera,
                fechaLlegadaEstimada: p.fechaLlegadaEstimada ? new Date(p.fechaLlegadaEstimada) : null
            }
        });
    }
    console.log(`   ✓ ${pedidosProveedor.length} pedidos a proveedor\n`);

    // ========================================
    // 16. BOBINAS DE PEDIDO
    // ========================================
    console.log('📥 Importando Bobinas de Pedido...');
    const bobinas = readJsonFile('BobinaPedido.json');
    for (const b of bobinas) {
        await prisma.bobinaPedido.upsert({
            where: { id: b.id },
            update: {},
            create: {
                id: b.id,
                cantidad: parseInt(b.cantidad) || 1,
                pedidoId: b.pedidoId,
                ancho: parseFloat(b.ancho),
                largo: parseFloat(b.largo),
                espesor: parseFloat(b.espesor),
                precioMetro: parseFloat(b.precioMetro) || 0,
                referenciaId: b.referenciaId
            }
        });
    }
    console.log(`   ✓ ${bobinas.length} bobinas\n`);

    // ========================================
    // 17. NOTAS
    // ========================================
    console.log('📝 Importando Notas...');
    const notas = readJsonFile('Nota.json');
    for (const n of notas) {
        await prisma.nota.upsert({
            where: { id: n.id },
            update: { content: n.content },
            create: {
                id: n.id,
                content: n.content,
                fecha: new Date(n.fecha)
            }
        });
    }
    console.log(`   ✓ ${notas.length} notas\n`);

    // ========================================
    // 18. CONFIGURACIÓN
    // ========================================
    console.log('⚙️ Importando Configuración...');
    const configs = readJsonFile('Config.json');
    for (const c of configs) {
        await prisma.config.upsert({
            where: { key: c.key },
            update: { value: c.value },
            create: { id: c.id, key: c.key, value: c.value }
        });
    }
    console.log(`   ✓ ${configs.length} configuraciones\n`);

    // ========================================
    // 19. SECUENCIAS
    // ========================================
    console.log('🔢 Importando Secuencias...');
    const sequences = readJsonFile('Sequence.json');
    for (const s of sequences) {
        await prisma.sequence.upsert({
            where: { name: s.name },
            update: { value: parseInt(s.value) },
            create: { name: s.name, value: parseInt(s.value) }
        });
    }
    console.log(`   ✓ ${sequences.length} secuencias\n`);

    console.log('═══════════════════════════════════════');
    console.log('🎉 ¡Importación completada exitosamente!');
    console.log('═══════════════════════════════════════\n');
}

main()
    .catch((e) => {
        console.error('❌ Error durante la importación:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
