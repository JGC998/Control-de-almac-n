import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ═══════════════════════════════════════════════════════════════════════════════
// GLOSARIO ESTÁTICO — variantes humanas → valores de BD
// ═══════════════════════════════════════════════════════════════════════════════

const CONF_ALIAS = {
  'sin fin': 'SF', 'sin-fin': 'SF', sinfin: 'SF', sf: 'SF',
  cerrada: 'SF', soldada: 'SF', 'sin costura': 'SF', endless: 'SF',
  'con grapa': 'GR', 'con grapas': 'GR', grapa: 'GR', grapas: 'GR',
  grapada: 'GR', grapado: 'GR', gr: 'GR',
  abierta: 'AB', abierto: 'AB', ab: 'AB', open: 'AB', 'sin unir': 'AB',
};

const CONF_LABEL = { SF: 'Sin Fin', GR: 'Con Grapa', AB: 'Abierta' };

const COLOR_ALIAS = {
  blanco: 'BLANCO', blanca: 'BLANCO', white: 'BLANCO',
  azul: 'AZUL', blue: 'AZUL',
  negro: 'NEGRO', negra: 'NEGRO', black: 'NEGRO',
  verde: 'VERDE', green: 'VERDE',
  gris: 'GRIS', grey: 'GRIS', gray: 'GRIS',
  amarillo: 'AMARILLO', amarilla: 'AMARILLO', yellow: 'AMARILLO',
  rojo: 'ROJO', roja: 'ROJO', red: 'ROJO',
  naranja: 'NARANJA', orange: 'NARANJA',
  marron: 'MARRON', brown: 'MARRON',
  beige: 'BEIGE',
  transparente: 'TRANSPARENTE', claro: 'TRANSPARENTE', transparente: 'TRANSPARENTE',
  natural: 'NATURAL',
};

const ESTADO_PEDIDO_ALIAS = {
  pendiente: 'Pendiente', pendientes: 'Pendiente',
  facturado: 'Facturado', facturados: 'Facturado', facturada: 'Facturado',
  cancelado: 'Cancelado', cancelados: 'Cancelado', cancelada: 'Cancelado',
};

const ESTADO_IMPORT_ALIAS = {
  borrador: 'BORRADOR',
  pedido: 'PEDIDO', encargado: 'PEDIDO',
  transito: 'TRANSITO', 'en camino': 'TRANSITO', navegando: 'TRANSITO', viaje: 'TRANSITO',
  aduana: 'ADUANA', aduanas: 'ADUANA',
  recibido: 'RECIBIDO', llegado: 'RECIBIDO', recibida: 'RECIBIDO',
};

// ═══════════════════════════════════════════════════════════════════════════════
// NORMALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

function norm(s) {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // eliminar acentos
    .replace(/[×*]/g, 'x')
    .replace(/[^a-z0-9\s.x,\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXTRACTORES DE ENTIDADES
// ═══════════════════════════════════════════════════════════════════════════════

function extraerEspesor(s) {
  // "3mm", "3.5mm", "3,5 mm", "espesor 6"
  const m1 = s.match(/(\d+(?:[.,]\d+)?)\s*mm\b/);
  if (m1) return parseFloat(m1[1].replace(',', '.'));
  const m2 = s.match(/\bespesor\s+(\d+(?:[.,]\d+)?)\b/);
  if (m2) return parseFloat(m2[1].replace(',', '.'));
  return null;
}

function extraerDimensiones(s) {
  // "600x4800", "600 x 4800", "600 por 4800", "600×4800"
  const m = s.match(/(\d{2,4})\s*(?:x|por)\s*(\d{3,5})/);
  if (!m) return null;
  const a = parseFloat(m[1]), b = parseFloat(m[2]);
  // convención: ancho ≤ largo
  return { ancho: Math.min(a, b), largo: Math.max(a, b) };
}

function extraerColor(s) {
  for (const [k, v] of Object.entries(COLOR_ALIAS)) {
    if (new RegExp(`\\b${k}\\b`).test(s)) return v;
  }
  return null;
}

function extraerConf(s) {
  // multi-palabra primero
  const multi = Object.entries(CONF_ALIAS).filter(([k]) => k.includes(' '));
  for (const [k, v] of multi) {
    if (s.includes(k)) return v;
  }
  // palabra sola como token
  for (const [k, v] of Object.entries(CONF_ALIAS)) {
    if (!k.includes(' ') && new RegExp(`\\b${k}\\b`).test(s)) return v;
  }
  return null;
}

function extraerMaterial(s, materialesDB) {
  for (const mat of materialesDB) {
    if (s.includes(mat.toLowerCase())) return mat;
  }
  return null;
}

function extraerEstadoPedido(s) {
  for (const [k, v] of Object.entries(ESTADO_PEDIDO_ALIAS)) {
    if (s.includes(k)) return v;
  }
  return null;
}

function extraerEstadoImport(s) {
  const multi = Object.entries(ESTADO_IMPORT_ALIAS).filter(([k]) => k.includes(' '));
  for (const [k, v] of multi) { if (s.includes(k)) return v; }
  for (const [k, v] of Object.entries(ESTADO_IMPORT_ALIAS)) {
    if (!k.includes(' ') && new RegExp(`\\b${k}\\b`).test(s)) return v;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETECCIÓN DE INTENCIÓN
// ═══════════════════════════════════════════════════════════════════════════════

function detectarIntencion(s, ent) {
  const tieneDims     = !!ent.dims;
  const tieneMaterial = !!ent.material;
  const tieneEspesor  = ent.espesor != null;
  const tieneConf     = !!ent.conf;

  // Calculadora de banda — dimensiones + cualquier otra pista de banda
  if (tieneDims && (tieneMaterial || tieneEspesor || tieneConf || ent.color)) {
    return 'calcular_banda';
  }
  // Sólo dimensiones → también calculadora (asume banda PVC)
  if (tieneDims) return 'calcular_banda';

  // Tarifa de material — pregunta de precio sin dimensiones
  if (/\b(precio|tarifa|cuanto|cuanta|coste|vale|cuesta|sale)\b/.test(s) && (tieneMaterial || tieneEspesor)) {
    return 'tarifa_material';
  }

  // Stock bajo mínimo
  if (/bajo.{0,10}minimo|minimo.{0,10}stock|alertas?\s*stock|critico/.test(s)) return 'stock_minimo';

  // Stock general
  if (/\b(stock|metros|disponible|hay|tenemos|quedan|cuanto|cuanta|inventario)\b/.test(s)) return 'stock';

  // Pedido número concreto (tiene dígitos después de "pedido")
  const mPed = s.match(/\bpedido\s+([a-z0-9\-]+)/);
  if (mPed && /\d/.test(mPed[1])) return 'pedido_numero';

  // Presupuesto número concreto
  const mPres = s.match(/\bpresupuesto\s+([a-z0-9\-]+)/);
  if (mPres && /\d/.test(mPres[1])) return 'presupuesto_numero';

  // Pedidos hoy
  if (/\bpedidos?\b.{0,8}\bhoy\b/.test(s)) return 'pedidos_hoy';

  // Presupuestos hoy
  if (/\bpresupuestos?\b.{0,8}\bhoy\b/.test(s)) return 'presupuestos_hoy';

  // Pedidos por estado
  if (/\bpedidos?\b/.test(s) && extraerEstadoPedido(s)) return 'pedidos_estado';

  // Pedidos recientes
  if (/\bpedidos?\b/.test(s)) return 'pedidos_recientes';

  // Presupuestos recientes
  if (/\bpresupuestos?\b/.test(s)) return 'presupuestos_recientes';

  // Importaciones / contenedores
  if (/\b(importacion|contenedor|envio|barco|transito|aduana|flete|carga)\b/.test(s)) return 'importaciones';

  // Cliente
  if (/\bcliente\s+\S+/.test(s) || /\bbuscar\s+\S+/.test(s)) return 'cliente';

  // Ayuda
  if (/\b(ayuda|help|que.{0,5}(puedo|puedes|sabes)|comandos|opciones)\b/.test(s)) return 'ayuda';

  return 'desconocido';
}

// ═══════════════════════════════════════════════════════════════════════════════
// CALCULADORA DE BANDA
// ═══════════════════════════════════════════════════════════════════════════════

async function calcularBanda(ent) {
  const { material, espesor, color, dims, conf } = ent;

  if (!dims) {
    return { texto: 'Necesito las dimensiones. Ejemplo: "banda pvc 3mm 600x4800 sin fin"', tipo: 'ayuda', datos: null };
  }

  // Buscar tarifa: intenta distintas combinaciones en orden de especificidad
  const intentos = [
    { material, espesor, color },
    { material, espesor, color: null },
    { material, espesor },
    { material },
  ].filter(w => Object.values(w).some(v => v != null));

  let tarifa = null;
  for (const where of intentos) {
    const cleaned = Object.fromEntries(Object.entries(where).filter(([, v]) => v != null));
    tarifa = await db.tarifaMaterial.findFirst({ where: cleaned, orderBy: { espesor: 'asc' } });
    if (tarifa) break;
  }

  const area_m2 = (dims.ancho / 1000) * (dims.largo / 1000);

  if (!tarifa) {
    return {
      texto: `No encontré tarifa para${material ? ' ' + material : ''}${espesor ? ' ' + espesor + 'mm' : ''}${color ? ' ' + color : ''}.\nSuperficie: ${area_m2.toFixed(3)} m²`,
      tipo: 'calculo',
      datos: { dims, area_m2, tarifa: null, conf },
    };
  }

  // Precio base por m²
  let precioM2 = tarifa.precio;
  let preciosVenta = null;

  if (tarifa.preciosVenta) {
    try {
      const pv = typeof tarifa.preciosVenta === 'string'
        ? JSON.parse(tarifa.preciosVenta)
        : tarifa.preciosVenta;
      if (pv && typeof pv === 'object' && !Array.isArray(pv)) {
        preciosVenta = pv;
        // Usa el primer tier como precio por defecto
        const primer = Object.values(pv)[0];
        if (primer && typeof primer === 'number') precioM2 = primer;
      }
    } catch { /* usa precio base */ }
  }

  const precio_total = area_m2 * precioM2;
  const peso_total   = area_m2 * (tarifa.peso || 0);

  // ¿Existe ya en el catálogo de bandas guardadas?
  const catalogoWhere = {
    activo: true,
    referenciaFabricante: 'BANDA_PVC',
    ancho: dims.ancho,
    largo: dims.largo,
    ...(espesor != null ? { espesor } : {}),
    ...(color ? { color } : {}),
    ...(conf ? { nombre: { contains: conf } } : {}),
  };
  const bandaCatalogo = await db.producto.findFirst({ where: catalogoWhere });

  return {
    texto: [
      `${dims.ancho}×${dims.largo} mm`,
      conf ? CONF_LABEL[conf] : null,
      tarifa.material,
      tarifa.espesor ? tarifa.espesor + ' mm' : null,
      tarifa.color || null,
    ].filter(Boolean).join(' · '),
    tipo: 'calculo',
    datos: {
      dims, conf,
      material: tarifa.material,
      espesor: tarifa.espesor,
      color: tarifa.color,
      area_m2,
      precio_m2: precioM2,
      precio_total,
      peso_m2: tarifa.peso || 0,
      peso_total,
      preciosVenta,
      bandaCatalogo: bandaCatalogo
        ? { id: bandaCatalogo.id, nombre: bandaCatalogo.nombre, precio: bandaCatalogo.precioUnitario }
        : null,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HANDLER PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request) {
  try {
    const { query } = await request.json();
    if (!query?.trim()) {
      return NextResponse.json({ texto: 'Escribe algo para consultar.', tipo: 'ayuda', datos: null });
    }

    const s = norm(query.trim());

    // Cargar materiales reales de BD para el glosario dinámico
    const tarifasDB = await db.tarifaMaterial.findMany({ select: { material: true }, distinct: ['material'] });
    const materialesDB = tarifasDB.map(r => r.material);

    // Extraer entidades
    const ent = {
      material: extraerMaterial(s, materialesDB),
      espesor:  extraerEspesor(s),
      color:    extraerColor(s),
      conf:     extraerConf(s),
      dims:     extraerDimensiones(s),
    };

    const intencion = detectarIntencion(s, ent);

    // ── Calculadora de banda ─────────────────────────────────────────────────
    if (intencion === 'calcular_banda') {
      const resultado = await calcularBanda(ent);
      return NextResponse.json(resultado);
    }

    // ── Tarifa de material ───────────────────────────────────────────────────
    if (intencion === 'tarifa_material') {
      const where = {};
      if (ent.material) where.material = ent.material;
      if (ent.espesor != null) where.espesor = ent.espesor;
      if (ent.color) where.color = ent.color;

      const tarifas = await db.tarifaMaterial.findMany({
        where,
        orderBy: [{ material: 'asc' }, { espesor: 'asc' }, { color: 'asc' }],
        take: 10,
      });

      if (!tarifas.length) {
        return NextResponse.json({ texto: 'No encontré tarifas con esos criterios.', tipo: 'tarifa', datos: [] });
      }

      return NextResponse.json({
        texto: `${tarifas.length} tarifa${tarifas.length !== 1 ? 's' : ''} encontrada${tarifas.length !== 1 ? 's' : ''}`,
        tipo: 'tarifa',
        datos: tarifas.map(t => ({
          material: t.material, espesor: t.espesor,
          color: t.color, acabado: t.acabado,
          precio: t.precio, peso: t.peso,
          preciosVenta: t.preciosVenta,
        })),
      });
    }

    // ── Stock bajo mínimo ────────────────────────────────────────────────────
    if (intencion === 'stock_minimo') {
      const todos = await db.stock.findMany({ orderBy: { metrosDisponibles: 'asc' } });
      const bajos = todos.filter(s => s.metrosDisponibles <= s.stockMinimo);
      return NextResponse.json({
        texto: bajos.length === 0
          ? 'Todo el stock está por encima del mínimo ✅'
          : `${bajos.length} material${bajos.length !== 1 ? 'es' : ''} bajo mínimo`,
        tipo: 'stock',
        datos: bajos.map(s => ({
          id: s.id, material: s.material, espesor: s.espesor,
          metros: s.metrosDisponibles, minimo: s.stockMinimo, alerta: true,
        })),
      });
    }

    // ── Stock con búsqueda ───────────────────────────────────────────────────
    if (intencion === 'stock') {
      // Construir búsqueda combinando material, espesor y texto libre
      let stocks;
      if (ent.material || ent.espesor != null) {
        const where = {};
        if (ent.material) where.material = { contains: ent.material };
        if (ent.espesor != null) where.espesor = ent.espesor;
        stocks = await db.stock.findMany({ where, orderBy: { material: 'asc' }, take: 12 });
      } else {
        // Texto libre: extraer palabras significativas
        const termino = s.replace(/\b(stock|metros|hay|tenemos|quedan|cuanto|cuanta|disponible|de|el|la|los|las)\b/g, '').trim();
        stocks = await db.stock.findMany({
          where: termino ? { material: { contains: termino } } : {},
          orderBy: { material: 'asc' },
          take: 12,
        });
      }

      if (!stocks.length) {
        return NextResponse.json({ texto: 'No encontré stock con esos criterios.', tipo: 'stock', datos: [] });
      }
      return NextResponse.json({
        texto: `${stocks.length} resultado${stocks.length !== 1 ? 's' : ''}`,
        tipo: 'stock',
        datos: stocks.map(s => ({
          id: s.id, material: s.material, espesor: s.espesor,
          metros: s.metrosDisponibles, minimo: s.stockMinimo,
          alerta: s.metrosDisponibles <= s.stockMinimo,
        })),
      });
    }

    // ── Pedido número concreto ───────────────────────────────────────────────
    if (intencion === 'pedido_numero') {
      const mNum = s.match(/\bpedido\s+([a-z0-9\-]+)/);
      const pedido = await db.pedido.findFirst({
        where: { numero: { contains: mNum[1] } },
        include: { cliente: { select: { nombre: true } }, items: { take: 5 } },
      });
      if (!pedido) return NextResponse.json({ texto: `No encontré pedido "${mNum[1]}".`, tipo: 'error', datos: null });
      return NextResponse.json({
        texto: `Pedido ${pedido.numero}`,
        tipo: 'pedido_detalle',
        datos: {
          id: pedido.id, numero: pedido.numero,
          cliente: pedido.cliente?.nombre, estado: pedido.estado,
          total: pedido.total, items: pedido.items.length,
          fecha: pedido.fechaCreacion,
        },
      });
    }

    // ── Pedidos de hoy ───────────────────────────────────────────────────────
    if (intencion === 'pedidos_hoy') {
      const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
      const manana = new Date(hoy); manana.setDate(manana.getDate() + 1);
      const pedidos = await db.pedido.findMany({
        where: { fechaCreacion: { gte: hoy, lt: manana } },
        include: { cliente: { select: { nombre: true } } },
        orderBy: { fechaCreacion: 'desc' },
      });
      return NextResponse.json({
        texto: pedidos.length === 0 ? 'No hay pedidos hoy.' : `${pedidos.length} pedido${pedidos.length !== 1 ? 's' : ''} hoy`,
        tipo: 'pedidos',
        datos: pedidos.map(p => ({ id: p.id, numero: p.numero, cliente: p.cliente?.nombre, estado: p.estado, total: p.total })),
      });
    }

    // ── Pedidos por estado ───────────────────────────────────────────────────
    if (intencion === 'pedidos_estado') {
      const estado = extraerEstadoPedido(s);
      const pedidos = await db.pedido.findMany({
        where: { estado },
        include: { cliente: { select: { nombre: true } } },
        orderBy: { fechaCreacion: 'desc' },
        take: 10,
      });
      return NextResponse.json({
        texto: pedidos.length === 0
          ? `No hay pedidos ${estado.toLowerCase()}s.`
          : `${pedidos.length} pedido${pedidos.length !== 1 ? 's' : ''} ${estado.toLowerCase()}${pedidos.length !== 1 ? 's' : ''}`,
        tipo: 'pedidos',
        datos: pedidos.map(p => ({ id: p.id, numero: p.numero, cliente: p.cliente?.nombre, estado: p.estado, total: p.total })),
      });
    }

    // ── Pedidos recientes ────────────────────────────────────────────────────
    if (intencion === 'pedidos_recientes') {
      const pedidos = await db.pedido.findMany({
        include: { cliente: { select: { nombre: true } } },
        orderBy: { fechaCreacion: 'desc' },
        take: 5,
      });
      return NextResponse.json({
        texto: 'Últimos 5 pedidos',
        tipo: 'pedidos',
        datos: pedidos.map(p => ({ id: p.id, numero: p.numero, cliente: p.cliente?.nombre, estado: p.estado, total: p.total })),
      });
    }

    // ── Presupuesto número concreto ──────────────────────────────────────────
    if (intencion === 'presupuesto_numero') {
      const mNum = s.match(/\bpresupuesto\s+([a-z0-9\-]+)/);
      const pres = await db.presupuesto.findFirst({
        where: { numero: { contains: mNum[1] } },
        include: { cliente: { select: { nombre: true } } },
      });
      if (!pres) return NextResponse.json({ texto: `No encontré presupuesto "${mNum[1]}".`, tipo: 'error', datos: null });
      return NextResponse.json({
        texto: `Presupuesto ${pres.numero}`,
        tipo: 'pedido_detalle',
        datos: {
          id: pres.id, numero: pres.numero,
          cliente: pres.cliente?.nombre, estado: pres.estado,
          total: pres.total, items: 0, fecha: pres.fechaCreacion,
          esPresupuesto: true,
        },
      });
    }

    // ── Presupuestos de hoy ──────────────────────────────────────────────────
    if (intencion === 'presupuestos_hoy') {
      const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
      const manana = new Date(hoy); manana.setDate(manana.getDate() + 1);
      const pres = await db.presupuesto.findMany({
        where: { fechaCreacion: { gte: hoy, lt: manana } },
        include: { cliente: { select: { nombre: true } } },
        orderBy: { fechaCreacion: 'desc' },
      });
      return NextResponse.json({
        texto: pres.length === 0 ? 'No hay presupuestos hoy.' : `${pres.length} presupuesto${pres.length !== 1 ? 's' : ''} hoy`,
        tipo: 'pedidos',
        datos: pres.map(p => ({ id: p.id, numero: p.numero, cliente: p.cliente?.nombre, estado: p.estado, total: p.total, esPresupuesto: true })),
      });
    }

    // ── Presupuestos recientes ───────────────────────────────────────────────
    if (intencion === 'presupuestos_recientes') {
      const pres = await db.presupuesto.findMany({
        include: { cliente: { select: { nombre: true } } },
        orderBy: { fechaCreacion: 'desc' },
        take: 5,
      });
      return NextResponse.json({
        texto: 'Últimos 5 presupuestos',
        tipo: 'pedidos',
        datos: pres.map(p => ({ id: p.id, numero: p.numero, cliente: p.cliente?.nombre, estado: p.estado, total: p.total, esPresupuesto: true })),
      });
    }

    // ── Importaciones / contenedores ─────────────────────────────────────────
    if (intencion === 'importaciones') {
      const estadoImport = extraerEstadoImport(s);
      const importaciones = await db.importacionContenedor.findMany({
        where: estadoImport ? { estado: estadoImport } : { estado: { in: ['PEDIDO', 'TRANSITO', 'ADUANA'] } },
        include: { proveedor: { select: { nombre: true } } },
        orderBy: { creadaEn: 'desc' },
        take: 8,
      });
      return NextResponse.json({
        texto: importaciones.length === 0
          ? 'No hay importaciones activas.'
          : `${importaciones.length} importacion${importaciones.length !== 1 ? 'es' : ''}`,
        tipo: 'importaciones',
        datos: importaciones.map(i => ({
          id: i.id, descripcion: i.descripcion, estado: i.estado,
          proveedor: i.proveedor?.nombre, numContenedor: i.numContenedor,
          nombreBarco: i.nombreBarco, etaEstimada: i.etaEstimada,
        })),
      });
    }

    // ── Cliente ──────────────────────────────────────────────────────────────
    if (intencion === 'cliente') {
      const mCli = s.match(/(?:cliente|buscar)\s+(.+)/);
      const nombre = mCli ? mCli[1].trim() : '';
      const cliente = await db.cliente.findFirst({
        where: { nombre: { contains: nombre } },
        include: {
          pedidos: {
            orderBy: { fechaCreacion: 'desc' }, take: 3,
            select: { id: true, numero: true, estado: true, total: true, fechaCreacion: true },
          },
        },
      });
      if (!cliente) return NextResponse.json({ texto: `No encontré cliente "${nombre}".`, tipo: 'error', datos: null });
      return NextResponse.json({
        texto: cliente.nombre,
        tipo: 'cliente',
        datos: {
          id: cliente.id, nombre: cliente.nombre,
          email: cliente.email, telefono: cliente.telefono,
          pedidosRecientes: cliente.pedidos,
        },
      });
    }

    // ── Ayuda ────────────────────────────────────────────────────────────────
    if (intencion === 'ayuda') {
      return NextResponse.json({
        texto: 'Puedo ayudarte con:',
        tipo: 'ayuda',
        datos: [
          '600x4800 sin fin pvc 3mm blanco  →  calcula precio',
          'tarifa pvc 6mm blanco            →  precios por m²',
          'stock pvc 3mm                    →  metros disponibles',
          'stock bajo mínimo                →  alertas de stock',
          'pedidos hoy / pedidos pendientes',
          'pedido 227                       →  busca por número',
          'presupuestos hoy',
          'contenedores en tránsito',
          'cliente castillero               →  historial',
        ],
      });
    }

    // ── No entendido ─────────────────────────────────────────────────────────
    return NextResponse.json({
      texto: 'No entendí esa consulta. Escribe "ayuda" para ver qué puedo hacer.',
      tipo: 'ayuda', datos: null,
    });

  } catch (error) {
    console.error('[/api/consulta]', error?.message);
    return NextResponse.json({ texto: 'Error al consultar. Inténtalo de nuevo.', tipo: 'error', datos: null });
  }
}
