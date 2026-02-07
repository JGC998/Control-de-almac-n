// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Tarifas Pallex 2026
const TARIFAS_PALLEX_2026 = [
    { provincia: "ÁLAVA", codigoPostal: "01", parcel: 46, miniQuarter: 49, miniLight: 58, quarter: 52, light: 72, half: 64, megaLight: 77, full: 80, megaFull: 87 },
    { provincia: "ÁVILA", codigoPostal: "05", parcel: 46, miniQuarter: 48, miniLight: 56, quarter: 50, light: 72, half: 60, megaLight: 70, full: 74, megaFull: 82 },
    { provincia: "BADAJOZ", codigoPostal: "06", parcel: 50, miniQuarter: 53, miniLight: 63, quarter: 57, light: 80, half: 70, megaLight: 86, full: 92, megaFull: 101 },
    { provincia: "BARCELONA", codigoPostal: "08", parcel: 52, miniQuarter: 56, miniLight: 67, quarter: 60, light: 84, half: 75, megaLight: 94, full: 99, megaFull: 111 },
    { provincia: "BARCELONA NORTE", codigoPostal: "A", parcel: 55, miniQuarter: 58, miniLight: 70, quarter: 62, light: 88, half: 78, megaLight: 96, full: 101, megaFull: 114 },
    { provincia: "BURGOS", codigoPostal: "09", parcel: 50, miniQuarter: 53, miniLight: 63, quarter: 57, light: 79, half: 70, megaLight: 86, full: 91, megaFull: 101 },
    { provincia: "CÁCERES", codigoPostal: "10", parcel: 51, miniQuarter: 55, miniLight: 64, quarter: 58, light: 80, half: 72, megaLight: 87, full: 92, megaFull: 103 },
    { provincia: "CASTELLÓN", codigoPostal: "12", parcel: 47, miniQuarter: 50, miniLight: 59, quarter: 53, light: 74, half: 65, megaLight: 80, full: 83, megaFull: 90 },
    { provincia: "CIUDAD REAL", codigoPostal: "13", parcel: 46, miniQuarter: 48, miniLight: 56, quarter: 50, light: 72, half: 60, megaLight: 70, full: 74, megaFull: 82 },
    { provincia: "A CORUÑA", codigoPostal: "15", parcel: 55, miniQuarter: 58, miniLight: 70, quarter: 62, light: 88, half: 78, megaLight: 96, full: 101, megaFull: 114 },
    { provincia: "CUENCA", codigoPostal: "16", parcel: 49, miniQuarter: 52, miniLight: 62, quarter: 56, light: 78, half: 67, megaLight: 83, full: 87, megaFull: 98 },
    { provincia: "GERONA", codigoPostal: "17", parcel: 55, miniQuarter: 58, miniLight: 70, quarter: 62, light: 90, half: 79, megaLight: 97, full: 102, megaFull: 115 },
    { provincia: "GUADALAJARA", codigoPostal: "19", parcel: 45, miniQuarter: 46, miniLight: 55, quarter: 49, light: 66, half: 58, megaLight: 67, full: 70, megaFull: 81 },
    { provincia: "GUIPUZCOA", codigoPostal: "20", parcel: 50, miniQuarter: 53, miniLight: 63, quarter: 57, light: 80, half: 72, megaLight: 86, full: 92, megaFull: 102 },
    { provincia: "HUESCA", codigoPostal: "22", parcel: 49, miniQuarter: 52, miniLight: 62, quarter: 56, light: 76, half: 68, megaLight: 83, full: 87, megaFull: 99 },
    { provincia: "HUESCA PIRINEO", codigoPostal: "B", parcel: 51, miniQuarter: 56, miniLight: 64, quarter: 58, light: 81, half: 73, megaLight: 87, full: 93, megaFull: 104 },
    { provincia: "LEÓN", codigoPostal: "24", parcel: 48, miniQuarter: 51, miniLight: 60, quarter: 55, light: 76, half: 66, megaLight: 82, full: 85, megaFull: 92 },
    { provincia: "LÉRIDA", codigoPostal: "25", parcel: 48, miniQuarter: 51, miniLight: 60, quarter: 55, light: 76, half: 66, megaLight: 82, full: 85, megaFull: 92 },
    { provincia: "LÉRIDA PIRINEO", codigoPostal: "C", parcel: 55, miniQuarter: 59, miniLight: 74, quarter: 66, light: 96, half: 85, megaLight: 106, full: 113, megaFull: 122 },
    { provincia: "LA RIOJA", codigoPostal: "26", parcel: 46, miniQuarter: 48, miniLight: 56, quarter: 50, light: 72, half: 61, megaLight: 70, full: 74, megaFull: 83 },
    { provincia: "LUGO", codigoPostal: "27", parcel: 53, miniQuarter: 57, miniLight: 69, quarter: 61, light: 88, half: 78, megaLight: 96, full: 101, megaFull: 114 },
    { provincia: "MADRID", codigoPostal: "28", parcel: 44, miniQuarter: 45, miniLight: 55, quarter: 49, light: 64, half: 57, megaLight: 66, full: 66, megaFull: 78 },
    { provincia: "MURCIA", codigoPostal: "30", parcel: 46, miniQuarter: 49, miniLight: 58, quarter: 52, light: 73, half: 65, megaLight: 78, full: 81, megaFull: 88 },
    { provincia: "NAVARRA", codigoPostal: "31", parcel: 46, miniQuarter: 49, miniLight: 58, quarter: 52, light: 73, half: 65, megaLight: 78, full: 81, megaFull: 88 },
    { provincia: "ORENSE", codigoPostal: "32", parcel: 53, miniQuarter: 57, miniLight: 70, quarter: 61, light: 88, half: 78, megaLight: 97, full: 102, megaFull: 114 },
    { provincia: "PRINCIPADO ASTURIAS", codigoPostal: "33", parcel: 51, miniQuarter: 55, miniLight: 64, quarter: 58, light: 80, half: 72, megaLight: 87, full: 92, megaFull: 103 },
    { provincia: "PALENCIA", codigoPostal: "34", parcel: 46, miniQuarter: 49, miniLight: 59, quarter: 52, light: 73, half: 65, megaLight: 78, full: 81, megaFull: 88 },
    { provincia: "PONTEVEDRA", codigoPostal: "36", parcel: 53, miniQuarter: 57, miniLight: 70, quarter: 61, light: 88, half: 78, megaLight: 96, full: 101, megaFull: 114 },
    { provincia: "SALAMANCA", codigoPostal: "37", parcel: 46, miniQuarter: 48, miniLight: 57, quarter: 50, light: 72, half: 61, megaLight: 72, full: 75, megaFull: 83 },
    { provincia: "CANTABRIA", codigoPostal: "39", parcel: 49, miniQuarter: 52, miniLight: 62, quarter: 56, light: 77, half: 67, megaLight: 82, full: 86, megaFull: 98 },
    { provincia: "SEGOVIA", codigoPostal: "40", parcel: 45, miniQuarter: 46, miniLight: 56, quarter: 49, light: 66, half: 58, megaLight: 68, full: 72, megaFull: 81 },
    { provincia: "SORIA", codigoPostal: "42", parcel: 49, miniQuarter: 52, miniLight: 63, quarter: 56, light: 78, half: 68, megaLight: 84, full: 88, megaFull: 99 },
    { provincia: "TARRAGONA", codigoPostal: "43", parcel: 55, miniQuarter: 58, miniLight: 73, quarter: 62, light: 90, half: 79, megaLight: 98, full: 103, megaFull: 115 },
    { provincia: "TERUEL", codigoPostal: "44", parcel: 51, miniQuarter: 55, miniLight: 65, quarter: 58, light: 81, half: 73, megaLight: 90, full: 94, megaFull: 104 },
    { provincia: "TOLEDO", codigoPostal: "45", parcel: 45, miniQuarter: 46, miniLight: 56, quarter: 49, light: 66, half: 58, megaLight: 68, full: 72, megaFull: 81 },
    { provincia: "VALLADOLID", codigoPostal: "47", parcel: 46, miniQuarter: 48, miniLight: 57, quarter: 50, light: 72, half: 61, megaLight: 72, full: 75, megaFull: 83 },
    { provincia: "VIZCAYA", codigoPostal: "48", parcel: 50, miniQuarter: 53, miniLight: 64, quarter: 58, light: 80, half: 72, megaLight: 87, full: 93, megaFull: 102 },
    { provincia: "ZAMORA", codigoPostal: "49", parcel: 49, miniQuarter: 52, miniLight: 63, quarter: 57, light: 78, half: 68, megaLight: 83, full: 87, megaFull: 99 },
    { provincia: "ZARAGOZA", codigoPostal: "50", parcel: 46, miniQuarter: 48, miniLight: 57, quarter: 51, light: 73, half: 62, megaLight: 72, full: 75, megaFull: 84 },
    { provincia: "ALBACETE", codigoPostal: "02", parcel: 46, miniQuarter: 47, miniLight: 54, quarter: 49, light: 69, half: 59, megaLight: 71, full: 72, megaFull: 81 },
    { provincia: "ALICANTE", codigoPostal: "03", parcel: 47, miniQuarter: 48, miniLight: 57, quarter: 51, light: 70, half: 63, megaLight: 75, full: 80, megaFull: 86 },
    { provincia: "VALENCIA", codigoPostal: "46", parcel: 46, miniQuarter: 47, miniLight: 54, quarter: 49, light: 69, half: 59, megaLight: 71, full: 72, megaFull: 81 },
    { provincia: "ALMERÍA", codigoPostal: "04", parcel: 41, miniQuarter: 42, miniLight: 46, quarter: 44, light: 56, half: 51, megaLight: 61, full: 64, megaFull: 71 },
    { provincia: "CÁDIZ", codigoPostal: "11", parcel: 43, miniQuarter: 44, miniLight: 52, quarter: 47, light: 62, half: 54, megaLight: 65, full: 67, megaFull: 76 },
    { provincia: "CÓRDOBA", codigoPostal: "14", parcel: 35, miniQuarter: 36, miniLight: 38, quarter: 37, light: 40, half: 39, megaLight: 41, full: 42, megaFull: 44 },
    { provincia: "GRANADA", codigoPostal: "18", parcel: 41, miniQuarter: 42, miniLight: 46, quarter: 44, light: 58, half: 51, megaLight: 61, full: 64, megaFull: 71 },
    { provincia: "HUELVA", codigoPostal: "21", parcel: 42, miniQuarter: 43, miniLight: 49, quarter: 45, light: 59, half: 52, megaLight: 62, full: 65, megaFull: 72 },
    { provincia: "JAÉN", codigoPostal: "23", parcel: 40, miniQuarter: 41, miniLight: 46, quarter: 43, light: 57, half: 50, megaLight: 60, full: 63, megaFull: 69 },
    { provincia: "MÁLAGA", codigoPostal: "29", parcel: 39, miniQuarter: 40, miniLight: 47, quarter: 43, light: 56, half: 49, megaLight: 59, full: 62, megaFull: 67 },
    { provincia: "SEVILLA", codigoPostal: "41", parcel: 41, miniQuarter: 42, miniLight: 46, quarter: 44, light: 56, half: 51, megaLight: 61, full: 64, megaFull: 71 },
    { provincia: "MALLORCA", codigoPostal: "07A", parcel: 120, miniQuarter: 140, miniLight: 166, quarter: 150, light: 210, half: 179, megaLight: 216, full: 233, megaFull: 264 },
    { provincia: "MENORCA", codigoPostal: "07B", parcel: 150, miniQuarter: 171, miniLight: 196, quarter: 179, light: 238, half: 210, megaLight: 246, full: 264, megaFull: 293 },
    { provincia: "IBIZA", codigoPostal: "07C", parcel: 120, miniQuarter: 140, miniLight: 166, quarter: 150, light: 210, half: 179, megaLight: 216, full: 233, megaFull: 264 },
    { provincia: "FORMENTERA", codigoPostal: "07D", parcel: 200, miniQuarter: 230, miniLight: 255, quarter: 239, light: 300, half: 269, megaLight: 306, full: 323, megaFull: 353 },
    { provincia: "CANARIAS ISLAS MAYORES", codigoPostal: "35/38A", parcel: 180, miniQuarter: 204, miniLight: 255, quarter: 215, light: 281, half: 266, megaLight: 305, full: 343, megaFull: 394 },
    { provincia: "CANARIAS ISLAS MENORES", codigoPostal: "35/38B", parcel: 215, miniQuarter: 245, miniLight: 316, quarter: 256, light: 362, half: 326, megaLight: 398, full: 437, megaFull: 508 },
    { provincia: "CEUTA", codigoPostal: "51", parcel: 205, miniQuarter: 235, miniLight: 260, quarter: 244, light: 325, half: 294, megaLight: 331, full: 348, megaFull: 378 },
    { provincia: "MELILLA", codigoPostal: "52", parcel: 144, miniQuarter: 154, miniLight: 204, quarter: 169, light: 200, half: 179, megaLight: 216, full: 236, megaFull: 249 },
    { provincia: "ANDORRA", codigoPostal: "AD", parcel: 147, miniQuarter: 166, miniLight: 193, quarter: 176, light: 235, half: 207, megaLight: 243, full: 261, megaFull: 290 },
    { provincia: "GIBRALTAR", codigoPostal: "GX", parcel: 115, miniQuarter: 135, miniLight: 196, quarter: 154, light: 221, half: 211, megaLight: 230, full: 244, megaFull: 276 },
    { provincia: "PORTUGAL", codigoPostal: "PT", parcel: 58, miniQuarter: 62, miniLight: 80, quarter: 69, light: 101, half: 91, megaLight: 103, full: 120, megaFull: 133 }
];

async function main() {
    console.log('🌱 Iniciando seed EXTENDIDO (Cobertura 100%) de la base de datos...\n');

    // 0. LIMPIEZA DE OPERACIONES (Para evitar duplicados)
    console.log('🧹 Limpiando tablas de operaciones...');
    await prisma.pedidoItem.deleteMany();
    await prisma.pedido.deleteMany();
    await prisma.presupuestoItem.deleteMany();
    await prisma.presupuesto.deleteMany();
    await prisma.bobinaPedido.deleteMany();
    await prisma.pedidoProveedor.deleteMany();
    await prisma.movimientoStock.deleteMany();
    await prisma.documento.deleteMany();
    await prisma.nota.deleteMany();
    await prisma.presupuestoTemplate.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.producto_Old.deleteMany();
    console.log('   ✓ Tablas de operaciones limpiadas\n');

    // ==========================================
    // 1. CONFIGURACIÓN DEL SISTEMA
    // ==========================================
    console.log('⚙️ Configurando Sistema...');

    // Config
    await prisma.config.upsert({ where: { key: 'IVA' }, update: {}, create: { key: 'IVA', value: '21' } });
    await prisma.config.upsert({ where: { key: 'MONEDA' }, update: {}, create: { key: 'MONEDA', value: 'EUR' } });
    await prisma.config.upsert({ where: { key: 'EMPRESA_NOMBRE' }, update: {}, create: { key: 'EMPRESA_NOMBRE', value: 'Control de Almacén S.L.' } });

    // Sequences
    await prisma.sequence.upsert({ where: { name_year: { name: 'presupuesto', year: 2026 } }, update: {}, create: { name: 'presupuesto', year: 2026, value: 0 } });
    await prisma.sequence.upsert({ where: { name_year: { name: 'pedido', year: 2026 } }, update: {}, create: { name: 'pedido', year: 2026, value: 0 } });

    // Reglas Margen
    const reglas = [
        { base: 'ESTANDAR', multiplicador: 1.35, gastoFijo: 5.00, descripcion: 'Margen estándar del 35%' },
        { base: 'PREMIUM', multiplicador: 1.50, gastoFijo: 0.00, descripcion: 'Margen premium del 50%' },
        { base: 'MAYORISTA', multiplicador: 1.20, gastoFijo: 2.00, descripcion: 'Margen mayorista del 20%' },
        { base: 'FABRICANTE', multiplicador: 1.15, gastoFijo: 0.00, descripcion: 'Margen mínimo para fabricantes' },
    ];
    for (const reg of reglas) {
        await prisma.reglaMargen.upsert({ where: { base: reg.base }, update: {}, create: reg });
    }

    // Config Paletizado
    await prisma.configPaletizado.deleteMany({});
    await prisma.configPaletizado.createMany({
        data: [
            { tipo: 'EUROPEO', costePale: 5.00, costeFilm: 0.538, costeFleje: 0.183, costePrecinto: 0.0147 },
            { tipo: 'MEDIO', costePale: 2.00, costeFilm: 0.538, costeFleje: 0.183, costePrecinto: 0.0147 }
        ]
    });

    // Tarifas Transporte
    await prisma.tarifaTransporte.deleteMany({});
    await prisma.tarifaTransporte.createMany({ data: TARIFAS_PALLEX_2026 });

    // Tacos
    const tacosData = [
        { tipo: 'RECTO', altura: 10, precioMetro: 2.50 }, { tipo: 'RECTO', altura: 20, precioMetro: 3.00 },
        { tipo: 'RECTO', altura: 30, precioMetro: 3.50 }, { tipo: 'RECTO', altura: 40, precioMetro: 4.00 },
        { tipo: 'RECTO', altura: 50, precioMetro: 4.50 }, { tipo: 'RECTO', altura: 60, precioMetro: 5.00 },
        { tipo: 'RECTO', altura: 70, precioMetro: 5.50 }, { tipo: 'RECTO', altura: 80, precioMetro: 6.00 },
        { tipo: 'RECTO', altura: 100, precioMetro: 7.00 },
        { tipo: 'INCLINADO', altura: 10, precioMetro: 2.80 }, { tipo: 'INCLINADO', altura: 20, precioMetro: 3.30 },
        { tipo: 'INCLINADO', altura: 30, precioMetro: 3.80 }, { tipo: 'INCLINADO', altura: 40, precioMetro: 4.30 },
        { tipo: 'INCLINADO', altura: 50, precioMetro: 4.80 }, { tipo: 'INCLINADO', altura: 60, precioMetro: 5.30 },
        { tipo: 'INCLINADO', altura: 70, precioMetro: 5.80 }, { tipo: 'INCLINADO', altura: 80, precioMetro: 6.30 },
        { tipo: 'INCLINADO', altura: 100, precioMetro: 7.50 },
    ];
    for (const taco of tacosData) {
        await prisma.taco.upsert({
            where: { tipo_altura: { tipo: taco.tipo, altura: taco.altura } },
            update: { precioMetro: taco.precioMetro, activo: true },
            create: taco,
        });
    }

    // Audit Log
    await prisma.auditLog.create({
        data: {
            action: 'CREATE',
            entity: 'System',
            entityId: 'SEED',
            details: { message: 'Database initialization' },
            user: 'System'
        }
    });

    console.log('   ✓ Configuración y Logs creados\n');


    // ==========================================
    // 2. CATÁLOGOS BASE
    // ==========================================
    console.log('📦 Creando Catálogos...');

    // Fabricantes
    await Promise.all(['Bridgestone', 'Continental', 'Dunlop', 'Goodyear', 'Michelin'].map(nombre =>
        prisma.fabricante.upsert({ where: { nombre }, update: {}, create: { nombre } })
    ));

    // Materiales
    const materialesNombres = ['Goma Natural', 'Goma Sintética', 'Fieltro', 'PVC', 'Neopreno', 'Silicona', 'Caucho EPDM'];
    await Promise.all(materialesNombres.map(nombre =>
        prisma.material.upsert({ where: { nombre }, update: {}, create: { nombre } })
    ));

    // Tarifas Material
    const coloresPVC = ['VERDE', 'BLANCO', 'AZUL', 'NEGRO'];
    const tarifasMat = [
        { material: 'Goma Natural', espesor: 5, precio: 12.50, peso: 1.2, color: null },
        { material: 'Goma Natural', espesor: 10, precio: 22.00, peso: 2.4, color: null },
        { material: 'Goma Sintética', espesor: 3, precio: 8.00, peso: 0.9, color: null },
        { material: 'Neopreno', espesor: 3, precio: 18.00, peso: 1.0, color: null },
    ];

    // Generar combinaciones para PVC
    coloresPVC.forEach(color => {
        tarifasMat.push(
            { material: 'PVC', espesor: 2, precio: 5.50, peso: 0.5, color },
            { material: 'PVC', espesor: 3, precio: 8.50, peso: 0.8, color },
            { material: 'PVC', espesor: 5, precio: 11.00, peso: 1.1, color }
        );
    });

    for (const t of tarifasMat) {
        await prisma.tarifaMaterial.upsert({
            where: { material_espesor_color: { material: t.material, espesor: t.espesor, color: t.color || "sin_color" } },
            update: { precio: t.precio, peso: t.peso },
            create: t
        }).catch(async () => await prisma.tarifaMaterial.create({ data: t }));
    }

    // Referencias Bobina
    const refsBobina = [
        { referencia: 'BOB-GN-500', ancho: 500, lonas: 2, pesoPorMetroLineal: 2.5 },
        { referencia: 'BOB-PVC-600', ancho: 600, lonas: 1, pesoPorMetroLineal: 1.5 },
    ];
    for (const r of refsBobina) {
        await prisma.referenciaBobina.upsert({
            where: { referencia_ancho_lonas: { referencia: r.referencia, ancho: r.ancho, lonas: r.lonas } },
            update: {},
            create: r
        });
    }

    // Notas (Tablón)
    await prisma.nota.createMany({
        data: [
            { content: '⚠️ Revisar stock de Neopreno' },
            { content: 'ℹ️ Mantenimiento programado para el viernes' },
            { content: '📞 Llamar a proveedor de Goma Natural' }
        ]
    });

    console.log('   ✓ Catálogos y Notas creados\n');


    // ==========================================
    // 3. TERCEROS Y PRODUCTOS
    // ==========================================
    console.log('👥 Creando Terceros, Productos y Stock...');

    // Clientes
    const cliente1 = await prisma.cliente.upsert({ where: { nombre: 'Industrias García S.A.' }, update: {}, create: { nombre: 'Industrias García S.A.', email: 'compras@industriasgarcia.es', telefono: '+34 91 555 1234', direccion: 'Madrid', categoria: 'FABRICANTE', tier: 'PREMIUM' } });
    const cliente2 = await prisma.cliente.upsert({ where: { nombre: 'Taller Mecánico Ruedas' }, update: {}, create: { nombre: 'Taller Mecánico Ruedas', email: 'taller@ruedas.com', telefono: '+34 956 333 222', direccion: 'Cádiz', categoria: 'CLIENTE FINAL', tier: 'BASIC' } });

    // Proveedores
    const prov1 = await prisma.proveedor.upsert({ where: { nombre: 'Gomas del Norte S.L.' }, update: {}, create: { nombre: 'Gomas del Norte S.L.', email: 'ventas@gomasnorte.es' } });
    const prov2 = await prisma.proveedor.upsert({ where: { nombre: 'Importaciones Chen Ltd.' }, update: {}, create: { nombre: 'Importaciones Chen Ltd.', email: 'sales@chen.cn' } });

    // Productos
    const prod1 = await prisma.producto.upsert({ where: { id: 1 }, update: {}, create: { nombre: 'Faldeta Goma 10mm', precio: 25.50, stock: 150, categoria: 'Goma' } });
    const prod2 = await prisma.producto.upsert({ where: { id: 2 }, update: {}, create: { nombre: 'Plancha PVC 5mm', precio: 18.75, stock: 200, categoria: 'PVC' } });
    const prod3 = await prisma.producto.upsert({ where: { id: 3 }, update: {}, create: { nombre: 'Junta Tórica Ø50', precio: 2.30, stock: 500, categoria: 'Juntas' } });

    // Stock
    const stock1 = await prisma.stock.create({ data: { material: 'Goma Natural', espesor: 10, metrosDisponibles: 250.5, proveedor: 'Gomas del Norte S.L.', costoMetro: 8.50 } });
    const stock2 = await prisma.stock.create({ data: { material: 'PVC', espesor: 5, metrosDisponibles: 320.0, proveedor: 'Importaciones Chen Ltd.', costoMetro: 4.00 } });

    // Movimientos Stock
    await prisma.movimientoStock.createMany({
        data: [
            { tipo: 'ENTRADA', cantidad: 300, stockId: stock1.id },
            { tipo: 'SALIDA', cantidad: 49.5, stockId: stock1.id },
            { tipo: 'ENTRADA', cantidad: 320, stockId: stock2.id }
        ]
    });

    // Producto Antiguo (Legacy)
    await prisma.producto_Old.create({
        data: {
            nombre: 'Producto Legacy 001',
            precioUnitario: 10.00,
            pesoUnitario: 1.5,
            clienteId: cliente1.id
        }
    });

    console.log('   ✓ Inventario y Terceros creados\n');


    // ==========================================
    // 4. OPERACIONES (Pedidos, Presupuestos, Prov)
    // ==========================================
    console.log('📋 Creando Operaciones...');

    // Pedido Venta
    const pedido = await prisma.pedido.create({
        data: {
            numero: 'PED-2026-001',
            estado: 'Pendiente',
            subtotal: 350.00, tax: 73.50, total: 423.50,
            clienteId: cliente1.id,
            items: { create: [{ descripcion: 'Faldeta Goma', quantity: 10, unitPrice: 35.00, productoId: prod1.id }] }
        }
    });

    // Presupuesto
    await prisma.presupuesto.create({
        data: {
            numero: 'PRES-2026-001',
            estado: 'Pendiente',
            subtotal: 100.00, tax: 21.00, total: 121.00,
            clienteId: cliente2.id,
            items: { create: [{ descripcion: 'Plancha PVC', quantity: 5, unitPrice: 20.00, productoId: prod2.id }] }
        }
    });

    // Pedido Proveedor
    const pedProv = await prisma.pedidoProveedor.create({
        data: {
            material: 'Goma Natural',
            estado: 'Pendiente',
            tipo: 'NACIONAL',
            proveedorId: prov1.id,
            bobinas: {
                create: [
                    { cantidad: 2, ancho: 500, largo: 100, espesor: 10, precioMetro: 8.50 }
                ]
            }
        }
    });

    // Plantilla Presupuesto
    await prisma.presupuestoTemplate.create({
        data: {
            nombre: 'Plantilla Estándar Taller',
            descripcion: 'Elementos básicos para taller mecánico',
            items: [
                { descripcion: 'Banda Goma 100x100', quantity: 1, unitPrice: 50 },
                { descripcion: 'Adhesivo Industrial', quantity: 2, unitPrice: 15 }
            ]
        }
    });

    // Documento
    await prisma.documento.create({
        data: {
            tipo: 'Plano',
            referencia: 'PLANO-2026-TEST',
            rutaArchivo: '/uploads/plano_test.pdf',
            productoId: prod1.id
        }
    });

    console.log('   ✓ Operaciones y Documentos creados\n');
    console.log('🎉 Seed (100% Cobertura) completado exitosamente!');
}

main()
    .catch((e) => {
        console.error('❌ Error durante el seed:', e);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
