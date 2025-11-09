#!/bin/bash
#
# Script: Corrige el error de Prisma removiendo el campo 'valor' del seeder y re-ejecuta la siembra.
#
set -e

echo "--- 1/2. Corrigiendo scripts/migrate-json-to-sql.js: Eliminando la asignación de 'valor' ---"
cat > scripts/migrate-json-to-sql.js <<'EOF'
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

  // --- Limpieza de DB (MANTENEMOS Tarifas y Config) ---
  console.log('Limpiando tablas (excepto Tarifas y Config)...');
  await db.movimientoStock.deleteMany();
  await db.stock.deleteMany();
  await db.bobinaPedido.deleteMany();
  await db.pedidoProveedor.deleteMany();
  await db.referenciaBobina.deleteMany(); 
  await db.precioEspecial.deleteMany();
  await db.descuentoTier.deleteMany();
  await db.reglaDescuento.deleteMany();
  await db.reglaMargen.deleteMany();
  await db.nota.deleteMany();
  await db.pedidoItem.deleteMany();
  await db.pedido.deleteMany();
  await db.presupuestoItem.deleteMany();
  await db.presupuesto.deleteMany();
  await db.producto.deleteMany();
  await db.cliente.deleteMany();
  await db.material.deleteMany();
  await db.fabricante.deleteMany();
  await db.proveedor.deleteMany();
  console.log('Limpieza completada.');
  // ----------------------------------------------------
  
  // --- 1. Migrar Modelos Simples (Sin Relaciones) ---

  console.log('Migrando Fabricantes...');
  const fabricantesData = await readJson('fabricantes.json');
  for (const f of fabricantesData) {
    await db.fabricante.upsert({
      where: { nombre: f.nombre }, 
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
  
  console.log('Migrando Proveedores...');
  const proveedoresData = await readJson('proveedores.json');
  for (const p of proveedoresData) {
    await db.proveedor.upsert({
      where: { nombre: p.nombre },
      update: { nombre: p.nombre, email: p.email, telefono: p.telefono, direccion: p.direccion },
      create: { nombre: p.nombre, email: p.email, telefono: p.telefono, direccion: p.direccion },
    });
  }
  console.log(`- ${proveedoresData.length} proveedores procesados.`);

  
  console.log('Migrando Notas...');
  const notasData = await readJson('notas.json');
  for (const n of notasData) {
     await db.nota.create({
        data: {
            content: n.content,
            fecha: n.fecha ? new Date(n.fecha) : undefined
        }
     });
  }
  console.log(`- ${notasData.length} notas procesadas.`);

  // --- MIGRACIÓN DE REGLAS DE MARGEN ---
  console.log('Migrando Reglas de Margen...');
  const margenesData = await readJson('margenes.json');
  let margenesMigrados = 0;
  for (const m of margenesData) {
    const multiplicadorFloat = parseFloat(m.multiplicador) || 1.0;
    const gastoFijoFloat = parseFloat(m.gastoFijo) || 0;
    
    await db.reglaMargen.create({ 
      data: {
        base: m.base,
        descripcion: m.descripcion,
        multiplicador: multiplicadorFloat,
        gastoFijo: gastoFijoFloat,
        tipo: m.tipo || 'General',
        // ELIMINADO EL CAMPO 'valor'
      }
    }).then(() => margenesMigrados++);
  }
  console.log(`- ${margenesMigrados} reglas de margen procesadas.`);
  
  // --- FIN MIGRACIÓN DE REGLAS DE MARGEN ---

  // --- 2. Migrar Modelos Relacionales (Requiere Mapeo) ---

  console.log('Migrando Clientes...');
  const clientesData = await readJson('clientes.json');
  for (const c of clientesData) {
    await db.cliente.upsert({
      where: { id: c.id },
      update: {
        nombre: c.nombre,
        email: c.email,
        direccion: c.direccion,
        telefono: c.telefono,
        tier: c.tier, 
      },
      create: {
        id: c.id, 
        nombre: c.nombre,
        email: c.email,
        direccion: c.direccion,
        telefono: c.telefono,
        tier: c.tier, 
      },
    });
  }
  console.log(`- ${clientesData.length} clientes procesados.`);

  // --- 3. Crear Mapeos para Productos ---
  const clientesDB = await db.cliente.findMany();
  const fabricantesDB = await db.fabricante.findMany();
  const materialesDB = await db.material.findMany();

  const clienteNombreMap = new Map(clientesDB.map(c => [c.nombre, c.id]));
  const clienteIdMap = new Map(clientesDB.map(c => [c.id, c.id])); 
  const fabricanteMap = new Map(fabricantesDB.map(f => [f.nombre, f.id]));
  const materialMap = new Map(materialesDB.map(m => [m.nombre, m.id]));

  console.log('Mapeos de IDs creados.');

  console.log('Migrando Productos (desde productos.json)...');
  const productosData = await readJson('productos.json');
  let productosMigrados = 0;
  for (const p of productosData) {
    const fabricanteNombre = p.nombre.split(' - ')[0];
    const fabricanteId = fabricanteMap.get(p.fabricante); 
    const materialId = materialMap.get(p.material);
    
    await db.producto.upsert({
      where: { id: p.id },
      update: {
          // Si es necesario actualizar algo, iría aquí
      },
      create: {
        id: p.id,
        nombre: p.nombre,
        referenciaFabricante: p.modelo || p.nombre.split(' - ')[1],
        espesor: parseFloat(p.espesor) || 0,
        largo: parseFloat(p.largo) || 0,
        ancho: parseFloat(p.ancho) || 0,
        precioUnitario: parseFloat(p.precioUnitario) || 0,
        pesoUnitario: parseFloat(p.pesoUnitario) || 0,
        costoUnitario: parseFloat(p.costo) || 0,
        fabricanteId: fabricanteId,
        materialId: materialId,
        clienteId: p.clienteId || null,
      },
    });
    productosMigrados++;
  }
  console.log(`- ${productosMigrados} productos procesados.`);

  const productoIdMap = new Map(productosData.map(p => [p.id, p.id]));
  
  // --- Migración de Referencias Bobina ---
  console.log('Migrando Referencias Bobina...');
  const refBobinaData = await readJson('referenciasBobina.json');
  for (const r of refBobinaData) {
    const an = parseFloat(r.ancho) || 0;
    const ln = parseInt(r.lonas) || 0;
    const pw = parseFloat(r.pesoPorMetroLineal) || 0;

    await db.referenciaBobina.upsert({
      where: { 
        referencia_ancho_lonas: {
          referencia: r.referencia,
          ancho: an,
          lonas: ln,
        },
      },
      update: {
          pesoPorMetroLineal: pw,
      },
      create: {
        referencia: r.referencia,
        ancho: an,
        lonas: ln,
        pesoPorMetroLineal: pw,
      }
    });
  }
  console.log(`- ${refBobinaData.length} referencias de bobina procesadas.`);


  console.log('Migrando Presupuestos...');
  const presupuestosData = await readJson('presupuestos.json');
  let presupuestosMigrados = 0;
  for (const q of presupuestosData) {
    const clienteId = clienteIdMap.get(q.clienteId);
    if (!clienteId) {
      console.warn(`- Omitiendo presupuesto ${q.id}: Cliente ${q.clienteId} no encontrado.`);
      continue;
    }

    const numeroPresupuesto = q.numero || `PRE-${Date.now()}-${presupuestosMigrados}`;
    
    await db.presupuesto.upsert({
      where: { numero: numeroPresupuesto },
      update: {},
      create: {
        id: q.id, 
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
        total: parseFloat(p.total) || items.reduce((acc, i) => acc + (i.precioUnitario * i.cantidad), 0) || 0,
        clienteId: clienteId,
        presupuestoId: presupuestoIdMap.get(p.presupuestoId), 
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
    await db.$disconnect();
    console.log('Desconectado de la base de datos.');
  });
EOF

echo "--- 2/2. Ejecutando la Recarga de Datos (Seeder) corregida ---"
node scripts/migrate-json-to-sql.js

echo "--- ✅ PROCESO DE INYECCIÓN DE DATOS COMPLETO. Por favor, reinicia el servidor de desarrollo y verifica las pestañas. ---"
