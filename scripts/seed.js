const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const readData = (filename) => {
  try {
    const filePath = path.join(__dirname, '../src/data', filename);
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    console.warn(`⚠️ Aviso: No se encontró ${filename}, saltando...`);
    return [];
  }
};

async function main() {
  console.log('🌱 Iniciando Re-Semillado completo...');

  // 1. LIMPIEZA DE BD (Orden estricto por Foreign Keys)
  // Añade deleteMany para tablas nuevas si creas más
  const tables = [
    'movimientoStock', 'stock', 'bobinaPedido', 'pedidoProveedor', 
    'pedidoItem', 'presupuestoItem', 'precioEspecial', 'documento',
    'pedido', 'presupuesto', 'producto', 
    'descuentoTier', 'reglaDescuento', 'reglaMargen', 'tarifaMaterial', 'referenciaBobina',
    'proveedor', 'cliente', 'fabricante', 'material', 'nota', 'config'
  ];

  console.log('🧹 Vaciando tablas...');
  for (const table of tables) {
    try {
      await prisma[table].deleteMany(); 
    } catch(e) {
      // Ignorar errores si la tabla no existe aún
    }
  }

  // 2. INSERCIÓN DE DATOS BASICOS
  console.log('📥 Insertando catálogos base...');

  // Fabricantes
  const fabricantes = readData('fabricantes.json');
  for (const f of fabricantes) await prisma.fabricante.create({ data: f });

  // Materiales
  const materiales = readData('materiales.json');
  for (const m of materiales) await prisma.material.create({ data: m });

  // Proveedores
  const proveedores = readData('proveedores.json');
  for (const p of proveedores) await prisma.proveedor.create({ data: p });

  // Clientes
  const clientes = readData('clientes.json');
  for (const c of clientes) await prisma.cliente.create({ data: c });

  // Configuración Pricing
  const margenes = readData('margenes.json');
  for (const m of margenes) await prisma.reglaMargen.create({ data: m });

  const tarifas = readData('tarifas.json');
  for (const t of tarifas) await prisma.tarifaMaterial.create({ data: t });
  
  const referencias = readData('referencias.json');
  for (const r of referencias) await prisma.referenciaBobina.create({ data: r });

  // 3. INSERCIÓN DE PRODUCTOS (Con Relaciones)
  console.log('🔗 Relacionando e insertando productos...');
  
  const dbFabricantes = await prisma.fabricante.findMany();
  const dbMateriales = await prisma.material.findMany();
  const productos = readData('productos.json');

  for (const prod of productos) {
    const fabId = dbFabricantes.find(f => f.nombre === prod.fabricante)?.id;
    const matId = dbMateriales.find(m => m.nombre === prod.material)?.id;

    // Quitamos los campos de texto y ponemos los IDs
    const { fabricante, material, ...data } = prod;
    
    await prisma.producto.create({
      data: {
        ...data,
        fabricanteId: fabId,
        materialId: matId
      }
    });
  }

  console.log('✅ Base de datos lista y operativa.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
