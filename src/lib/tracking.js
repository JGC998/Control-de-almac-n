/**
 * Tracking de contenedores Yang Ming + notificaciones WhatsApp via CallMeBot.
 *
 * Variables de entorno requeridas:
 *   CALLMEBOT_PHONE   — Número sin + (ej: 34612345678)
 *   CALLMEBOT_APIKEY  — API key de CallMeBot
 *   CALLMEBOT_PHONE_2  — (Opcional) Segundo número
 *   CALLMEBOT_APIKEY_2 — (Opcional) API key del segundo número
 *
 * Fuente de datos: API pública de Yang Ming (sin autenticación).
 * Soporta contenedores con prefijo YMMU / YMLU.
 * Para otras navieras: añadir su endpoint correspondiente.
 */

import { logApiError } from '@/lib/logger';

const YM_API        = 'https://www.yangming.com/api/CargoTracking/GetTracking';
// Vessel status — descubierto vía DevTools en yangming.com/en/esolution/schedule/vessel_schedule
const YM_VESSEL_API = 'https://www.yangming.com/api/VesselTracking/GetVesselStatus';

const PREFIJOS_YM = new Set(['YMMU', 'YMLU']);

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

function prefijo(num) {
  return num?.trim().toUpperCase().slice(0, 4) ?? '';
}

function esYangMing(num) {
  return PREFIJOS_YM.has(prefijo(num));
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

// ISO 3166-1 alpha-2 → nombre en español (rutas relevantes Asia–Europa)
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
    // Primer intento con el valor recibido (puede ser código "OSOL" o nombre "ONE SOLIDARITY")
    let json = await fetchVesselStatus(vesselCode);

    // Si falla con nombre completo, intentar solo con la primera palabra
    // ("ONE SOLIDARITY" → "ONE") — poco probable que funcione pero es gratis intentarlo
    if (!json && vesselCode.includes(' ')) {
      json = await fetchVesselStatus(vesselCode.split(' ')[0]);
    }

    if (!json) return null;

    const vesselName = json.vesselName ?? null;
    const portCalls  = json.detailedVesselPosition?.berthDetail ?? [];

    return {
      vesselCode,
      vesselName,
      puertos: portCalls.map(p => {
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
      }).filter(p => p.eta || p.ata || p.etd),
    };
  } catch (e) {
    logApiError(e, `tracking:vessel:${vesselCode}`);
    return null;
  }
}

/**
 * Consulta el estado de un contenedor.
 * Actualmente soporta Yang Ming (YMMU/YMLU).
 * Para otras navieras, añadir su función correspondiente.
 */
export async function buscarTracking(trackingNumber, _uuid = null) {
  if (!trackingNumber?.trim()) return null;

  const num = trackingNumber.trim().toUpperCase();

  if (esYangMing(num)) {
    return buscarTrackingYangMing(num);
  }

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
      .filter(p => p.eta)
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
 * Clave de deduplicación para detectar si un evento ya fue notificado.
 */
export function claveEvento(evento) {
  if (!evento) return null;
  return `${evento.status ?? ''}|${evento.occurrenceDatetime ?? ''}`;
}
