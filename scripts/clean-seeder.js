const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid'); 

const db = new PrismaClient();

// --- DATOS INICIALES (MANTENIDOS) ---

const CLIENTES_DATA = [
  { id: "cli-001", nombre: "Aldama", email: "aldama@contacto.es", telefono: "111", categoria: "FABRICANTE" }, 
  { id: "cli-002", nombre: "Noli", email: "noli@contacto.es", telefono: "112", categoria: "FABRICANTE" }, 
  { id: "cli-003", nombre: "Agruiz", email: "agruiz@contacto.es", telefono: "113", categoria: "FABRICANTE" }, 
  { id: "cli-004", nombre: "Moresil", email: "moresil@contacto.es", telefono: "114", categoria: "FABRICANTE" }, 
  { id: "cli-005", nombre: "Ferreteria Ubetense", email: "ubetense@ferreteria.es", telefono: "225", categoria: "INTERMEDIARIO" }, 
  { id: "cli-006", nombre: "La Preferida", email: "preferida@contacto.es", telefono: "336", categoria: "CLIENTE FINAL" }, 
  { id: "cli-007", nombre: "Antonio Artugal", email: "antonio@contacto.es", telefono: "337", categoria: "CLIENTE FINAL" }, 
];

const FABRICANTES_DATA = [
  { id: "fab-esbelt", nombre: "Esbelt" },
  { id: "fab-siban", nombre: "Siban" },
  { id: "fab-rigalli", nombre: "Rigalli" },
  { id: "fab-aldama", nombre: "Aldama" }, 
  { id: "fab-moresil", nombre: "Moresil" }, 
];

const MATERIALES_DATA = [
  { id: "mat-pvc", nombre: "PVC" },
  { id: "mat-goma", nombre: "GOMA" },
  { id: "mat-fieltro", nombre: "FIELTRO" },
  { id: "mat-caramelo", nombre: "GOMA CARAMELO" },
  { id: "mat-verde", nombre: "GOMA VERDE" },
  { id: "mat-blanda", nombre: "GOMA BLANDA" },
];

const PRODUCTOS_DATA = [
  // Actualizamos Largo y Ancho a MM para que el cálculo sea correcto
  { id: "prod-001", nombre: "Banda PVC 3mm Blanca Vulcanizada", modelo: "PVC B3 Vulcanizado", espesor: 3.0, largo: 1000, ancho: 150, precioUnitario: 50.00, pesoUnitario: 1.5, costo: 25.00, material: "PVC", fabricante: "Esbelt" },
  { id: "prod-002", nombre: "Faldeta Aldama Goma", modelo: "FAldG", espesor: 10.0, largo: 600, ancho: 500, precioUnitario: 20.00, pesoUnitario: 10.0, costo: 10.00, material: "GOMA", fabricante: "Aldama" },
  { id: "prod-003", nombre: "Perfil Goma Caramelo 6mm", modelo: "GCM-P06", espesor: 6.0, largo: 50, ancho: 50, precioUnitario: 18.00, pesoUnitario: 0.5, costo: 12.00, material: "GOMA CARAMELO", fabricante: "Aldama" },
  { id: "prod-004", nombre: "Junta Goma Verde Industrial", modelo: "GVI-J01", espesor: 4.0, largo: 100, ancho: 100, precioUnitario: 35.00, pesoUnitario: 0.8, costo: 25.00, material: "GOMA VERDE", fabricante: "Moresil" },
  { id: "prod-005", nombre: "Plantilla Aldama Rápida", modelo: "CLI-ALD-01", espesor: 5.0, largo: 30, ancho: 30, precioUnitario: 8.00, pesoUnitario: 0.1, costo: 3.50, material: "FIELTRO", fabricante: "Esbelt", clienteId: "cli-001" }
];

const RAW_TARIFAS_DATA = [
  // ... (datos de tarifa sin cambios)
  { material: 'FIELTRO', espesor: 10.0, precio: 30.00, peso: 8.00 },
  { material: 'FIELTRO', espesor: 15.0, precio: 45.00, peso: 12.00 },
  { material: 'GOMA', espesor: 8.0, precio: 36.00, peso: 14.40 },
  { material: 'GOMA', espesor: 10.0, precio: 45.00, peso: 18.00 },
  { material: 'GOMA', espesor: 12.0, precio: 54.00, peso: 21.60 },
  { material: 'GOMA', espesor: 15.0, precio: 67.50, peso: 27.00 },
  { material: 'GOMA BLANDA', espesor: 2.0, precio: 8.00, peso: 2.00 },
  { material: 'GOMA BLANDA', espesor: 3.0, precio: 12.00, peso: 3.00 },
  { material: 'GOMA BLANDA', espesor: 6.0, precio: 24.00, peso: 6.00 },
  { material: 'GOMA CARAMELO', espesor: 6.0, precio: 36.00, peso: 7.20 },
  { material: 'GOMA CARAMELO', espesor: 8.0, precio: 48.00, peso: 9.60 },
  { material: 'GOMA CARAMELO', espesor: 10.0, precio: 60.00, peso: 12.00 },
  { material: 'GOMA CARAMELO', espesor: 12.0, precio: 72.00, peso: 14.40 },
  { material: 'GOMA VERDE', espesor: 8.0, precio: 44.00, peso: 12.80 },
  { material: 'GOMA VERDE', espesor: 10.0, precio: 55.00, peso: 16.00 },
  { material: 'GOMA VERDE', espesor: 12.0, precio: 66.00, peso: 19.20 },
  { material: 'PVC', espesor: 2.0, precio: 16.00, peso: 2.80 },
  { material: 'PVC', espesor: 3.0, precio: 24.00, peso: 4.20 },
];

// --- CORRECCIÓN CLAVE: Nuevos valores de Gasto Fijo y ELIMINACIÓN DE FALLBACK ---
const RAW_MARGENES_SQL = `
  INSERT INTO "ReglaMargen" 
    ("id", "base", "multiplicador", "gastoFijo", "descripcion", "tipo", "tipo_categoria", "tierCliente") 
  VALUES
    ('mrg-fab', 'FABRICANTE', 1.40, 4.00, 'Margen para Fabricantes', 'Cliente', NULL, 'FABRICANTE'),
    ('mrg-int', 'INTERMEDIARIO', 1.70, 7.00, 'Margen para Intermediarios', 'Cliente', NULL, 'INTERMEDIARIO'),
    ('mrg-fin', 'CLIENTE_FINAL', 2.00, 9.00, 'Margen para Cliente Final', 'Cliente', NULL, 'CLIENTE FINAL');
    -- Eliminado: GENERAL_FALLBACK
`;

const CONFIG_DATA = [
    { key: 'iva_rate', value: '0.21' },
];

// ... (Resto de datos de prueba sin cambios)

const PRESUPUESTOS_DATA = [
  { 
      id: "pre-001", numero: "2025-001", estado: "Aceptado", clienteId: "cli-001",
      subtotal: 50.00, tax: 10.50, total: 60.50, notes: "Aceptado y convertido a pedido",
      items: [{ description: "Banda PVC 3mm Blanca Vulcanizada", quantity: 1, unitPrice: 50.00, productoId: "prod-001" }]
  },
  { 
      id: "pre-002", numero: "2025-002", estado: "Borrador", clienteId: "cli-005",
      subtotal: 90.00, tax: 18.90, total: 108.90, notes: "Pendiente de revisión del intermediario.",
      items: [{ description: "Perfil Goma Caramelo 6mm", quantity: 5, unitPrice: 18.00, productoId: "prod-003" }]
  },
  { 
      id: "pre-003", numero: "2025-003", estado: "Rechazado", clienteId: "cli-006",
      subtotal: 70.00, tax: 14.70, total: 84.70, notes: "Cliente no conforme con el precio final.",
      items: [{ description: "Junta Goma Verde Industrial", quantity: 2, unitPrice: 35.00, productoId: "prod-004" }]
  },
];

const PEDIDOS_DATA = [
  { 
      id: "ped-001", numero: "PED-2025-001", estado: "Enviado", clienteId: "cli-001",
      subtotal: 50.00, tax: 10.50, total: 60.50, presupuestoId: "pre-001",
      items: [{ description: "Banda PVC 3mm Blanca Vulcanizada", quantity: 1, unitPrice: 50.00, pesoUnitario: 1.5, productoId: "prod-001" }]
  },
  { 
      id: "ped-002", numero: "PED-2025-002", estado: "Pendiente", clienteId: "cli-007",
      subtotal: 200.00, tax: 42.00, total: 242.00, 
      items: [{ description: "Faldeta Aldama Goma", quantity: 10, unitPrice: 20.00, pesoUnitario: 10.0, productoId: "prod-002" }]
  },
];


// --- DATOS AÑADIDOS: PROVEEDORES Y PEDIDOS PROVEEDOR ---

const PROVEEDORES_DATA = [
  { id: "prov-001", nombre: "Nacional Metales S.A.", email: "compras@nm.es", telefono: "900111222", direccion: "C/ Metal, 1" },
  { id: "prov-002", nombre: "Global Imports Corp", email: "sales@gic.com", telefono: "+86 512 8888", direccion: "Shanghai Port" },
];

const REFERENCIAS_BOBINA_DATA = [
    { id: "ref-ep250", referencia: "EP 250/2 2+1.5", ancho: 1500, lonas: 2, pesoPorMetroLineal: 2.0 },
    { id: "ref-ep400", referencia: "EP400/3 3+1.5", ancho: 1200, lonas: 3, pesoPorMetroLineal: 4.45 },
];

const PEDIDOS_PROVEEDOR_DATA = [
    // PP-001: Nacional - Recibido (Simulación de stock que ha entrado)
    {
        id: "pp-001", material: "GOMA", tipo: "NACIONAL", estado: "Recibido", proveedorId: "prov-001",
        gastosTotales: 50.00, tasaCambio: 1.00, notas: "Urgente, entregado por la mañana. Se prorroateó 0.50 €/m.",
        bobinas: [
            // Bobina de 100m. Precio Unitario Final: 10.50 €/m.
            { largo: 100, ancho: 500, espesor: 10.0, precioMetro: 10.00, costoFinalMetro: 10.50, referenciaId: null }, 
        ]
    },
    // PP-002: Importación - Pendiente (Contenedor en camino)
    {
        id: "pp-002", material: "PVC", tipo: "IMPORTACION", estado: "Pendiente", proveedorId: "prov-002",
        gastosTotales: 1500.00, tasaCambio: 1.08, notas: "Contenedor completo, ETA firme. Incluye coste de aduanas.",
        numeroContenedor: "MSCU9876543", naviera: "MSC", 
        fechaLlegadaEstimada: new Date(Date.now() + 20 * 86400000).toISOString(), // 20 días en el futuro
        bobinas: [
            { largo: 500, ancho: 1500, espesor: 3.0, precioMetro: 2.50, color: "Blanco", referenciaId: "ref-ep250" }, 
            { largo: 300, ancho: 1200, espesor: 2.0, precioMetro: 2.00, color: "Verde", referenciaId: "ref-ep400" },
        ]
    },
];

const STOCK_DATA = [
    { 
        id: "stk-001", material: "GOMA", espesor: 10.0, metrosDisponibles: 100.0, 
        proveedor: "Nacional Metales S.A.", ubicacion: "Rack A1", costoMetro: 10.50, stockMinimo: 50.0 
    }
];

const MOVIMIENTOS_DATA = [
    { tipo: "Entrada", cantidad: 100.0, referencia: "Pedido Prov: pp-001", stockId: "stk-001" }
];

// --- FUNCIÓN PRINCIPAL DE SEEDING ---
async function main() {
  console.log("Iniciando SEEDING limpio de datos iniciales...");
  
  // Limpieza total
  await db.$transaction([
    db.movimientoStock.deleteMany(), db.stock.deleteMany(), db.bobinaPedido.deleteMany(),
    db.pedidoProveedor.deleteMany(), db.referenciaBobina.deleteMany(), db.precioEspecial.deleteMany(),
    db.descuentoTier.deleteMany(), db.reglaDescuento.deleteMany(), db.reglaMargen.deleteMany(),
    db.nota.deleteMany(), 
    db.pedidoItem.deleteMany(), db.pedido.deleteMany(),
    db.presupuestoItem.deleteMany(), db.presupuesto.deleteMany(), 
    db.producto.deleteMany(),
    db.cliente.deleteMany(), db.material.deleteMany(), db.fabricante.deleteMany(), db.proveedor.deleteMany(),
    db.tarifaMaterial.deleteMany(), 
    db.config.deleteMany(), 
  ]);
  console.log('Limpieza inicial de tablas completada.');

  // --- 1. Mapeo de IDs (para productos) ---
  const fabricanteMap = new Map(FABRICANTES_DATA.map(f => [f.nombre, f.id]));
  const materialMap = new Map(MATERIALES_DATA.map(m => [m.nombre, m.id]));

  // --- 2. Inserción de modelos base (directa) ---
  for (const f of FABRICANTES_DATA) { await db.fabricante.create({ data: f }); }
  for (const m of MATERIALES_DATA) { await db.material.create({ data: m }); }
  
  // Clientes
  for (const c of CLIENTES_DATA) { 
      await db.cliente.create({ 
          data: {
              id: c.id,
              nombre: c.nombre,
              email: c.email,
              direccion: c.direccion,
              telefono: c.telefono,
              tier: c.categoria 
          }
      }); 
  }
  
  // Proveedores
  for (const p of PROVEEDORES_DATA) { await db.proveedor.create({ data: p }); }
  console.log(`- ${PROVEEDORES_DATA.length} proveedores insertados.`);

  // Referencias de Bobina
  for (const r of REFERENCIAS_BOBINA_DATA) {
     await db.referenciaBobina.create({ data: {
         id: r.id,
         referencia: r.referencia,
         ancho: r.ancho,
         lonas: r.lonas,
         pesoPorMetroLineal: r.pesoPorMetroLineal,
     }});
  }
  console.log(`- ${REFERENCIAS_BOBINA_DATA.length} referencias de bobina insertadas.`);


  // Configuración (IVA)
  for (const c of CONFIG_DATA) { await db.config.create({ data: c }); }
  console.log(`- ${CONFIG_DATA.length} item(s) de configuración insertado(s).`);

  console.log(`- ${CLIENTES_DATA.length} clientes, ${FABRICANTES_DATA.length} fabricantes insertados.`);
  
  // --- 3. INSERCIÓN FORZADA DE REGLAS DE MARGEN VÍA SQL ---
  try {
     await db.$executeRawUnsafe(RAW_MARGENES_SQL);
     console.log('✅ Reglas de Margen insertadas exitosamente vía SQL directo.');
  } catch (error) {
     console.error('CRÍTICO: Fallo al insertar ReglaMargen vía SQL.');
     throw error;
  }
 
  // --- 4. INSERCIÓN DE TARIFAS DE MATERIAL VÍA SQL ---
  try {
     const TARIFAS_SQL = RAW_TARIFAS_DATA.map(t => 
       `('${uuidv4()}', '${t.material}', ${t.espesor}, ${t.precio}, ${t.peso})`
     ).join(',\n');

     const FINAL_TARIFAS_SQL = `INSERT INTO "TarifaMaterial" ("id", "material", "espesor", "precio", "peso") VALUES ${TARIFAS_SQL};`;

     await db.$executeRawUnsafe(FINAL_TARIFAS_SQL);
     console.log(`✅ ${RAW_TARIFAS_DATA.length} Tarifas de Material insertadas exitosamente vía SQL directo.`);
  } catch (error) {
     console.error('CRÍTICO: Fallo al insertar Tarifas de Material vía SQL.');
     throw error;
  }
  
  // --- 5. Inserción de Productos ---
  for (const p of PRODUCTOS_DATA) {
    await db.producto.create({
      data: {
        id: p.id,
        nombre: p.nombre,
        referenciaFabricante: p.modelo,
        espesor: parseFloat(p.espesor) || 0,
        largo: parseFloat(p.largo) || 0,
        ancho: parseFloat(p.ancho) || 0,
        precioUnitario: parseFloat(p.precioUnitario) || 0,
        pesoUnitario: parseFloat(p.pesoUnitario) || 0,
        costoUnitario: parseFloat(p.costo) || 0,
        tieneTroquel: p.tieneTroquel || false,
        clienteId: p.clienteId || null,
        fabricanteId: fabricanteMap.get(p.fabricante),
        materialId: materialMap.get(p.material),
      },
    });
  }
  console.log(`- ${PRODUCTOS_DATA.length} productos insertados.`);
  
  // --- Inserción de Presupuestos de Prueba ---
  for (const q of PRESUPUESTOS_DATA) {
    await db.presupuesto.create({
      data: {
        id: q.id,
        numero: q.numero,
        fechaCreacion: new Date(Date.now() - Math.floor(Math.random() * 86400000)).toISOString(), 
        estado: q.estado,
        clienteId: q.clienteId,
        notas: q.notes,
        subtotal: q.subtotal,
        tax: q.tax,
        total: q.total,
        items: {
          create: q.items.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            productoId: item.productoId,
          })),
        },
      },
    });
  }
  console.log(`- ${PRESUPUESTOS_DATA.length} presupuestos de prueba insertados.`);
  
  // --- Inserción de Pedidos de Prueba ---
  for (const p of PEDIDOS_DATA) {
    await db.pedido.create({
      data: {
        id: p.id,
        numero: p.numero,
        fechaCreacion: new Date(Date.now() - Math.floor(Math.random() * 86400000)).toISOString(),
        estado: p.estado,
        clienteId: p.clienteId,
        notas: p.notes,
        subtotal: p.subtotal,
        tax: p.tax,
        total: p.total,
        presupuestoId: p.presupuestoId || null, 
        items: {
          create: p.items.map(item => ({
            descripcion: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            pesoUnitario: item.pesoUnitario || 0, 
            productoId: item.productoId,
          })),
        },
      },
    });
  }
  console.log(`- ${PEDIDOS_DATA.length} pedidos de cliente de prueba insertados.`);

  // --- AÑADIDO: Inserción de Pedidos a Proveedor ---
  for (const pp of PEDIDOS_PROVEEDOR_DATA) {
      const pedidoData = {
        id: pp.id,
        material: pp.material,
        tipo: pp.tipo,
        estado: pp.estado,
        proveedorId: pp.proveedorId,
        gastosTotales: pp.gastosTotales,
        tasaCambio: pp.tasaCambio,
        notas: pp.notas,
        numeroContenedor: pp.numeroContenedor || null,
        naviera: pp.naviera || null,
        fechaLlegadaEstimada: pp.fechaLlegadaEstimada || null,
        bobinas: {
          create: pp.bobinas.map(b => ({
            referenciaId: b.referenciaId || null,
            ancho: b.ancho,
            largo: b.largo,
            espesor: b.espesor,
            precioMetro: b.precioMetro,
            color: b.color || null,
            costoFinalMetro: b.costoFinalMetro || null,
          })),
        },
      };
      await db.pedidoProveedor.create({ data: pedidoData });
  }
  console.log(`- ${PEDIDOS_PROVEEDOR_DATA.length} pedidos a proveedor de prueba insertados.`);

  // --- AÑADIDO: Inserción de Stock y Movimiento (solo para pedidos 'Recibidos') ---
  for (const s of STOCK_DATA) {
      await db.stock.create({ data: s });
  }
  for (const m of MOVIMIENTOS_DATA) {
      await db.movimientoStock.create({ data: m });
  }
  console.log(`- ${STOCK_DATA.length} entradas de stock de prueba insertadas.`);


  console.log('¡SEEDING DE DATOS BASE COMPLETADO!');

}

main()
  .catch((e) => {
    console.error("Error durante el SEEDING:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
    console.log("Desconectado de la base de datos. SEEDING FINALIZADO.");
  });
