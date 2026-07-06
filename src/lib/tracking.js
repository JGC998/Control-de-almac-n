/**
 * Tracking de contenedores Yang Ming + MSC + notificaciones WhatsApp via CallMeBot.
 *
 * Variables de entorno requeridas:
 *   CALLMEBOT_PHONE   — Número sin + (ej: 34612345678)
 *   CALLMEBOT_APIKEY  — API key de CallMeBot
 *   CALLMEBOT_PHONE_2  — (Opcional) Segundo número
 *   CALLMEBOT_APIKEY_2 — (Opcional) API key del segundo número
 *
 * Navieras soportadas:
 *   Yang Ming — prefijos YMMU/YMLU — API pública sin autenticación
 *   MSC       — prefijos MSCU/MEDU/MSDU/MSKL/MSXU — API pública sin autenticación
 */

import { logApiError } from '@/lib/logger';

const YM_API        = 'https://www.yangming.com/api/CargoTracking/GetTracking';
// Vessel status — descubierto vía DevTools en yangming.com/en/esolution/schedule/vessel_schedule
const YM_VESSEL_API = 'https://www.yangming.com/api/VesselTracking/GetVesselStatus';

// MSC usa SSR (Sitecore + Alpine.js) — los datos vienen en el HTML, no en JSON
const MSC_TRACK_URL = 'https://www.msc.com/en/track-a-shipment';

const PREFIJOS_YM  = new Set(['YMMU', 'YMLU']);
const PREFIJOS_MSC = new Set(['MSCU', 'MEDU', 'MSDU', 'MSKL', 'MSXU']);

// Traducción de eventos Yang Ming → español
const YM_EVENT_ES = {
  // Carga y origen
  'Received at Origin':                                    'Recibido en origen',
  'Empty to Shipper':                                      'Contenedor vacío entregado al cargador',
  'Empty Container Released':                              'Contenedor vacío liberado',
  'Full Container Received':                               'Contenedor lleno recibido',
  // Terminal y aduana
  'Gate In':                                               'Entrada en terminal',
  'Gate Out':                                              'Salida de terminal',
  'Customs Clearance':                                     'Despacho de aduana',
  'Customs Released':                                      'Liberado por aduana',
  // Carga en buque
  'Loaded on Vessel':                                      'Cargado en buque',
  'On Board':                                              'A bordo del buque',
  'Transhipment Load':                                     'Cargado en trasbordo',
  'Transhipment Discharge':                                'Descargado en trasbordo',
  // Tránsito
  'Vessel Departure':                                      'Buque en ruta — salida',
  'Departure':                                             'Buque en ruta — salida',
  'Vessel Arrival':                                        'Buque llegado al puerto de destino',
  'Arrival':                                               'Llegada al puerto de destino',
  'Rail Departure':                                        'Salida por ferrocarril',
  'Rail Arrival':                                          'Llegada por ferrocarril',
  // Descarga y destino
  'Discharged from Vessel':                                'Descargado del buque',
  'Discharge':                                             'Descargado del buque',
  'Gate out of Full Equipment by Truck at Port terminal':  'Contenedor lleno retirado de terminal',
  'Gate in of Full Equipment by Truck at Port terminal':   'Contenedor lleno en terminal',
  'Gate in of Laden Equipment by Truck at Port terminal':  'Contenedor lleno entregado en terminal',
  'Gate out of Empty Equipment by Truck at Depot':         'Contenedor vacío devuelto al depósito',
  'Gate in of Empty Equipment by Truck at Depot':          'Devolución de contenedor vacío',
  'Out for Delivery':                                      'En camino — entrega en curso',
  'Delivered':                                             'Entregado al receptor',
};

// Traducción de eventos MSC → español
const MSC_EVENT_ES = {
  'Gate in':                          'Entrada en terminal',
  'Gate out':                         'Salida de terminal',
  'Load':                             'Cargado en buque',
  'Loaded':                           'Cargado en buque',
  'Discharge':                        'Descargado del buque',
  'Discharged':                       'Descargado del buque',
  'Vessel Departure':                 'Buque en ruta — salida',
  'Vessel Arrival':                   'Buque llegado al puerto de destino',
  'Arrival':                          'Llegada al puerto de destino',
  'Departure':                        'Buque en ruta — salida',
  'Empty to Shipper':                 'Contenedor vacío entregado al cargador',
  'Empty Return':                     'Devolución de contenedor vacío',
  'Stuffing':                         'Carga del contenedor',
  'Stripping':                        'Descarga del contenedor',
  'Customs Cleared':                  'Liberado por aduana',
  'Customs Release':                  'Liberado por aduana',
  'Delivered':                        'Entregado al receptor',
  'Out for Delivery':                 'En camino — entrega en curso',
  'Transhipment':                     'Trasbordo',
  'Container on Rail':                'Contenedor en ferrocarril',
};

function prefijo(num) {
  return num?.trim().toUpperCase().slice(0, 4) ?? '';
}

function esYangMing(num) { return PREFIJOS_YM.has(prefijo(num)); }
function esMSC(num)      { return PREFIJOS_MSC.has(prefijo(num)); }

// Convierte "22/07/2026" o "22/07/2026 10:00" → ISO string
function parseFechaMSC(str) {
  if (!str) return null;
  const m = str.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
  if (!m) return null;
  const [, dd, mm, yyyy, hh = '00', min = '00'] = m;
  const d = new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:00Z`);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// Extrae texto de etiqueta → valor en HTML de MSC
// Busca el patrón: [etiqueta] … [valor hasta <]
function extraerCampoHTML(html, etiqueta) {
  // Ej: "POD ETA</label>\n<p>22/07/2026</p>"
  const re = new RegExp(
    etiqueta.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
    '[^<]*<[^>]+>\\s*([^<]{1,120})\\s*<',
    'i',
  );
  return html.match(re)?.[1]?.trim() ?? null;
}

async function buscarTrackingMSC(trackingNumber) {
  // MSC usa SSR (Sitecore + Alpine.js): los datos del contenedor vienen en el HTML
  // El parámetro GET más común es ?containerNumber= ; si falla probamos ?query=
  const intentos = [
    `${MSC_TRACK_URL}?containerNumber=${encodeURIComponent(trackingNumber)}`,
    `${MSC_TRACK_URL}?query=${encodeURIComponent(trackingNumber)}`,
    `${MSC_TRACK_URL}?cn=${encodeURIComponent(trackingNumber)}`,
  ];

  const HEADERS = {
    'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer':         'https://www.msc.com/en/track-a-shipment',
  };

  let html = null;
  for (const url of intentos) {
    try {
      const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(30_000) });
      if (!res.ok) continue;
      const text = await res.text();
      // Confirmar que la respuesta contiene datos del contenedor (no solo la página vacía)
      if (text.includes(trackingNumber)) { html = text; break; }
    } catch { /* probar siguiente */ }
  }

  if (!html) {
    logApiError(new Error('MSC: HTML no contiene datos del contenedor (posible bloqueo Akamai)'), `tracking:msc:${trackingNumber}`);
    return null;
  }

  // ── Extraer campos visibles en la página ────────────────────────────────────
  const podEtaStr    = extraerCampoHTML(html, 'POD ETA');
  const latestMove   = extraerCampoHTML(html, 'Latest move');
  const podName      = extraerCampoHTML(html, 'Port of Discharge');
  const vesselRaw    = extraerCampoHTML(html, 'Vessel');

  const eta = parseFechaMSC(podEtaStr);

  // ── Extraer tabla de eventos si está en el HTML ──────────────────────────────
  // MSC puede tener filas de historial: buscar patrones de fecha DD/MM/YYYY + acción
  const eventosHTML = [];
  const reEvento = /(\d{2}\/\d{2}\/\d{4}(?:\s+\d{2}:\d{2})?)[^<]{0,20}<[^>]+>([^<]{3,100})<[^>]+>([^<]{3,80})/g;
  let m;
  while ((m = reEvento.exec(html)) !== null) {
    const [, fecha, accion, lugar] = m;
    const isoFecha = parseFechaMSC(fecha);
    if (!isoFecha) continue;
    const desc = accion.trim();
    eventosHTML.push({
      status:             MSC_EVENT_ES[desc] ?? desc,
      occurrenceDatetime: isoFecha,
      location:           lugar.trim(),
      vesselVoyage:       null,
      vesselCode:         null,
    });
  }

  // Si no hay tabla, generar un pseudo-evento con el último movimiento visible
  if (eventosHTML.length === 0 && latestMove) {
    eventosHTML.push({
      status:             'Último movimiento registrado',
      occurrenceDatetime: null,
      location:           latestMove,
      vesselVoyage:       vesselRaw ?? null,
      vesselCode:         null,
    });
  }

  if (eventosHTML.length === 0 && !eta) return null;

  // Más reciente primero
  eventosHTML.sort((a, b) => {
    if (!a.occurrenceDatetime) return 1;
    if (!b.occurrenceDatetime) return -1;
    return new Date(b.occurrenceDatetime) - new Date(a.occurrenceDatetime);
  });

  return {
    eventos:      eventosHTML,
    ultimoEvento: eventosHTML[0] ?? null,
    eta,
    shipmentId:   null,
    // Puerto de descarga para la UI
    portOfDischarge: podName ?? null,
  };
}

function parseFechaYM(str) {
  if (!str) return null;
  // "2026/06/09 22:22" → ISO 8601
  const iso = str.replace(/\//g, '-').replace(' ', 'T') + ':00';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

async function buscarTrackingYangMing(trackingNumber) {
  const url = `${YM_API}?paramTrackNo=${encodeURIComponent(trackingNumber)}&paramTrackPosition=SEARCH&paramRefNo=`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept':     'application/json, text/plain, */*',
      'Referer':    'https://www.yangming.com/en/esolution/cargo_tracking',
      'Origin':     'https://www.yangming.com',
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    logApiError(new Error(`Yang Ming API HTTP ${res.status}`), `tracking:${trackingNumber}`);
    return null;
  }

  const json = await res.json();
  const container = json?.containerList?.[0];
  if (!container || !json.successCnt) return null;

  const rawEvents = container.ctStatusInfo ?? [];
  if (rawEvents.length === 0) {
    return null;
  }

  // seq 1 = evento más reciente (nowStatus "Y"), seq N = más antiguo
  const eventos = rawEvents.map(e => ({
    status:               YM_EVENT_ES[e.eventDesc] ?? e.eventDesc ?? 'Evento desconocido',
    occurrenceDatetime:   parseFechaYM(e.moveDate),
    location:             e.atFacility ?? null,
    vesselVoyage:         e.vesselVoyage ? e.vesselVoyage.replace(/<br\s*\/?>/gi, ' ').trim() : null,
    // Campo de código de barco — Yang Ming puede llamarlo de distintas formas
    vesselCode:           e.vesselCode ?? e.vslCode ?? e.vslCd ?? e.carrierVslCode ?? null,
  }));

  const ultimoEvento = eventos[0] ?? null;

  // ETA: puede venir en dportETA de cualquier evento
  const etaRaw = rawEvents.find(e => e.dportETA)?.dportETA ?? null;
  const eta = parseFechaYM(etaRaw);


  return { eventos, ultimoEvento, eta, shipmentId: null };
}

/**
 * Extrae el código/nombre del barco para buscar su schedule.
 * Maneja dos formatos de vesselVoyage de Yang Ming:
 *   "OSOL / 134E"               → devuelve "OSOL"   (código corto, funciona directo con la API)
 *   "ONE SOLIDARITY (001W)"     → devuelve "ONE SOLIDARITY"  (nombre completo, sin el voyage)
 * Prioriza e.vesselCode si el evento raw lo trae explícitamente.
 */
export function extraerNombreBarco(eventos) {
  for (const e of eventos) {
    if (e.vesselCode) return e.vesselCode.trim().toUpperCase();
    if (e.vesselVoyage) {
      const vv = e.vesselVoyage;
      if (vv.includes('/')) {
        // Formato "CODE / VOYAGE" → tomar la parte izquierda
        return vv.split('/')[0].trim().toUpperCase();
      }
      // Formato "NAME (VOYAGE)" → eliminar el voyage entre paréntesis
      return vv.replace(/\s*\(.*?\)\s*$/, '').trim().toUpperCase();
    }
  }
  return null;
}

// ─── VesselFinder — tracking universal de barcos (cualquier naviera) ──────────

const VF_SEARCH    = 'https://www.vesselfinder.com/searchjson.js';
const VF_PORTCALLS = 'https://www.vesselfinder.com/api/pub/pcext/v4';

const VF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept':     'application/json, text/plain, */*',
  'Referer':    'https://www.vesselfinder.com/',
  'Origin':     'https://www.vesselfinder.com',
};

// ETA de VesselFinder viene como string "MMDDHHMM" (UTC)
function parseVFEta(etaStr) {
  if (!etaStr) return null;
  const s = etaStr.toString().padStart(8, '0');
  if (s === '00000000') return null;
  const now   = new Date();
  const month = parseInt(s.slice(0, 2), 10) - 1;
  const day   = parseInt(s.slice(2, 4), 10);
  const hour  = parseInt(s.slice(4, 6), 10);
  const min   = parseInt(s.slice(6, 8), 10);
  let year = now.getFullYear();
  let d = new Date(Date.UTC(year, month, day, hour, min));
  if (isNaN(d.getTime())) return null;
  // Si la fecha calculada es más de 60 días en el pasado → es del año siguiente
  if (d < now - 60 * 86400_000) d = new Date(Date.UTC(year + 1, month, day, hour, min));
  return d.toISOString();
}

// Fechas de escalas: "Jun 25, 01:09" (sin año, UTC implícito)
function parseVFDate(str) {
  if (!str) return null;
  try {
    const year = new Date().getFullYear();
    const d = new Date(str.replace(',', '') + ` ${year} UTC`);
    if (isNaN(d.getTime())) return null;
    // Si queda más de 6 meses en el futuro → probablemente del año pasado
    if (d - Date.now() > 6 * 30 * 86400_000) d.setFullYear(d.getFullYear() - 1);
    return d.toISOString();
  } catch { return null; }
}

/**
 * Consulta VesselFinder usando el MMSI directamente (sin búsqueda por nombre).
 * El endpoint pcext/v4/{mmsi}?d devuelve las escalas recientes del barco.
 * Exportada para usarla desde la ruta de tracking cuando el MMSI está guardado en DB.
 */
export async function buscarSchedulePorMmsi(mmsi, vesselName = null) {
  if (!mmsi) return null;
  try {
    const pcRes = await fetch(
      `${VF_PORTCALLS}/${mmsi}?d`,
      { headers: VF_HEADERS, signal: AbortSignal.timeout(15_000) },
    );
    if (!pcRes.ok) {
      logApiError(new Error(`VF pcext HTTP ${pcRes.status}`), `tracking:vf:mmsi:${mmsi}`);
      return null;
    }
    const portCalls = await pcRes.json();
    if (!Array.isArray(portCalls)) return null;

    const puertos = portCalls
      .filter(p => p.dp && p.dp !== 'locked' && p.c)
      .map((p, i) => ({
        puerto:           p.dp,
        portCode:         p.l  || null,
        pais:             p.c  || null,
        eta:              null,
        ata:              parseVFDate(p.a),
        etd:              parseVFDate(p.d),
        esPosicionActual: i === 0,
      }));

    if (puertos.length === 0) return null;

    return { vesselCode: mmsi, vesselName: vesselName ?? mmsi, puertos };
  } catch (e) {
    logApiError(e, `tracking:vf:mmsi:${mmsi}`);
    return null;
  }
}

/**
 * Busca un barco en VesselFinder por nombre.
 * NOTA: searchjson.js devuelve 404 — esta función se mantiene pero probablemente no funcione
 * sin encontrar un nuevo endpoint de búsqueda. Usar buscarSchedulePorMmsi() con MMSI directo.
 */
async function buscarScheduleVesselFinder(vesselName) {
  if (!vesselName) return null;
  try {
    // searchjson.js ya no existe (404) — intentar con el endpoint de API pública
    const searchRes = await fetch(
      `${VF_SEARCH}?term=${encodeURIComponent(vesselName)}`,
      { headers: VF_HEADERS, signal: AbortSignal.timeout(10_000) },
    );
    if (!searchRes.ok) return null;

    let results;
    try { results = await searchRes.json(); } catch { return null; }

    // Intentar múltiples formatos de respuesta
    const vessel =
      (Array.isArray(results) ? results[0] : null) ??
      results?.vessels?.[0] ??
      results?.data?.[0] ??
      null;
    if (!vessel?.mmsi) return null;

    // Con el MMSI obtenido, usar la función directa
    return buscarSchedulePorMmsi(vessel.mmsi, vessel.name ?? vesselName);

  } catch (e) {
    logApiError(e, `tracking:vf:search:${vesselName}`);
    return null;
  }
}

// ─── ISO 3166-1 alpha-2 → nombre en español (rutas relevantes Asia–Europa)
const PAIS_POR_ISO = {
  AE: 'Emiratos Árabes', BE: 'Bélgica',  CN: 'China',       DE: 'Alemania',
  EG: 'Egipto',          ES: 'España',    FR: 'Francia',     GB: 'Reino Unido',
  GR: 'Grecia',          ID: 'Indonesia', IN: 'India',       IT: 'Italia',
  JP: 'Japón',           KR: 'Corea del Sur', LK: 'Sri Lanka', MA: 'Marruecos',
  MT: 'Malta',           MY: 'Malasia',   NL: 'Países Bajos', OM: 'Omán',
  PK: 'Pakistán',        PT: 'Portugal',  SA: 'Arabia Saudí', SG: 'Singapur',
  TH: 'Tailandia',       TR: 'Turquía',   TW: 'Taiwán',      VN: 'Vietnam',
};

function paisDesdeCodigo(portCode) {
  if (!portCode || portCode.length < 2) return null;
  return PAIS_POR_ISO[portCode.slice(0, 2).toUpperCase()] ?? null;
}

/**
 * Consulta el schedule de escala del barco en Yang Ming.
 * Devuelve array de puertos con ETA/ETD, o null si el endpoint no está disponible.
 */
async function fetchVesselStatus(vesselParam) {
  const url = `${YM_VESSEL_API}?vesselCode=${encodeURIComponent(vesselParam)}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept':  'application/json, text/plain, */*',
      'Referer': `https://www.yangming.com/en/esolution/schedule/vessel_schedule?vessel=${encodeURIComponent(vesselParam)}`,
      'Origin':  'https://www.yangming.com',
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return null;
  const json = await res.json();
  // La API devuelve un objeto vacío o sin berthDetail si el código no existe
  const portCalls = json?.detailedVesselPosition?.berthDetail;
  if (!Array.isArray(portCalls) || portCalls.length === 0) return null;
  return json;
}

export async function buscarScheduleBarco(vesselCode) {
  if (!vesselCode) return null;
  try {
    // Para barcos Yang Ming: intentar primero su propia API (datos de schedule más precisos)
    let json = await fetchVesselStatus(vesselCode);
    if (!json && vesselCode.includes(' ')) {
      json = await fetchVesselStatus(vesselCode.split(' ')[0]);
    }

    if (json) {
      const vesselName = json.vesselName ?? null;
      const portCalls  = json.detailedVesselPosition?.berthDetail ?? [];
      const puertos = portCalls.map(p => {
        const isActual = p.arrivalStatus === 'Actual';
        const arrDate  = p.arrivalDate   !== 'SKIP' ? p.arrivalDate   : null;
        const depDate  = p.departureDate !== 'SKIP' ? p.departureDate : null;
        return {
          puerto:           p.portName ?? '?',
          portCode:         p.portCode ?? null,
          pais:             paisDesdeCodigo(p.portCode),
          eta:              !isActual ? parseFechaYM(arrDate) : null,
          ata:              isActual  ? parseFechaYM(arrDate) : null,
          etd:              parseFechaYM(depDate),
          esPosicionActual: p.lastPosition === true,
        };
      }).filter(p => p.eta || p.ata || p.etd);

      if (puertos.length > 0) return { vesselCode, vesselName, puertos };
    }

    // Fallback universal: VesselFinder (AIS, funciona para MSC y cualquier naviera)
    return buscarScheduleVesselFinder(vesselCode);
  } catch (e) {
    logApiError(e, `tracking:vessel:${vesselCode}`);
    return null;
  }
}

/**
 * Consulta el estado de un contenedor.
 * Soporta: Yang Ming (YMMU/YMLU), MSC (MSCU/MEDU/MSDU/MSKL/MSXU).
 */
export async function buscarTracking(trackingNumber, _uuid = null) {
  if (!trackingNumber?.trim()) return null;

  const num = trackingNumber.trim().toUpperCase();

  if (esYangMing(num)) return buscarTrackingYangMing(num);
  if (esMSC(num))      return buscarTrackingMSC(num);

  logApiError(new Error(`Naviera no soportada (prefijo: ${prefijo(num)})`), `tracking:${num}`);
  return null;
}

/**
 * Envía un mensaje de WhatsApp via CallMeBot.
 */
export async function enviarWhatsApp(mensaje) {
  const destinatarios = [
    { phone: process.env.CALLMEBOT_PHONE,   apikey: process.env.CALLMEBOT_APIKEY },
    { phone: process.env.CALLMEBOT_PHONE_2, apikey: process.env.CALLMEBOT_APIKEY_2 },
  ].filter(d => d.phone && d.apikey);

  if (destinatarios.length === 0) {
    return false;
  }

  const enviar = async ({ phone, apikey }) => {
    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(mensaje)}&apikey=${encodeURIComponent(apikey)}`;
    try {
      const r    = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      const body = await r.text().catch(() => '');
      if (!r.ok) logApiError(new Error(`CallMeBot HTTP ${r.status}: ${body.slice(0, 200)}`), `tracking:whatsapp:${phone}`);
      return { phone, ok: r.ok, status: r.status, body: body.slice(0, 200) };
    } catch (e) {
      logApiError(e, `tracking:whatsapp:${phone}`);
      return { phone, ok: false, error: e.message };
    }
  };

  const resultados = await Promise.all(destinatarios.map(enviar));
  return resultados;
}

// Emoji según el tipo de evento
const EMOJI_EVENTO = {
  'Recibido en origen':                   '🏭',
  'Contenedor vacío entregado al cargador':'📦',
  'Entrada en terminal':                  '🏗️',
  'Salida de terminal':                   '🚛',
  'Cargado en buque':                     '⚓',
  'A bordo del buque':                    '🚢',
  'Buque en ruta — salida':               '🌊',
  'Buque llegado al puerto de destino':   '🏁',
  'Llegada al puerto de destino':         '🏁',
  'Descargado del buque':                 '🏗️',
  'Despacho de aduana':                   '🛃',
  'Liberado por aduana':                  '✅',
  'Contenedor lleno retirado de terminal':'🚛',
  'En camino — entrega en curso':         '🚚',
  'Entregado al receptor':                '✅',
};

/**
 * Genera el texto del mensaje de WhatsApp para un nuevo evento.
 * scheduleBarco es opcional — si se pasa, añade posición actual y próxima escala del barco.
 */
export function formatearMensajeTracking(imp, evento, eta = null, scheduleBarco = null) {
  const num   = imp.numContenedor || imp.blNumber || 'Sin número';
  const desc  = evento.status || 'Nuevo estado';
  const emoji = EMOJI_EVENTO[desc] || '📋';

  const fecha = evento.occurrenceDatetime
    ? new Date(evento.occurrenceDatetime).toLocaleString('es-ES', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null;

  const etaFmt = eta
    ? new Date(eta).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;

  // Sección de barco: posición actual + próximas escalas (máx 2)
  const haySchedule = scheduleBarco?.puertos?.length > 0;
  const lineasBarco = [];
  if (haySchedule) {
    const nombre = scheduleBarco.vesselName ?? scheduleBarco.vesselCode ?? '';
    if (nombre) lineasBarco.push(``, `🚢 *${nombre}*`);

    const posActual = scheduleBarco.puertos.find(p => p.esPosicionActual);
    if (posActual) {
      const pais = posActual.pais ? ` (${posActual.pais})` : '';
      lineasBarco.push(`📍 Últ. posición: ${posActual.puerto}${pais}`);
    }

    scheduleBarco.puertos
      .filter(p => p.eta && !p.esPosicionActual)
      .slice(0, 2)
      .forEach(p => {
        const d    = new Date(p.eta).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
        const pais = p.pais ? ` (${p.pais})` : '';
        lineasBarco.push(`⏭ ${p.puerto}${pais} — ${d}`);
      });
  }

  // Ubicación: recortar al nombre del puerto (quitar nombre del terminal)
  const ubicacion = evento.location
    ? evento.location.split(' - ')[0].split(',')[0].trim()
    : null;

  return [
    imp.descripcion ? `📦 *${imp.descripcion}*` : `📦 *Contenedor ${num}*`,
    imp.descripcion ? `🔢 ${num}` : null,
    ``,
    `${emoji} ${desc}`,
    ubicacion                       ? `📍 ${ubicacion}` : null,
    // Mostrar línea de barco solo si no hay sección de schedule (evita duplicar)
    !haySchedule && evento.vesselVoyage ? `🛳 ${evento.vesselVoyage.replace(/\s+/g, ' ').trim()}` : null,
    fecha                           ? `📅 ${fecha}` : null,
    etaFmt                          ? `🕐 ETA prevista: ${etaFmt}` : null,
    ...lineasBarco,
  ].filter(s => s !== null).join('\n');
}

/**
 * Mensaje WhatsApp cuando el barco llega a un nuevo puerto.
 * Se dispara cuando ultimaPosicionBarco cambia (independiente del evento del contenedor).
 */
export function formatearMensajeBarco(imp, puertoActual, proximoPuerto) {
  const num    = imp.numContenedor || imp.blNumber || 'Sin número';
  const nombre = imp.descripcion ? `${imp.descripcion} (${num})` : `Contenedor ${num}`;
  const pais   = puertoActual.pais ? ` (${puertoActual.pais})` : '';

  const lineas = [
    `🚢 *${puertoActual.vesselName ?? puertoActual.vesselCode ?? 'Barco'} llegó a ${puertoActual.puerto}${pais}*`,
    ``,
    `📦 ${nombre}`,
  ];

  if (proximoPuerto) {
    const d     = new Date(proximoPuerto.eta).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    const pNext = proximoPuerto.pais ? ` (${proximoPuerto.pais})` : '';
    lineas.push(`⏭ Próx. escala: ${proximoPuerto.puerto}${pNext} — ${d}`);
  }

  return lineas.join('\n');
}

/**
 * Mensaje WhatsApp cuando el contenedor cambia de barco (transbordo).
 */
export function formatearMensajeTransbordo(imp, barcoAnterior, barcoNuevoCodigo, barcoNuevoNombre, puertoTransbordo) {
  const num    = imp.numContenedor || imp.blNumber || 'Sin número';
  const nombre = imp.descripcion ? `${imp.descripcion} (${num})` : `Contenedor ${num}`;
  const barcoNuevo = barcoNuevoNombre ?? barcoNuevoCodigo ?? 'nuevo barco';
  const pais   = puertoTransbordo?.pais ? ` (${puertoTransbordo.pais})` : '';
  const puerto = puertoTransbordo ? `\n📍 Puerto de transbordo: ${puertoTransbordo.puerto}${pais}` : '';

  return [
    `🔄 *Transbordo detectado*`,
    ``,
    `📦 ${nombre}`,
    `🚢 Barco anterior: ${barcoAnterior}`,
    `🚢 Nuevo barco: *${barcoNuevo}*${puerto}`,
  ].join('\n');
}

/**
 * Clave de deduplicación para detectar si un evento ya fue notificado.
 */
export function claveEvento(evento) {
  if (!evento) return null;
  return `${evento.status ?? ''}|${evento.occurrenceDatetime ?? ''}`;
}
