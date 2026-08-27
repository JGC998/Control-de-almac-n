import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const OLLAMA_URL   = process.env.OLLAMA_URL   || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:3b';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════════

const CONF_LABEL = { SF: 'Sin Fin', GR: 'Con Grapa', AB: 'Abierta' };

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
// OLLAMA — EXTRACCIÓN DE INTENCIÓN Y ENTIDADES (primer uso, antes de DB)
// ═══════════════════════════════════════════════════════════════════════════════

async function extraerConOllama(query, materialesDisponibles) {
  try {
    const mats = materialesDisponibles.slice(0, 12).join(', ');

    const prompt = `Eres un extractor de datos para un taller de bandas PVC. Analiza la consulta y devuelve ÚNICAMENTE un JSON válido sin ningún texto adicional.

Materiales del catálogo: ${mats}
Tipos de confección: SF=sin fin/cerrada/soldada, GR=grapa/con grapa, AB=abierta, null=no indicada
Colores: BLANCO, NEGRO, AZUL, VERDE, GRIS, AMARILLO, ROJO, TRANSPARENTE, NATURAL
Dimensiones: ancho y largo se expresan en mm, pueden llevar puntos o comas de miles (3.900 = 3900 mm, 6,800 = 6800 mm), devuélvelos siempre como número entero sin separadores.

Intenciones posibles:
- calcular_banda: precio de banda (ancho+largo en mm, con confección SF/GR/AB)
- calcular_pieza: precio pieza plana sin confección (faldeta, lámina, chapa, corte, caucho)
- calcular_metraje: precio de tira por metros lineales (anchoTira mm + metros)
- tarifa_material: precio por m² de un material
- stock: consultar disponibilidad de stock
- stock_minimo: materiales bajo mínimo / alertas
- pedidos_hoy: pedidos creados hoy
- pedidos_recientes: últimos pedidos
- pedidos_estado: pedidos filtrados por estado
- pedido_numero: buscar pedido por número
- presupuestos_hoy: presupuestos creados hoy
- presupuestos_recientes: últimos presupuestos
- presupuesto_numero: buscar presupuesto por número
- importaciones: contenedores/importaciones
- cliente: información de un cliente
- ayuda: qué puede hacer el asistente

Consulta: "${query}"

Responde con este JSON (usa null en campos que no apliquen):
{"intencion":"...","unidades":1,"material":null,"espesor":null,"color":null,"conf":null,"ancho":null,"largo":null,"anchoTira":null,"metros":null,"numero":null,"clienteNombre":null,"estado":null,"estadoImport":null}`;

    const ctrl    = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 18000);

    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        format: 'json',
        options: { temperature: 0, num_predict: 180 },
      }),
      signal: ctrl.signal,
    });

    clearTimeout(timeout);
    if (!res.ok) return null;

    const raw  = await res.json();
    const text = raw.response?.trim();
    if (!text) return null;

    const parsed = JSON.parse(text);
    return parsed?.intencion ? parsed : null;

  } catch {
    return null; // timeout o Ollama no disponible → fallback a regex
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// REGEX FALLBACK — se usa solo cuando Ollama no responde
// ═══════════════════════════════════════════════════════════════════════════════

function norm(s) {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    // separadores de miles → eliminar: 3.900→3900, 3,900→3900 (4+ dígitos tras punto/coma)
    .replace(/(\d)[.,](\d{3})\b/g, '$1$2')
    .replace(/[×*·]/g, 'x')
    .replace(/[^a-z0-9\s.x,\-]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

const CONF_ALIAS = {
  'sin fin': 'SF', 'sin-fin': 'SF', sinfin: 'SF', sf: 'SF',
  cerrada: 'SF', soldada: 'SF',
  'con grapa': 'GR', 'con grapas': 'GR', grapa: 'GR', grapas: 'GR', grapada: 'GR', gr: 'GR',
  abierta: 'AB', abierto: 'AB', ab: 'AB',
};

const COLOR_ALIAS = {
  blanco: 'BLANCO', blanca: 'BLANCO', negro: 'NEGRO', negra: 'NEGRO',
  azul: 'AZUL', verde: 'VERDE', gris: 'GRIS', grey: 'GRIS',
  amarillo: 'AMARILLO', rojo: 'ROJO', naranja: 'NARANJA',
  transparente: 'TRANSPARENTE', natural: 'NATURAL',
};

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

function extraerUnidades(s) {
  const m1 = s.match(/\b(\d{1,3})\s*(?:bandas?|piezas?|unidades?|uds?\.?)\b/);
  if (m1) return parseInt(m1[1], 10);
  const m2 = s.match(/\b(?:x|×)\s*(\d{1,3})\b/);
  if (m2) return parseInt(m2[1], 10);
  return 1;
}

function extraerMetros(s) {
  const m = s.match(/(\d+(?:[.,]\d+)?)\s*(?:metros?\s*lineales?|metros?\b(?!\s*mm)|m\s*lin)/);
  if (!m) return null;
  return parseFloat(m[1].replace(',', '.'));
}

function extraerAnchoTira(s, espesorConocido) {
  const m1 = s.match(/(\d{2,4})\s*mm\s*(?:de\s*)?ancho/);
  if (m1) return parseFloat(m1[1]);
  const m2 = s.match(/ancho\s*(?:de\s*)?(\d{2,4})\s*mm/);
  if (m2) return parseFloat(m2[1]);
  const todos = [...s.matchAll(/(\d+)\s*mm/g)].map(m => parseFloat(m[1]));
  return todos.find(v => v !== espesorConocido && v >= 50 && v <= 2000) ?? null;
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

function detectarIntencionRegex(s, ent) {
  const { dims, material, espesor, conf, color } = ent;
  const metrosLin = extraerMetros(s);
  const esPieza   = /\b(pieza|faldeta|lamina|cortina|chapa|placa|corte)\b/.test(s);
  const esBandaKW = /\b(banda|transportadora)\b/.test(s);

  if (metrosLin && (material || espesor != null)) return 'calcular_metraje';
  if (dims && esPieza) return 'calcular_pieza';
  if (dims && (conf || esBandaKW || material || espesor != null || color)) return 'calcular_banda';
  if (dims) return 'calcular_banda';
  if (/\b(precio|tarifa|cuanto|cuanta|coste|vale|cuesta|sale)\b/.test(s) && (material || espesor != null)) return 'tarifa_material';
  if (/bajo.{0,10}minimo|minimo.{0,10}stock|alertas?\s*stock|critico/.test(s)) return 'stock_minimo';
  if (/\b(stock|metros|disponible|hay|tenemos|quedan|inventario)\b/.test(s)) return 'stock';
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
// CALCULADORAS
// ═══════════════════════════════════════════════════════════════════════════════

function aplicarUnidades(resultado, unidades) {
  if (unidades <= 1 || !resultado.datos?.precio_total) return resultado;
  const d = resultado.datos;
  return {
    ...resultado,
    datos: {
      ...d,
      unidades,
      precio_unitario: d.precio_total,
      peso_unitario:   d.peso_total,
      precio_total:    Math.round(d.precio_total * unidades * 100) / 100,
      peso_total:      (d.peso_total || 0) * unidades,
      tipo_calculo:    resultado.tipo,
    },
  };
}

async function buscarTarifa(material, espesor, color) {
  const intentos = [
    { material, espesor, color },
    { material, espesor, color: null },
    { material, espesor },
    { material },
  ].filter(w => Object.values(w).some(v => v != null));

  for (const where of intentos) {
    const cleaned = Object.fromEntries(Object.entries(where).filter(([, v]) => v != null));
    const tarifa = await db.tarifaMaterial.findFirst({ where: cleaned, orderBy: { espesor: 'asc' } });
    if (tarifa) return tarifa;
  }
  return null;
}

async function calcularBanda(ent) {
  const { material, espesor, color, dims, conf } = ent;
  if (!dims) return { texto: 'Necesito las dimensiones. Ejemplo: "600x4800 pvc 3mm sin fin"', tipo: 'ayuda', datos: null };

  const tarifa  = await buscarTarifa(material, espesor, color);
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

  let coste_conf = 0, desc_conf = null;

  if (conf === 'SF') {
    const cfgVulc    = await db.config.findUnique({ where: { key: 'costeVulcanizadoMetro' } });
    const costeVulcM = cfgVulc ? parseFloat(cfgVulc.value) || 0 : 0;
    coste_conf = costeVulcM * (dims.ancho / 1000);
    if (coste_conf > 0) desc_conf = `Vulcanizado Sin Fin`;
  } else if (conf === 'GR' && espesor != null) {
    const modelo = await db.modeloGrapa.findFirst({
      where: { espesorDesde: { lte: espesor }, OR: [{ espesorHasta: null }, { espesorHasta: { gte: espesor } }] },
      orderBy: { espesorDesde: 'asc' },
    });
    if (modelo?.precioPor100mm) {
      coste_conf = (dims.ancho / 100) * modelo.precioPor100mm;
      desc_conf  = `Grapa ${modelo.nombre}`;
    }
  }

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
      coste_conf: Math.round(coste_conf * 100) / 100, desc_conf,
      precio_total, peso_m2: tarifa.peso || 0, peso_total,
      preciosVenta,
      bandaCatalogo: bandaCatalogo
        ? { id: bandaCatalogo.id, nombre: bandaCatalogo.nombre, precio: bandaCatalogo.precioUnitario }
        : null,
    },
  };
}

async function calcularPieza(ent) {
  const { material, espesor, color, dims } = ent;
  if (!dims) return { texto: 'Necesito las dimensiones. Ejemplo: "faldeta 300x500 epdm 6mm"', tipo: 'ayuda', datos: null };

  const tarifa  = await buscarTarifa(material, espesor, color);
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

async function calcularMetraje(ent) {
  const { material, espesor, color, metros, anchoTira } = ent;

  if (!metros || !anchoTira) {
    return { texto: 'Ejemplo: "50 metros de PVC 3mm de 150mm de ancho"', tipo: 'ayuda', datos: null };
  }

  const tarifa   = await buscarTarifa(material, espesor, color);
  const area_m2  = (anchoTira / 1000) * metros;
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
// VALIDACIÓN DE DATOS NECESARIOS — pregunta al usuario lo que falta
// ═══════════════════════════════════════════════════════════════════════════════

// Fusiona entidades de una conversación parcial anterior con las nuevas.
// Los valores nuevos no nulos sobreescriben los almacenados; los null no borran.
function mergeEnt(almacenado, nuevo) {
  const base = { ...almacenado };
  delete base.intencion; // no contaminar ent con campo de control
  for (const [k, v] of Object.entries(nuevo)) {
    if (v != null) base[k] = v;
  }
  return base;
}

// Devuelve { pregunta } si falta algún dato imprescindible, o null si todo ok.
function validarEntidades(intencion, ent) {
  if (intencion === 'calcular_banda' || intencion === 'calcular_pieza') {
    if (!ent.dims) {
      return { pregunta: '¿Cuáles son las dimensiones (ancho × largo en mm)? Ej: 600×4800' };
    }
    if (!ent.material && ent.espesor == null) {
      return { pregunta: '¿Qué material y espesor? Ej: PVC 3mm, EPDM 6mm, PU 8mm' };
    }
  }
  if (intencion === 'calcular_metraje') {
    if (!ent.metros && !ent.anchoTira) {
      return { pregunta: '¿Cuántos metros y qué ancho de tira necesitas? Ej: 50 metros de 150 mm de ancho' };
    }
    if (!ent.metros) {
      return { pregunta: '¿Cuántos metros lineales necesitas?' };
    }
    if (!ent.anchoTira) {
      return { pregunta: '¿Cuál es el ancho de la tira en mm? Ej: 150 mm' };
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROCESADOR PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function procesarConsulta(s, ent, contexto, intencionOverride) {
  const intencion = intencionOverride ?? detectarIntencionRegex(s, ent);

  // Multiplicar resultado anterior × N (memoria de conversación)
  if (contexto?.precio_total != null) {
    const esMultiply = /\b(multiplic|por\s+(?:las?\s*)?\d|\d\s*(?:unidades?|bandas?|piezas?))\b/.test(s);
    const n = esMultiply
      ? (parseInt(s.match(/\d+/g)?.slice(-1)[0]) || ent.unidades)
      : ent.unidades;
    if (esMultiply && n > 1) {
      const precio_unitario = contexto.precio_unitario ?? contexto.precio_total;
      return {
        texto: `× ${n} unidades`,
        tipo: contexto.tipo_calculo ?? 'calculo',
        datos: {
          ...contexto,
          unidades: n,
          precio_unitario,
          precio_total: Math.round(precio_unitario * n * 100) / 100,
          peso_total:   (contexto.peso_unitario ?? contexto.peso_total ?? 0) * n,
        },
      };
    }
  }

  const unidades = ent.unidades ?? 1;

  if (intencion === 'calcular_banda')   return aplicarUnidades(await calcularBanda(ent), unidades);
  if (intencion === 'calcular_pieza')   return aplicarUnidades(await calcularPieza(ent), unidades);
  if (intencion === 'calcular_metraje') return calcularMetraje(ent);

  if (intencion === 'tarifa_material') {
    const where = {};
    if (ent.material) where.material = ent.material;
    if (ent.espesor  != null) where.espesor = ent.espesor;
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
    const bajos = todos.filter(st => st.metrosDisponibles <= st.stockMinimo);
    return {
      texto: bajos.length === 0 ? 'Todo el stock sobre mínimo ✅' : `${bajos.length} material${bajos.length !== 1 ? 'es' : ''} bajo mínimo`,
      tipo: 'stock',
      datos: bajos.map(st => ({ id: st.id, material: st.material, espesor: st.espesor, metros: st.metrosDisponibles, minimo: st.stockMinimo, alerta: true })),
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
      stocks = await db.stock.findMany({ orderBy: { material: 'asc' }, take: 12 });
    }
    if (!stocks.length) return { texto: 'No encontré stock con esos criterios.', tipo: 'stock', datos: [] };
    return {
      texto: `${stocks.length} resultado${stocks.length !== 1 ? 's' : ''}`,
      tipo: 'stock',
      datos: stocks.map(st => ({ id: st.id, material: st.material, espesor: st.espesor, metros: st.metrosDisponibles, minimo: st.stockMinimo, alerta: st.metrosDisponibles <= st.stockMinimo })),
    };
  }

  if (intencion === 'pedido_numero') {
    const num = ent.numero ?? s.match(/\bpedido\s+([a-z0-9\-]+)/)?.[1] ?? '';
    const pedido = await db.pedido.findFirst({
      where: { numero: { contains: num } },
      include: { cliente: { select: { nombre: true } }, items: { take: 5 } },
    });
    if (!pedido) return { texto: `No encontré pedido "${num}".`, tipo: 'error', datos: null };
    return {
      texto: `Pedido ${pedido.numero}`, tipo: 'pedido_detalle',
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
    const estado = ent.estado ?? extraerEstadoPedido(s);
    const pedidos = await db.pedido.findMany({
      where: { estado }, include: { cliente: { select: { nombre: true } } },
      orderBy: { fechaCreacion: 'desc' }, take: 10,
    });
    return {
      texto: pedidos.length === 0 ? `No hay pedidos ${(estado ?? '').toLowerCase()}s.` : `${pedidos.length} pedido${pedidos.length !== 1 ? 's' : ''} ${(estado ?? '').toLowerCase()}s`,
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
    const num = ent.numero ?? s.match(/\bpresupuesto\s+([a-z0-9\-]+)/)?.[1] ?? '';
    const pres = await db.presupuesto.findFirst({
      where: { numero: { contains: num } }, include: { cliente: { select: { nombre: true } } },
    });
    if (!pres) return { texto: `No encontré presupuesto "${num}".`, tipo: 'error', datos: null };
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
    const estadoImport = ent.estadoImport ?? extraerEstadoImport(s);
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
    const nombre = ent.clienteNombre ?? (s.match(/(?:cliente|buscar)\s+(.+)/)?.[1]?.trim() ?? '');
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
        '4 bandas 800x6900 grapa pvc 2mm  →  precio × cantidad',
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
// HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request) {
  try {
    const { query, contexto } = await request.json();
    if (!query?.trim()) {
      return NextResponse.json({ texto: 'Escribe algo para consultar.', tipo: 'ayuda', datos: null });
    }

    // Materiales reales de la BD — necesarios tanto para Ollama como para regex fallback
    const tarifasDB    = await db.tarifaMaterial.findMany({ select: { material: true }, distinct: ['material'] });
    const materialesDB = tarifasDB.map(r => r.material);

    // ── INTENTO 1: Ollama entiende la consulta en lenguaje natural ──────────────
    let intencion = null;
    let ent       = null;

    const extracted = await extraerConOllama(query, materialesDB);

    if (extracted) {
      intencion = extracted.intencion;
      const parseDim = v => v != null ? parseFloat(String(v).replace(/[.,](?=\d{3}\b)/g, '')) : null;
      const ancho = parseDim(extracted.ancho);
      const largo = parseDim(extracted.largo);
      ent = {
        material:      extracted.material      || null,
        espesor:       extracted.espesor  != null ? parseFloat(extracted.espesor)  : null,
        color:         extracted.color         || null,
        conf:          extracted.conf          || null,
        dims:          ancho && largo ? { ancho: Math.min(ancho, largo), largo: Math.max(ancho, largo) } : null,
        unidades:      parseInt(extracted.unidades) || 1,
        metros:        extracted.metros     != null ? parseFloat(extracted.metros)    : null,
        anchoTira:     extracted.anchoTira  != null ? parseFloat(extracted.anchoTira) : null,
        numero:        extracted.numero        || null,
        clienteNombre: extracted.clienteNombre || null,
        estado:        extracted.estado        || null,
        estadoImport:  extracted.estadoImport  || null,
      };
    }

    // ── INTENTO 2: Regex fallback si Ollama no respondió ────────────────────────
    if (!ent) {
      const s = norm(query.trim());
      ent = {
        material:      extraerMaterial(s, materialesDB),
        espesor:       extraerEspesor(s),
        color:         extraerColor(s),
        conf:          extraerConf(s),
        dims:          extraerDimensiones(s),
        unidades:      extraerUnidades(s),
        metros:        extraerMetros(s),
        anchoTira:     extraerAnchoTira(s, extraerEspesor(s)),
        numero:        null,
        clienteNombre: null,
        estado:        null,
        estadoImport:  null,
      };
    }

    const s = norm(query.trim());

    // ── Retomar conversación parcial: fusionar entidades del turno anterior ──────
    // Si el turno anterior terminó con 'falta_datos', contexto.intencion estará
    // presente pero contexto.precio_total no (a diferencia de un resultado normal).
    const ctx = contexto ?? null;
    if (ctx?.intencion && ctx?.precio_total == null) {
      // Usar la intención almacenada si Ollama no detectó una diferente
      intencion = intencion ?? ctx.intencion;
      // Fusionar: los valores nuevos no nulos sobreescriben los guardados
      ent = mergeEnt(ctx, ent);
    }

    // ── Preguntar si faltan datos imprescindibles ────────────────────────────────
    const intent = intencion ?? detectarIntencionRegex(s, ent);
    const faltante = validarEntidades(intent, ent);
    if (faltante) {
      return NextResponse.json({
        texto: faltante.pregunta,
        tipo: 'falta_datos',
        datos: { intencion: intent, ...ent }, // guardamos el estado parcial
      });
    }

    const resultado = await procesarConsulta(s, ent, ctx, intencion);

    return NextResponse.json(resultado);

  } catch (error) {
    console.error('[/api/consulta]', error?.message);
    return NextResponse.json({ texto: 'Error al consultar. Inténtalo de nuevo.', tipo: 'error', datos: null });
  }
}
