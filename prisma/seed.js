// prisma/seed.js
// Script para llenar la base de datos con datos de prueba
// Ejecutar con: npx prisma db seed
// O directamente: node prisma/seed.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Iniciando seed de la base de datos...\n');

    // ==========================================
    // 1. FABRICANTES
    // ==========================================
    console.log('📦 Creando Fabricantes...');
    const fabricantes = await Promise.all([
        prisma.fabricante.upsert({ where: { nombre: 'Bridgestone' }, update: {}, create: { nombre: 'Bridgestone' } }),
        prisma.fabricante.upsert({ where: { nombre: 'Continental' }, update: {}, create: { nombre: 'Continental' } }),
        prisma.fabricante.upsert({ where: { nombre: 'Dunlop' }, update: {}, create: { nombre: 'Dunlop' } }),
        prisma.fabricante.upsert({ where: { nombre: 'Goodyear' }, update: {}, create: { nombre: 'Goodyear' } }),
        prisma.fabricante.upsert({ where: { nombre: 'Michelin' }, update: {}, create: { nombre: 'Michelin' } }),
    ]);
    console.log(`   ✓ ${fabricantes.length} fabricantes\n`);

    // ==========================================
    // 2. MATERIALES
    // ==========================================
    console.log('🧱 Creando Materiales...');
    const materiales = await Promise.all([
        prisma.material.upsert({ where: { nombre: 'Goma Natural' }, update: {}, create: { nombre: 'Goma Natural' } }),
        prisma.material.upsert({ where: { nombre: 'Goma Sintética' }, update: {}, create: { nombre: 'Goma Sintética' } }),
        prisma.material.upsert({ where: { nombre: 'Fieltro' }, update: {}, create: { nombre: 'Fieltro' } }),
        prisma.material.upsert({ where: { nombre: 'PVC' }, update: {}, create: { nombre: 'PVC' } }),
        prisma.material.upsert({ where: { nombre: 'Neopreno' }, update: {}, create: { nombre: 'Neopreno' } }),
        prisma.material.upsert({ where: { nombre: 'Silicona' }, update: {}, create: { nombre: 'Silicona' } }),
        prisma.material.upsert({ where: { nombre: 'Caucho EPDM' }, update: {}, create: { nombre: 'Caucho EPDM' } }),
    ]);
    console.log(`   ✓ ${materiales.length} materiales\n`);

    // ==========================================
    // 3. PROVEEDORES
    // ==========================================
    console.log('🚚 Creando Proveedores...');
    const proveedores = await Promise.all([
        prisma.proveedor.upsert({
            where: { nombre: 'Gomas del Norte S.L.' },
            update: {},
            create: {
                nombre: 'Gomas del Norte S.L.',
                email: 'ventas@gomasnorte.es',
                telefono: '+34 943 123 456',
                direccion: 'Polígono Industrial Urbi, Nave 12, 20600 Eibar'
            }
        }),
        prisma.proveedor.upsert({
            where: { nombre: 'Importaciones Chen Ltd.' },
            update: {},
            create: {
                nombre: 'Importaciones Chen Ltd.',
                email: 'sales@chenrubber.cn',
                telefono: '+86 21 5888 1234',
                direccion: 'Shanghai Industrial Zone, Building 8'
            }
        }),
        prisma.proveedor.upsert({
            where: { nombre: 'Cauchos Mediterráneo' },
            update: {},
            create: {
                nombre: 'Cauchos Mediterráneo',
                email: 'info@cauchosmed.es',
                telefono: '+34 961 789 012',
                direccion: 'Av. del Puerto 45, 46021 Valencia'
            }
        }),
        prisma.proveedor.upsert({
            where: { nombre: 'RubberTech GmbH' },
            update: {},
            create: {
                nombre: 'RubberTech GmbH',
                email: 'kontakt@rubbertech.de',
                telefono: '+49 89 123 4567',
                direccion: 'Industriestraße 22, 80939 München'
            }
        }),
    ]);
    console.log(`   ✓ ${proveedores.length} proveedores\n`);

    // ==========================================
    // 4. CLIENTES
    // ==========================================
    console.log('👥 Creando Clientes...');
    const clientes = await Promise.all([
        prisma.cliente.upsert({
            where: { nombre: 'Industrias García S.A.' },
            update: {},
            create: {
                nombre: 'Industrias García S.A.',
                email: 'compras@industriasgarcia.es',
                telefono: '+34 91 555 1234',
                direccion: 'Calle de la Industria 45, 28001 Madrid',
                categoria: 'FABRICANTE',
                tier: 'PREMIUM'
            }
        }),
        prisma.cliente.upsert({
            where: { nombre: 'Distribuciones López' },
            update: {},
            create: {
                nombre: 'Distribuciones López',
                email: 'pedidos@distlopez.com',
                telefono: '+34 93 444 5678',
                direccion: 'Polígono Les Fonts, 08740 Barcelona',
                categoria: 'INTERMEDIARIO',
                tier: 'STANDARD'
            }
        }),
        prisma.cliente.upsert({
            where: { nombre: 'Taller Mecánico Ruedas' },
            update: {},
            create: {
                nombre: 'Taller Mecánico Ruedas',
                email: 'tallerruedas@gmail.com',
                telefono: '+34 956 333 222',
                direccion: 'Av. de Andalucía 78, 11001 Cádiz',
                categoria: 'CLIENTE FINAL',
                tier: 'BASIC'
            }
        }),
        prisma.cliente.upsert({
            where: { nombre: 'Autopartes del Sur' },
            update: {},
            create: {
                nombre: 'Autopartes del Sur',
                email: 'info@autopartessur.es',
                telefono: '+34 954 666 777',
                direccion: 'Calle Sierpes 12, 41004 Sevilla',
                categoria: 'NORMAL'
            }
        }),
        prisma.cliente.upsert({
            where: { nombre: 'Ferretería Industrial Martínez' },
            update: {},
            create: {
                nombre: 'Ferretería Industrial Martínez',
                email: 'contacto@ferremartinez.es',
                telefono: '+34 983 111 222',
                direccion: 'Plaza Mayor 5, 47001 Valladolid',
                categoria: 'INTERMEDIARIO'
            }
        }),
    ]);
    console.log(`   ✓ ${clientes.length} clientes\n`);

    // ==========================================
    // 5. PRODUCTOS
    // ==========================================
    console.log('📦 Creando Productos...');
    const productos = await Promise.all([
        prisma.producto.upsert({
            where: { id: 1 },
            update: {},
            create: { nombre: 'Faldeta de Goma 10mm', descripcion: 'Faldeta protectora para camiones', precio: 25.50, stock: 150, categoria: 'Goma' }
        }),
        prisma.producto.upsert({
            where: { id: 2 },
            update: {},
            create: { nombre: 'Faldeta de Goma 15mm', descripcion: 'Faldeta resistente reforzada', precio: 35.00, stock: 80, categoria: 'Goma' }
        }),
        prisma.producto.upsert({
            where: { id: 3 },
            update: {},
            create: { nombre: 'Plancha PVC 5mm', descripcion: 'Plancha flexible para suelos', precio: 18.75, stock: 200, categoria: 'PVC' }
        }),
        prisma.producto.upsert({
            where: { id: 4 },
            update: {},
            create: { nombre: 'Banda Transportadora 500mm', descripcion: 'Banda para cintas transportadoras industriales', precio: 145.00, stock: 25, categoria: 'Industrial' }
        }),
        prisma.producto.upsert({
            where: { id: 5 },
            update: {},
            create: { nombre: 'Junta Tórica Ø50', descripcion: 'Junta de sellado estándar', precio: 2.30, stock: 500, categoria: 'Juntas' }
        }),
        prisma.producto.upsert({
            where: { id: 6 },
            update: {},
            create: { nombre: 'Burlete Adhesivo 3m', descripcion: 'Burlete para puertas y ventanas', precio: 8.90, stock: 300, categoria: 'Sellado' }
        }),
        prisma.producto.upsert({
            where: { id: 7 },
            update: {},
            create: { nombre: 'Alfombrilla Antifatiga', descripcion: 'Alfombrilla ergonómica para puestos de trabajo', precio: 65.00, stock: 45, categoria: 'Ergonomía' }
        }),
        prisma.producto.upsert({
            where: { id: 8 },
            update: {},
            create: { nombre: 'Perfil U de Goma', descripcion: 'Perfil protector de cantos', precio: 12.50, stock: 120, categoria: 'Perfiles' }
        }),
    ]);
    console.log(`   ✓ ${productos.length} productos\n`);

    // ==========================================
    // 6. TARIFAS DE MATERIAL
    // ==========================================
    console.log('💰 Creando Tarifas de Material...');
    const tarifas = [
        { material: 'Goma Natural', espesor: 5, precio: 12.50, peso: 1.2 },
        { material: 'Goma Natural', espesor: 10, precio: 22.00, peso: 2.4 },
        { material: 'Goma Natural', espesor: 15, precio: 31.50, peso: 3.6 },
        { material: 'Goma Sintética', espesor: 3, precio: 8.00, peso: 0.9 },
        { material: 'Goma Sintética', espesor: 6, precio: 14.50, peso: 1.8 },
        { material: 'PVC', espesor: 2, precio: 5.50, peso: 0.5 },
        { material: 'PVC', espesor: 5, precio: 11.00, peso: 1.1 },
        { material: 'Neopreno', espesor: 3, precio: 18.00, peso: 1.0 },
        { material: 'Neopreno', espesor: 6, precio: 32.00, peso: 2.0 },
        { material: 'Fieltro', espesor: 5, precio: 6.00, peso: 0.4 },
    ];
    for (const t of tarifas) {
        await prisma.tarifaMaterial.upsert({
            where: { material_espesor: { material: t.material, espesor: t.espesor } },
            update: { precio: t.precio, peso: t.peso },
            create: t
        });
    }
    console.log(`   ✓ ${tarifas.length} tarifas\n`);

    // ==========================================
    // 7. REFERENCIAS DE BOBINA
    // ==========================================
    console.log('🎯 Creando Referencias de Bobina...');
    const referencias = [
        { referencia: 'BOB-GN-500', ancho: 500, lonas: 2, pesoPorMetroLineal: 2.5 },
        { referencia: 'BOB-GN-800', ancho: 800, lonas: 3, pesoPorMetroLineal: 4.2 },
        { referencia: 'BOB-GS-400', ancho: 400, lonas: 1, pesoPorMetroLineal: 1.8 },
        { referencia: 'BOB-PVC-600', ancho: 600, lonas: 1, pesoPorMetroLineal: 1.5 },
        { referencia: 'BOB-NEO-300', ancho: 300, lonas: 2, pesoPorMetroLineal: 2.0 },
    ];
    for (const r of referencias) {
        await prisma.referenciaBobina.upsert({
            where: { referencia_ancho_lonas: { referencia: r.referencia, ancho: r.ancho, lonas: r.lonas } },
            update: {},
            create: r
        });
    }
    console.log(`   ✓ ${referencias.length} referencias\n`);

    // ==========================================
    // 8. REGLAS DE MARGEN
    // ==========================================
    console.log('📊 Creando Reglas de Margen...');
    const reglas = [
        { base: 'ESTANDAR', multiplicador: 1.35, gastoFijo: 5.00, descripcion: 'Margen estándar del 35%' },
        { base: 'PREMIUM', multiplicador: 1.50, gastoFijo: 0.00, descripcion: 'Margen premium del 50%' },
        { base: 'MAYORISTA', multiplicador: 1.20, gastoFijo: 2.00, descripcion: 'Margen mayorista del 20%' },
        { base: 'FABRICANTE', multiplicador: 1.15, gastoFijo: 0.00, descripcion: 'Margen mínimo para fabricantes' },
    ];
    for (const reg of reglas) {
        await prisma.reglaMargen.upsert({
            where: { base: reg.base },
            update: {},
            create: reg
        });
    }
    console.log(`   ✓ ${reglas.length} reglas de margen\n`);

    // ==========================================
    // 9. STOCK DE ALMACÉN
    // ==========================================
    console.log('🏭 Creando Stock de Almacén...');
    const stocks = await Promise.all([
        prisma.stock.create({
            data: {
                material: 'Goma Natural',
                espesor: 10,
                metrosDisponibles: 250.5,
                proveedor: 'Gomas del Norte S.L.',
                costoMetro: 8.50,
                cantidadBobinas: 3
            }
        }),
        prisma.stock.create({
            data: {
                material: 'Goma Sintética',
                espesor: 6,
                metrosDisponibles: 180.0,
                proveedor: 'Cauchos Mediterráneo',
                costoMetro: 6.20,
                cantidadBobinas: 2
            }
        }),
        prisma.stock.create({
            data: {
                material: 'PVC',
                espesor: 5,
                metrosDisponibles: 320.0,
                proveedor: 'Importaciones Chen Ltd.',
                costoMetro: 4.00,
                cantidadBobinas: 4
            }
        }),
        prisma.stock.create({
            data: {
                material: 'Neopreno',
                espesor: 3,
                metrosDisponibles: 95.5,
                proveedor: 'RubberTech GmbH',
                costoMetro: 12.00,
                cantidadBobinas: 1
            }
        }),
    ]);
    console.log(`   ✓ ${stocks.length} registros de stock\n`);

    // ==========================================
    // 10. MOVIMIENTOS DE STOCK
    // ==========================================
    console.log('📈 Creando Movimientos de Stock...');
    const movimientos = await Promise.all([
        prisma.movimientoStock.create({ data: { tipo: 'ENTRADA', cantidad: 100.0, stockId: stocks[0].id } }),
        prisma.movimientoStock.create({ data: { tipo: 'ENTRADA', cantidad: 150.5, stockId: stocks[0].id } }),
        prisma.movimientoStock.create({ data: { tipo: 'SALIDA', cantidad: 25.0, stockId: stocks[0].id } }),
        prisma.movimientoStock.create({ data: { tipo: 'ENTRADA', cantidad: 180.0, stockId: stocks[1].id } }),
        prisma.movimientoStock.create({ data: { tipo: 'ENTRADA', cantidad: 320.0, stockId: stocks[2].id } }),
        prisma.movimientoStock.create({ data: { tipo: 'SALIDA', cantidad: 50.0, stockId: stocks[2].id } }),
    ]);
    console.log(`   ✓ ${movimientos.length} movimientos\n`);

    // ==========================================
    // 11. NOTAS DEL TABLÓN
    // ==========================================
    console.log('📝 Creando Notas del Tablón...');
    const notas = await Promise.all([
        prisma.nota.create({ data: { content: '⚠️ Revisar stock de Neopreno - niveles bajos' } }),
        prisma.nota.create({ data: { content: '📦 Llegada prevista: Contenedor de China el día 15' } }),
        prisma.nota.create({ data: { content: '💡 Recordar: actualizar tarifas a final de mes' } }),
        prisma.nota.create({ data: { content: '🔧 Mantenimiento preventivo de maquinaria programado para el viernes' } }),
    ]);
    console.log(`   ✓ ${notas.length} notas\n`);

    // ==========================================
    // 12. SECUENCIAS
    // ==========================================
    console.log('🔢 Configurando Secuencias...');
    await prisma.sequence.upsert({ where: { name: 'presupuesto' }, update: {}, create: { name: 'presupuesto', value: 100 } });
    await prisma.sequence.upsert({ where: { name: 'pedido' }, update: {}, create: { name: 'pedido', value: 50 } });
    await prisma.sequence.upsert({ where: { name: 'factura' }, update: {}, create: { name: 'factura', value: 25 } });
    console.log(`   ✓ 3 secuencias\n`);

    // ==========================================
    // 13. CONFIGURACIÓN
    // ==========================================
    console.log('⚙️ Configurando parámetros...');
    await prisma.config.upsert({ where: { key: 'IVA' }, update: {}, create: { key: 'IVA', value: '21' } });
    await prisma.config.upsert({ where: { key: 'MONEDA' }, update: {}, create: { key: 'MONEDA', value: 'EUR' } });
    await prisma.config.upsert({ where: { key: 'EMPRESA_NOMBRE' }, update: {}, create: { key: 'EMPRESA_NOMBRE', value: 'Control de Almacén S.L.' } });
    console.log(`   ✓ 3 configuraciones\n`);

    // ==========================================
    // 14. PRESUPUESTOS
    // ==========================================
    console.log('📋 Creando Presupuestos...');
    const presupuesto1 = await prisma.presupuesto.create({
        data: {
            numero: 'PRES-2024-101',
            estado: 'Borrador',
            notas: 'Presupuesto para suministro de faldetas',
            subtotal: 510.00,
            tax: 107.10,
            total: 617.10,
            clienteId: clientes[0].id,
            items: {
                create: [
                    { descripcion: 'Faldeta de Goma 10mm x 20 unidades', quantity: 20, unitPrice: 25.50, productoId: productos[0].id },
                ]
            }
        }
    });
    const presupuesto2 = await prisma.presupuesto.create({
        data: {
            numero: 'PRES-2024-102',
            estado: 'Aceptado',
            notas: 'Presupuesto aceptado para bandas transportadoras',
            subtotal: 725.00,
            tax: 152.25,
            total: 877.25,
            clienteId: clientes[1].id,
            items: {
                create: [
                    { descripcion: 'Banda Transportadora 500mm x 5 unidades', quantity: 5, unitPrice: 145.00, productoId: productos[3].id },
                ]
            }
        }
    });
    console.log(`   ✓ 2 presupuestos\n`);

    // ==========================================
    // 15. PEDIDOS DE CLIENTE
    // ==========================================
    console.log('🛒 Creando Pedidos de Cliente...');
    const pedido1 = await prisma.pedido.create({
        data: {
            numero: 'PED-2024-051',
            estado: 'Pendiente',
            notas: 'Entrega urgente',
            subtotal: 350.00,
            tax: 73.50,
            total: 423.50,
            clienteId: clientes[2].id,
            items: {
                create: [
                    { descripcion: 'Faldeta de Goma 15mm x 10 unidades', quantity: 10, unitPrice: 35.00, productoId: productos[1].id },
                ]
            }
        }
    });
    const pedido2 = await prisma.pedido.create({
        data: {
            numero: 'PED-2024-052',
            estado: 'En Producción',
            notas: 'Pedido recurrente mensual',
            subtotal: 267.50,
            tax: 56.18,
            total: 323.68,
            clienteId: clientes[3].id,
            items: {
                create: [
                    { descripcion: 'Plancha PVC 5mm x 10 unidades', quantity: 10, unitPrice: 18.75, productoId: productos[2].id },
                    { descripcion: 'Burlete Adhesivo 3m x 10 unidades', quantity: 10, unitPrice: 8.90, productoId: productos[5].id },
                ]
            }
        }
    });
    console.log(`   ✓ 2 pedidos de cliente\n`);

    // ==========================================
    // 16. PEDIDOS A PROVEEDOR
    // ==========================================
    console.log('📥 Creando Pedidos a Proveedor...');
    const pedidoProv1 = await prisma.pedidoProveedor.create({
        data: {
            material: 'Goma Natural',
            estado: 'Pendiente',
            tipo: 'NACIONAL',
            notas: 'Reposición de stock estándar',
            proveedorId: proveedores[0].id,
            bobinas: {
                create: [
                    { cantidad: 3, ancho: 500, largo: 100, espesor: 10, precioMetro: 8.50 },
                    { cantidad: 2, ancho: 800, largo: 80, espesor: 15, precioMetro: 12.00 },
                ]
            }
        }
    });
    const pedidoProv2 = await prisma.pedidoProveedor.create({
        data: {
            material: 'PVC',
            estado: 'En Tránsito',
            tipo: 'IMPORTACION',
            notas: 'Importación desde China',
            numeroContenedor: 'MSKU1234567',
            naviera: 'Maersk',
            fechaLlegadaEstimada: new Date('2024-03-15'),
            tasaCambio: 7.85,
            gastosTotales: 1250.00,
            proveedorId: proveedores[1].id,
            bobinas: {
                create: [
                    { cantidad: 10, ancho: 600, largo: 150, espesor: 5, precioMetro: 3.20 },
                ]
            }
        }
    });
    console.log(`   ✓ 2 pedidos a proveedor\n`);

    console.log('═══════════════════════════════════════');
    console.log('🎉 ¡Seed completado exitosamente!');
    console.log('═══════════════════════════════════════\n');
}

main()
    .catch((e) => {
        console.error('❌ Error durante el seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
