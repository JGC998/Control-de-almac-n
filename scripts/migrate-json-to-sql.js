const { PrismaClient } = require('@prisma/client');
const fs = require('fs/promises');
const path = require('path');

// Inicializa el cliente de la base de datos
const db = new PrismaClient();
const dataDir = path.join(__dirname, '../src/data');

/**
 * Lee un archivo JSON de forma segura, devolviendo un array vacío si no existe.
 */
async function readJson(filename) {
  try {
    const data = await fs.readFile(path.join(dataDir, filename), 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.warn(`Advertencia: No se encontró el archivo ${filename}, se omitirá.`);
      return [];
    }
    throw error;
  }
}

/**
 * Función principal de migración
 */
async function main() {
  console.log('Iniciando migración de datos de JSON a SQLite...');
  await db.$connect();
  console.log('Conectado a la base de datos.');

  // --- 1. Migrar Modelos Simples (Sin Relaciones) ---

  console.log('Migrando Fabricantes...');
  const fabricantesData = await readJson('fabricantes.json');
  for (const f of fabricantesData) {
    await db.fabricante.upsert({
      where: { nombre: f.nombre }, // Usa un campo único
      update: { nombre: f.nombre },
      create: { nombre: f.nombre },
    });
  }
  console.log(`- ${fabricantesData.length} fabricantes procesados.`);

  console.log('Migrando Materiales...');
  const materialesData = await readJson('materiales.json');
  for (const m of materialesData) {
    await db.material.upsert({
      where: { nombre: m.nombre },
      update: { nombre: m.nombre },
      create: { nombre: m.nombre },
    });
  }
  console.log(`- ${materialesData.length} materiales procesados.`);

  console.log('Migrando Tarifas (precios.json)...');
  const tarifasData = await readJson('precios.json');
  for (const t of tarifasData) {
    await db.tarifaMaterial.upsert({
      where: { material_espesor: { material: t.material, espesor: String(t.espesor) } }, // Usa la clave @@unique
      update: {
        precio: parseFloat(t.precio) || 0,
        peso: parseFloat(t.peso) || 0,
      },
      create: {
        material: t.material,
        espesor: String(t.espesor),
        precio: parseFloat(t.precio) || 0,
        peso: parseFloat(t.peso) || 0,
      },
    });
  }
  console.log(`- ${tarifasData.length} tarifas procesadas.`);
  
  console.log('Migrando Notas...');
  const notasData = await readJson('notas.json');
  // Para las notas, simplemente las creamos. Si el script se ejecuta 2 veces, se duplicarán.
  // Esto es aceptable para 'notas' ya que no tienen un campo único claro.
  for (const n of notasData) {
     await db.nota.create({
        data: {
            content: n.content,
            fecha: n.fecha ? new Date(n.fecha) : undefined
        }
     });
  }
  console.log(`- ${notasData.length} notas procesadas.`);

  console.log('Migrando Config...');
  const configData = await readJson('config.json');
  if (configData.iva_rate) {
    await db.config.upsert({
      where: { key: 'iva_rate' },
      update: { value: String(configData.iva_rate) },
      create: { key: 'iva_rate', value: String(configData.iva_rate) },
    });
    console.log('- Configuración de IVA migrada.');
  }

  // --- 2. Migrar Modelos Relacionales (Requiere Mapeo) ---

  console.log('Migrando Clientes...');
  const clientesData = await readJson('clientes.json');
  for (const c of clientesData) {
    // Usamos el ID antiguo (ej. 'cli-001') como el ID en la nueva base de datos
    // Esto hace que el mapeo de relaciones sea mucho más fácil.
    await db.cliente.upsert({
      where: { id: c.id },
      update: {
        nombre: c.nombre,
        email: c.email,
        direccion: c.direccion,
        telefono: c.telefono,
      },
      create: {
        id: c.id, // Usamos el ID antiguo
        nombre: c.nombre,
        email: c.email,
        direccion: c.direccion,
        telefono: c.telefono,
      },
    });
  }
  console.log(`- ${clientesData.length} clientes procesados.`);

  // Ahora, creamos los mapas de IDs
  const clientesDB = await db.cliente.findMany();
  const fabricantesDB = await db.fabricante.findMany();
  const materialesDB = await db.material.findMany();

  // Mapa: Nombre de Cliente -> Nuevo ID
  const clienteNombreMap = new Map(clientesDB.map(c => [c.nombre, c.id]));
  // Mapa: ID Antiguo (cli-001) -> Nuevo ID (que es el mismo)
  const clienteIdMap = new Map(clientesData.map(c => [c.id, c.id]));

  // Mapa: Nombre de Fabricante -> Nuevo ID
  const fabricanteMap = new Map(fabricantesDB.map(f => [f.nombre, f.id]));
  // Mapa: Nombre de Material -> Nuevo ID
  const materialMap = new Map(materialesDB.map(m => [m.nombre, m.id]));

  console.log('Mapeos de IDs creados.');

  console.log('Migrando Productos (desde productos.json)...');
  const productosData = await readJson('productos.json');
  let productosMigrados = 0;
  for (const p of productosData) {
    const fabricanteNombre = p.nombre.split(' - ')[0];
    const fabricanteId = fabricanteMap.get(fabricanteNombre);
    const materialId = materialMap.get(p.material);
    
    await db.producto.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        nombre: p.nombre,
        modelo: p.modelo || p.nombre.split(' - ')[1],
        espesor: parseFloat(p.espesor) || 0,
        largo: parseFloat(p.largo) || 0,
        ancho: parseFloat(p.ancho) || 0,
        precioUnitario: parseFloat(p.precioUnitario) || 0,
        pesoUnitario: parseFloat(p.pesoUnitario) || 0,
        fabricanteId: fabricanteId,
        materialId: materialId,
      },
    });
    productosMigrados++;
  }
  console.log(`- ${productosMigrados} productos procesados.`);

  const productoIdMap = new Map(productosData.map(p => [p.id, p.id]));

  console.log('Migrando Presupuestos...');
  const presupuestosData = await readJson('presupuestos.json');
  let presupuestosMigrados = 0;
  for (const q of presupuestosData) {
    const clienteId = clienteIdMap.get(q.clienteId);
    if (!clienteId) {
      console.warn(`- Omitiendo presupuesto ${q.id}: Cliente ${q.clienteId} no encontrado.`);
      continue;
    }

    // Generamos un número único si no existe
    const numeroPresupuesto = q.numero || `PRE-${Date.now()}-${presupuestosMigrados}`;
    
    await db.presupuesto.upsert({
      where: { numero: numeroPresupuesto },
      update: {}, // No actualizamos si ya existe
      create: {
        id: q.id, // Reutilizamos ID antiguo
        numero: numeroPresupuesto,
        fechaCreacion: new Date(q.fechaCreacion || q.fecha),
        estado: q.estado || 'Borrador',
        notas: q.notes,
        subtotal: parseFloat(q.subtotal) || 0,
        tax: parseFloat(q.tax) || 0,
        total: parseFloat(q.total) || 0,
        clienteId: clienteId,
        items: {
          create: q.items.map(item => ({
            description: item.description || item.nombre,
            quantity: parseInt(item.quantity) || 0,
            unitPrice: parseFloat(item.unitPrice || item.precio_unitario) || 0,
            productoId: productoIdMap.get(item.productId || item.plantillaId),
          })),
        },
      },
    });
    presupuestosMigrados++;
  }
  console.log(`- ${presupuestosMigrados} presupuestos procesados.`);

  const presupuestoIdMap = new Map(presupuestosData.map(p => [p.id, p.id]));

  console.log('Migrando Pedidos...');
  const pedidosData = await readJson('pedidos.json');
  let pedidosMigrados = 0;
  for (const p of pedidosData) {
    let clienteId = null;
    if (p.clienteId) {
      clienteId = clienteIdMap.get(p.clienteId);
    } else if (p.cliente) {
      clienteId = clienteNombreMap.get(p.cliente);
    }

    if (!clienteId) {
      console.warn(`- Omitiendo pedido ${p.id}: Cliente ${p.clienteId || p.cliente} no encontrado.`);
      continue;
    }
    
    const items = p.items || p.productos || [];
    const numeroPedido = p.numero || p.id;
    
    await db.pedido.upsert({
      where: { numero: numeroPedido },
      update: {},
      create: {
        id: p.id,
        numero: numeroPedido,
        fechaCreacion: new Date(p.fechaCreacion || p.fecha),
        estado: p.estado || 'Activo',
        notas: p.notas,
        subtotal: parseFloat(p.subtotal) || 0,
        tax: parseFloat(p.tax) || 0,
        total: parseFloat(p.total) || p.items?.reduce((acc, i) => acc + (i.precioUnitario * i.cantidad), 0) || 0, // Recalcula si falta
        clienteId: clienteId,
        presupuestoId: presupuestoIdMap.get(p.presupuestoId), // Puede ser null
        items: {
          create: items.map(item => ({
            descripcion: item.description || item.nombre || item.descripcion,
            quantity: parseInt(item.quantity || item.cantidad) || 0,
            unitPrice: parseFloat(item.unitPrice || item.precioUnitario || item.precio_unitario) || 0,
            pesoUnitario: parseFloat(item.pesoUnitario) || 0,
            productoId: productoIdMap.get(item.productId || item.plantillaId),
          })),
        },
      },
    });
    pedidosMigrados++;
  }
  console.log(`- ${pedidosMigrados} pedidos procesados.`);

  console.log('¡Migración de datos completada!');
}

main()
  .catch((e) => {
    console.error('Error durante la migración:', e);
    process.exit(1);
  })
  .finally(async () => {
    // Cierra la conexión a la BD
    await db.$disconnect();
    console.log('Desconectado de la base de datos.');
  });
