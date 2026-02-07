const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const DATA_DIR = path.join(__dirname, '../data/src/data/migracion');

// Helper para leer archivos JSON
function readJSON(filename) {
    const filepath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filepath)) {
        console.log(`⚠️  Archivo no encontrado: ${filename}`);
        return [];
    }
    const content = fs.readFileSync(filepath, 'utf8');
    return JSON.parse(content);
}

async function main() {
    console.log('🚀 Iniciando importación de datos de producción...\n');

    try {
        // 1. INDEPENDIENTES (sin dependencias)
        console.log('📦 Importando datos independientes...');

        // Materiales
        const materiales = readJSON('Material.json');
        console.log(`   Material: ${materiales.length} registros`);
        for (const mat of materiales) {
            await prisma.material.upsert({
                where: { id: mat.id },
                update: {},
                create: {
                    id: mat.id,
                    nombre: mat.nombre,
                },
            });
        }

        // Fabricantes
        const fabricantes = readJSON('Fabricante.json');
        console.log(`   Fabricante: ${fabricantes.length} registros`);
        for (const fab of fabricantes) {
            await prisma.fabricante.upsert({
                where: { id: fab.id },
                update: {},
                create: {
                    id: fab.id,
                    nombre: fab.nombre,
                },
            });
        }

        // Clientes
        const clientes = readJSON('Cliente.json');
        console.log(`   Cliente: ${clientes.length} registros`);
        for (const cli of clientes) {
            await prisma.cliente.upsert({
                where: { id: cli.id },
                update: {},
                create: {
                    id: cli.id,
                    nombre: cli.nombre,
                    email: cli.email,
                    direccion: cli.direccion,
                    telefono: cli.telefono,
                    tier: cli.tier,
                },
            });
        }

        // Proveedores
        const proveedores = readJSON('Proveedor.json');
        console.log(`   Proveedor: ${proveedores.length} registros`);
        for (const prov of proveedores) {
            await prisma.proveedor.upsert({
                where: { id: prov.id },
                update: {},
                create: {
                    id: prov.id,
                    nombre: prov.nombre,
                    email: prov.email || null,
                    telefono: prov.telefono || null,
                    direccion: prov.direccion || null,
                },
            });
        }

        // 2. CON DEPENDENCIAS SIMPLES
        console.log('\n📦 Importando datos con dependencias...');

        // Productos
        const productos = readJSON('Producto.json');
        console.log(`   Producto: ${productos.length} registros`);
        for (const prod of productos) {
            await prisma.producto.upsert({
                where: { id: prod.id },
                update: {},
                create: {
                    id: prod.id,
                    nombre: prod.nombre,
                    referenciaFabricante: prod.referencia_fab,
                    espesor: prod.espesor,
                    largo: prod.largo,
                    ancho: prod.ancho,
                    precioUnitario: prod.precioUnitario || 0,
                    pesoUnitario: prod.pesoUnitario || 0,
                    costoUnitario: prod.costo,
                    tieneTroquel: prod.tieneTroquel === 1,
                    color: prod.color || null,
                    fabricanteId: prod.fabricanteId,
                    materialId: prod.materialId,
                    precioVentaFab: prod.precioVentaFab || 0,
                    precioVentaInt: prod.precioVentaInt || 0,
                    precioVentaFin: prod.precioVentaFin || 0,
                },
            });
        }

        // Reglas de Margen
        const reglas = readJSON('ReglaMargen.json');
        console.log(`   ReglaMargen: ${reglas.length} registros`);
        for (const regla of reglas) {
            await prisma.reglaMargen.upsert({
                where: { id: regla.id },
                update: {},
                create: {
                    id: regla.id,
                    base: regla.base,
                    multiplicador: regla.multiplicador,
                    gastoFijo: regla.gastoFijo,
                    descripcion: regla.descripcion,
                    tierCliente: regla.tierCliente,
                },
            });
        }

        // Tarifas de Material
        const tarifas = readJSON('TarifaMaterial.json');
        console.log(`   TarifaMaterial: ${tarifas.length} registros`);
        for (const tarifa of tarifas) {
            await prisma.tarifaMaterial.upsert({
                where: {
                    material_espesor_color: {
                        material: tarifa.material,
                        espesor: tarifa.espesor,
                        color: tarifa.color || 'N/A',
                    },
                },
                update: {},
                create: {
                    id: tarifa.id,
                    material: tarifa.material,
                    espesor: tarifa.espesor,
                    precio: tarifa.precio,
                    peso: tarifa.peso,
                    color: tarifa.color || 'N/A',
                },
            });
        }

        // Referencias de Bobina
        const referencias = readJSON('ReferenciaBobina.json');
        console.log(`   ReferenciaBobina: ${referencias.length} registros`);
        for (const ref of referencias) {
            const referenciaValue = ref.referencia || ref.nombre || 'SIN_REF';
            await prisma.referenciaBobina.upsert({
                where: {
                    referencia_ancho_lonas: {
                        referencia: referenciaValue,
                        ancho: ref.ancho || 0,
                        lonas: ref.lonas || 0,
                    },
                },
                update: {},
                create: {
                    id: ref.id,
                    referencia: referenciaValue,
                    ancho: ref.ancho,
                    lonas: ref.lonas,
                    pesoPorMetroLineal: ref.pesoPorMetroLineal,
                },
            });
        }

        // Sequences
        const sequences = readJSON('Sequence.json');
        console.log(`   Sequence: ${sequences.length} registros`);
        for (const seq of sequences) {
            const yearValue = seq.year || new Date().getFullYear();
            await prisma.sequence.upsert({
                where: {
                    name_year: {
                        name: seq.name,
                        year: yearValue,
                    },
                },
                update: {},
                create: {
                    name: seq.name,
                    year: yearValue,
                    value: seq.value,
                },
            });
        }

        // Notas
        const notas = readJSON('Nota.json');
        console.log(`   Nota: ${notas.length} registros`);
        for (const nota of notas) {
            await prisma.nota.upsert({
                where: { id: nota.id },
                update: {},
                create: {
                    id: nota.id,
                    content: nota.content,
                    fecha: new Date(nota.fecha),
                },
            });
        }

        // 3. DOCUMENTOS DE NEGOCIO
        console.log('\n📦 Importando documentos de negocio...');

        // Presupuestos (si hay)
        const presupuestos = readJSON('Presupuesto.json');
        console.log(`   Presupuesto: ${presupuestos.length} registros`);
        for (const pres of presupuestos) {
            await prisma.presupuesto.upsert({
                where: { id: pres.id },
                update: {},
                create: {
                    id: pres.id,
                    numero: pres.numero,
                    fechaCreacion: new Date(pres.fechaCreacion),
                    estado: pres.estado,
                    notas: pres.notas,
                    subtotal: pres.subtotal,
                    tax: pres.tax,
                    total: pres.total,
                    clienteId: pres.clienteId,
                    marginId: pres.marginId,
                },
            });
        }

        // Pedidos
        const pedidos = readJSON('Pedido.json');
        console.log(`   Pedido: ${pedidos.length} registros`);
        for (const ped of pedidos) {
            await prisma.pedido.upsert({
                where: { id: ped.id },
                update: {},
                create: {
                    id: ped.id,
                    numero: ped.numero,
                    fechaCreacion: new Date(ped.fechaCreacion),
                    estado: ped.estado,
                    notas: ped.notas,
                    subtotal: ped.subtotal,
                    tax: ped.tax,
                    total: ped.total,
                    clienteId: ped.clienteId,
                    presupuestoId: ped.presupuestoId,
                    marginId: ped.marginId,
                },
            });
        }

        // 4. ITEMS Y DETALLES
        console.log('\n📦 Importando items y detalles...');

        // Items de Pedido
        const pedidoItems = readJSON('PedidoItem.json');
        console.log(`   PedidoItem: ${pedidoItems.length} registros`);
        for (const item of pedidoItems) {
            await prisma.pedidoItem.upsert({
                where: { id: item.id },
                update: {},
                create: {
                    id: item.id,
                    descripcion: item.descripcion || '',
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    pesoUnitario: item.pesoUnitario || 0,
                    pedidoId: item.pedidoId,
                    productoId: item.productoId,
                },
            });
        }

        // Items de Presupuesto (si hay)
        const presupuestoItems = readJSON('PresupuestoItem.json');
        console.log(`   PresupuestoItem: ${presupuestoItems.length} registros`);
        for (const item of presupuestoItems) {
            await prisma.presupuestoItem.upsert({
                where: { id: item.id },
                update: {},
                create: {
                    id: item.id,
                    descripcion: item.descripcion || '',
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    pesoUnitario: item.pesoUnitario || 0,
                    presupuestoId: item.presupuestoId,
                    productoId: item.productoId,
                },
            });
        }

        // Documentos
        const documentos = readJSON('Documento.json');
        console.log(`   Documento: ${documentos.length} registros`);
        for (const doc of documentos) {
            await prisma.documento.upsert({
                where: { id: doc.id },
                update: {},
                create: {
                    id: doc.id,
                    tipo: doc.tipo,
                    referencia: doc.referencia,
                    descripcion: doc.descripcion,
                    rutaArchivo: doc.rutaArchivo,
                    maquinaUbicacion: doc.maquinaUbicacion,
                    fechaSubida: new Date(doc.fechaSubida),
                    productoId: doc.productoId,
                },
            });
        }

        console.log('\n✅ Importación completada exitosamente!\n');

        // Mostrar resumen
        console.log('📊 Resumen de datos importados:');
        const counts = await Promise.all([
            prisma.material.count(),
            prisma.fabricante.count(),
            prisma.cliente.count(),
            prisma.proveedor.count(),
            prisma.producto.count(),
            prisma.reglaMargen.count(),
            prisma.tarifaMaterial.count(),
            prisma.referenciaBobina.count(),
            prisma.sequence.count(),
            prisma.nota.count(),
            prisma.presupuesto.count(),
            prisma.pedido.count(),
            prisma.pedidoItem.count(),
            prisma.presupuestoItem.count(),
            prisma.documento.count(),
        ]);

        console.log(`   Materiales: ${counts[0]}`);
        console.log(`   Fabricantes: ${counts[1]}`);
        console.log(`   Clientes: ${counts[2]}`);
        console.log(`   Proveedores: ${counts[3]}`);
        console.log(`   Productos: ${counts[4]}`);
        console.log(`   Reglas de Margen: ${counts[5]}`);
        console.log(`   Tarifas de Material: ${counts[6]}`);
        console.log(`   Referencias de Bobina: ${counts[7]}`);
        console.log(`   Sequences: ${counts[8]}`);
        console.log(`   Notas: ${counts[9]}`);
        console.log(`   Presupuestos: ${counts[10]}`);
        console.log(`   Pedidos: ${counts[11]}`);
        console.log(`   Items de Pedido: ${counts[12]}`);
        console.log(`   Items de Presupuesto: ${counts[13]}`);
        console.log(`   Documentos: ${counts[14]}`);
        console.log('\n🎉 ¡Base de datos de producción lista!\n');

    } catch (error) {
        console.error('\n❌ Error durante la importación:', error);
        throw error;
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
