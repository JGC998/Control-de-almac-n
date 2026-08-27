import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const OLLAMA_URL   = process.env.OLLAMA_URL   || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:3b';

// ═══════════════════════════════════════════════════════════════════════════════
// GLOSARIO ESTÁTICO
// ═══════════════════════════════════════════════════════════════════════════════

const CONF_ALIAS = {
  'sin fin': 'SF', 'sin-fin': 'SF', sinfin: 'SF', sf: 'SF',
  cerrada: 'SF', soldada: 'SF', 'sin costura': 'SF',
  'con grapa': 'GR', 'con grapas': 'GR', grapa: 'GR', grapas: 'GR',
  grapada: 'GR', grapado: 'GR', gr: 'GR',
  abierta: 'AB', abierto: 'AB', ab: 'AB', 'sin unir': 'AB',
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
  marron: 'MARRON', marrón: 'MARRON', brown: 'MARRON',
  beige: 'BEIGE', transparente: 'TRANSPARENTE', natural: 'NATURAL',
};

const ESTADO_PEDIDO_ALIAS = {
  pendiente: 'Pendiente', pendientes: 'Pendiente',
  facturado: 'Facturado', facturados: 'Facturado',
  cancelado: 'Cancelado', cancelados: 'Cancelado',
};

const ESTADO_IMPORT_ALIAS = {
  borrador: 'BORRADOR', pedido: 'PEDIDO', encargado: 'PEDIDO',
  transito: 'TRANSITO', 'en camino': 'TRANSITO', navegando: 'TRANSITO',
  aduana: 'ADUANA', aduanas: 'ADUANA',
  recibido: 'RECIBIDO', llegado: 'RECIBIDO',
};

// ═══════════════════════════════════════════════════════════════════════════════
// NORMALIZACIÓN Y EXTRACTORES
// ═══════════════════════════════════════════════════════════════════════════════

function norm(s) {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[×*]/g, 'x')
    .replace(/[^a-z0-9\s.x,\-]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

function extraerUnidades(s) {
  // "4 bandas", "2 unidades", "3 piezas", "×4", "x4"
  const m1 = s.match(/\b(\d{1,3})\s*(?:bandas?|piezas?|unidades?|uds?\.?|metros?)\b/);
  if (m1) return parseInt(m1[1], 10);
  const m2 = s.match(/\b(?:x|×)\s*(\d{1,3})\b/);
  if (m2) return parseInt(m2[1], 10);
  return 1;
}

function extraerMultiplicador(s) {
  // "multiplicalo por 4", "por las 4", "por 4 bandas", "por 4 unidades"
  const m = s.match(/(?:multiplic|por\s+(?:las?\s*)?|x\s*)(\d{1,3})\b/);
  return m ? parseInt(m[1], 10) : null;
}

function extraerEspesor(s) {
  const m1 = s.match(/(\d+(?:[.,]\d+)?)\s*mm\b/);
  if (m1) return parseFloat(m1[1].replace(',', '.'));
  const m2 = s.match(/\bespesor\s+(\d+(?:[.,]\d+)?)\b/);
  if (m2) return parseFloat(m2[1].replace(',', '.'));
  return null;
}

function extraerDimensiones(s) {
  const m = s.match(/(\d{2,4})\s*(?:x|por)\s*(\d{3,5})/);
  if (!m) return null;
  const a = parseFloat(m[1]), b = parseFloat(m[2]);
  return { ancho: Math.min(a, b), largo: Math.max(a, b) };
}

function extraerMetros(s) {
  // "50 metros", "50m lineales", "50ml" — pero NO "50mm"
  const m = s.match(/(\d+(?:[.,]\d+)?)\s*(?:metros?\s*lineales?|metros?\b(?!\s*mm)|m\s*lin)/);
  if (!m) return null;
  return parseFloat(m[1].replace(',', '.'));
}

function extraerAnchoTira(s, espesorConocido) {
  // "150mm de ancho", "ancho de 150mm"
  const m1 = s.match(/(\d{2,4})\s*mm\s*(?:de\s*)?ancho/);
  if (m1) return parseFloat(m1[1]);
  const m2 = s.match(/ancho\s*(?:de\s*)?(\d{2,4})\s*mm/);
  if (m2) return parseFloat(m2[1]);
  // Fallback: cualquier valor en mm distinto del espesor, entre 50 y 2000mm
  const todos = [...s.matchAll(/(\d+)\s*mm/g)].map(m => parseFloat(m[1]));
  return todos.find(v => v !== espesorConocido && v >= 50 && v <= 2000) ?? null;
}

function extraerColor(s) {
  for (const [k, v] of Object.entries(COLOR_ALIAS)) {
    if (new RegExp(`\\b${k}\\b`).test(s)) return v;
  }
  return null;
}

function extraerConf(s) {
  const multi = Object.entries(CONF_ALIAS).filter(([k]) => k.includes(' '));
  for (const [k, v] of multi) { if (s.includes(k)) return v; }
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

function detectarIntencion(s, ent) {
  const { dims, material, espesor, conf, color } = ent;

  // Metraje lineal: "50 metros de PVC 3mm de 150mm de ancho"
  const metrosLin = extraerMetros(s);
  if (metrosLin && (material || espesor != null)) return 'calcular_metraje';

  // Pieza plana (sin confección): faldeta, lámina, placa, cortina, corte
  const esPieza = /\b(pieza|faldeta|lamina|lámina|cortina|chapa|placa|corte)\b/.test(s);
  if (dims && esPieza) return 'calcular_pieza';

  // Banda: tiene conf explícita, o es PVC con dims (default del taller), o lleva keyword "banda"
  const esBandaKW = /\b(banda|transportadora)\b/.test(s);
  if (dims && (conf || esBandaKW || material === 'PVC' || (material || espesor != null || color))) return 'calcular_banda';
  if (dims) return 'calcular_banda';
  if (/\b(precio|tarifa|cuanto|cuanta|coste|vale|cuesta|sale)\b/.test(s) && (material || espesor != null)) return 'tarifa_material';
  if (/bajo.{0,10}minimo|minimo.{0,10}stock|alertas?\s*stock|critico/.test(s)) return 'stock_minimo';
  if (/\b(stock|metros|disponible|hay|tenemos|quedan|cuanto|inventario)\b/.test(s)) return 'stock';
  const mPed = s.match(/\bpedido\s+([a-z0-9\-]+)/);
  if (mPed && /\d/.test(mPed[1])) return 'pedido_numero';
  const mPres = s.match(/\bpresupuesto\s+([a-z0-9\-]+)/);
  if (mPres && /\d/.test(mPres[1])) return 'presupuesto_numero';
  if (/\bpedidos?\b.{0,8}\bhoy\b/.test(s)) return 'pedidos_hoy';
  if (/\bpresupuestos?\b.{0,8}\bhoy\b/.test(s)) return 'presupuestos_hoy';
  if (/\bpedidos?\b/.test(s) && extraerEstadoPedido(s)) return 'pedidos_estado';
  if (/\bpedidos?\b/.test(s)) return 'pedidos_recientes';
  if (/\bpresupuestos?\b/.test(s)) return 'presupuestos_recientes';
  if (/\b(importacion|contenedor|barco|transito|aduana|flete)\b/.test(s)) return 'importaciones';
  if (/\bcliente\s+\S+/.test(s) || /\bbuscar\s+\S+/.test(s)) return 'cliente';
  if (/\b(ayuda|help|comandos|opciones|que.{0,5}(puedo|sabes))\b/.test(s)) return 'ayuda';
  return 'desconocido';
}

// ═══════════════════════════════════════════════════════════════════════════════
// CALCULADORA DE BANDA
// ═══════════════════════════════════════════════════════════════════════════════

function aplicarUnidades(resultado, unidades) {
  if (unidades <= 1 || !resultado.datos?.precio_total) return resultado;
  const d = resultado.datos;
  return {
    ...resultado,
    datos: {
      ...d,
      unidades,
      precio_unitario:  d.precio_total,
      peso_unitario:    d.peso_total,
      precio_total:     Math.round(d.precio_total * unidades * 100) / 100,
      peso_total:       (d.peso_total || 0) * unidades,
      tipo_calculo:     resultado.tipo,
    },
  };
}

async function calcularBanda(ent) {
  const { material, espesor, color, dims, conf } = ent;
  if (!dims) return { texto: 'Necesito las dimensiones. Ejemplo: "600x4800 pvc 3mm sin fin"', tipo: 'ayuda', datos: null };

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
      texto: `Sin tarifa para${material ? ' ' + material : ''}${espesor ? ' ' + espesor + 'mm' : ''}. Superficie: ${area_m2.toFixed(3)} m²`,
      tipo: 'calculo', datos: { dims, area_m2, tarifa: null, conf },
    };
  }

  let precioM2 = tarifa.precio;
  let preciosVenta = null;
  if (tarifa.preciosVenta) {
    try {
      const pv = typeof tarifa.preciosVenta === 'string' ? JSON.parse(tarifa.preciosVenta) : tarifa.preciosVenta;
      if (pv && typeof pv === 'object' && !Array.isArray(pv)) {
        preciosVenta = pv;
        const primer = Object.values(pv)[0];
        if (primer && typeof primer === 'number') precioM2 = primer;
      }
    } catch { /* usa precio base */ }
  }

  const precio_material = area_m2 * precioM2;
  const peso_total      = area_m2 * (tarifa.peso || 0);

  // Coste de confección (igual que CalculadoraBandas.js)
  let coste_conf = 0;
  let desc_conf  = null;

  if (conf === 'SF') {
    // Sin Fin: costeVulcanizadoMetro × (ancho / 1000)
    const cfgVulc = await db.config.findUnique({ where: { key: 'costeVulcanizadoMetro' } });
    const costeVulcM = cfgVulc ? parseFloat(cfgVulc.value) || 0 : 0;
    coste_conf = costeVulcM * (dims.ancho / 1000);
    if (coste_conf > 0) desc_conf = `Vulcanizado Sin Fin`;
  } else if (conf === 'GR' && espesor != null) {
    // Grapa: primer modelo compatible × (ancho / 100)
    const modelo = await db.modeloGrapa.findFirst({
      where: { espesorDesde: { lte: espesor }, OR: [{ espesorHasta: null }, { espesorHasta: { gte: espesor } }] },
      orderBy: { espesorDesde: 'asc' },
    });
    if (modelo?.precioPor100mm) {
      coste_conf = (dims.ancho / 100) * modelo.precioPor100mm;
      desc_conf  = `Grapa ${modelo.nombre}`;
    }
  }
  // AB (Abierta) → coste_conf = 0

  const precio_total = Math.round((precio_material + coste_conf) * 100) / 100;

  const bandaCatalogo = await db.producto.findFirst({
    where: {
      activo: true, referenciaFabricante: 'BANDA_PVC',
      ancho: dims.ancho, largo: dims.largo,
      ...(espesor != null ? { espesor } : {}),
      ...(color ? { color } : {}),
      ...(conf ? { nombre: { contains: conf } } : {}),
    },
  });

  return {
    texto: [
      `${dims.ancho}×${dims.largo} mm`,
      conf ? CONF_LABEL[conf] : null,
      tarifa.material, tarifa.espesor ? tarifa.espesor + ' mm' : null, tarifa.color,
    ].filter(Boolean).join(' · '),
    tipo: 'calculo',
    datos: {
      dims, conf, material: tarifa.material, espesor: tarifa.espesor,
      color: tarifa.color, area_m2, precio_m2: precioM2,
      precio_material: Math.round(precio_material * 100) / 100,
      coste_conf: Math.round(coste_conf * 100) / 100,
      desc_conf,
      precio_total, peso_m2: tarifa.peso || 0, peso_total,
      preciosVenta,
      bandaCatalogo: bandaCatalogo
        ? { id: bandaCatalogo.id, nombre: bandaCatalogo.nombre, precio: bandaCatalogo.precioUnitario }
        : null,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CALCULADORA DE PIEZA (faldeta, lámina, corte — sin confección)
// ═══════════════════════════════════════════════════════════════════════════════

async function calcularPieza(ent) {
  const { material, espesor, color, dims } = ent;
  if (!dims) return { texto: 'Necesito las dimensiones. Ejemplo: "faldeta 300x500 epdm 6mm"', tipo: 'ayuda', datos: null };

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
      texto: `Sin tarifa para${material ? ' ' + material : ''}${espesor ? ' ' + espesor + 'mm' : ''}. Superficie: ${area_m2.toFixed(3)} m²`,
      tipo: 'calculo', datos: { dims, area_m2, tarifa: null },
    };
  }

  const precio_total = Math.round(area_m2 * tarifa.precio * 100) / 100;
  const peso_total   = area_m2 * (tarifa.peso || 0);

  return {
    texto: `${dims.ancho}×${dims.largo} mm · ${tarifa.material}${tarifa.espesor ? ' ' + tarifa.espesor + 'mm' : ''}`,
    tipo: 'calculo',
    datos: {
      dims, material: tarifa.material, espesor: tarifa.espesor, color: tarifa.color,
      area_m2, precio_m2: tarifa.precio,
      precio_material: precio_total, coste_conf: 0, desc_conf: null,
      precio_total, peso_m2: tarifa.peso || 0, peso_total,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CALCULADORA DE METRAJE (tira de ancho fijo × metros lineales)
// ═══════════════════════════════════════════════════════════════════════════════

async function calcularMetraje(s, ent) {
  const { material, espesor, color } = ent;
  const metros    = extraerMetros(s);
  const anchoTira = extraerAnchoTira(s, espesor);

  if (!metros || !anchoTira) {
    return { texto: 'Ejemplo: "50 metros de PVC 3mm de 150mm de ancho"', tipo: 'ayuda', datos: null };
  }

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

  const area_m2     = (anchoTira / 1000) * metros;
  const precio_m2   = tarifa?.precio ?? null;
  const precio_total = precio_m2 != null ? Math.round(area_m2 * precio_m2 * 100) / 100 : null;
  const peso_total   = tarifa ? area_m2 * (tarifa.peso || 0) : null;

  return {
    texto: `${anchoTira}mm × ${metros}m · ${tarifa?.material ?? material ?? '?'}${tarifa?.espesor ? ' ' + tarifa.espesor + 'mm' : ''}`,
    tipo: 'metraje',
    datos: {
      anchoTira, metros, area_m2,
      material: tarifa?.material ?? material, espesor: tarifa?.espesor ?? espesor, color: tarifa?.color ?? color,
      precio_m2, precio_total, peso_m2: tarifa?.peso ?? null, peso_total,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROCESADOR PRINCIPAL — devuelve resultado estructurado
// ═══════════════════════════════════════════════════════════════════════════════

async function procesarConsulta(s, ent, contexto) {
  const intencion = detectarIntencion(s, ent);

  // Multiplicar resultado anterior por N unidades
  if (contexto && /\b(multiplic|por\s+(?:las?\s*)?\d|x\s*\d|\d\s*unidades?|\d\s*bandas?|\d\s*piezas?)\b/.test(s)) {
    const n = extraerMultiplicador(s) || extraerUnidades(s);
    if (n > 1 && contexto.precio_total != null) {
      const precio_unitario = contexto.precio_unitario ?? contexto.precio_total;
      return {
        texto: `× ${n} unidades`,
        tipo: contexto.tipo_calculo ?? 'calculo',
        datos: {
          ...contexto,
          unidades: n,
          precio_unitario,
          precio_total: Math.round(precio_unitario * n * 100) / 100,
          peso_total: (contexto.peso_unitario ?? contexto.peso_total ?? 0) * n,
        },
      };
    }
  }

  const unidades = extraerUnidades(s);
  if (intencion === 'calcular_banda')   return aplicarUnidades(await calcularBanda(ent), unidades);
  if (intencion === 'calcular_pieza')   return aplicarUnidades(await calcularPieza(ent), unidades);
  if (intencion === 'calcular_metraje') return await calcularMetraje(s, ent); // metros ya lleva el total

  if (intencion === 'tarifa_material') {
    const where = {};
    if (ent.material) where.material = ent.material;
    if (ent.espesor != null) where.espesor = ent.espesor;
    if (ent.color) where.color = ent.color;
    const tarifas = await db.tarifaMaterial.findMany({ where, orderBy: [{ material: 'asc' }, { espesor: 'asc' }], take: 10 });
    if (!tarifas.length) return { texto: 'No encontré tarifas con esos criterios.', tipo: 'tarifa', datos: [] };
    return {
      texto: `${tarifas.length} tarifa${tarifas.length !== 1 ? 's' : ''}`,
      tipo: 'tarifa',
      datos: tarifas.map(t => ({ material: t.material, espesor: t.espesor, color: t.color, acabado: t.acabado, precio: t.precio, peso: t.peso, preciosVenta: t.preciosVenta })),
    };
  }

  if (intencion === 'stock_minimo') {
    const todos = await db.stock.findMany({ orderBy: { metrosDisponibles: 'asc' } });
    const bajos = todos.filter(s => s.metrosDisponibles <= s.stockMinimo);
    return {
      texto: bajos.length === 0 ? 'Todo el stock sobre mínimo ✅' : `${bajos.length} material${bajos.length !== 1 ? 'es' : ''} bajo mínimo`,
      tipo: 'stock',
      datos: bajos.map(s => ({ id: s.id, material: s.material, espesor: s.espesor, metros: s.metrosDisponibles, minimo: s.stockMinimo, alerta: true })),
    };
  }

  if (intencion === 'stock') {
    let stocks;
    if (ent.material || ent.espesor != null) {
      const where = {};
      if (ent.material) where.material = { contains: ent.material };
      if (ent.espesor != null) where.espesor = ent.espesor;
      stocks = await db.stock.findMany({ where, orderBy: { material: 'asc' }, take: 12 });
    } else {
      const termino = s.replace(/\b(stock|metros|hay|tenemos|quedan|cuanto|cuanta|disponible|de|el|la|los|las)\b/g, '').trim();
      stocks = await db.stock.findMany({
        where: termino ? { material: { contains: termino } } : {},
        orderBy: { material: 'asc' }, take: 12,
      });
    }
    if (!stocks.length) return { texto: 'No encontré stock con esos criterios.', tipo: 'stock', datos: [] };
    return {
      texto: `${stocks.length} resultado${stocks.length !== 1 ? 's' : ''}`,
      tipo: 'stock',
      datos: stocks.map(s => ({ id: s.id, material: s.material, espesor: s.espesor, metros: s.metrosDisponibles, minimo: s.stockMinimo, alerta: s.metrosDisponibles <= s.stockMinimo })),
    };
  }

  if (intencion === 'pedido_numero') {
    const mNum = s.match(/\bpedido\s+([a-z0-9\-]+)/);
    const pedido = await db.pedido.findFirst({
      where: { numero: { contains: mNum[1] } },
      include: { cliente: { select: { nombre: true } }, items: { take: 5 } },
    });
    if (!pedido) return { texto: `No encontré pedido "${mNum[1]}".`, tipo: 'error', datos: null };
    return {
      texto: `Pedido ${pedido.numero}`,
      tipo: 'pedido_detalle',
      datos: { id: pedido.id, numero: pedido.numero, cliente: pedido.cliente?.nombre, estado: pedido.estado, total: pedido.total, items: pedido.items.length, fecha: pedido.fechaCreacion },
    };
  }

  if (intencion === 'pedidos_hoy') {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy); manana.setDate(manana.getDate() + 1);
    const pedidos = await db.pedido.findMany({
      where: { fechaCreacion: { gte: hoy, lt: manana } },
      include: { cliente: { select: { nombre: true } } }, orderBy: { fechaCreacion: 'desc' },
    });
    return {
      texto: pedidos.length === 0 ? 'No hay pedidos hoy.' : `${pedidos.length} pedido${pedidos.length !== 1 ? 's' : ''} hoy`,
      tipo: 'pedidos',
      datos: pedidos.map(p => ({ id: p.id, numero: p.numero, cliente: p.cliente?.nombre, estado: p.estado, total: p.total })),
    };
  }

  if (intencion === 'pedidos_estado') {
    const estado = extraerEstadoPedido(s);
    const pedidos = await db.pedido.findMany({
      where: { estado }, include: { cliente: { select: { nombre: true } } },
      orderBy: { fechaCreacion: 'desc' }, take: 10,
    });
    return {
      texto: pedidos.length === 0 ? `No hay pedidos ${estado.toLowerCase()}s.` : `${pedidos.length} pedido${pedidos.length !== 1 ? 's' : ''} ${estado.toLowerCase()}${pedidos.length !== 1 ? 's' : ''}`,
      tipo: 'pedidos',
      datos: pedidos.map(p => ({ id: p.id, numero: p.numero, cliente: p.cliente?.nombre, estado: p.estado, total: p.total })),
    };
  }

  if (intencion === 'pedidos_recientes') {
    const pedidos = await db.pedido.findMany({ include: { cliente: { select: { nombre: true } } }, orderBy: { fechaCreacion: 'desc' }, take: 5 });
    return {
      texto: 'Últimos 5 pedidos', tipo: 'pedidos',
      datos: pedidos.map(p => ({ id: p.id, numero: p.numero, cliente: p.cliente?.nombre, estado: p.estado, total: p.total })),
    };
  }

  if (intencion === 'presupuesto_numero') {
    const mNum = s.match(/\bpresupuesto\s+([a-z0-9\-]+)/);
    const pres = await db.presupuesto.findFirst({
      where: { numero: { contains: mNum[1] } }, include: { cliente: { select: { nombre: true } } },
    });
    if (!pres) return { texto: `No encontré presupuesto "${mNum[1]}".`, tipo: 'error', datos: null };
    return {
      texto: `Presupuesto ${pres.numero}`, tipo: 'pedido_detalle',
      datos: { id: pres.id, numero: pres.numero, cliente: pres.cliente?.nombre, estado: pres.estado, total: pres.total, items: 0, fecha: pres.fechaCreacion, esPresupuesto: true },
    };
  }

  if (intencion === 'presupuestos_hoy') {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy); manana.setDate(manana.getDate() + 1);
    const pres = await db.presupuesto.findMany({
      where: { fechaCreacion: { gte: hoy, lt: manana } },
      include: { cliente: { select: { nombre: true } } }, orderBy: { fechaCreacion: 'desc' },
    });
    return {
      texto: pres.length === 0 ? 'No hay presupuestos hoy.' : `${pres.length} presupuesto${pres.length !== 1 ? 's' : ''} hoy`,
      tipo: 'pedidos',
      datos: pres.map(p => ({ id: p.id, numero: p.numero, cliente: p.cliente?.nombre, estado: p.estado, total: p.total, esPresupuesto: true })),
    };
  }

  if (intencion === 'presupuestos_recientes') {
    const pres = await db.presupuesto.findMany({ include: { cliente: { select: { nombre: true } } }, orderBy: { fechaCreacion: 'desc' }, take: 5 });
    return {
      texto: 'Últimos 5 presupuestos', tipo: 'pedidos',
      datos: pres.map(p => ({ id: p.id, numero: p.numero, cliente: p.cliente?.nombre, estado: p.estado, total: p.total, esPresupuesto: true })),
    };
  }

  if (intencion === 'importaciones') {
    const estadoImport = extraerEstadoImport(s);
    const importaciones = await db.importacionContenedor.findMany({
      where: estadoImport ? { estado: estadoImport } : { estado: { in: ['PEDIDO', 'TRANSITO', 'ADUANA'] } },
      include: { proveedor: { select: { nombre: true } } },
      orderBy: { creadaEn: 'desc' }, take: 8,
    });
    return {
      texto: importaciones.length === 0 ? 'No hay importaciones activas.' : `${importaciones.length} importacion${importaciones.length !== 1 ? 'es' : ''}`,
      tipo: 'importaciones',
      datos: importaciones.map(i => ({ id: i.id, descripcion: i.descripcion, estado: i.estado, proveedor: i.proveedor?.nombre, numContenedor: i.numContenedor, nombreBarco: i.nombreBarco, etaEstimada: i.etaEstimada })),
    };
  }

  if (intencion === 'cliente') {
    const mCli = s.match(/(?:cliente|buscar)\s+(.+)/);
    const nombre = mCli ? mCli[1].trim() : '';
    const cliente = await db.cliente.findFirst({
      where: { nombre: { contains: nombre } },
      include: { pedidos: { orderBy: { fechaCreacion: 'desc' }, take: 3, select: { id: true, numero: true, estado: true, total: true, fechaCreacion: true } } },
    });
    if (!cliente) return { texto: `No encontré cliente "${nombre}".`, tipo: 'error', datos: null };
    return {
      texto: cliente.nombre, tipo: 'cliente',
      datos: { id: cliente.id, nombre: cliente.nombre, email: cliente.email, telefono: cliente.telefono, pedidosRecientes: cliente.pedidos },
    };
  }

  if (intencion === 'ayuda') {
    return {
      texto: 'Puedo ayudarte con:', tipo: 'ayuda',
      datos: [
        '600x4800 sin fin pvc 3mm blanco  →  banda (mat. + vulcanizado)',
        '600x4800 grapa pvc 3mm           →  banda con grapa',
        'faldeta 300x500 epdm 6mm         →  pieza (solo material)',
        '50 metros pvc 3mm 150mm ancho    →  metraje lineal',
        'tarifa pvc 6mm blanco            →  precios por m²',
        'stock pvc 3mm  /  stock bajo mínimo',
        'pedidos hoy  /  pedidos pendientes  /  pedido 227',
        'presupuestos hoy  /  presupuesto 042',
        'contenedores en tránsito',
        'cliente castillero',
      ],
    };
  }

  return { texto: 'No entendí esa consulta. Escribe "ayuda" para ver opciones.', tipo: 'ayuda', datos: null };
}

// ═══════════════════════════════════════════════════════════════════════════════
// OLLAMA — generación de respuesta natural
// ═══════════════════════════════════════════════════════════════════════════════

function resumirParaOllama(query, resultado) {
  const { tipo, datos } = resultado;

  if (tipo === 'calculo' && datos?.precio_total != null) {
    const confLabel = datos.conf === 'SF' ? 'Sin Fin' : datos.conf === 'GR' ? 'Con Grapa' : datos.conf === 'AB' ? 'Abierta' : '';
    return `El usuario preguntó: "${query}"
Datos calculados:
- Dimensiones: ${datos.dims?.ancho}×${datos.dims?.largo} mm${confLabel ? ', ' + confLabel : ''}
- Material: ${datos.material || '?'} ${datos.espesor || ''}mm${datos.color ? ' ' + datos.color : ''}
- Superficie: ${datos.area_m2?.toFixed(3)} m²
- Precio/m² material: ${datos.precio_m2?.toFixed(2)}€
- Coste material: ${datos.precio_material?.toFixed(2)}€${datos.coste_conf > 0 ? `\n- ${datos.desc_conf || 'Confección'}: ${datos.coste_conf?.toFixed(2)}€` : ''}
- PRECIO TOTAL: ${datos.precio_total?.toFixed(2)}€
- Peso total: ${datos.peso_total?.toFixed(2)} kg
${datos.bandaCatalogo ? `- Ya está en catálogo al precio de ${datos.bandaCatalogo.precio?.toFixed(2)}€` : ''}`;
  }

  if (tipo === 'tarifa' && Array.isArray(datos) && datos.length) {
    const lineas = datos.slice(0, 5).map(t => `  ${t.material} ${t.espesor}mm${t.color ? ' ' + t.color : ''}: ${t.precio?.toFixed(2)}€/m² (peso ${t.peso} kg/m²)`);
    return `El usuario preguntó: "${query}"\nTarifas encontradas:\n${lineas.join('\n')}`;
  }

  if (tipo === 'stock' && Array.isArray(datos) && datos.length) {
    const lineas = datos.slice(0, 6).map(s => `  ${s.material}${s.espesor ? ' ' + s.espesor + 'mm' : ''}: ${s.metros?.toFixed(1)} m² disponibles${s.alerta ? ' ⚠️ BAJO MÍNIMO' : ''}`);
    return `El usuario preguntó: "${query}"\nStock:\n${lineas.join('\n')}`;
  }

  if (tipo === 'pedidos' && Array.isArray(datos) && datos.length) {
    const lineas = datos.slice(0, 6).map(p => `  ${p.numero} - ${p.cliente || 'Sin cliente'} - ${p.estado} - ${p.total?.toFixed(2)}€`);
    return `El usuario preguntó: "${query}"\nPedidos:\n${lineas.join('\n')}`;
  }

  if (tipo === 'pedido_detalle' && datos) {
    return `El usuario preguntó: "${query}"\nPedido ${datos.numero}: cliente ${datos.cliente || 'desconocido'}, estado ${datos.estado}, total ${datos.total?.toFixed(2)}€, ${datos.items} líneas, fecha ${new Date(datos.fecha).toLocaleDateString('es-ES')}.`;
  }

  if (tipo === 'cliente' && datos) {
    const ultimos = datos.pedidosRecientes?.map(p => p.numero).join(', ') || 'ninguno';
    return `El usuario preguntó: "${query}"\nCliente ${datos.nombre}: email ${datos.email || 'no disponible'}, teléfono ${datos.telefono || 'no disponible'}. Últimos pedidos: ${ultimos}.`;
  }

  if (tipo === 'metraje' && datos?.precio_total != null) {
    return `El usuario preguntó: "${query}"
Datos calculados:
- Tira de ${datos.anchoTira}mm de ancho × ${datos.metros} metros lineales
- Material: ${datos.material || '?'}${datos.espesor ? ' ' + datos.espesor + 'mm' : ''}${datos.color ? ' ' + datos.color : ''}
- Área total: ${datos.area_m2?.toFixed(3)} m²
- Precio/m²: ${datos.precio_m2?.toFixed(2)}€
- Precio total: ${datos.precio_total?.toFixed(2)}€
- Peso total: ${datos.peso_total?.toFixed(2)} kg`;
  }

  return null; // no hay datos útiles para Ollama
}

async function generarTextoOllama(query, resultado) {
  try {
    const resumen = resumirParaOllama(query, resultado);
    if (!resumen) return null;

    const prompt = `Eres el asistente de un taller de bandas transportadoras PVC. Responde en español, de forma breve y directa (máximo 2 frases). No uses bullet points ni markdown. Solo los datos más relevantes.

${resumen}

Respuesta:`;

    const ctrl    = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 20000); // 20s timeout

    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        options: { temperature: 0.2, num_predict: 120 },
      }),
      signal: ctrl.signal,
    });

    clearTimeout(timeout);
    if (!res.ok) return null;

    const data = await res.json();
    const texto = data.response?.trim();
    return texto || null;

  } catch {
    return null; // timeout o Ollama no disponible → usa texto de plantilla
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request) {
  try {
    const { query, contexto } = await request.json();
    if (!query?.trim()) {
      return NextResponse.json({ texto: 'Escribe algo para consultar.', tipo: 'ayuda', datos: null });
    }

    const s = norm(query.trim());

    // Glosario dinámico — materiales reales de BD
    const tarifasDB  = await db.tarifaMaterial.findMany({ select: { material: true }, distinct: ['material'] });
    const materialesDB = tarifasDB.map(r => r.material);

    const ent = {
      material: extraerMaterial(s, materialesDB),
      espesor:  extraerEspesor(s),
      color:    extraerColor(s),
      conf:     extraerConf(s),
      dims:     extraerDimensiones(s),
    };

    // Procesamos la consulta para obtener datos estructurados
    const resultado = await procesarConsulta(s, ent, contexto ?? null);

    // Ollama para cálculos y metrajes — donde el lenguaje natural aporta valor real
    const esCalculoConPrecio =
      (['calculo', 'metraje'].includes(resultado.tipo)) && resultado.datos?.precio_total != null;
    if (esCalculoConPrecio) {
      const textoAI = await generarTextoOllama(query, resultado);
      if (textoAI) resultado.texto = textoAI;
    }

    return NextResponse.json(resultado);

  } catch (error) {
    console.error('[/api/consulta]', error?.message);
    return NextResponse.json({ texto: 'Error al consultar. Inténtalo de nuevo.', tipo: 'error', datos: null });
  }
}
