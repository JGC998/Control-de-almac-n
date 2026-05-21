const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ── Helpers ──────────────────────────────────────────────────────────────────
function uuid() {
  return require('crypto').randomUUID();
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randFloat(min, max, dec = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(dec));
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// ── Datos base ────────────────────────────────────────────────────────────────

const FABRICANTES = [
  'Forbo Siegling',
  'Continental Contitech',
  'Habasit',
  'Ammeraal Beltech',
  'Phoenix Conveyor Belt',
  'Intralox',
];

const MATERIALES = ['PVC', 'Caucho', 'Poliuretano', 'Silicona', 'Poliéster', 'Nitrilo'];

const COLORES = ['Negro', 'Blanco', 'Verde', 'Azul', 'Gris', null];

const CLIENTES = [
  { nombre: 'Industrias Marín S.L.',        email: 'compras@marin-ind.es',         telefono: '957 23 45 67', direccion: 'Pol. Ind. La Asomadilla C/ Forja 12, Córdoba',        tier: 'Premium',  categoria: 'Industrial' },
  { nombre: 'Fundición Alcalá S.A.',         email: 'pedidos@fundicion-alcala.es',   telefono: '955 98 76 54', direccion: 'C/ Metalurgia 8, Alcalá de Guadaíra, Sevilla',         tier: 'Standard', categoria: 'Fundición' },
  { nombre: 'Cementos Andaluces S.A.',        email: 'logistica@cementos-andal.com', telefono: '958 45 67 89', direccion: 'Ctra. N-432 km 12, Granada',                            tier: 'VIP',      categoria: 'Construcción' },
  { nombre: 'Agroalimentaria del Sur S.L.',   email: 'tecnico@agrosur.net',          telefono: '956 34 56 78', direccion: 'Pol. Ind. El Viso, Jerez de la Frontera, Cádiz',        tier: 'Premium',  categoria: 'Alimentación' },
  { nombre: 'Extractos Mineros Jaén S.L.',    email: 'mantenimiento@emjaen.es',      telefono: '953 12 34 56', direccion: 'Ctra. Linares-Úbeda km 4, Jaén',                        tier: 'Standard', categoria: 'Minería' },
  { nombre: 'Plásticos Ronda S.A.',           email: 'compras@plastironda.es',       telefono: '952 67 89 01', direccion: 'Pol. Ind. El Fuerte Nave 7, Ronda, Málaga',             tier: 'Standard', categoria: 'Plásticos' },
  { nombre: 'Conservas Mediterráneo S.A.',    email: 'produccion@conservamed.com',   telefono: '950 78 90 12', direccion: 'C/ Mar 45, El Ejido, Almería',                          tier: 'Premium',  categoria: 'Alimentación' },
  { nombre: 'Cerámicas Espiel S.L.',          email: 'pedidos@ceramicasespiel.es',   telefono: '957 56 78 90', direccion: 'C/ Cerámica 3, Espiel, Córdoba',                        tier: 'Standard', categoria: 'Cerámica' },
  { nombre: 'Panadería Industrial Torres',    email: 'mantenimiento@pitorres.com',   telefono: '955 23 45 67', direccion: 'Pol. Ind. Pineda C/ Panaderos 1, Sevilla',              tier: 'VIP',      categoria: 'Alimentación' },
  { nombre: 'Embalajes Garrido Hnos.',        email: 'info@embalajesgarrido.com',    telefono: '957 89 01 23', direccion: 'Pol. Ind. Chinales Nave 15, Córdoba',                   tier: 'Standard', categoria: 'Embalaje' },
  { nombre: 'Materiales Construcción Priego', email: 'obra@mcp-priego.es',           telefono: '957 54 32 10', direccion: 'Avda. Andalucía 88, Priego de Córdoba',                 tier: 'Standard', categoria: 'Construcción' },
  { nombre: 'Lácteos Sierra Morena S.L.',     email: 'produccion@lacteossm.com',     telefono: '957 11 22 33', direccion: 'Ctra. Adamuz km 2, Córdoba',                            tier: 'Premium',  categoria: 'Alimentación' },
  { nombre: 'Talleres Mecánicos Valverde',    email: 'tmv@valverde-taller.es',       telefono: '959 44 55 66', direccion: 'C/ Taller 21, Valverde del Camino, Huelva',             tier: 'Standard', categoria: 'Mecánica' },
  { nombre: 'Aceitunera Baena Coop.',         email: 'mantenimiento@aceitbaena.coop',telefono: '957 67 12 34', direccion: 'Ctra. Córdoba-Granada km 56, Baena',                    tier: 'VIP',      categoria: 'Alimentación' },
  { nombre: 'Hormigones del Genil S.A.',      email: 'logistica@hormgenil.es',       telefono: '958 90 12 34', direccion: 'Pol. Ind. Sur C/ Río 5, Loja, Granada',                tier: 'Standard', categoria: 'Construcción' },
];

const PROVEEDORES = [
  { nombre: 'Forbo Siegling España S.L.',   email: 'pedidos@forbo.es',      telefono: '93 456 78 90', direccion: 'Pol. Ind. Vallès C/ Tecnologia 8, Barcelona' },
  { nombre: 'Continental Contitech Iberia', email: 'sales@contitech.es',    telefono: '91 234 56 78', direccion: 'Avda. Europa 14, Alcobendas, Madrid' },
  { nombre: 'Habasit Iberia S.A.',          email: 'info@habasit.es',       telefono: '93 877 65 43', direccion: 'C/ Comerç 12, Granollers, Barcelona' },
  { nombre: 'Ammeraal Beltech S.L.',        email: 'spain@ammeraalbeltech.com', telefono: '91 345 67 89', direccion: 'Pol. Ind. Carabanchel, Madrid' },
];

const REFERENCIAS_BOBINA = [
  { referencia: 'PVC-3-1000', nombre: 'PVC 3mm Negro 1000mm',  ancho: 1000, lonas: 2, pesoPorMetroLineal: 3.8 },
  { referencia: 'PVC-3-800',  nombre: 'PVC 3mm Negro 800mm',   ancho: 800,  lonas: 2, pesoPorMetroLineal: 3.1 },
  { referencia: 'PVC-4-1200', nombre: 'PVC 4mm Verde 1200mm',  ancho: 1200, lonas: 3, pesoPorMetroLineal: 5.2 },
  { referencia: 'PVC-5-1000', nombre: 'PVC 5mm Blanco 1000mm', ancho: 1000, lonas: 3, pesoPorMetroLineal: 5.8 },
  { referencia: 'PU-3-600',   nombre: 'PU 3mm Blanco 600mm',   ancho: 600,  lonas: 2, pesoPorMetroLineal: 2.1 },
  { referencia: 'PU-4-800',   nombre: 'PU 4mm Azul 800mm',     ancho: 800,  lonas: 2, pesoPorMetroLineal: 3.2 },
];

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Iniciando seed de desarrollo...\n');

  // Limpieza ordenada respetando FK
  await prisma.auditLog.deleteMany();
  await prisma.nota.deleteMany();
  await prisma.movimientoStock.deleteMany();
  await prisma.stock.deleteMany();
  await prisma.bobinaPedido.deleteMany();
  await prisma.pedidoProveedor.deleteMany();
  await prisma.proveedor.deleteMany();
  await prisma.referenciaBobina.deleteMany();
  await prisma.pedidoItem.deleteMany();
  await prisma.pedido.deleteMany();
  await prisma.presupuestoItem.deleteMany();
  await prisma.presupuesto.deleteMany();
  await prisma.producto.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.tarifaMaterial.deleteMany();
  await prisma.tarifaRollo.deleteMany();
  await prisma.reglaMargen.deleteMany();
  await prisma.taco.deleteMany();
  await prisma.grapa.deleteMany();
  await prisma.tarifaTransporte.deleteMany();
  await prisma.configPaletizado.deleteMany();
  await prisma.config.deleteMany();
  await prisma.sequence.deleteMany();
  await prisma.fabricante.deleteMany();
  await prisma.material.deleteMany();
  console.log('🗑️  Tablas limpiadas\n');

  // ── Config ──
  const configData = [
    { key: 'empresa.nombre',    value: 'Taller Industrial La Rambla' },
    { key: 'empresa.nif',       value: 'B14xxxxxx' },
    { key: 'empresa.direccion', value: 'C. La Jarra, 41, 14540 La Rambla, Córdoba' },
    { key: 'empresa.telefono',  value: '957 68 28 19' },
    { key: 'empresa.email',     value: 'info@tallerlrambla.es' },
    { key: 'iva.porcentaje',    value: '21' },
  ];
  for (const c of configData) {
    await prisma.config.upsert({ where: { key: c.key }, update: {}, create: c });
  }
  console.log('✓ Config');

  // ── Sequences ──
  for (const seq of [{ name: 'PEDIDO', year: 2026, value: 18 }, { name: 'PRESUPUESTO', year: 2026, value: 24 }]) {
    await prisma.sequence.upsert({
      where: { name_year: { name: seq.name, year: seq.year } },
      update: {},
      create: seq,
    });
  }
  console.log('✓ Sequences');

  // ── Fabricantes ──
  const fabIds = {};
  for (const nombre of FABRICANTES) {
    const f = await prisma.fabricante.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
    fabIds[nombre] = f.id;
  }
  console.log('✓ Fabricantes');

  // ── Materiales ──
  const matIds = {};
  for (const nombre of MATERIALES) {
    const m = await prisma.material.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
    matIds[nombre] = m.id;
  }
  console.log('✓ Materiales');

  // ── Tarifas Material ──
  const tarifasMat = [
    { material: 'PVC',        espesor: 2,   precio: 4.20,  peso: 2.8,  color: 'Negro' },
    { material: 'PVC',        espesor: 3,   precio: 5.80,  peso: 3.8,  color: 'Negro' },
    { material: 'PVC',        espesor: 3,   precio: 6.10,  peso: 3.9,  color: 'Blanco' },
    { material: 'PVC',        espesor: 4,   precio: 7.40,  peso: 5.0,  color: 'Negro' },
    { material: 'PVC',        espesor: 4,   precio: 7.80,  peso: 5.1,  color: 'Verde' },
    { material: 'PVC',        espesor: 5,   precio: 9.20,  peso: 6.2,  color: 'Negro' },
    { material: 'Caucho',     espesor: 3,   precio: 8.50,  peso: 4.5,  color: null },
    { material: 'Caucho',     espesor: 5,   precio: 12.30, peso: 7.2,  color: null },
    { material: 'Caucho',     espesor: 8,   precio: 18.90, peso: 11.4, color: null },
    { material: 'Poliuretano',espesor: 2,   precio: 9.80,  peso: 2.4,  color: 'Blanco' },
    { material: 'Poliuretano',espesor: 3,   precio: 13.50, peso: 3.5,  color: 'Blanco' },
    { material: 'Silicona',   espesor: 3,   precio: 22.00, peso: 3.0,  color: 'Blanco' },
    { material: 'Nitrilo',    espesor: 4,   precio: 14.60, peso: 5.8,  color: 'Negro' },
  ];
  await prisma.tarifaMaterial.createMany({ data: tarifasMat });
  console.log('✓ Tarifas de material');

  // ── Tarifas Rollo ──
  const tarifasRollo = [
    { material: 'PVC',        espesor: 3, ancho: 1000, color: 'Negro',  metrajeMinimo: 10, precioBase: 5.20,  peso: 3.8 },
    { material: 'PVC',        espesor: 3, ancho: 800,  color: 'Negro',  metrajeMinimo: 10, precioBase: 4.90,  peso: 3.4 },
    { material: 'PVC',        espesor: 4, ancho: 1200, color: 'Verde',  metrajeMinimo: 10, precioBase: 8.10,  peso: 5.5 },
    { material: 'PVC',        espesor: 5, ancho: 1000, color: 'Blanco', metrajeMinimo: 15, precioBase: 10.40, peso: 6.2 },
    { material: 'Poliuretano',espesor: 3, ancho: 600,  color: 'Blanco', metrajeMinimo: 5,  precioBase: 14.20, peso: 2.1 },
    { material: 'Caucho',     espesor: 5, ancho: 1000, color: null,     metrajeMinimo: 20, precioBase: 13.80, peso: 7.0 },
  ];
  await prisma.tarifaRollo.createMany({ data: tarifasRollo });
  console.log('✓ Tarifas de rollo');

  // ── Reglas de margen ──
  const margenes = [
    { base: 'FABRICACION',  tipo: 'multiplicador', multiplicador: 2.8,  gastoFijo: 0,     descripcion: 'Margen fabricación estándar',     tierCliente: null },
    { base: 'FABRICACION_P',tipo: 'multiplicador', multiplicador: 2.4,  gastoFijo: 0,     descripcion: 'Margen fabricación cliente Premium', tierCliente: 'Premium' },
    { base: 'FABRICACION_V',tipo: 'multiplicador', multiplicador: 2.2,  gastoFijo: 0,     descripcion: 'Margen fabricación cliente VIP',     tierCliente: 'VIP' },
    { base: 'MATERIAL',     tipo: 'multiplicador', multiplicador: 1.35, gastoFijo: 0,     descripcion: 'Margen venta material en rollo',    tierCliente: null },
    { base: 'ENVIO',        tipo: 'gastoFijo',     multiplicador: 1.0,  gastoFijo: 12.50, descripcion: 'Gastos de gestión envío',           tierCliente: null },
  ];
  for (const m of margenes) {
    await prisma.reglaMargen.upsert({
      where: { base: m.base },
      update: {},
      create: m,
    });
  }
  console.log('✓ Reglas de margen');

  // ── Tacos ──
  const tacos = [
    { tipo: 'U',   altura: 4,  precioMetro: 0.32 },
    { tipo: 'U',   altura: 5,  precioMetro: 0.38 },
    { tipo: 'U',   altura: 6,  precioMetro: 0.44 },
    { tipo: 'U',   altura: 8,  precioMetro: 0.56 },
    { tipo: 'U',   altura: 10, precioMetro: 0.68 },
    { tipo: 'T',   altura: 5,  precioMetro: 0.42 },
    { tipo: 'T',   altura: 8,  precioMetro: 0.61 },
    { tipo: 'T',   altura: 10, precioMetro: 0.75 },
    { tipo: 'V',   altura: 5,  precioMetro: 0.45 },
    { tipo: 'V',   altura: 8,  precioMetro: 0.65 },
    { tipo: 'CUT', altura: 3,  precioMetro: 0.28 },
  ];
  for (const t of tacos) {
    await prisma.taco.upsert({
      where: { tipo_altura: { tipo: t.tipo, altura: t.altura } },
      update: {},
      create: t,
    });
  }
  console.log('✓ Tacos');

  // ── Grapas ──
  await prisma.grapa.createMany({
    data: [
      { nombre: 'Flexco R2 1/2"',   fabricante: 'Flexco',    descripcion: 'Grapa de unión acero inox. para correas hasta 5mm',  precioMetro: 4.80 },
      { nombre: 'Flexco R5',         fabricante: 'Flexco',    descripcion: 'Grapa de unión para correas 5-8mm',                  precioMetro: 6.20 },
      { nombre: 'Flexco Bolt Solid', fabricante: 'Flexco',    descripcion: 'Unión mecánica sólida para correas pesadas',         precioMetro: 9.40 },
      { nombre: 'MLT S20 Inox',      fabricante: 'Minet',     descripcion: 'Grapa acero inox. de uña para alimentación',         precioMetro: 5.10 },
      { nombre: 'Alligator RS 62',   fabricante: 'Alligator', descripcion: 'Grapa articulada para correas ligeras',              precioMetro: 3.90 },
    ],
  });
  console.log('✓ Grapas');

  // ── Productos ──
  const productosData = [
    { nombre: 'Banda PVC 3mm Negro 1000mm',    espesor: 3, ancho: 1000, largo: null, color: 'Negro',  precioUnitario: 5.20, pesoUnitario: 3.8, costoUnitario: 3.12 },
    { nombre: 'Banda PVC 3mm Negro 800mm',     espesor: 3, ancho: 800,  largo: null, color: 'Negro',  precioUnitario: 4.90, pesoUnitario: 3.4, costoUnitario: 2.94 },
    { nombre: 'Banda PVC 4mm Verde 1200mm',    espesor: 4, ancho: 1200, largo: null, color: 'Verde',  precioUnitario: 8.10, pesoUnitario: 5.5, costoUnitario: 4.86 },
    { nombre: 'Banda PVC 5mm Blanco 1000mm',   espesor: 5, ancho: 1000, largo: null, color: 'Blanco', precioUnitario: 10.40,pesoUnitario: 6.2, costoUnitario: 6.24 },
    { nombre: 'Banda Poliuretano 3mm 600mm',   espesor: 3, ancho: 600,  largo: null, color: 'Blanco', precioUnitario: 14.20,pesoUnitario: 2.1, costoUnitario: 8.52 },
    { nombre: 'Banda Caucho 5mm 1000mm',       espesor: 5, ancho: 1000, largo: null, color: null,     precioUnitario: 13.80,pesoUnitario: 7.0, costoUnitario: 8.28 },
    { nombre: 'Banda Caucho 8mm 1200mm',       espesor: 8, ancho: 1200, largo: null, color: null,     precioUnitario: 21.60,pesoUnitario: 12.0,costoUnitario: 12.96 },
    { nombre: 'Banda Silicona 3mm 500mm',      espesor: 3, ancho: 500,  largo: null, color: 'Blanco', precioUnitario: 24.50,pesoUnitario: 2.0, costoUnitario: 14.70 },
    { nombre: 'Correa PVC Dentada 150mm',      espesor: 4, ancho: 150,  largo: 2000, color: 'Negro',  precioUnitario: 18.90,pesoUnitario: 1.2, costoUnitario: 11.34 },
    { nombre: 'Correa Poliuretano Lisa 200mm', espesor: 2, ancho: 200,  largo: 1500, color: 'Blanco', precioUnitario: 22.40,pesoUnitario: 0.8, costoUnitario: 13.44 },
  ];

  const productos = [];
  for (const p of productosData) {
    const mat = p.nombre.includes('Caucho') ? 'Caucho'
               : p.nombre.includes('Poliuretano') ? 'Poliuretano'
               : p.nombre.includes('Silicona') ? 'Silicona' : 'PVC';
    const fab = pick(FABRICANTES);
    const prod = await prisma.producto.create({
      data: {
        ...p,
        referenciaFabricante: `REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        precioVentaFab: p.precioUnitario * 0.85,
        precioVentaInt: p.precioUnitario * 0.95,
        precioVentaFin: p.precioUnitario,
        fabricanteId: fabIds[fab],
        materialId: matIds[mat],
      },
    });
    productos.push(prod);
  }
  console.log('✓ Productos');

  // ── Stock ──
  const stockItems = [
    { material: 'PVC',         espesor: 3, metrosDisponibles: 450,  costoMetro: 3.12, cantidadBobinas: 3, proveedor: 'Forbo Siegling España S.L.' },
    { material: 'PVC',         espesor: 4, metrosDisponibles: 220,  costoMetro: 4.86, cantidadBobinas: 2, proveedor: 'Habasit Iberia S.A.' },
    { material: 'Caucho',      espesor: 5, metrosDisponibles: 180,  costoMetro: 8.28, cantidadBobinas: 2, proveedor: 'Continental Contitech Iberia' },
    { material: 'Poliuretano', espesor: 3, metrosDisponibles: 95,   costoMetro: 8.52, cantidadBobinas: 1, proveedor: 'Ammeraal Beltech S.L.' },
    { material: 'Silicona',    espesor: 3, metrosDisponibles: 40,   costoMetro: 14.70,cantidadBobinas: 1, proveedor: 'Forbo Siegling España S.L.' },
    { material: 'PVC',         espesor: 5, metrosDisponibles: 310,  costoMetro: 6.24, cantidadBobinas: 2, proveedor: 'Habasit Iberia S.A.' },
  ];

  for (const s of stockItems) {
    const stock = await prisma.stock.create({ data: s });
    // Añadir 2-3 movimientos por cada stock
    for (let i = 0; i < randInt(2, 4); i++) {
      await prisma.movimientoStock.create({
        data: {
          tipo: pick(['ENTRADA', 'SALIDA', 'ENTRADA']),
          cantidad: randFloat(20, 150),
          fecha: daysAgo(randInt(5, 120)),
          stockId: stock.id,
        },
      });
    }
  }
  console.log('✓ Stock y movimientos');

  // ── Clientes ──
  const clientes = [];
  for (const c of CLIENTES) {
    const cliente = await prisma.cliente.upsert({
      where: { nombre: c.nombre },
      update: {},
      create: c,
    });
    clientes.push(cliente);
  }
  console.log('✓ Clientes');

  // ── Proveedores ──
  const proveedores = [];
  for (const p of PROVEEDORES) {
    const prov = await prisma.proveedor.upsert({
      where: { nombre: p.nombre },
      update: {},
      create: p,
    });
    proveedores.push(prov);
  }
  console.log('✓ Proveedores');

  // ── Referencias Bobina ──
  const refIds = {};
  for (const r of REFERENCIAS_BOBINA) {
    const ref = await prisma.referenciaBobina.upsert({
      where: { referencia_ancho_lonas: { referencia: r.referencia, ancho: r.ancho, lonas: r.lonas } },
      update: {},
      create: r,
    });
    refIds[r.referencia] = ref.id;
  }
  console.log('✓ Referencias bobina');

  // ── Pedidos Proveedor ──
  const estadosProv = ['Recibido', 'En tránsito', 'Pendiente'];
  for (let i = 0; i < 5; i++) {
    const prov = pick(proveedores);
    const ref = REFERENCIAS_BOBINA[i % REFERENCIAS_BOBINA.length];
    await prisma.pedidoProveedor.create({
      data: {
        material: ref.referencia.split('-')[0],
        fecha: daysAgo(randInt(10, 180)),
        estado: pick(estadosProv),
        proveedorId: prov.id,
        tipo: i < 2 ? 'IMPORTACION' : 'NACIONAL',
        gastosTotales: randFloat(80, 400),
        bobinas: {
          create: [{
            cantidad: randInt(1, 3),
            ancho: ref.ancho,
            largo: randInt(100, 300),
            espesor: parseFloat(ref.referencia.split('-')[1]),
            precioMetro: randFloat(2.5, 9.0),
            referenciaId: refIds[ref.referencia],
          }],
        },
      },
    });
  }
  console.log('✓ Pedidos proveedor');

  // ── Presupuestos y Pedidos de cliente ──
  const estados = ['Pendiente', 'Completado', 'Enviado', 'Cancelado'];
  const estadosPres = ['Borrador', 'Enviado', 'Aceptado', 'Rechazado'];

  let numPed = 1;
  let numPres = 1;

  for (const cliente of clientes) {
    const cuantos = randInt(2, 5);
    for (let j = 0; j < cuantos; j++) {
      const numItems = randInt(1, 4);
      const fecha = daysAgo(randInt(1, 240));
      const items = [];
      let subtotal = 0;

      for (let k = 0; k < numItems; k++) {
        const prod = pick(productos);
        const qty = randInt(1, 50);
        const price = prod.precioUnitario;
        subtotal += qty * price;
        items.push({
          descripcion: prod.nombre,
          quantity: qty,
          unitPrice: price,
          pesoUnitario: prod.pesoUnitario,
          productoId: prod.id,
        });
      }

      const tax = parseFloat((subtotal * 0.21).toFixed(2));
      const total = parseFloat((subtotal + tax).toFixed(2));
      subtotal = parseFloat(subtotal.toFixed(2));

      const esAceptado = Math.random() > 0.35;
      const estadoPres = esAceptado ? 'Aceptado' : pick(estadosPres);

      const presNum = `PRE-2026-${String(numPres++).padStart(3, '0')}`;
      const pres = await prisma.presupuesto.create({
        data: {
          numero: presNum,
          fechaCreacion: fecha,
          estado: estadoPres,
          subtotal,
          tax,
          total,
          clienteId: cliente.id,
          notas: Math.random() > 0.7 ? 'Urgente. Cliente requiere entrega en 48h.' : null,
          items: { create: items },
        },
      });

      if (esAceptado) {
        const pedNum = `PED-2026-${String(numPed++).padStart(3, '0')}`;
        await prisma.pedido.create({
          data: {
            numero: pedNum,
            fechaCreacion: new Date(fecha.getTime() + 86400000 * randInt(1, 3)),
            estado: pick(estados),
            subtotal,
            tax,
            total,
            clienteId: cliente.id,
            presupuestoId: pres.id,
            notas: null,
            items: {
              create: items.map(i => ({
                descripcion: i.descripcion,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                pesoUnitario: i.pesoUnitario,
                productoId: i.productoId,
              })),
            },
          },
        });
      }
    }
  }
  console.log(`✓ Presupuestos (${numPres - 1}) y Pedidos (${numPed - 1})`);

  // ── Notas ──
  await prisma.nota.createMany({
    data: [
      { content: 'Llamar a Industrias Marín para confirmar medidas de la banda 3mm.', fecha: daysAgo(2) },
      { content: 'Pendiente recibir muestra de PU blanco de Habasit.', fecha: daysAgo(5) },
      { content: 'Revisar stock de caucho 8mm — posible rotura de stock en 3 semanas.', fecha: daysAgo(1) },
      { content: 'Aceitunera Baena: piden presupuesto para sustitución completa de línea de cinta.', fecha: daysAgo(7) },
    ],
  });
  console.log('✓ Notas');

  // ── Tarifas transporte (muestra) ──
  const tarifasTransporte = [
    { provincia: 'Córdoba',  codigoPostal: '14',  parcel: 8.50,  miniQuarter: 12.00, quarter: 22.00, light: 38.00, half: 62.00, full: 118.00 },
    { provincia: 'Sevilla',  codigoPostal: '41',  parcel: 9.00,  miniQuarter: 13.00, quarter: 24.00, light: 40.00, half: 65.00, full: 124.00 },
    { provincia: 'Granada',  codigoPostal: '18',  parcel: 9.50,  miniQuarter: 13.50, quarter: 25.00, light: 42.00, half: 68.00, full: 130.00 },
    { provincia: 'Málaga',   codigoPostal: '29',  parcel: 9.50,  miniQuarter: 13.50, quarter: 25.00, light: 42.00, half: 68.00, full: 130.00 },
    { provincia: 'Madrid',   codigoPostal: '28',  parcel: 11.00, miniQuarter: 16.00, quarter: 30.00, light: 52.00, half: 88.00, full: 165.00 },
    { provincia: 'Barcelona',codigoPostal: '08',  parcel: 12.00, miniQuarter: 17.00, quarter: 33.00, light: 56.00, half: 94.00, full: 178.00 },
    { provincia: 'Valencia', codigoPostal: '46',  parcel: 11.50, miniQuarter: 16.50, quarter: 31.00, light: 54.00, half: 90.00, full: 170.00 },
  ];
  for (const t of tarifasTransporte) {
    await prisma.tarifaTransporte.upsert({
      where: { provincia_codigoPostal: { provincia: t.provincia, codigoPostal: t.codigoPostal } },
      update: {},
      create: t,
    });
  }
  console.log('✓ Tarifas transporte');

  // ── Config Paletizado ──
  const paletizados = [
    { tipo: 'EURO',  costePale: 8.50 },
    { tipo: 'QUART', costePale: 4.25 },
    { tipo: 'HALF',  costePale: 6.00 },
  ];
  for (const p of paletizados) {
    await prisma.configPaletizado.upsert({
      where: { tipo: p.tipo },
      update: {},
      create: p,
    });
  }
  console.log('✓ Config paletizado');

  // ── Audit Log (muestra) ──
  await prisma.auditLog.createMany({
    data: [
      { action: 'CREATE', entity: 'Presupuesto', details: '{"numero":"PRE-2026-001"}', user: 'sistema', createdAt: daysAgo(10) },
      { action: 'UPDATE', entity: 'Pedido',       details: '{"estado":"Completado"}',  user: 'sistema', createdAt: daysAgo(8) },
      { action: 'CREATE', entity: 'Cliente',      details: '{"nombre":"Industrias Marín S.L."}', user: 'sistema', createdAt: daysAgo(30) },
      { action: 'DELETE', entity: 'Presupuesto',  details: '{"numero":"PRE-2025-099"}', user: 'sistema', createdAt: daysAgo(15) },
    ],
  });
  console.log('✓ Audit log\n');

  console.log('✅ Seed completado. Base de datos lista para desarrollo.');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
