const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid'); 

const db = new PrismaClient();

// --- DATOS INICIALES FINALIZADOS (Se usarán para mapeos) ---

const CLIENTES_DATA = [
  { id: "cli-001", nombre: "Aldama", email: "aldama@contacto.es", telefono: "111", tier: "FABRICANTE" },
  { id: "cli-002", nombre: "Noli", email: "noli@contacto.es", telefono: "112", tier: "FABRICANTE" },
  { id: "cli-003", nombre: "Agruiz", email: "agruiz@contacto.es", telefono: "113", tier: "FABRICANTE" },
  { id: "cli-004", nombre: "Moresil", email: "moresil@contacto.es", telefono: "114", tier: "FABRICANTE" },
  { id: "cli-005", nombre: "Ferreteria Ubetense", email: "ubetense@ferreteria.es", telefono: "225", tier: "INTERMEDIARIO" },
  { id: "cli-006", nombre: "La Preferida", email: "preferida@contacto.es", telefono: "336", tier: "CLIENTE FINAL" },
  { id: "cli-007", nombre: "Antonio Artugal", email: "antonio@contacto.es", telefono: "337", tier: "CLIENTE FINAL" },
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
  { id: "prod-001", nombre: "Banda PVC 3mm Blanca Vulcanizada", modelo: "PVC B3 Vulcanizado", espesor: 3.0, largo: 1000, ancho: 150, precioUnitario: 50.00, pesoUnitario: 1.5, costo: 25.00, material: "PVC", fabricante: "Esbelt" },
  { id: "prod-002", nombre: "Faldeta Aldama Goma", modelo: "FAldG", espesor: 10.0, largo: 600, ancho: 500, precioUnitario: 20.00, pesoUnitario: 10.0, costo: 10.00, material: "GOMA", fabricante: "Aldama" },
  { id: "prod-003", nombre: "Perfil Goma Caramelo 6mm", modelo: "GCM-P06", espesor: 6.0, largo: 50, ancho: 50, precioUnitario: 18.00, pesoUnitario: 0.5, costo: 12.00, material: "GOMA CARAMELO", fabricante: "Aldama" },
  { id: "prod-004", nombre: "Junta Goma Verde Industrial", modelo: "GVI-J01", espesor: 4.0, largo: 100, ancho: 100, precioUnitario: 35.00, pesoUnitario: 0.8, costo: 25.00, material: "GOMA VERDE", fabricante: "Moresil" },
  { id: "prod-005", nombre: "Plantilla Aldama Rápida", modelo: "CLI-ALD-01", espesor: 5.0, largo: 30, ancho: 30, precioUnitario: 8.00, pesoUnitario: 0.1, costo: 3.50, material: "FIELTRO", fabricante: "Esbelt", clienteId: "cli-001" }
];

// *******************************************************************
// * CORRECCIÓN FINAL: INSERCIÓN SQL CON COLUMNA 'multiplicador'      *
// * Y 'gastoFijo' (ASUMIMOS QUE ESTAS SON LAS COLUMNAS REALES).     *
// *******************************************************************
const RAW_MARGENES_SQL = `
  INSERT INTO "ReglaMargen" 
    ("id", "base", "multiplicador", "gastoFijo", "descripcion", "tipo", "tipo_categoria", "tierCliente") 
  VALUES
    ('mrg-fab', 1.0, 1.50, 0.00, 'Margen para Fabricantes', 'Cliente', '', 'FABRICANTE'),
    ('mrg-int', 1.0, 1.75, 0.00, 'Margen para Intermediarios', 'Cliente', '', 'INTERMEDIARIO'),
    ('mrg-fin', 1.0, 2.00, 0.00, 'Margen para Cliente Final', 'Cliente', '', 'CLIENTE FINAL'),
    ('mrg-gen', 1.0, 1.40, 0.00, 'Margen General de Fallback', 'General', '', NULL);
`;


// --- FUNCIÓN PRINCIPAL DE SEEDING ---
async function main() {
  console.log("Iniciando SEEDING limpio de datos iniciales...");
  
  // Limpieza total
  await db.$transaction([
    db.movimientoStock.deleteMany(), db.stock.deleteMany(), db.bobinaPedido.deleteMany(),
    db.pedidoProveedor.deleteMany(), db.referenciaBobina.deleteMany(), db.precioEspecial.deleteMany(),
    db.descuentoTier.deleteMany(), db.reglaDescuento.deleteMany(), db.reglaMargen.deleteMany(),
    db.nota.deleteMany(), db.pedidoItem.deleteMany(), db.pedido.deleteMany(),
    db.presupuestoItem.deleteMany(), db.presupuesto.deleteMany(), db.producto.deleteMany(),
    db.cliente.deleteMany(), db.material.deleteMany(), db.fabricante.deleteMany(), db.proveedor.deleteMany(),
  ]);
  console.log('Limpieza inicial de tablas completada.');

  // --- 1. Mapeo de IDs (para productos) ---
  const fabricanteMap = new Map(FABRICANTES_DATA.map(f => [f.nombre, f.id]));
  const materialMap = new Map(MATERIALES_DATA.map(m => [m.nombre, m.id]));

  // --- 2. Inserción de modelos base (directa) ---
  for (const f of FABRICANTES_DATA) { await db.fabricante.create({ data: f }); }
  for (const m of MATERIALES_DATA) { await db.material.create({ data: m }); }
  for (const c of CLIENTES_DATA) { await db.cliente.create({ data: c }); }
  
  console.log(`- ${CLIENTES_DATA.length} clientes, ${FABRICANTES_DATA.length} fabricantes insertados.`);
  
  // --- 3. INSERCIÓN FORZADA DE REGLAS DE MARGEN VÍA SQL ---
  try {
     // EJECUCIÓN DEL SQL CORREGIDO CON COLUMNAS ANTIGUAS
     await db.$executeRawUnsafe(RAW_MARGENES_SQL);
     console.log('✅ Reglas de Margen insertadas exitosamente vía SQL directo.');
  } catch (error) {
     console.error('CRÍTICO: Fallo al insertar ReglaMargen vía SQL.');
     throw error;
  }
 
  // --- 4. Inserción de Productos ---
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
